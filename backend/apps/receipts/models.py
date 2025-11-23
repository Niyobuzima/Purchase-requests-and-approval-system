from django.db import models
from django.conf import settings
from cloudinary.models import CloudinaryField


class Receipt(models.Model):
    """Receipt uploaded for a purchase order"""

    VALIDATION_STATUS_CHOICES = [
        ('PENDING', 'Pending Validation'),
        ('MATCHED', 'Matched'),
        ('DISCREPANCY', 'Has Discrepancies'),
        ('APPROVED', 'Approved by Finance'),
    ]

    purchase_order = models.ForeignKey(
        'purchase_orders.PurchaseOrder',
        on_delete=models.CASCADE,
        related_name='receipts',
        help_text='Associated purchase order'
    )
    receipt_file = CloudinaryField(
        'receipt',
        folder='receipts',
        resource_type='auto',
        help_text='Receipt file (PDF or image)'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_receipts',
        help_text='User who uploaded the receipt'
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Timestamp when receipt was uploaded'
    )
    validation_status = models.CharField(
        max_length=20,
        choices=VALIDATION_STATUS_CHOICES,
        default='PENDING',
        help_text='Validation status of the receipt'
    )
    extracted_receipt_data = models.JSONField(
        blank=True,
        null=True,
        help_text='Data extracted from receipt by AI (vendor, items, amounts)'
    )
    discrepancies = models.JSONField(
        blank=True,
        null=True,
        help_text='List of discrepancies found between receipt and PO'
    )
    finance_comments = models.TextField(
        blank=True,
        help_text='Comments from finance team'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_receipts',
        help_text='Finance user who approved despite discrepancies'
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when receipt was approved'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'receipts'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['purchase_order']),
            models.Index(fields=['validation_status']),
            models.Index(fields=['-uploaded_at']),
        ]

    def __str__(self):
        return f"Receipt for {self.purchase_order.po_number} - {self.validation_status}"

    @property
    def receipt_url(self):
        """Get the Cloudinary URL for the receipt file"""
        if self.receipt_file:
            return self.receipt_file.url
        return None
