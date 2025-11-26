"""
Reports Views.

This module handles report generation and export operations including:
- Purchase Orders CSV export
- Receipts CSV export
- Spending Summary PDF export
- Approval Timeline CSV export
- Export history tracking
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db.models import Sum, Count, Avg, Q
from drf_spectacular.utils import extend_schema

from apps.purchase_orders.models import PurchaseOrder
from apps.receipts.models import Receipt
from apps.purchase_requests.models import PurchaseRequest
from .models import ExportLog
from .serializers import ExportRequestSerializer, ExportLogSerializer
from .permissions import IsFinanceUser
from .utils import (
    generate_purchase_orders_csv,
    generate_receipts_csv,
    generate_spending_summary_pdf,
    generate_approval_timeline_csv
)

# Import core utilities
from core.responses import APIResponse
from core.logging_utils import app_logger, log_view_action, audit_log
from core.constants import ErrorCode


@extend_schema(tags=['Reports'])
class ReportViewSet(viewsets.ViewSet):
    """
    ViewSet for generating and downloading reports
    """
    permission_classes = [IsFinanceUser]

    def get_queryset_with_filters(self, model, filters):
        """Apply common filters to queryset"""
        queryset = model.objects.all()

        # Date range filter
        if filters.get('start_date'):
            if model == PurchaseOrder:
                queryset = queryset.filter(generated_at__date__gte=filters['start_date'])
            elif model == Receipt:
                queryset = queryset.filter(uploaded_at__date__gte=filters['start_date'])

        if filters.get('end_date'):
            if model == PurchaseOrder:
                queryset = queryset.filter(generated_at__date__lte=filters['end_date'])
            elif model == Receipt:
                queryset = queryset.filter(uploaded_at__date__lte=filters['end_date'])

        # Status filter
        if filters.get('status_filter'):
            if model == PurchaseOrder:
                queryset = queryset.filter(request__status=filters['status_filter'])
            elif model == Receipt:
                queryset = queryset.filter(validation_status=filters['status_filter'])

        # Vendor filter
        if filters.get('vendor_filter') and model == PurchaseOrder:
            queryset = queryset.filter(
                request__vendor_name__icontains=filters['vendor_filter']
            )

        return queryset

    @action(detail=False, methods=['post'], url_path='export')
    @log_view_action("Export Report")
    def export_data(self, request):
        """
        Export data based on parameters
        POST /api/reports/export/
        """
        serializer = ExportRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.validation_error(
                errors=serializer.errors,
                message="Invalid export parameters"
            )

        export_type = serializer.validated_data['export_type']
        export_format = serializer.validated_data['export_format']
        filters = {
            'start_date': serializer.validated_data.get('start_date'),
            'end_date': serializer.validated_data.get('end_date'),
            'status_filter': serializer.validated_data.get('status_filter'),
            'vendor_filter': serializer.validated_data.get('vendor_filter'),
        }

        # Generate export based on type
        try:
            record_count = 0

            if export_type == 'PURCHASE_ORDERS':
                queryset = self.get_queryset_with_filters(PurchaseOrder, filters)
                queryset = queryset.select_related('request', 'request__requester').prefetch_related('receipts')
                record_count = queryset.count()  # Count before consuming queryset

                if export_format == 'CSV':
                    response = generate_purchase_orders_csv(queryset, filters)
                else:
                    return APIResponse.error(
                        message="PDF format not supported for Purchase Orders. Use CSV or Spending Summary.",
                        code=ErrorCode.VALIDATION_ERROR
                    )

            elif export_type == 'RECEIPTS':
                queryset = self.get_queryset_with_filters(Receipt, filters)
                queryset = queryset.select_related(
                    'purchase_order',
                    'purchase_order__request',
                    'uploaded_by',
                    'approved_by'
                )
                record_count = queryset.count()  # Count before consuming queryset

                if export_format == 'CSV':
                    response = generate_receipts_csv(queryset, filters)
                else:
                    return APIResponse.error(
                        message="PDF format not supported for Receipts. Use CSV.",
                        code=ErrorCode.VALIDATION_ERROR
                    )

            elif export_type == 'SPENDING_SUMMARY':
                # Generate summary data
                po_queryset = self.get_queryset_with_filters(PurchaseOrder, filters)
                record_count = po_queryset.count()

                # Build base query filters for date range
                pr_date_filters = Q()
                receipt_date_filters = Q()
                
                if filters.get('start_date'):
                    pr_date_filters &= Q(created_at__date__gte=filters['start_date'])
                    receipt_date_filters &= Q(uploaded_at__date__gte=filters['start_date'])
                
                if filters.get('end_date'):
                    pr_date_filters &= Q(created_at__date__lte=filters['end_date'])
                    receipt_date_filters &= Q(uploaded_at__date__lte=filters['end_date'])

                summary_data = {
                    'total_records': record_count,
                    'total_pos': po_queryset.count(),
                    'total_spending': float(po_queryset.aggregate(
                        total=Sum('request__total_amount')
                    )['total'] or 0),
                    'avg_po_value': float(po_queryset.aggregate(
                        avg=Avg('request__total_amount')
                    )['avg'] or 0),
                    'approved_count': PurchaseRequest.objects.filter(
                        pr_date_filters,
                        status='APPROVED'
                    ).count(),
                    'pending_count': PurchaseRequest.objects.filter(
                        pr_date_filters,
                        status__in=['PENDING_L1', 'PENDING_L2']
                    ).count(),
                    'rejected_count': PurchaseRequest.objects.filter(
                        pr_date_filters,
                        status__in=['REJECTED_L1', 'REJECTED_L2']
                    ).count(),
                    'receipts_validated': Receipt.objects.filter(
                        receipt_date_filters,
                        validation_status__in=['MATCHED', 'APPROVED']
                    ).count(),
                    'receipts_pending': Receipt.objects.filter(
                        receipt_date_filters,
                        validation_status='PENDING'
                    ).count(),
                }

                # Top vendors
                top_vendors = list(po_queryset.values('request__vendor_name').annotate(
                    total_spent=Sum('request__total_amount'),
                    po_count=Count('id')
                ).order_by('-total_spent')[:5])

                summary_data['top_vendors'] = [
                    {
                        'vendor_name': v['request__vendor_name'],
                        'total_spent': float(v['total_spent']),
                        'po_count': v['po_count']
                    }
                    for v in top_vendors
                ]

                if export_format == 'PDF':
                    response = generate_spending_summary_pdf(summary_data, filters)
                else:
                    return APIResponse.error(
                        message="CSV format not supported for Spending Summary. Use PDF.",
                        code=ErrorCode.VALIDATION_ERROR
                    )

            elif export_type == 'APPROVAL_TIMELINE':
                # Get purchase requests with approval timeline data
                queryset = PurchaseRequest.objects.all()
                
                # Apply date filters
                if filters.get('start_date'):
                    queryset = queryset.filter(created_at__date__gte=filters['start_date'])
                if filters.get('end_date'):
                    queryset = queryset.filter(created_at__date__lte=filters['end_date'])
                
                # Apply status filter if provided
                if filters.get('status_filter'):
                    queryset = queryset.filter(status=filters['status_filter'])
                
                # Exclude drafts by default (only include submitted requests)
                queryset = queryset.exclude(status='DRAFT')
                
                # Select related data to avoid N+1 queries
                queryset = queryset.select_related(
                    'requester',
                    'approved_l1_by',
                    'approved_l2_by',
                    'rejected_by'
                ).order_by('-created_at')
                
                record_count = queryset.count()  # Count before consuming queryset

                if export_format == 'CSV':
                    response = generate_approval_timeline_csv(queryset, filters)
                else:
                    return APIResponse.error(
                        message="PDF format not supported for Approval Timeline. Use CSV.",
                        code=ErrorCode.VALIDATION_ERROR
                    )

            else:
                return APIResponse.error(
                    message="Invalid export type",
                    code=ErrorCode.VALIDATION_ERROR
                )

            # Log the export
            # Convert dates to strings for JSON serialization
            filters_for_log = {
                'status_filter': filters.get('status_filter'),
                'vendor_filter': filters.get('vendor_filter'),
            }
            if filters.get('start_date'):
                filters_for_log['start_date'] = filters['start_date'].isoformat() if hasattr(filters['start_date'], 'isoformat') else str(filters['start_date'])
            if filters.get('end_date'):
                filters_for_log['end_date'] = filters['end_date'].isoformat() if hasattr(filters['end_date'], 'isoformat') else str(filters['end_date'])

            export_log = ExportLog.objects.create(
                user=request.user,
                export_type=export_type,
                export_format=export_format,
                start_date=filters.get('start_date'),
                end_date=filters.get('end_date'),
                filters_applied=filters_for_log,
                record_count=record_count,
            )

            # Audit log
            audit_log(
                action='EXPORT_REPORT',
                user=request.user,
                resource_type='ExportLog',
                resource_id=export_log.id,
                details={
                    'export_type': export_type,
                    'export_format': export_format,
                    'record_count': record_count,
                },
                request=request
            )

            app_logger.info(
                f"Report exported: {export_type} as {export_format}",
                user_id=request.user.id,
                export_type=export_type,
                record_count=record_count
            )

            return response

        except ValidationError as e:
            app_logger.warning(
                f"Validation error during export: {str(e)}",
                user_id=request.user.id,
                export_type=export_type,
                export_format=export_format
            )
            return APIResponse.validation_error(
                errors={'detail': str(e)},
                message=str(e)
            )
        except PermissionDenied as e:
            app_logger.warning(
                f"Permission denied during export: {str(e)}",
                user_id=request.user.id,
                export_type=export_type
            )
            return APIResponse.forbidden(
                message="You do not have permission to perform this export"
            )
        except Exception as e:
            app_logger.error(
                f"Unexpected error during export: {e}",
                exc_info=True,
                user_id=request.user.id,
                export_type=export_type,
                export_format=export_format
            )
            return APIResponse.server_error(
                message="An unexpected error occurred while generating the report. Please try again or contact support."
            )

    @action(detail=False, methods=['get'], url_path='history')
    def export_history(self, request):
        """
        Get export history for current user
        GET /api/reports/history/
        """
        logs = ExportLog.objects.filter(user=request.user)[:20]
        serializer = ExportLogSerializer(logs, many=True)
        return APIResponse.success(data=serializer.data)

    @action(detail=False, methods=['get'], url_path='preview')
    def preview_data(self, request):
        """
        Preview data before export (first 10 records)
        GET /api/reports/preview/?export_type=PURCHASE_ORDERS&start_date=2025-01-01
        """
        export_type = request.query_params.get('export_type', 'PURCHASE_ORDERS')
        filters = {
            'start_date': request.query_params.get('start_date'),
            'end_date': request.query_params.get('end_date'),
            'status_filter': request.query_params.get('status_filter'),
            'vendor_filter': request.query_params.get('vendor_filter'),
        }

        if export_type == 'PURCHASE_ORDERS':
            queryset = self.get_queryset_with_filters(PurchaseOrder, filters)[:10]
            data = [{
                'po_number': po.po_number,
                'vendor': po.request.vendor_name,
                'total': float(po.request.total_amount),
                'status': po.request.status,
                'date': po.generated_at.strftime('%Y-%m-%d'),
            } for po in queryset]
        elif export_type == 'RECEIPTS':
            queryset = self.get_queryset_with_filters(Receipt, filters)[:10]
            data = [{
                'receipt_id': receipt.id,
                'po_number': receipt.purchase_order.po_number,
                'validation_status': receipt.validation_status,
                'upload_date': receipt.uploaded_at.strftime('%Y-%m-%d'),
            } for receipt in queryset]
        else:
            data = []

        return APIResponse.success(data={
            'preview': data,
            'total_count': self.get_queryset_with_filters(
                PurchaseOrder if export_type == 'PURCHASE_ORDERS' else Receipt,
                filters
            ).count()
        })
