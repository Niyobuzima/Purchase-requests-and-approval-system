from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta, datetime
from apps.purchase_requests.models import PurchaseRequest
from apps.purchase_orders.models import PurchaseOrder
from apps.receipts.models import Receipt
from apps.users.permissions import IsFinance


class DashboardStatsView(APIView):
    """
    Finance Dashboard Summary Statistics

    Returns:
        - Total purchase requests (all time)
        - Pending approvals (L1 + L2)
        - Total amount spent (approved requests)
        - Active purchase orders
        - Pending receipt validations
    """
    permission_classes = [IsAuthenticated, IsFinance]

    def get(self, request):
        # Total purchase requests
        total_requests = PurchaseRequest.objects.count()

        # Pending approvals (L1 or L2)
        pending_approvals = PurchaseRequest.objects.filter(
            status__in=[
                PurchaseRequest.Status.PENDING,
                PurchaseRequest.Status.APPROVED_L1
            ]
        ).count()

        # Total spent (sum of approved or completed requests)
        total_spent = PurchaseRequest.objects.filter(
            status__in=[
                PurchaseRequest.Status.APPROVED,
                PurchaseRequest.Status.APPROVED_L2,
                PurchaseRequest.Status.COMPLETED
            ]
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        # Active purchase orders (approved but not completed)
        active_pos = PurchaseOrder.objects.filter(
            request__status=PurchaseRequest.Status.APPROVED
        ).count()

        # Pending receipt validations
        pending_receipts = Receipt.objects.filter(
            validation_status__in=['PENDING', 'DISCREPANCY']
        ).count()

        return Response({
            'stats': {
                'total_requests': total_requests,
                'pending_approvals': pending_approvals,
                'total_spent': float(total_spent),
                'active_pos': active_pos,
                'pending_receipts': pending_receipts,
            }
        })


class SpendingAnalyticsView(APIView):
    """
    Spending Analytics

    Query params:
        - start_date (optional): Filter from this date (YYYY-MM-DD)
        - end_date (optional): Filter to this date (YYYY-MM-DD)

    Returns:
        - Spending by vendor
        - Monthly spending trend
        - Total spending for period
    """
    permission_classes = [IsAuthenticated, IsFinance]

    def get(self, request):
        # Parse date filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Base queryset: approved or completed requests
        queryset = PurchaseRequest.objects.filter(
            status__in=[
                PurchaseRequest.Status.APPROVED,
                PurchaseRequest.Status.APPROVED_L2,
                PurchaseRequest.Status.COMPLETED
            ]
        )

        # Apply date filters
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                queryset = queryset.filter(created_at__gte=start)
            except ValueError:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                # Include the entire end date
                end = datetime.combine(end.date(), datetime.max.time())
                queryset = queryset.filter(created_at__lte=end)
            except ValueError:
                pass

        # Spending by vendor
        spending_by_vendor = queryset.values('vendor_name').annotate(
            total=Sum('total_amount')
        ).order_by('-total')[:10]  # Top 10 vendors

        # Convert to list and handle empty vendor names
        vendor_spending = [
            {
                'vendor_name': item['vendor_name'] or 'Unknown Vendor',
                'total': float(item['total'] or 0)
            }
            for item in spending_by_vendor
        ]

        # Monthly spending (last 6 months)
        six_months_ago = timezone.now() - timedelta(days=180)
        monthly_spending = queryset.filter(
            created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total=Sum('total_amount')
        ).order_by('month')

        # Format monthly data
        monthly_data = [
            {
                'month': item['month'].strftime('%b %Y'),
                'total': float(item['total'] or 0)
            }
            for item in monthly_spending
        ]

        # Total spending for period
        total_spending = queryset.aggregate(
            total=Sum('total_amount')
        )['total'] or 0

        return Response({
            'spending_by_vendor': vendor_spending,
            'monthly_spending': monthly_data,
            'total_spending': float(total_spending),
        })


class PendingReceiptsView(APIView):
    """
    Get all receipts pending Finance review

    Returns receipts with status PENDING or DISCREPANCY
    """
    permission_classes = [IsAuthenticated, IsFinance]

    def get(self, request):
        receipts = Receipt.objects.filter(
            validation_status__in=['PENDING', 'DISCREPANCY']
        ).select_related(
            'purchase_order',
            'purchase_order__request',
            'uploaded_by'
        ).order_by('-uploaded_at')

        # Serialize the data
        receipts_data = []
        for receipt in receipts:
            receipts_data.append({
                'id': receipt.id,
                'purchase_order_id': receipt.purchase_order.id,
                'po_number': receipt.purchase_order.po_number,
                'validation_status': receipt.validation_status,
                'validation_status_display': receipt.get_validation_status_display(),
                'uploaded_at': receipt.uploaded_at,
                'uploaded_by_name': f"{receipt.uploaded_by.first_name} {receipt.uploaded_by.last_name}" if receipt.uploaded_by else 'Unknown',
                'request_title': receipt.purchase_order.request.title,
                'total_amount': float(receipt.purchase_order.request.total_amount),
                'discrepancy_count': len(receipt.discrepancies) if isinstance(receipt.discrepancies, list) else 0,
            })

        return Response({
            'receipts': receipts_data,
            'count': len(receipts_data)
        })


class RequestStatusDistributionView(APIView):
    """
    Get distribution of purchase requests by status

    Useful for pie charts showing workflow progress
    """
    permission_classes = [IsAuthenticated, IsFinance]

    def get(self, request):
        distribution = PurchaseRequest.objects.values(
            'status'
        ).annotate(
            count=Count('id')
        ).order_by('-count')

        # Format data
        status_map = dict(PurchaseRequest.Status.choices)
        status_data = [
            {
                'status': item['status'],
                'status_display': status_map[item['status']],
                'count': item['count']
            }
            for item in distribution
        ]

        return Response({
            'distribution': status_data
        })
