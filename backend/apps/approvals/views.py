"""
Approval Views.

This module handles approval workflow operations including:
- Viewing pending approvals
- Approving/rejecting requests
- Approval statistics
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Sum, Count, Q, Case, When, IntegerField
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.approvals.models import Approval
from apps.approvals.serializers import ApprovalSerializer, ApprovalActionSerializer
from apps.approvals.permissions import IsApprover
from apps.purchase_requests.models import PurchaseRequest

# Import core utilities
from core.responses import APIResponse
from core.logging_utils import app_logger, log_view_action, audit_log
from core.constants import ErrorCode


@extend_schema(tags=['Approvals'])
@extend_schema_view(
    list=extend_schema(description='List pending approvals for current user'),
    retrieve=extend_schema(description='Get approval details'),
)
class ApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing approvals"""

    serializer_class = ApprovalSerializer
    permission_classes = [IsAuthenticated, IsApprover]

    def get_queryset(self):
        """
        Return approvals based on user's role:
        - L1 Approver: Only L1 pending approvals
        - L2 Approver: Only L2 pending approvals
        - When filtered by request ID: Return ALL approvals for that request (for timeline view)
        """
        user = self.request.user
        request_id = self.request.query_params.get('request', None)

        if request_id is not None:
            return Approval.objects.filter(
                request_id=request_id
            ).select_related('request', 'request__requester', 'approver').order_by('level')

        # Filter by user role for pending approvals
        if user.role == 'APPROVER_L1':
            return Approval.objects.filter(
                level=Approval.Level.LEVEL_1,
                status=Approval.Status.PENDING
            ).select_related('request', 'request__requester', 'approver')

        elif user.role == 'APPROVER_L2':
            return Approval.objects.filter(
                level=Approval.Level.LEVEL_2,
                status=Approval.Status.PENDING
            ).select_related('request', 'request__requester', 'approver')

        return Approval.objects.none()

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending approvals for the current user's level (paginated)"""
        queryset = self.get_queryset()

        # Use pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(data=serializer.data)

    @action(detail=True, methods=['post'])
    @log_view_action("Approve Request")
    def approve(self, request, pk=None):
        """
        Approve an approval request.
        Uses select_for_update to prevent concurrent approvals.
        """
        try:
            with transaction.atomic():
                # Lock the approval record for update
                approval = Approval.objects.select_for_update().get(pk=pk)

                # Validate approval is pending
                if approval.status != Approval.Status.PENDING:
                    app_logger.warning(
                        f"Attempted to approve already processed approval {pk}",
                        user_id=request.user.id,
                        approval_status=approval.status
                    )
                    return APIResponse.error(
                        message="This approval has already been processed",
                        code=ErrorCode.ALREADY_PROCESSED
                    )

                # Validate user can approve this level
                user = request.user
                if user.role == 'APPROVER_L1' and approval.level != Approval.Level.LEVEL_1:
                    return APIResponse.forbidden(
                        message="You can only approve Level 1 requests"
                    )
                if user.role == 'APPROVER_L2' and approval.level != Approval.Level.LEVEL_2:
                    return APIResponse.forbidden(
                        message="You can only approve Level 2 requests"
                    )

                # Additional validation for L2: ensure L1 is approved
                if approval.level == Approval.Level.LEVEL_2:
                    purchase_request = approval.request
                    if purchase_request.status != PurchaseRequest.Status.APPROVED_L1:
                        return APIResponse.error(
                            message="Level 1 approval must be completed first",
                            code=ErrorCode.INVALID_STATUS
                        )

                # Approve the approval
                approval.approve(user)

                # Audit log
                audit_log(
                    action='APPROVE',
                    user=user,
                    resource_type='Approval',
                    resource_id=approval.id,
                    details={
                        'request_id': approval.request_id,
                        'level': approval.level,
                    },
                    request=request
                )

                app_logger.info(
                    f"Approval {pk} approved by user {user.id}",
                    approval_id=pk,
                    request_id=approval.request_id,
                    level=approval.level
                )

                serializer = self.get_serializer(approval)
                return APIResponse.success(
                    data=serializer.data,
                    message=f"Request approved at Level {approval.level}"
                )

        except Approval.DoesNotExist:
            return APIResponse.not_found(
                resource_type="Approval",
                resource_id=pk
            )
        except Exception as e:
            app_logger.error(
                f"Error approving approval {pk}: {e}",
                exc_info=True,
                user_id=request.user.id
            )
            return APIResponse.server_error(
                message=f"Error processing approval: {str(e)}"
            )

    @action(detail=True, methods=['post'])
    @log_view_action("Reject Request")
    def reject(self, request, pk=None):
        """
        Reject an approval request.
        Requires comments explaining the rejection.
        """
        try:
            serializer = ApprovalActionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            comments = serializer.validated_data.get('comments', '')
            if not comments:
                return APIResponse.validation_error(
                    errors={'comments': ['Comments are required for rejection']},
                    message="Comments are required for rejection"
                )

            with transaction.atomic():
                # Lock the approval record for update
                approval = Approval.objects.select_for_update().get(pk=pk)

                # Validate approval is pending
                if approval.status != Approval.Status.PENDING:
                    app_logger.warning(
                        f"Attempted to reject already processed approval {pk}",
                        user_id=request.user.id,
                        approval_status=approval.status
                    )
                    return APIResponse.error(
                        message="This approval has already been processed",
                        code=ErrorCode.ALREADY_PROCESSED
                    )

                # Validate user can reject this level
                user = request.user
                if user.role == 'APPROVER_L1' and approval.level != Approval.Level.LEVEL_1:
                    return APIResponse.forbidden(
                        message="You can only reject Level 1 requests"
                    )
                if user.role == 'APPROVER_L2' and approval.level != Approval.Level.LEVEL_2:
                    return APIResponse.forbidden(
                        message="You can only reject Level 2 requests"
                    )

                # Reject the approval
                approval.reject(user, comments)

                # Audit log
                audit_log(
                    action='REJECT',
                    user=user,
                    resource_type='Approval',
                    resource_id=approval.id,
                    details={
                        'request_id': approval.request_id,
                        'level': approval.level,
                        'comments': comments,
                    },
                    request=request
                )

                app_logger.info(
                    f"Approval {pk} rejected by user {user.id}",
                    approval_id=pk,
                    request_id=approval.request_id,
                    level=approval.level
                )

                serializer = self.get_serializer(approval)
                return APIResponse.success(
                    data=serializer.data,
                    message="Request rejected"
                )

        except Approval.DoesNotExist:
            return APIResponse.not_found(
                resource_type="Approval",
                resource_id=pk
            )
        except Exception as e:
            app_logger.error(
                f"Error rejecting approval {pk}: {e}",
                exc_info=True,
                user_id=request.user.id
            )
            return APIResponse.server_error(
                message=f"Error processing rejection: {str(e)}"
            )

    @action(detail=False, methods=['get'])
    def my_approvals(self, request):
        """Get all approvals processed by the current user (paginated)"""
        approvals = Approval.objects.filter(
            approver=request.user
        ).select_related('request', 'request__requester').order_by('-updated_at')

        # Use pagination
        page = self.paginate_queryset(approvals)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(approvals, many=True)
        return APIResponse.success(data=serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get approval statistics for the current approver.
        Optimized: Uses 2 queries instead of 5 (pending stats + user stats).
        """
        user = request.user
        level = Approval.Level.LEVEL_1 if user.role == 'APPROVER_L1' else Approval.Level.LEVEL_2
        today = timezone.now().date()

        # Query 1: Pending approvals for this level (count + amount)
        pending_stats = Approval.objects.filter(
            level=level,
            status=Approval.Status.PENDING
        ).aggregate(
            pending_count=Count('id'),
            pending_amount=Sum('request__total_amount')
        )

        # Query 2: User's approval stats (approved, rejected, today's processed)
        user_stats = Approval.objects.filter(approver=user).aggregate(
            my_approved=Count('id', filter=Q(status=Approval.Status.APPROVED)),
            my_rejected=Count('id', filter=Q(status=Approval.Status.REJECTED)),
            today_processed=Count('id', filter=Q(processed_at__date=today))
        )

        return APIResponse.success(data={
            'pending_count': pending_stats['pending_count'] or 0,
            'pending_amount': float(pending_stats['pending_amount'] or 0),
            'my_approved': user_stats['my_approved'] or 0,
            'my_rejected': user_stats['my_rejected'] or 0,
            'today_processed': user_stats['today_processed'] or 0,
            'level': level,
            'level_display': 'Level 1' if level == 1 else 'Level 2',
        })
