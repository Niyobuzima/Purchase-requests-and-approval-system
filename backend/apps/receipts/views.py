"""
Receipt Views.

This module handles receipt management operations including:
- Uploading receipts
- AI-powered data extraction
- Validating receipts against purchase orders
- Finance approval workflow
"""

from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Receipt
from .serializers import ReceiptSerializer, ReceiptApprovalSerializer
from .filters import ReceiptFilter
from utils.ai_processor import get_document_processor

# Import core utilities
from core.responses import APIResponse
from core.logging_utils import app_logger, log_view_action, audit_log
from core.constants import AMOUNT_TOLERANCE_PERCENT, ErrorCode


@extend_schema(tags=['Receipts'])
@extend_schema_view(
    list=extend_schema(description='List receipts'),
    create=extend_schema(description='Upload a receipt for a purchase order'),
    retrieve=extend_schema(description='Get receipt details'),
    update=extend_schema(description='Update receipt'),
    partial_update=extend_schema(description='Partially update receipt'),
    destroy=extend_schema(description='Delete receipt'),
)
class ReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Receipt management

    Endpoints:
    - GET /api/receipts/ - List all receipts (filter by PO or validation status)
    - POST /api/receipts/ - Upload a receipt for a purchase order
    - GET /api/receipts/{id}/ - Get receipt details
    - PATCH /api/receipts/{id}/ - Update receipt (finance comments)
    - DELETE /api/receipts/{id}/ - Delete receipt
    - POST /api/receipts/{id}/validate/ - Validate receipt against PO
    - POST /api/receipts/{id}/approve/ - Approve receipt (Finance only)
    """

    queryset = Receipt.objects.all().select_related(
        'purchase_order',
        'purchase_order__request',
        'uploaded_by',
        'approved_by'
    )
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ReceiptFilter
    ordering_fields = ['uploaded_at', 'approved_at', 'validation_status']
    ordering = ['-uploaded_at']

    def get_queryset(self):
        """Filter receipts based on user role and query params"""
        queryset = super().get_queryset()
        user = self.request.user

        # Filter by purchase order if provided
        po_id = self.request.query_params.get('purchase_order')
        if po_id:
            queryset = queryset.filter(purchase_order_id=po_id)

        # Filter by validation status if provided
        validation_status = self.request.query_params.get('validation_status')
        if validation_status:
            queryset = queryset.filter(validation_status=validation_status)

        # Finance users see all receipts
        # Staff users see only receipts for their own POs
        if user.role == 'STAFF':
            queryset = queryset.filter(purchase_order__request__requester=user)

        return queryset

    def perform_create(self, serializer):
        """
        Create receipt and automatically extract data using AI,
        then automatically validate against PO
        """
        # Set the uploader
        receipt = serializer.save(uploaded_by=self.request.user)

        # Audit log for receipt upload
        audit_log(
            action='UPLOAD_RECEIPT',
            user=self.request.user,
            resource_type='Receipt',
            resource_id=receipt.id,
            details={
                'purchase_order_id': receipt.purchase_order_id,
            },
            request=self.request
        )

        # Process the receipt with AI in the background
        try:
            app_logger.info(
                f"Processing receipt {receipt.id} with AI",
                receipt_id=receipt.id,
                user_id=self.request.user.id
            )
            processor = get_document_processor()

            # Process from Cloudinary file
            extracted_data = processor.process_document_from_file(receipt.receipt_file)

            if extracted_data.get('success'):
                # Save extracted data
                receipt.extracted_receipt_data = extracted_data
                receipt.save(update_fields=['extracted_receipt_data'])
                app_logger.info(
                    f"Successfully extracted data from receipt {receipt.id}",
                    receipt_id=receipt.id
                )

                # Automatically run validation after extraction
                self._auto_validate_receipt(receipt)
            elif extracted_data.get('is_valid_document') is False:
                # Document type validation failed - not a valid receipt
                app_logger.warning(
                    f"Invalid document type uploaded for receipt {receipt.id}",
                    receipt_id=receipt.id,
                    document_type=extracted_data.get('document_type'),
                    error=extracted_data.get('error')
                )
                # Save the error info and mark as failed validation
                receipt.extracted_receipt_data = extracted_data
                receipt.validation_status = 'FAILED'
                receipt.validation_notes = extracted_data.get(
                    'user_message',
                    'Invalid document type. Please upload a valid receipt.'
                )
                receipt.save(update_fields=['extracted_receipt_data', 'validation_status', 'validation_notes'])
            else:
                app_logger.warning(
                    f"AI extraction failed for receipt {receipt.id}",
                    receipt_id=receipt.id,
                    error=extracted_data.get('error')
                )

        except Exception as e:
            app_logger.error(
                f"Error processing receipt {receipt.id}: {e}",
                exc_info=True,
                receipt_id=receipt.id
            )
            # Don't fail the upload, just log the error

    def _validate_receipt_against_po(self, receipt, po, receipt_data):
        """
        Core validation logic comparing receipt data against PO.
        
        Returns:
            tuple: (validation_status, discrepancies_list)
        """
        discrepancies = []

        # 1. Vendor name check (case-insensitive substring match)
        po_vendor = (po.request.vendor_name or '').lower()
        receipt_vendor = (receipt_data.get('vendor_name') or '').lower()

        if po_vendor and receipt_vendor:
            if receipt_vendor not in po_vendor and po_vendor not in receipt_vendor:
                discrepancies.append({
                    'type': 'vendor_mismatch',
                    'severity': 'medium',
                    'message': f"Vendor name mismatch",
                    'po_value': po.request.vendor_name,
                    'receipt_value': receipt_data.get('vendor_name'),
                })

        # 2. Total amount check (±5% tolerance)
        po_total = float(po.request.total_amount)
        receipt_total = receipt_data.get('total_amount')

        if receipt_total:
            # Validate and convert receipt_total safely
            try:
                # Strip whitespace and convert to float
                receipt_total_str = str(receipt_total).strip() if receipt_total else ''
                if not receipt_total_str:
                    raise ValueError("Empty total amount")
                
                receipt_total_float = float(receipt_total_str)
                
                # Check if within tolerance (use constant from core)
                lower_bound = po_total * (1 - AMOUNT_TOLERANCE_PERCENT)
                upper_bound = po_total * (1 + AMOUNT_TOLERANCE_PERCENT)

                if not (lower_bound <= receipt_total_float <= upper_bound):
                    difference = receipt_total_float - po_total
                    discrepancies.append({
                        'type': 'amount_mismatch',
                        'severity': 'high',
                        'message': f"Total amount outside {int(AMOUNT_TOLERANCE_PERCENT * 100)}% tolerance",
                        'po_value': po_total,
                        'receipt_value': receipt_total_float,
                        'difference': difference,
                    })
            except (ValueError, TypeError) as e:
                # Invalid numeric value in receipt total
                discrepancies.append({
                    'type': 'invalid_amount',
                    'severity': 'high',
                    'message': f"Invalid total amount format in receipt: '{receipt_total}'",
                    'po_value': po_total,
                    'receipt_value': str(receipt_total),
                    'error': str(e),
                })

        # 3. Item count check
        po_items = po.request.items.all()
        receipt_items = receipt_data.get('items', [])

        if len(receipt_items) != len(po_items):
            discrepancies.append({
                'type': 'item_count_mismatch',
                'severity': 'medium',
                'message': f"Item count mismatch: PO has {len(po_items)} items, Receipt has {len(receipt_items)} items",
                'po_value': len(po_items),
                'receipt_value': len(receipt_items),
            })

        # 4. Item matching
        po_descriptions = [item.description.lower() for item in po_items]
        receipt_descriptions = [item.get('description', '').lower() for item in receipt_items]

        # Check for missing items from receipt
        for po_item in po_items:
            po_desc = po_item.description.lower()
            matched = any(
                po_desc in receipt_desc or receipt_desc in po_desc
                for receipt_desc in receipt_descriptions
            )
            if not matched:
                discrepancies.append({
                    'type': 'missing_item',
                    'severity': 'medium',
                    'message': f"PO item not found in receipt: {po_item.description}",
                    'po_item': po_item.description,
                    'po_quantity': float(po_item.quantity),
                    'po_unit_price': float(po_item.unit_price)
                })

        # Check for extra items in receipt
        for receipt_item in receipt_items:
            receipt_desc = receipt_item.get('description', '').lower()
            matched = any(
                receipt_desc in po_desc or po_desc in receipt_desc
                for po_desc in po_descriptions
            )
            if not matched:
                discrepancies.append({
                    'type': 'extra_item',
                    'severity': 'low',
                    'message': f"Extra item in receipt not in PO: {receipt_item.get('description')}",
                    'receipt_item': receipt_item.get('description'),
                    'receipt_quantity': receipt_item.get('quantity'),
                    'receipt_unit_price': receipt_item.get('unit_price')
                })

        # Determine validation status
        validation_status = 'DISCREPANCY' if discrepancies else 'MATCHED'
        
        return validation_status, discrepancies

    def _auto_validate_receipt(self, receipt):
        """
        Automatically validate receipt against PO after AI extraction
        """
        try:
            app_logger.info(
                f"Auto-validating receipt {receipt.id}",
                receipt_id=receipt.id
            )

            if not receipt.extracted_receipt_data:
                return

            po = receipt.purchase_order
            receipt_data = receipt.extracted_receipt_data

            # Use common validation logic
            validation_status, discrepancies = self._validate_receipt_against_po(
                receipt, po, receipt_data
            )

            # Update receipt with validation results
            receipt.validation_status = validation_status
            receipt.discrepancies = discrepancies
            receipt.save(update_fields=['validation_status', 'discrepancies'])

            app_logger.info(
                f"Validation complete for receipt {receipt.id}: {receipt.validation_status}",
                receipt_id=receipt.id,
                validation_status=receipt.validation_status,
                discrepancy_count=len(discrepancies)
            )

        except Exception as e:
            app_logger.error(
                f"Error auto-validating receipt {receipt.id}: {e}",
                exc_info=True,
                receipt_id=receipt.id
            )

    @action(detail=True, methods=['post'])
    @log_view_action("Validate Receipt")
    def validate(self, request, pk=None):
        """
        Validate receipt against purchase order

        Compares extracted receipt data with PO items and amounts
        """
        receipt = self.get_object()

        if not receipt.extracted_receipt_data:
            return APIResponse.error(
                message="Receipt data has not been extracted yet",
                code=ErrorCode.VALIDATION_ERROR
            )

        # Get PO and receipt data
        po = receipt.purchase_order
        receipt_data = receipt.extracted_receipt_data

        # Use common validation logic
        validation_status, discrepancies = self._validate_receipt_against_po(
            receipt, po, receipt_data
        )

        # Save validation results
        with transaction.atomic():
            receipt.discrepancies = discrepancies
            receipt.validation_status = validation_status
            receipt.save(update_fields=['validation_status', 'discrepancies'])

        # Audit log
        audit_log(
            action='VALIDATE_RECEIPT',
            user=request.user,
            resource_type='Receipt',
            resource_id=receipt.id,
            details={
                'validation_status': validation_status,
                'discrepancy_count': len(discrepancies),
            },
            request=request
        )

        app_logger.info(
            f"Receipt {receipt.id} validated by user {request.user.id}",
            receipt_id=receipt.id,
            validation_status=validation_status,
            discrepancy_count=len(discrepancies)
        )

        return APIResponse.success(
            data={
                'validation_status': validation_status,
                'discrepancies': discrepancies,
                'discrepancy_count': len(discrepancies),
            },
            message="Validation complete"
        )

    @action(detail=True, methods=['post'], parser_classes=[JSONParser])
    @log_view_action("Approve Receipt")
    def approve(self, request, pk=None):
        """
        Approve receipt despite discrepancies (Finance only)
        """
        if request.user.role != 'FINANCE':
            return APIResponse.forbidden(
                message="Only Finance users can approve receipts"
            )

        receipt = self.get_object()
        serializer = ReceiptApprovalSerializer(data=request.data)

        if not serializer.is_valid():
            return APIResponse.validation_error(
                errors=serializer.errors,
                message="Invalid approval data"
            )

        with transaction.atomic():
            receipt.validation_status = 'APPROVED'
            receipt.finance_comments = serializer.validated_data.get('finance_comments', '')
            receipt.approved_by = request.user
            receipt.approved_at = timezone.now()
            receipt.save(update_fields=[
                'validation_status',
                'finance_comments',
                'approved_by',
                'approved_at'
            ])

        # Audit log
        audit_log(
            action='APPROVE_RECEIPT',
            user=request.user,
            resource_type='Receipt',
            resource_id=receipt.id,
            details={
                'purchase_order_id': receipt.purchase_order_id,
                'finance_comments': receipt.finance_comments,
            },
            request=request
        )

        app_logger.info(
            f"Receipt {receipt.id} approved by finance user {request.user.id}",
            receipt_id=receipt.id,
            approved_by=request.user.id
        )

        return APIResponse.success(
            data=ReceiptSerializer(receipt).data,
            message="Receipt approved successfully"
        )
