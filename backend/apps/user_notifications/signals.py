from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.purchase_requests.models import PurchaseRequest
from apps.approvals.models import Approval
from apps.purchase_orders.models import PurchaseOrder
from apps.receipts.models import Receipt
from apps.user_notifications.models import Notification
from apps.users.models import User
from apps.user_notifications.email_utils import (
    send_approval_email,
    send_rejection_email,
    send_po_generated_email,
    send_receipt_uploaded_email
)


def create_notification(user, notification_type, title, message, **kwargs):
    """Helper function to create a notification"""
    Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        **kwargs
    )


@receiver(post_save, sender=PurchaseRequest)
def notify_on_request_submitted(sender, instance, created, **kwargs):
    """Notify approvers when a request is submitted"""
    if not created:
        # Check if status changed to PENDING
        if instance.status == PurchaseRequest.Status.PENDING:
            # Check if we've already notified L1 approvers for this request
            # to avoid duplicate notifications on repeated saves
            if Notification.objects.filter(
                notification_type=Notification.NotificationType.PENDING_APPROVAL_L1,
                request=instance
            ).exists():
                return  # Already notified, skip

            # Notify L1 approvers
            l1_approvers = User.objects.filter(role='APPROVER_L1')
            for approver in l1_approvers:
                create_notification(
                    user=approver,
                    notification_type=Notification.NotificationType.PENDING_APPROVAL_L1,
                    title=f'New Request Pending Approval',
                    message=f'Purchase request PR-{instance.id} from {instance.requester.get_full_name() or instance.requester.username} requires your Level 1 approval',
                    link=f'/approver/requests/{instance.id}',
                    request=instance
                )


@receiver(post_save, sender=Approval)
def notify_on_approval_status_change(sender, instance, created, **kwargs):
    """Notify requester when their request is approved or rejected"""
    
    if instance.status == Approval.Status.PENDING:
        return

    request = instance.request
    requester = request.requester

    # Notify requester about approval/rejection
    if instance.status == Approval.Status.APPROVED:
        if instance.level == 1:
            # L1 Approved
            approver_name = instance.approver.get_full_name() or instance.approver.username
            create_notification(
                user=requester,
                notification_type=Notification.NotificationType.REQUEST_APPROVED_L1,
                title='Request Approved (Level 1)',
                message=f'Your request PR-{request.id} has been approved by {approver_name}',
                link=f'/staff/requests/{request.id}',
                request=request
            )

            # Send email to requester
            send_approval_email(requester, request.id, 1, approver_name)

            # Notify L2 approvers
            l2_approvers = User.objects.filter(role='APPROVER_L2')
            for approver in l2_approvers:
                create_notification(
                    user=approver,
                    notification_type=Notification.NotificationType.PENDING_APPROVAL_L2,
                    title='Request Pending Level 2 Approval',
                    message=f'Purchase request PR-{request.id} from {request.requester.get_full_name() or request.requester.username} requires your Level 2 approval',
                    link=f'/approver/requests/{request.id}',
                    request=request
                )

        elif instance.level == 2:
            # L2 Approved (final approval)
            approver_name = instance.approver.get_full_name() or instance.approver.username
            create_notification(
                user=requester,
                notification_type=Notification.NotificationType.REQUEST_APPROVED,
                title='Request Fully Approved!',
                message=f'Your request PR-{request.id} has been fully approved. Purchase Order will be generated shortly.',
                link=f'/staff/requests/{request.id}',
                request=request
            )

            # Send email to requester
            send_approval_email(requester, request.id, 2, approver_name)

    elif instance.status == Approval.Status.REJECTED:
        # Request rejected at any level
        rejection_reason = instance.comments or 'No reason provided'
        level_text = f'Level {instance.level}' if instance.level else 'approval'
        approver_name = instance.approver.get_full_name() or instance.approver.username
        create_notification(
            user=requester,
            notification_type=Notification.NotificationType.REQUEST_REJECTED,
            title=f'Request Rejected at {level_text}',
            message=f'Your request PR-{request.id} was rejected by {approver_name} at {level_text}. Reason: {rejection_reason}',
            link=f'/staff/requests/{request.id}',
            request=request
        )

        # Send email to requester
        send_rejection_email(requester, request.id, instance.level, approver_name, rejection_reason)


@receiver(post_save, sender=PurchaseOrder)
def notify_on_po_generated(sender, instance, created, **kwargs):
    """Notify requester and finance when PO is generated"""
    if created:
        # Notify requester
        create_notification(
            user=instance.request.requester,
            notification_type=Notification.NotificationType.PO_GENERATED,
            title='Purchase Order Generated',
            message=f'Purchase Order {instance.po_number} has been generated for your request PR-{instance.request.id}',
            link=f'/staff/purchase-orders/{instance.id}',
            purchase_order=instance,
            request=instance.request
        )

        # Send email to requester
        send_po_generated_email(
            instance.request.requester,
            instance.request.id,
            instance.po_number,
            role='STAFF'
        )

        # Notify finance users
        finance_users = User.objects.filter(role='FINANCE')
        for finance_user in finance_users:
            create_notification(
                user=finance_user,
                notification_type=Notification.NotificationType.PO_GENERATED,
                title='New Purchase Order Generated',
                message=f'Purchase Order {instance.po_number} has been generated',
                link=f'/finance/purchase-orders/{instance.id}',
                purchase_order=instance
            )

            # Send email to finance user
            send_po_generated_email(
                finance_user,
                instance.request.id,
                instance.po_number,
                role='FINANCE'
            )


@receiver(post_save, sender=Receipt)
def notify_on_receipt_uploaded(sender, instance, created, **kwargs):
    """Notify finance when a receipt is uploaded"""
    if created:
        # Notify finance users
        finance_users = User.objects.filter(role='FINANCE')
        po_number = instance.purchase_order.po_number if instance.purchase_order else 'Unknown'
        uploader_name = instance.uploaded_by.get_full_name() or instance.uploaded_by.username

        for finance_user in finance_users:
            create_notification(
                user=finance_user,
                notification_type=Notification.NotificationType.RECEIPT_UPLOADED,
                title='New Receipt Uploaded',
                message=f'A receipt has been uploaded for PO {po_number} by {uploader_name}',
                link=f'/finance/receipts/{instance.id}/validate',
                receipt=instance,
                purchase_order=instance.purchase_order
            )

            # Send email to finance user
            send_receipt_uploaded_email(finance_user, po_number, uploader_name)
