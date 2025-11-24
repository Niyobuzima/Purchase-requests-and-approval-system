from django.db import models
from django.conf import settings
from decimal import Decimal
from cloudinary.models import CloudinaryField


class PurchaseRequest(models.Model):
    """Purchase Request model - main request entity"""

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED_L1 = 'APPROVED_L1', 'Approved Level 1'
        APPROVED_L2 = 'APPROVED_L2', 'Approved Level 2'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='purchase_requests',
    )
    title = models.CharField(max_length=255)
    vendor_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Name of the vendor/supplier'
    )
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
    )

    # Document/Invoice Upload
    document_file = CloudinaryField(
        'document',
        null=True,
        blank=True,
        folder='purchase_requests/documents',
        help_text='Upload invoice/receipt PDF or image'
    )
    extracted_data = models.JSONField(
        null=True,
        blank=True,
        help_text='AI-extracted data from uploaded document'
    )
    document_processed = models.BooleanField(
        default=False,
        help_text='Whether document has been processed by AI'
    )

    # Approval tracking
    approved_l1_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_l1_requests',
    )
    approved_l1_at = models.DateTimeField(null=True, blank=True)
    approved_l2_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_l2_requests',
    )
    approved_l2_at = models.DateTimeField(null=True, blank=True)

    # Rejection tracking
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rejected_requests',
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'purchase_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['requester', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"PR-{self.id}: {self.title} ({self.status})"

    def calculate_total(self):
        """Calculate total amount from all items"""
        total = self.items.aggregate(
            total=models.Sum(models.F('quantity') * models.F('unit_price'))
        )['total'] or Decimal('0.00')
        return total

    def save(self, *args, **kwargs):
        # Auto-calculate total if not set
        if not self.total_amount or self.total_amount == Decimal('0.00'):
            if self.pk:  # Only if already saved (has items)
                self.total_amount = self.calculate_total()
        super().save(*args, **kwargs)


class RequestItem(models.Model):
    """Individual items in a purchase request"""

    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='items',
    )
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    unit_of_measure = models.CharField(
        max_length=50,
        default='unit',
        help_text='e.g., unit, kg, box, etc.',
    )
    notes = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'request_items'
        ordering = ['id']

    def __str__(self):
        return f"{self.description} (x{self.quantity})"

    @property
    def subtotal(self):
        """Calculate subtotal for this item"""
        return self.quantity * self.unit_price
