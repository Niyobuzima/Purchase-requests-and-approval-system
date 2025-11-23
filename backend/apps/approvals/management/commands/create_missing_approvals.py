from django.core.management.base import BaseCommand
from apps.approvals.models import Approval
from apps.purchase_requests.models import PurchaseRequest


class Command(BaseCommand):
    help = 'Create L1 approval records for existing pending requests'

    def handle(self, *args, **kwargs):
        # Get all PENDING requests without L1 approvals
        pending_requests = PurchaseRequest.objects.filter(status=PurchaseRequest.Status.PENDING)

        created_count = 0
        for request in pending_requests:
            # Check if L1 approval already exists
            if not Approval.objects.filter(request=request, level=Approval.Level.LEVEL_1).exists():
                Approval.objects.create(
                    request=request,
                    level=Approval.Level.LEVEL_1,
                    status=Approval.Status.PENDING
                )
                created_count += 1
                self.stdout.write(f'Created L1 approval for request #{request.id}')

        # Get all APPROVED_L1 requests without L2 approvals
        l1_approved_requests = PurchaseRequest.objects.filter(status=PurchaseRequest.Status.APPROVED_L1)

        for request in l1_approved_requests:
            # Check if L2 approval already exists
            if not Approval.objects.filter(request=request, level=Approval.Level.LEVEL_2).exists():
                Approval.objects.create(
                    request=request,
                    level=Approval.Level.LEVEL_2,
                    status=Approval.Status.PENDING
                )
                created_count += 1
                self.stdout.write(f'Created L2 approval for request #{request.id}')

        self.stdout.write(self.style.SUCCESS(f'Successfully created {created_count} approval records'))
