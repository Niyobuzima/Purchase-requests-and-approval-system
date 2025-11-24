from rest_framework import serializers
from .models import Receipt
from apps.purchase_orders.models import PurchaseOrder
from apps.purchase_orders.serializers import PurchaseOrderSerializer


class ReceiptSerializer(serializers.ModelSerializer):
    """Serializer for Receipt model"""

    purchase_order_details = PurchaseOrderSerializer(source='purchase_order', read_only=True)
    purchase_order_number = serializers.SerializerMethodField()
    request_title = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()
    validation_status_display = serializers.CharField(source='get_validation_status_display', read_only=True)

    class Meta:
        model = Receipt
        fields = [
            'id',
            'purchase_order',
            'purchase_order_number',
            'purchase_order_details',
            'request_title',
            'total_amount',
            'receipt_file',
            'receipt_url',
            'uploaded_by',
            'uploaded_by_name',
            'uploaded_at',
            'validation_status',
            'validation_status_display',
            'extracted_receipt_data',
            'discrepancies',
            'finance_comments',
            'approved_by',
            'approved_by_name',
            'approved_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'uploaded_by',
            'uploaded_at',
            'extracted_receipt_data',
            'created_at',
            'updated_at',
        ]

    def get_purchase_order_number(self, obj):
        """Get the purchase order number"""
        if obj.purchase_order:
            return obj.purchase_order.po_number
        return None

    def get_request_title(self, obj):
        """Get the associated request title"""
        if obj.purchase_order and obj.purchase_order.request:
            return obj.purchase_order.request.title
        return None

    def get_total_amount(self, obj):
        """Get total amount from extracted receipt data or purchase order"""
        # First try to get from extracted receipt data
        if obj.extracted_receipt_data and 'total_amount' in obj.extracted_receipt_data:
            return obj.extracted_receipt_data.get('total_amount')

        # Fallback to purchase order total
        if obj.purchase_order and obj.purchase_order.request:
            return float(obj.purchase_order.request.total_estimated_cost)

        return None

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip() or obj.uploaded_by.username
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip() or obj.approved_by.username
        return None

    def get_receipt_url(self, obj):
        return obj.receipt_url

    def validate_purchase_order(self, value):
        """Validate that the purchase order exists and is approved"""
        if not value:
            raise serializers.ValidationError("Purchase order is required")

        # Check if PO is approved (request status should be APPROVED)
        if value.request.status != 'APPROVED':
            raise serializers.ValidationError(
                "Cannot upload receipt for purchase order that is not fully approved"
            )

        return value

    def validate_receipt_file(self, value):
        """Validate the uploaded receipt file"""
        if not value:
            raise serializers.ValidationError("Receipt file is required")

        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if hasattr(value, 'size') and value.size > max_size:
            raise serializers.ValidationError("Receipt file size cannot exceed 10MB")

        # Check file type
        if hasattr(value, 'content_type'):
            allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    "Invalid file type. Only PDF and image files (JPEG, PNG) are allowed"
                )

        return value


class ReceiptApprovalSerializer(serializers.Serializer):
    """Serializer for approving receipt despite discrepancies"""

    finance_comments = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Finance comments for approval"
    )
