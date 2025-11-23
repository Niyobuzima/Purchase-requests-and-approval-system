from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from apps.approvals.models import Approval
from apps.approvals.serializers import ApprovalSerializer, ApprovalActionSerializer
from apps.approvals.permissions import IsApprover, IsApproverL1, IsApproverL2
from apps.purchase_requests.models import PurchaseRequest


class ApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing approvals"""

    serializer_class = ApprovalSerializer
    permission_classes = [IsAuthenticated, IsApprover]

    def get_queryset(self):
        """
        Return approvals based on user's role:
        - L1 Approver: Only L1 pending approvals
        - L2 Approver: Only L2 pending approvals
        - Can be filtered by request ID via query params
        """
        user = self.request.user
        queryset = Approval.objects.none()

        if user.role == 'APPROVER_L1':
            queryset = Approval.objects.filter(
                level=Approval.Level.LEVEL_1,
                status=Approval.Status.PENDING
            ).select_related('request', 'request__requester', 'approver')

        elif user.role == 'APPROVER_L2':
            queryset = Approval.objects.filter(
                level=Approval.Level.LEVEL_2,
                status=Approval.Status.PENDING
            ).select_related('request', 'request__requester', 'approver')

        # Filter by request ID if provided
        request_id = self.request.query_params.get('request', None)
        if request_id is not None:
            queryset = queryset.filter(request_id=request_id)

        return queryset

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending approvals for the current user's level"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve an approval request
        Uses select_for_update to prevent concurrent approvals
        """
        try:
            with transaction.atomic():
                # Lock the approval record for update
                approval = Approval.objects.select_for_update().get(pk=pk)

                # Validate approval is pending
                if approval.status != Approval.Status.PENDING:
                    return Response(
                        {'error': 'This approval has already been processed'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Validate user can approve this level
                user = request.user
                if user.role == 'APPROVER_L1' and approval.level != Approval.Level.LEVEL_1:
                    return Response(
                        {'error': 'You can only approve Level 1 requests'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                if user.role == 'APPROVER_L2' and approval.level != Approval.Level.LEVEL_2:
                    return Response(
                        {'error': 'You can only approve Level 2 requests'},
                        status=status.HTTP_403_FORBIDDEN
                    )

                # Additional validation for L2: ensure L1 is approved
                if approval.level == Approval.Level.LEVEL_2:
                    purchase_request = approval.request
                    if purchase_request.status != PurchaseRequest.Status.APPROVED_L1:
                        return Response(
                            {'error': 'Level 1 approval must be completed first'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                # Approve the approval
                approval.approve(user)

                serializer = self.get_serializer(approval)
                return Response(serializer.data)

        except Approval.DoesNotExist:
            return Response(
                {'error': 'Approval not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject an approval request
        Requires comments explaining the rejection
        """
        try:
            serializer = ApprovalActionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            comments = serializer.validated_data.get('comments', '')
            if not comments:
                return Response(
                    {'error': 'Comments are required for rejection'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                # Lock the approval record for update
                approval = Approval.objects.select_for_update().get(pk=pk)

                # Validate approval is pending
                if approval.status != Approval.Status.PENDING:
                    return Response(
                        {'error': 'This approval has already been processed'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Validate user can reject this level
                user = request.user
                if user.role == 'APPROVER_L1' and approval.level != Approval.Level.LEVEL_1:
                    return Response(
                        {'error': 'You can only reject Level 1 requests'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                if user.role == 'APPROVER_L2' and approval.level != Approval.Level.LEVEL_2:
                    return Response(
                        {'error': 'You can only reject Level 2 requests'},
                        status=status.HTTP_403_FORBIDDEN
                    )

                # Reject the approval
                approval.reject(user, comments)

                serializer = self.get_serializer(approval)
                return Response(serializer.data)

        except Approval.DoesNotExist:
            return Response(
                {'error': 'Approval not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def my_approvals(self, request):
        """Get all approvals processed by the current user"""
        approvals = Approval.objects.filter(
            approver=request.user
        ).select_related('request', 'request__requester').order_by('-updated_at')

        serializer = self.get_serializer(approvals, many=True)
        return Response(serializer.data)
