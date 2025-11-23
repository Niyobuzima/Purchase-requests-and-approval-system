import pytest
from django.test import TransactionTestCase
from django.db import connection
from concurrent.futures import ThreadPoolExecutor, as_completed
from apps.purchase_orders.models import PurchaseOrder
from apps.purchase_requests.models import PurchaseRequest, RequestItem
from apps.users.models import User


@pytest.mark.django_db(transaction=True)
class PurchaseOrderConcurrencyTestCase(TransactionTestCase):
    """Test cases for PurchaseOrder concurrent PO number generation
    
    Uses TransactionTestCase to ensure each thread can see committed data.
    """

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='STAFF'
        )

    def test_generate_po_number_no_race_condition(self):
        """Test that concurrent PO number generation doesn't create duplicates"""
        # Create multiple purchase requests
        requests = []
        for i in range(10):
            pr = PurchaseRequest.objects.create(
                title=f'Test Request {i}',
                description=f'Test Description {i}',
                requester=self.user,
                status='APPROVED'
            )
            RequestItem.objects.create(
                request=pr,
                description=f'Item {i}',
                quantity=1,
                unit_price=100.00
            )
            requests.append(pr)

        # Simulate concurrent PO creation
        def create_po(purchase_request):
            """Helper function to create PO in a thread"""
            return PurchaseOrder.objects.create(request=purchase_request)

        po_numbers = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_po, req) for req in requests]
            for future in as_completed(futures):
                po = future.result()
                po_numbers.append(po.po_number)

        # Verify all PO numbers are unique
        self.assertEqual(len(po_numbers), len(set(po_numbers)),
                        "Duplicate PO numbers detected in concurrent creation")

        # Verify sequential numbering
        sorted_numbers = sorted(po_numbers)
        for i, po_num in enumerate(sorted_numbers, start=1):
            expected_suffix = f'{i:04d}'
            self.assertTrue(po_num.endswith(expected_suffix),
                          f"Expected suffix {expected_suffix} but got {po_num}")

    def test_generate_po_number_format(self):
        """Test PO number format is correct"""
        pr = PurchaseRequest.objects.create(
            title='Test Request',
            description='Test Description',
            requester=self.user,
            status='APPROVED'
        )
        RequestItem.objects.create(
            request=pr,
            description='Test Item',
            quantity=1,
            unit_price=100.00
        )
        
        po = PurchaseOrder.objects.create(request=pr)
        
        # Verify format: PO-YYYYMMDD-XXXX
        self.assertTrue(po.po_number.startswith('PO-'))
        parts = po.po_number.split('-')
        self.assertEqual(len(parts), 3)
        self.assertEqual(len(parts[1]), 8)  # YYYYMMDD
        self.assertEqual(len(parts[2]), 4)  # XXXX
        self.assertTrue(parts[2].isdigit())

