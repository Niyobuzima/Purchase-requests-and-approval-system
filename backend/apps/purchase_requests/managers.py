"""
Custom model managers for PurchaseRequest.

"""

from django.db import models


class PurchaseRequestManager(models.Manager):
    """
    Custom manager for PurchaseRequest model.

    Provides methods for commonly needed queryset optimizations.

    Usage:
        # In model
        class PurchaseRequest(models.Model):
            objects = PurchaseRequestManager()

        # In views
        PurchaseRequest.objects.with_relations()
        PurchaseRequest.objects.with_items()
        PurchaseRequest.objects.optimized()
    """

    def with_relations(self):
        """
        Return queryset with all related user objects prefetched.

        Eliminates N+1 queries when accessing:
        - requester
        - approved_l1_by
        - approved_l2_by
        - rejected_by
        """
        return self.select_related(
            'requester',
            'approved_l1_by',
            'approved_l2_by',
            'rejected_by',
        )

    def with_items(self):
        """
        Return queryset with items prefetched.
        """
        return self.prefetch_related('items')

    def optimized(self):
        """
        Return fully optimized queryset with all relations and items.

        Use this for list views and detail views where you need
        complete request data.
        """
        return self.with_relations().prefetch_related('items')

    def for_user(self, user):
        """
        Return queryset filtered by user role.

        Args:
            user: User instance

        Returns:
            Filtered queryset based on user's role
        """
        from core.constants import UserRole

        if user.role == UserRole.STAFF:
            return self.filter(requester=user)
        elif user.role in [UserRole.APPROVER_L1, UserRole.APPROVER_L2]:
            # Approvers can see requests pending their approval level
            return self.all()
        elif user.role in [UserRole.FINANCE, UserRole.ADMIN]:
            # Finance and Admin can see all
            return self.all()
        else:
            # Default to own requests only
            return self.filter(requester=user)

    def pending_approval(self, level='L1'):
        """
        Return requests pending approval at specified level.

        Args:
            level: 'L1' or 'L2'

        Returns:
            Queryset of pending requests
        """
        status = 'PENDING_L1' if level == 'L1' else 'PENDING_L2'
        return self.filter(status=status)

    def active(self):
        """
        Return requests that are not in a final state.
        """
        return self.exclude(status__in=['APPROVED', 'REJECTED', 'REJECTED_L1', 'REJECTED_L2'])

    def recent(self, days=30):
        """
        Return requests from the last N days.
        """
        from datetime import datetime, timedelta
        cutoff = datetime.now() - timedelta(days=days)
        return self.filter(created_at__gte=cutoff)


class PurchaseRequestItemManager(models.Manager):
    """
    Custom manager for PurchaseRequestItem model.
    """

    def for_request(self, request_id):
        """Get all items for a specific request"""
        return self.filter(request_id=request_id)

    def total_for_request(self, request_id):
        """Calculate total amount for a request"""
        from django.db.models import Sum, F
        return self.filter(request_id=request_id).aggregate(
            total=Sum(F('quantity') * F('unit_price'))
        )['total'] or 0
