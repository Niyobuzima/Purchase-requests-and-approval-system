from django.db import models
from django.conf import settings
from django.utils import timezone


class Approval(models.Model):
    """Approval records for multi-level approval workflow"""

    class Level(models.IntegerChoices):
        LEVEL_1 = 1, 'Level 1'
        LEVEL_2 = 2, 'Level 2'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    request = models.ForeignKey(
        'purchase_requests.PurchaseRequest',
        on_delete=models.CASCADE,
        related_name='approvals',
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approvals_given',
    )
    level = models.IntegerField(choices=Level.choices)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    comments = models.TextField(blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'approvals'
        ordering = ['level', 'created_at']
        indexes = [
            models.Index(fields=['request', 'level', 'status']),
            models.Index(fields=['status', 'level']),
        ]
        unique_together = [['request', 'level']]

    def __str__(self):
        return f"Approval L{self.level} for {self.request} - {self.status}"

    @property
    def is_pending(self):
        return self.status == self.Status.PENDING

    @property
    def is_approved(self):
        return self.status == self.Status.APPROVED

    @property
    def is_rejected(self):
        return self.status == self.Status.REJECTED

    def approve(self, approver):
        """Approve this approval record"""
        self.status = self.Status.APPROVED
        self.approver = approver
        self.processed_at = timezone.now()
        self.save()

    def reject(self, approver, comments=''):
        """Reject this approval record"""
        self.status = self.Status.REJECTED
        self.approver = approver
        self.comments = comments
        self.processed_at = timezone.now()
        self.save()
