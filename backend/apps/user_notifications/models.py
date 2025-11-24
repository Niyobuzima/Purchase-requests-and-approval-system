from django.db import models
from django.conf import settings
from django.utils import timezone


class Notification(models.Model):
    """
    Notification model to inform users about system events
    """

    class NotificationType(models.TextChoices):
        REQUEST_SUBMITTED = 'REQUEST_SUBMITTED', 'Request Submitted'
        REQUEST_APPROVED_L1 = 'REQUEST_APPROVED_L1', 'Request Approved (Level 1)'
        REQUEST_APPROVED_L2 = 'REQUEST_APPROVED_L2', 'Request Approved (Level 2)'
        REQUEST_APPROVED = 'REQUEST_APPROVED', 'Request Fully Approved'
        REQUEST_REJECTED = 'REQUEST_REJECTED', 'Request Rejected'
        PO_GENERATED = 'PO_GENERATED', 'Purchase Order Generated'
        RECEIPT_UPLOADED = 'RECEIPT_UPLOADED', 'Receipt Uploaded'
        RECEIPT_VALIDATED = 'RECEIPT_VALIDATED', 'Receipt Validated'
        PENDING_APPROVAL_L1 = 'PENDING_APPROVAL_L1', 'Pending Your Approval (Level 1)'
        PENDING_APPROVAL_L2 = 'PENDING_APPROVAL_L2', 'Pending Your Approval (Level 2)'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True, null=True, help_text="URL to navigate to when clicked")

    # Related objects - ForeignKey relationships ensure referential integrity
    # Using SET_NULL to preserve notification history even if related objects are deleted
    request = models.ForeignKey(
        'purchase_requests.PurchaseRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    purchase_order = models.ForeignKey(
        'purchase_orders.PurchaseOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    receipt = models.ForeignKey(
        'receipts.Receipt',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"

    def mark_as_read(self):
        """Mark this notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
