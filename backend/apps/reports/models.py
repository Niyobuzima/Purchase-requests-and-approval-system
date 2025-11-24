from django.db import models
from django.conf import settings


class ExportLog(models.Model):
    """Track export requests for audit purposes"""

    EXPORT_FORMAT_CHOICES = [
        ('CSV', 'CSV'),
        ('PDF', 'PDF'),
    ]

    EXPORT_TYPE_CHOICES = [
        ('PURCHASE_ORDERS', 'Purchase Orders'),
        ('RECEIPTS', 'Receipts'),
        ('SPENDING_SUMMARY', 'Spending Summary'),
        ('APPROVAL_TIMELINE', 'Approval Timeline'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='export_logs'
    )
    export_type = models.CharField(max_length=50, choices=EXPORT_TYPE_CHOICES)
    export_format = models.CharField(max_length=10, choices=EXPORT_FORMAT_CHOICES)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    filters_applied = models.JSONField(default=dict, blank=True)
    record_count = models.IntegerField(default=0)
    file_size_kb = models.IntegerField(null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    download_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'export_logs'
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['user', '-generated_at']),
            models.Index(fields=['export_type']),
        ]

    def __str__(self):
        return f"{self.export_type} - {self.export_format} by {self.user} at {self.generated_at}"
