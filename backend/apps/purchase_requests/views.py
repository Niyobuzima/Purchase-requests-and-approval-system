from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.core.cache import cache
import tempfile
import os
from apps.purchase_requests.models import PurchaseRequest, RequestItem
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

    def get_queryset(self):
        """
        Filter queryset based on user role:
        - STAFF: Only their own requests
        - APPROVER_L1/L2: Requests pending their approval
        - FINANCE: All approved requests
        """
        user = self.request.user

        if user.role == 'STAFF':
            # Staff can only see their own requests
            return PurchaseRequest.objects.filter(requester=user).select_related(
                'requester',
                'approved_l1_by',
                'approved_l2_by',
                'rejected_by',
            ).prefetch_related('items')

        elif user.role == 'APPROVER_L1':
            # L1 Approvers see pending requests
            return PurchaseRequest.objects.filter(
                status=PurchaseRequest.Status.PENDING
            ).select_related(
                'requester',
                'approved_l1_by',
                'approved_l2_by',
                'rejected_by',
            ).prefetch_related('items')

        elif user.role == 'APPROVER_L2':
            # L2 Approvers see L1-approved requests
            return PurchaseRequest.objects.filter(
                status=PurchaseRequest.Status.APPROVED_L1
            ).select_related(
                'requester',
                'approved_l1_by',
                'approved_l2_by',
                'rejected_by',
            ).prefetch_related('items')

        elif user.role == 'FINANCE':
            # Finance sees all approved requests
            return PurchaseRequest.objects.filter(
                status=PurchaseRequest.Status.APPROVED
            ).select_related(
                'requester',
                'approved_l1_by',
                'approved_l2_by',
                'rejected_by',
            ).prefetch_related('items')

        # Default: no access
        return PurchaseRequest.objects.none()

    def get_serializer_class(self):
        """Use list serializer for list action"""
        if self.action == 'list':
            return PurchaseRequestListSerializer
        return PurchaseRequestSerializer

    def perform_create(self, serializer):
        """Set requester to current user"""
        serializer.save(requester=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a new purchase request"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return full serialized data
        response_serializer = PurchaseRequestSerializer(serializer.instance)
        headers = self.get_success_headers(response_serializer.data)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        """Update purchase request (only if DRAFT)"""
        instance = self.get_object()

        # Only allow updates if request is in DRAFT status
        if instance.status != PurchaseRequest.Status.DRAFT:
            return Response(
                {'error': 'Only draft requests can be updated.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only requester can update
        if instance.requester != request.user:
            return Response(
                {'error': 'You can only update your own requests.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete purchase request (only if DRAFT)"""
        instance = self.get_object()

        # Only allow deletion if request is in DRAFT status
        if instance.status != PurchaseRequest.Status.DRAFT:
            return Response(
                {'error': 'Only draft requests can be deleted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only requester can delete
        if instance.requester != request.user:
            return Response(
                {'error': 'You can only delete your own requests.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit a draft request for approval

        Changes status from DRAFT -> PENDING
        """
        instance = self.get_object()

        # Only requester can submit
        if instance.requester != request.user:
            return Response(
                {'error': 'You can only submit your own requests.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SubmitRequestSerializer(
            data={},
            context={'request_obj': instance}
        )
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()

        # Return full request data
        response_serializer = PurchaseRequestSerializer(updated_instance)
        return Response(response_serializer.data)

    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get current user's requests"""
        queryset = PurchaseRequest.objects.filter(
            requester=request.user
        ).select_related(
            'requester',
            'approved_l1_by',
            'approved_l2_by',
            'rejected_by',
        ).prefetch_related('items')

        # Apply filters
        queryset = self.filter_queryset(queryset)

        # Use list serializer explicitly
        serializer = PurchaseRequestListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Get items for a specific request"""
        instance = self.get_object()
        items = instance.items.all()
        serializer = RequestItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser]
    )
    def upload_document(self, request, pk=None):
        """
        Upload invoice/receipt document to request

        Accepts: multipart/form-data with 'document' file field
        Returns: URL of uploaded document
        """
        instance = self.get_object()

        # Only requester can upload
        if instance.requester != request.user:
            return Response(
                {'error': 'You can only upload documents to your own requests.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Only allow upload for draft requests
        if instance.status != PurchaseRequest.Status.DRAFT:
            return Response(
                {'error': 'Documents can only be uploaded to draft requests.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get file from request
        document_file = request.FILES.get('document')
        if not document_file:
            return Response(
                {'error': 'No document file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if document_file.size > max_size:
            return Response(
                {'error': 'File size exceeds 10MB limit.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        allowed_types = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png'
        ]
        if document_file.content_type not in allowed_types:
            return Response(
                {'error': 'Only PDF and image files (JPG, PNG) are allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Store file temporarily for AI processing (before/during Cloudinary upload)
        # Write to a temporary file instead of caching in memory
        document_file.seek(0)
        file_content = document_file.read()
        file_name = document_file.name
        
        # Create temporary file
        temp_fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file_name)[1])
        try:
            # Write content to temp file
            with os.fdopen(temp_fd, 'wb') as temp_file:
                temp_file.write(file_content)
            
            # Save file to Cloudinary (for storage/reference)
            document_file.seek(0)
            instance.document_file = document_file
            instance.save()
            
            # Cache only the temp file path (very small) for 5 minutes
            cache_key = f'upload_file_{instance.id}'
            cache.set(cache_key, {
                'temp_path': temp_path,
                'name': file_name
            }, timeout=300)  # 5 minutes
        except Exception as e:
            # Clean up temp file if something goes wrong
            try:
                os.unlink(temp_path)
            except:
                pass
            raise e

        return Response({
            'message': 'Document uploaded successfully.',
            'document_url': instance.document_file.url if instance.document_file else None,
        })

    @action(detail=True, methods=['post'])
    def process_document(self, request, pk=None):
        """
        Process uploaded document with AI to extract invoice data

        Returns extracted data: vendor_name, items, total_amount, etc.
        """
        instance = self.get_object()

        # Only requester can process
        if instance.requester != request.user:
            return Response(
                {'error': 'You can only process documents for your own requests.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Ensure document is uploaded
        if not instance.document_file:
            return Response(
                {'error': 'No document uploaded. Please upload a document first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Try to get cached temp file path first (uploaded within last 5 minutes)
            cache_key = f'upload_file_{instance.id}'
            cached_file = cache.get(cache_key)

            from utils.ai_processor import get_document_processor
            processor = get_document_processor()

            if cached_file and cached_file.get('temp_path'):
                # Use temporary file (bypasses Cloudinary download)
                temp_path = cached_file['temp_path']
                print(f"Using temporary file for AI processing: {temp_path}")
                
                try:
                    # Read from temp file
                    with open(temp_path, 'rb') as temp_file:
                        file_content = temp_file.read()
                    
                    extracted_data = processor.process_document_from_bytes(
                        file_content,
                        cached_file['name']
                    )
                finally:
                    # Clean up: delete temp file and cache entry
                    try:
                        os.unlink(temp_path)
                    except Exception as cleanup_error:
                        print(f"Warning: Could not delete temp file {temp_path}: {cleanup_error}")
                    cache.delete(cache_key)
            else:
                # Fallback: download from Cloudinary
                print("No cached temp file, attempting to download from Cloudinary")
                extracted_data = processor.process_document_from_file(instance.document_file)
                cache.delete(cache_key)

            # Save extracted data
            instance.extracted_data = extracted_data
            instance.document_processed = extracted_data.get('success', False)
            instance.save()

            return Response({
                'message': 'Document processed successfully.' if instance.document_processed else 'Document processing failed.',
                'extracted_data': extracted_data,
                'document_processed': instance.document_processed,
            })

        except Exception as e:
            return Response(
                {'error': f'Error processing document: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
