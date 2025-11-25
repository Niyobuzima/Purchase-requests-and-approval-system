"""
Purchase Order Views.

This module handles purchase order operations including:
- Viewing purchase orders
- Downloading PO PDF files
"""

from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse

from apps.purchase_orders.models import PurchaseOrder
from apps.purchase_orders.serializers import PurchaseOrderSerializer, PurchaseOrderListSerializer
from apps.purchase_orders.filters import PurchaseOrderFilter
import requests

# Import core utilities
from core.responses import APIResponse
from core.logging_utils import app_logger, log_view_action, audit_log


class PurchaseOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Purchase Orders
    Read-only access to purchase orders
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = PurchaseOrderFilter
    ordering_fields = ['generated_at', 'request__total_amount', 'request__status']
    ordering = ['-generated_at']

    def get_queryset(self):
        """
        Return POs based on user's role:
        - Staff: Only their own POs
        - Approvers/Admin: All POs
        """
        user = self.request.user

        if user.role == 'STAFF':
            # Staff see only POs for their requests
            return PurchaseOrder.objects.filter(
                request__requester=user
            ).select_related('request', 'request__requester')
        else:
            # Approvers and admins see all POs
            return PurchaseOrder.objects.all().select_related(
                'request', 'request__requester'
            )

    def get_serializer_class(self):
        """Use different serializer for list vs detail"""
        if self.action == 'list':
            return PurchaseOrderListSerializer
        return PurchaseOrderSerializer

    @action(detail=True, methods=['get'])
    @log_view_action("Download PO PDF")
    def download(self, request, pk=None):
        """
        Download PDF file for a purchase order
        Streams the PDF from Cloudinary URL
        """
        po = self.get_object()

        if not po.pdf_file:
            return APIResponse.not_found(
                message="PDF file not available for this purchase order",
                resource_type="PDF",
                resource_id=po.po_number
            )

        try:
            # Stream the PDF from Cloudinary with timeout to prevent hanging
            # timeout=(5, 10) means: 5 seconds for connection, 10 seconds for read
            response = requests.get(po.pdf_file, stream=True, timeout=(5, 10))
            response.raise_for_status()

            # Audit log for PDF download
            audit_log(
                action='DOWNLOAD_PO_PDF',
                user=request.user,
                resource_type='PurchaseOrder',
                resource_id=po.id,
                details={
                    'po_number': po.po_number,
                },
                request=request
            )

            app_logger.info(
                f"PO PDF downloaded: {po.po_number}",
                po_id=po.id,
                user_id=request.user.id
            )

            # Return the PDF as a downloadable file
            http_response = HttpResponse(
                response.content,
                content_type='application/pdf'
            )
            http_response['Content-Disposition'] = f'attachment; filename="{po.po_number}.pdf"'

            return http_response

        except requests.exceptions.Timeout as e:
            app_logger.error(
                f"Timeout downloading PDF from Cloudinary: {e}",
                exc_info=True,
                po_id=po.id
            )
            return APIResponse.server_error(
                message="PDF download timed out. Please try again later."
            )
        except requests.exceptions.RequestException as e:
            app_logger.error(
                f"Error downloading PDF from Cloudinary: {e}",
                exc_info=True,
                po_id=po.id
            )
            return APIResponse.server_error(
                message="Failed to download PDF file"
            )
