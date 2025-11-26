from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from apps.purchase_orders.models import PurchaseOrder
from apps.purchase_requests.serializers import PurchaseRequestSerializer


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """
    Serializer for Purchase Order model - used for list views.
    Optimized to avoid N+1 queries - uses flat fields instead of nested serializers.
    """

    # Flat request fields (avoids N+1)
    request_title = serializers.CharField(source='request.title', read_only=True)
    request_total = serializers.DecimalField(
        source='request.total_amount',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    request_status = serializers.CharField(source='request.status', read_only=True)
    request_vendor = serializers.CharField(source='request.vendor_name', read_only=True)
    requester_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'request',
            'request_title',
            'request_total',
            'request_status',
            'request_vendor',
            'requester_name',
            'po_number',
            'generated_at',
            'pdf_file',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'po_number',
            'generated_at',
            'created_at',
            'updated_at',
        ]

    @extend_schema_field(str)
    def get_requester_name(self, obj) -> str:
        """Get requester's full name"""
        if obj.request and obj.request.requester:
            user = obj.request.requester
            if user.first_name and user.last_name:
                return f"{user.first_name} {user.last_name}"
            return user.username
        return "Unknown"


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Purchase Order - used for retrieve views.
    Includes full request_details with nested items and approval info.
    """

    requester_name = serializers.SerializerMethodField()
    request_details = PurchaseRequestSerializer(source='request', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'request',
            'requester_name',
            'po_number',
            'generated_at',
            'pdf_file',
            'created_at',
            'updated_at',
            'request_details',
        ]
        read_only_fields = [
            'id',
            'po_number',
            'generated_at',
            'created_at',
            'updated_at',
        ]

    @extend_schema_field(str)
    def get_requester_name(self, obj) -> str:
        """Get requester's full name"""
        if obj.request and obj.request.requester:
            user = obj.request.requester
            if user.first_name and user.last_name:
                return f"{user.first_name} {user.last_name}"
            return user.username
        return "Unknown"


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""

    request_title = serializers.CharField(source='request.title', read_only=True)
    request_total = serializers.DecimalField(
        source='request.total_amount',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    requester_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'request',
            'request_title',
            'request_total',
            'requester_name',
            'po_number',
            'generated_at',
            'pdf_file',
        ]

    def get_requester_name(self, obj):
        """Get requester's full name"""
        if obj.request and obj.request.requester:
            user = obj.request.requester
            if user.first_name and user.last_name:
                return f"{user.first_name} {user.last_name}"
            return user.username
        return "Unknown"
