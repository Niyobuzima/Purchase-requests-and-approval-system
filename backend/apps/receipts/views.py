from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction

from .models import Receipt
from .serializers import ReceiptSerializer, ReceiptApprovalSerializer
from .filters import ReceiptFilter
from apps.purchase_orders.models import PurchaseOrder
from utils.ai_processor import get_document_processor
import logging

logger = logging.getLogger(__name__)


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

        # Process the receipt with AI in the background
        try:
            logger.info(f"Processing receipt {receipt.id} with AI...")
            processor = get_document_processor()

            # Process from Cloudinary file
            extracted_data = processor.process_document_from_file(receipt.receipt_file)

            if extracted_data.get('success'):
                # Save extracted data
                receipt.extracted_receipt_data = extracted_data
                receipt.save(update_fields=['extracted_receipt_data'])
                logger.info(f"Successfully extracted data from receipt {receipt.id}")

                # Automatically run validation after extraction
                self._auto_validate_receipt(receipt)
            else:
                logger.warning(f"AI extraction failed for receipt {receipt.id}: {extracted_data.get('error')}")

        except Exception as e:
            logger.error(f"Error processing receipt {receipt.id}: {e}")
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
                
                # Check if within tolerance
                tolerance = 0.05  # 5%
                lower_bound = po_total * (1 - tolerance)
                upper_bound = po_total * (1 + tolerance)

                if not (lower_bound <= receipt_total_float <= upper_bound):
                    difference = receipt_total_float - po_total
                    discrepancies.append({
                        'type': 'amount_mismatch',
                        'severity': 'high',
                        'message': f"Total amount outside 5% tolerance",
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
            logger.info(f"Auto-validating receipt {receipt.id}...")

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
            
            logger.info(f"Validation complete for receipt {receipt.id}: {receipt.validation_status}")

        except Exception as e:
            logger.error(f"Error auto-validating receipt {receipt.id}: {e}")

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """
        Validate receipt against purchase order

        Compares extracted receipt data with PO items and amounts
        """
        receipt = self.get_object()

        if not receipt.extracted_receipt_data:
            return Response(
                {'error': 'Receipt data has not been extracted yet'},
                status=status.HTTP_400_BAD_REQUEST
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

        return Response({
            'validation_status': validation_status,
            'discrepancies': discrepancies,
            'discrepancy_count': len(discrepancies),
            'message': 'Validation complete'
        })

    @action(detail=True, methods=['post'], parser_classes=[JSONParser])
    def approve(self, request, pk=None):
        """
        Approve receipt despite discrepancies (Finance only)
        """
        if request.user.role != 'FINANCE':
            return Response(
                {'error': 'Only Finance users can approve receipts'},
                status=status.HTTP_403_FORBIDDEN
            )

        receipt = self.get_object()
        serializer = ReceiptApprovalSerializer(data=request.data)

        if serializer.is_valid():
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

            return Response({
                'message': 'Receipt approved successfully',
                'receipt': ReceiptSerializer(receipt).data
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
