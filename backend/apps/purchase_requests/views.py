from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
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
    filterset_fields = ['status', 'requester']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'submitted_at', 'total_amount']
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
                status__in=[
                    PurchaseRequest.Status.APPROVED,
                    PurchaseRequest.Status.COMPLETED,
                ]
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
