from django.db import models
from django.utils import timezone
from apps.purchase_requests.models import PurchaseRequest
import datetime


class PurchaseOrder(models.Model):
    """Purchase Order generated from approved purchase requests"""

    request = models.OneToOneField(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='purchase_order',
        help_text='Associated purchase request'
    )
    po_number = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique PO number in format PO-YYYYMMDD-XXXX'
    )
    generated_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Timestamp when PO was generated'
    )
    pdf_file = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text='Cloudinary URL for the PO PDF'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchase_orders'
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['po_number']),
            models.Index(fields=['-generated_at']),
        ]

    def __str__(self):
        return f"{self.po_number} - {self.request.title}"

    @staticmethod
    def generate_po_number():
        """
        Generate unique PO number in format: PO-YYYYMMDD-XXXX
        where XXXX is a sequential number for the day
        """
        today = timezone.now().date()
        date_str = today.strftime('%Y%m%d')

        # Get all POs created today
        prefix = f'PO-{date_str}-'
        today_pos = PurchaseOrder.objects.filter(
            po_number__startswith=prefix
        ).order_by('-po_number')

        if today_pos.exists():
            # Get the last PO number and increment
            last_po = today_pos.first()
            last_sequence = int(last_po.po_number.split('-')[-1])
            new_sequence = last_sequence + 1
        else:
            # First PO of the day
            new_sequence = 1

        # Format: PO-YYYYMMDD-0001
        po_number = f'{prefix}{new_sequence:04d}'
        return po_number

    def save(self, *args, **kwargs):
        """Override save to auto-generate PO number if not set"""
        if not self.po_number:
            self.po_number = self.generate_po_number()
        super().save(*args, **kwargs)
