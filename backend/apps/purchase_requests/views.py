"""
Purchase Request Views.

This module handles all purchase request operations including:
- Creating and managing purchase requests
- Submitting requests for approval
- Document upload and AI processing
"""

from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.core.cache import cache
from django.db.models import Q
import tempfile
import os

from apps.purchase_requests.models import PurchaseRequest, RequestItem
from apps.approvals.models import Approval
from apps.purchase_requests.serializers import (
    PurchaseRequestSerializer,
    PurchaseRequestListSerializer,
    RequestItemSerializer,
    SubmitRequestSerializer,
)
from apps.purchase_requests.permissions import (
    CanCreatePurchaseRequest,
    IsRequesterOrReadOnly,
)
from apps.purchase_requests.filters import PurchaseRequestFilter

# Import core utilities
from core.responses import APIResponse
from core.exceptions import FileValidationError
from core.validators import FileValidator
from core.logging_utils import app_logger, log_view_action, audit_log
from core.constants import TEMP_FILE_CACHE_TIMEOUT, ErrorCode


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Purchase Requests

    Endpoints:
    - GET /api/requests/ - List requests (filtered by user role)
    - POST /api/requests/ - Create request (STAFF only)
    - GET /api/requests/{id}/ - Get request detail
    - PUT/PATCH /api/requests/{id}/ - Update request (requester only)
    - DELETE /api/requests/{id}/ - Delete request (requester only)
    - POST /api/requests/{id}/submit/ - Submit draft request
    """

    permission_classes = [IsAuthenticated, CanCreatePurchaseRequest, IsRequesterOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PurchaseRequestFilter
    search_fields = ['title', 'description', 'vendor_name']
    ordering_fields = ['created_at', 'submitted_at', 'total_amount', 'status']
    ordering = ['-created_at']

    def _get_optimized_queryset(self):
        """Return queryset with standard optimizations"""
        return PurchaseRequest.objects.select_related(
            'requester',
            'approved_l1_by',
            'approved_l2_by',
            'rejected_by',
        ).prefetch_related('items')

    def get_queryset(self):
        """
        Filter queryset based on user role:
        - STAFF: Only their own requests
        - APPROVER_L1/L2: Requests pending their approval (list) or any they've reviewed (detail)
        - FINANCE: All approved requests
        """
        user = self.request.user
        base_queryset = self._get_optimized_queryset()

        if user.role == 'STAFF':
            return base_queryset.filter(requester=user)

        elif user.role == 'APPROVER_L1':
            if self.action == 'retrieve':
                approved_request_ids = Approval.objects.filter(
                    Q(approver=user) | Q(level=Approval.Level.LEVEL_1, status=Approval.Status.PENDING)
                ).values_list('request_id', flat=True)
                return base_queryset.filter(id__in=approved_request_ids)
            return base_queryset.filter(status=PurchaseRequest.Status.PENDING)

        elif user.role == 'APPROVER_L2':
            if self.action == 'retrieve':
                approved_request_ids = Approval.objects.filter(
                    Q(approver=user) | Q(level=Approval.Level.LEVEL_2, status=Approval.Status.PENDING)
                ).values_list('request_id', flat=True)
                return base_queryset.filter(id__in=approved_request_ids)
            return base_queryset.filter(status=PurchaseRequest.Status.APPROVED_L1)

        elif user.role == 'FINANCE':
            return base_queryset.filter(status=PurchaseRequest.Status.APPROVED)

        return PurchaseRequest.objects.none()

    def get_serializer_class(self):
        """Use list serializer for list action"""
        if self.action == 'list':
            return PurchaseRequestListSerializer
        return PurchaseRequestSerializer

    def perform_create(self, serializer):
        """Set requester to current user"""
        serializer.save(requester=self.request.user)

    @log_view_action("Create Purchase Request")
    def create(self, request, *args, **kwargs):
        """Create a new purchase request"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Log the creation
        audit_log(
            action='CREATE',
            user=request.user,
            resource_type='PurchaseRequest',
            resource_id=serializer.instance.id,
            details={'title': serializer.instance.title},
            request=request
        )

        response_serializer = PurchaseRequestSerializer(serializer.instance)
        return APIResponse.created(
            data=response_serializer.data,
            message="Purchase request created successfully"
        )

    @log_view_action("Update Purchase Request")
    def update(self, request, *args, **kwargs):
        """Update purchase request (only if DRAFT)"""
        instance = self.get_object()

        # Only allow updates if request is in DRAFT status
        if instance.status != PurchaseRequest.Status.DRAFT:
            app_logger.warning(
                f"Attempted to update non-draft request {instance.id}",
                user_id=request.user.id,
                request_status=instance.status
            )
            return APIResponse.error(
                message="Only draft requests can be updated",
                code=ErrorCode.INVALID_STATUS
            )

        # Only requester can update
        if instance.requester != request.user:
            return APIResponse.forbidden(
                message="You can only update your own requests"
            )

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        audit_log(
            action='UPDATE',
            user=request.user,
            resource_type='PurchaseRequest',
            resource_id=instance.id,
            request=request
        )

        return APIResponse.success(
            data=serializer.data,
            message="Purchase request updated successfully"
        )

    @log_view_action("Delete Purchase Request")
    def destroy(self, request, *args, **kwargs):
        """Delete purchase request (only if DRAFT)"""
        instance = self.get_object()

        # Only allow deletion if request is in DRAFT status
        if instance.status != PurchaseRequest.Status.DRAFT:
            app_logger.warning(
                f"Attempted to delete non-draft request {instance.id}",
                user_id=request.user.id,
                request_status=instance.status
            )
            return APIResponse.error(
                message="Only draft requests can be deleted",
                code=ErrorCode.INVALID_STATUS
            )

        # Only requester can delete
        if instance.requester != request.user:
            return APIResponse.forbidden(
                message="You can only delete your own requests"
            )

        request_id = instance.id
        instance.delete()

        audit_log(
            action='DELETE',
            user=request.user,
            resource_type='PurchaseRequest',
            resource_id=request_id,
            request=request
        )

        return APIResponse.no_content()

    @action(detail=True, methods=['post'])
    @log_view_action("Submit Purchase Request")
    def submit(self, request, pk=None):
        """
        Submit a draft request for approval

        Changes status from DRAFT -> PENDING
        """
        instance = self.get_object()

        # Only requester can submit
        if instance.requester != request.user:
            return APIResponse.forbidden(
                message="You can only submit your own requests"
            )

        serializer = SubmitRequestSerializer(
            data={},
            context={'request_obj': instance}
        )
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()

        audit_log(
            action='SUBMIT',
            user=request.user,
            resource_type='PurchaseRequest',
            resource_id=instance.id,
            details={'new_status': updated_instance.status},
            request=request
        )

        response_serializer = PurchaseRequestSerializer(updated_instance)
        return APIResponse.success(
            data=response_serializer.data,
            message="Purchase request submitted for approval"
        )

    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get current user's requests with pagination"""
        queryset = self._get_optimized_queryset().filter(requester=request.user)
        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = PurchaseRequestListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = PurchaseRequestListSerializer(queryset, many=True)
        return APIResponse.success(data=serializer.data)

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Get items for a specific request"""
        instance = self.get_object()
        items = instance.items.all()
        serializer = RequestItemSerializer(items, many=True)
        return APIResponse.success(data=serializer.data)

    @action(
        detail=True,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser]
    )
    @log_view_action("Upload Document")
    def upload_document(self, request, pk=None):
        """
        Upload invoice/receipt document to request

        Accepts: multipart/form-data with 'document' file field
        Returns: URL of uploaded document
        """
        instance = self.get_object()

        # Only requester can upload
        if instance.requester != request.user:
            return APIResponse.forbidden(
                message="You can only upload documents to your own requests"
            )

        # Only allow upload for draft requests
        if instance.status != PurchaseRequest.Status.DRAFT:
            return APIResponse.error(
                message="Documents can only be uploaded to draft requests",
                code=ErrorCode.INVALID_STATUS
            )

        # Get file from request
        document_file = request.FILES.get('document')
        if not document_file:
            return APIResponse.validation_error(
                errors={'document': ['No document file provided']},
                message="No document file provided"
            )

        # Validate file using centralized validator
        try:
            FileValidator.validate(document_file)
        except FileValidationError as e:
            return APIResponse.validation_error(
                errors={'document': [e.message]},
                message=e.message
            )

        # Store file temporarily for AI processing
        document_file.seek(0)
        file_content = document_file.read()
        file_name = document_file.name

        temp_fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file_name)[1])
        try:
            with os.fdopen(temp_fd, 'wb') as temp_file:
                temp_file.write(file_content)

            # Save file to Cloudinary
            document_file.seek(0)
            instance.document_file = document_file
            instance.save()

            # Cache temp file path for AI processing with timestamp for cleanup
            cache_key = f'upload_file_{instance.id}'
            cache.set(cache_key, {
                'temp_path': temp_path,
                'name': file_name,
                'created_at': os.path.getmtime(temp_path)
            }, timeout=TEMP_FILE_CACHE_TIMEOUT)

            app_logger.info(
                f"Document uploaded for request {instance.id}, temp file cached",
                user_id=request.user.id,
                file_name=file_name,
                temp_path=temp_path
            )

        except Exception as e:
            # Clean up temp file on error
            try:
                os.unlink(temp_path)
            except Exception as cleanup_error:
                app_logger.warning(
                    f"Failed to cleanup temp file {temp_path}: {cleanup_error}",
                    user_id=request.user.id
                )
            app_logger.error(
                f"Failed to upload document for request {instance.id}: {e}",
                exc_info=True,
                user_id=request.user.id
            )
            raise

        return APIResponse.success(
            message="Document uploaded successfully",
            document_url=instance.document_file.url if instance.document_file else None
        )

    @action(detail=True, methods=['post'])
    @log_view_action("Process Document with AI")
    def process_document(self, request, pk=None):
        """
        Process uploaded document with AI to extract invoice data

        Returns extracted data: vendor_name, items, total_amount, etc.
        """
        instance = self.get_object()

        # Only requester can process
        if instance.requester != request.user:
            return APIResponse.forbidden(
                message="You can only process documents for your own requests"
            )

        # Ensure document is uploaded
        if not instance.document_file:
            return APIResponse.error(
                message="No document uploaded. Please upload a document first.",
                code=ErrorCode.VALIDATION_ERROR
            )

        try:
            cache_key = f'upload_file_{instance.id}'
            cached_file = cache.get(cache_key)

            from utils.ai_processor import get_document_processor
            processor = get_document_processor()

            if cached_file and cached_file.get('temp_path'):
                temp_path = cached_file['temp_path']
                app_logger.info(
                    f"Using temporary file for AI processing: {temp_path}",
                    request_id=instance.id
                )

                try:
                    with open(temp_path, 'rb') as temp_file:
                        file_content = temp_file.read()

                    extracted_data = processor.process_document_from_bytes(
                        file_content,
                        cached_file['name']
                    )
                finally:
                    # Clean up temp file
                    try:
                        os.unlink(temp_path)
                    except Exception as cleanup_error:
                        app_logger.warning(
                            f"Could not delete temp file {temp_path}: {cleanup_error}"
                        )
                    cache.delete(cache_key)
            else:
                app_logger.info(
                    "No cached temp file, downloading from Cloudinary",
                    request_id=instance.id
                )
                extracted_data = processor.process_document_from_file(instance.document_file)
                cache.delete(cache_key)

            # Save extracted data
            instance.extracted_data = extracted_data
            instance.document_processed = extracted_data.get('success', False)
            instance.save()

            # Check if document validation failed (invalid document type)
            is_invalid_document = extracted_data.get('is_valid_document') is False

            audit_log(
                action='PROCESS_DOCUMENT',
                user=request.user,
                resource_type='PurchaseRequest',
                resource_id=instance.id,
                details={
                    'success': instance.document_processed,
                    'is_valid_document': not is_invalid_document,
                    'document_type': extracted_data.get('document_type')
                },
                request=request
            )

            # Return appropriate message based on result
            if instance.document_processed:
                message = 'Document processed successfully'
            elif is_invalid_document:
                # Use user-friendly message for invalid document types
                message = extracted_data.get('user_message', 'Invalid document type. Please upload a valid proforma invoice, receipt, or quotation.')
            else:
                message = 'Document processing completed with issues'

            return APIResponse.success(
                message=message,
                extracted_data=extracted_data,
                document_processed=instance.document_processed
            )

        except Exception as e:
            app_logger.error(
                f"Error processing document for request {instance.id}: {e}",
                exc_info=True,
                user_id=request.user.id
            )
            return APIResponse.server_error(
                message=f"Error processing document: {str(e)}"
            )
