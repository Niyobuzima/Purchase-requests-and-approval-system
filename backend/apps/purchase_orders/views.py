from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse, FileResponse
from django.shortcuts import get_object_or_404
from apps.purchase_orders.models import PurchaseOrder
from apps.purchase_orders.serializers import PurchaseOrderSerializer, PurchaseOrderListSerializer
import requests
import logging

logger = logging.getLogger(__name__)


class IsAuthenticated(permissions.BasePermission):
    """Ensure user is authenticated"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class PurchaseOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Purchase Orders
    Read-only access to purchase orders
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PurchaseOrderSerializer

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
    def download(self, request, pk=None):
        """
        Download PDF file for a purchase order
        Streams the PDF from Cloudinary URL
        """
        po = self.get_object()

        if not po.pdf_file:
            return Response(
                {'error': 'PDF file not available for this purchase order'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            # Stream the PDF from Cloudinary
            response = requests.get(po.pdf_file, stream=True)
            response.raise_for_status()

            # Return the PDF as a downloadable file
            http_response = HttpResponse(
                response.content,
                content_type='application/pdf'
            )
            http_response['Content-Disposition'] = f'attachment; filename="{po.po_number}.pdf"'

            return http_response

        except requests.exceptions.RequestException as e:
            logger.error(f"Error downloading PDF from Cloudinary: {e}")
            return Response(
                {'error': 'Failed to download PDF file'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
