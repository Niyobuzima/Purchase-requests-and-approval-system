from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Receipt


class ReceiptSerializer(serializers.ModelSerializer):
    """
    Serializer for Receipt model.
    Optimized to avoid N+1 queries - uses flat fields instead of nested serializers.
    """

    # Flat PO fields (avoids N+1)
    purchase_order_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    po_pdf_file = serializers.CharField(source='purchase_order.pdf_file', read_only=True)

    # Flat request fields (avoids N+1)
    request_id = serializers.IntegerField(source='purchase_order.request.id', read_only=True)
    request_title = serializers.CharField(source='purchase_order.request.title', read_only=True)
    request_vendor = serializers.CharField(source='purchase_order.request.vendor_name', read_only=True)
    request_total = serializers.DecimalField(
        source='purchase_order.request.total_amount',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    # User names
    uploaded_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    # Computed fields
    receipt_url = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    validation_status_display = serializers.CharField(source='get_validation_status_display', read_only=True)

    class Meta:
        model = Receipt
        fields = [
            'id',
            'purchase_order',
            'purchase_order_number',
            'po_pdf_file',
            'request_id',
            'request_title',
            'request_vendor',
            'request_total',
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

    @extend_schema_field(str)
    def get_uploaded_by_name(self, obj) -> str:
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip() or obj.uploaded_by.username
        return None

    @extend_schema_field(str)
    def get_approved_by_name(self, obj) -> str:
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip() or obj.approved_by.username
        return None

    @extend_schema_field(str)
    def get_receipt_url(self, obj) -> str:
        return obj.receipt_url

    @extend_schema_field(float)
    def get_total_amount(self, obj) -> float:
        """Get total amount from extracted receipt data or purchase order"""
        # First try to get from extracted receipt data
        if obj.extracted_receipt_data and 'total_amount' in obj.extracted_receipt_data:
            try:
                return float(obj.extracted_receipt_data.get('total_amount'))
            except (ValueError, TypeError):
                pass  # Fall through to PO total

        # Fallback to purchase order total
        if obj.purchase_order and obj.purchase_order.request:
            return float(obj.purchase_order.request.total_amount)

        return None

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


class ReceiptListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""

    purchase_order_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    request_title = serializers.CharField(source='purchase_order.request.title', read_only=True)
    request_total = serializers.DecimalField(
        source='purchase_order.request.total_amount',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    uploaded_by_name = serializers.SerializerMethodField()
    validation_status_display = serializers.CharField(source='get_validation_status_display', read_only=True)

    class Meta:
        model = Receipt
        fields = [
            'id',
            'purchase_order',
            'purchase_order_number',
            'request_title',
            'request_total',
            'receipt_file',
            'uploaded_by_name',
            'uploaded_at',
            'validation_status',
            'validation_status_display',
        ]

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip() or obj.uploaded_by.username
        return None


class ReceiptApprovalSerializer(serializers.Serializer):
    """Serializer for approving receipt despite discrepancies"""

    finance_comments = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Finance comments for approval"
    )
