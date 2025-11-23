from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from apps.approvals.models import Approval
from apps.purchase_requests.models import PurchaseRequest


@receiver(post_save, sender=Approval)
def handle_approval_status_change(sender, instance, created, **kwargs):
    """
    Handle approval status changes:
    - When L1 is approved, create L2 approval and update request status
    - When L2 is approved, update request to APPROVED
    - When any level is rejected, update request to REJECTED
    """
    if created:
        return  # Don't process newly created approvals

    request = instance.request

    if instance.status == Approval.Status.APPROVED:
        if instance.level == Approval.Level.LEVEL_1:
            # L1 approved - update request status and create L2 approval
            request.status = PurchaseRequest.Status.APPROVED_L1
            request.approved_l1_by = instance.approver
            request.approved_l1_at = instance.processed_at
            request.save()

            # Create L2 approval if it doesn't exist
            Approval.objects.get_or_create(
                request=request,
                level=Approval.Level.LEVEL_2,
                defaults={
                    'status': Approval.Status.PENDING,
                }
            )

        elif instance.level == Approval.Level.LEVEL_2:
            # L2 approved - fully approve the request
            request.status = PurchaseRequest.Status.APPROVED
            request.approved_l2_by = instance.approver
            request.approved_l2_at = instance.processed_at
            request.save()

    elif instance.status == Approval.Status.REJECTED:
        # Rejected - update request status
        request.status = PurchaseRequest.Status.REJECTED
        request.rejected_by = instance.approver
        request.rejected_at = instance.processed_at
        request.rejection_reason = instance.comments
        request.save()
