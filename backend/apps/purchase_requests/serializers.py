from rest_framework import serializers
from apps.purchase_requests.models import PurchaseRequest, RequestItem
from apps.users.serializers import UserSerializer
from decimal import Decimal
from django.utils import timezone


class RequestItemSerializer(serializers.ModelSerializer):
    """Serializer for individual request items"""

    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = RequestItem
        fields = [
            'id',
            'description',
            'quantity',
            'unit_price',
            'unit_of_measure',
            'notes',
            'subtotal',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'subtotal', 'created_at', 'updated_at']

    def validate_quantity(self, value):
        """Ensure quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_unit_price(self, value):
        """Ensure unit price is positive"""
        if value <= 0:
            raise serializers.ValidationError("Unit price must be greater than zero.")
        return value


class PurchaseRequestSerializer(serializers.ModelSerializer):
    """Serializer for purchase requests with nested items"""

    items = RequestItemSerializer(many=True)
    requester = UserSerializer(read_only=True)
    requester_id = serializers.IntegerField(write_only=True, required=False)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # Approval info (read-only)
    approved_l1_by = UserSerializer(read_only=True)
    approved_l2_by = UserSerializer(read_only=True)
    rejected_by = UserSerializer(read_only=True)

    class Meta:
        model = PurchaseRequest
        fields = [
            'id',
            'requester',
            'requester_id',
            'title',
            'description',
            'status',
            'status_display',
            'total_amount',
            'items',
            'document_file',
            'extracted_data',
            'document_processed',
            'approved_l1_by',
            'approved_l1_at',
            'approved_l2_by',
            'approved_l2_at',
            'rejected_by',
            'rejected_at',
            'rejection_reason',
            'created_at',
            'updated_at',
            'submitted_at',
        ]
        read_only_fields = [
            'id',
            'total_amount',
            'extracted_data',
            'document_processed',
            'approved_l1_by',
            'approved_l1_at',
            'approved_l2_by',
            'approved_l2_at',
            'rejected_by',
            'rejected_at',
            'created_at',
            'updated_at',
        ]

    def validate_items(self, value):
        """
        Ensure at least one item is provided
        Exception: DRAFT status requests can be created without items (for document upload workflow)
        """
        # Allow empty items for DRAFT requests (will be filled by AI processing)
        status = self.initial_data.get('status', '')
        if status == 'DRAFT':
            return value or []

        # For non-DRAFT requests, require at least one item
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        if len(value) < 1:
            raise serializers.ValidationError("At least one item is required.")
        return value

    def validate(self, attrs):
        """Additional validation"""
        # Ensure title is not empty
        if not attrs.get('title', '').strip():
            raise serializers.ValidationError({
                'title': 'Title cannot be empty.'
            })
        return attrs

    def create(self, validated_data):
        """Create purchase request with nested items"""
        items_data = validated_data.pop('items', [])
        requester_id = validated_data.pop('requester_id', None)

        # Set requester from context if not provided
        if requester_id is None:
            request = self.context.get('request')
            if request is None:
                raise serializers.ValidationError(
                    'Request context is required when requester_id is not provided.'
                )
            requester = request.user
            validated_data['requester'] = requester

        # Create purchase request
        purchase_request = PurchaseRequest.objects.create(**validated_data)

        # Create items (if any)
        for item_data in items_data:
            RequestItem.objects.create(request=purchase_request, **item_data)

        # Calculate and save total
        purchase_request.total_amount = purchase_request.calculate_total()
        purchase_request.save()

        return purchase_request

    def update(self, instance, validated_data):
        """Update purchase request and items"""
        items_data = validated_data.pop('items', None)

        # Update main fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()

            # Create new items
            for item_data in items_data:
                RequestItem.objects.create(request=instance, **item_data)

            # Recalculate total
            instance.total_amount = instance.calculate_total()

        instance.save()
        return instance


class PurchaseRequestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""

    requester = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequest
        fields = [
            'id',
            'requester',
            'title',
            'description',
            'status',
            'status_display',
            'total_amount',
            'item_count',
            'created_at',
            'submitted_at',
        ]

    def get_item_count(self, obj):
        """Get count of items in request"""
        return obj.items.count()


class SubmitRequestSerializer(serializers.Serializer):
    """Serializer for submitting a draft request"""

    def validate(self, attrs):
        """Ensure request can be submitted"""
        request_obj = self.context.get('request_obj')

        if not request_obj:
            raise serializers.ValidationError("Request not found.")

        if request_obj.status != PurchaseRequest.Status.DRAFT:
            raise serializers.ValidationError(
                "Only draft requests can be submitted."
            )

        if not request_obj.items.exists():
            raise serializers.ValidationError(
                "Cannot submit request without items."
            )

        return attrs

    def save(self):
        """Submit the request and create L1 approval"""
        from apps.approvals.models import Approval

        request_obj = self.context.get('request_obj')
        request_obj.status = PurchaseRequest.Status.PENDING
        request_obj.submitted_at = timezone.now()
        request_obj.save()

        # Create Level 1 approval record
        Approval.objects.get_or_create(
            request=request_obj,
            level=Approval.Level.LEVEL_1,
            defaults={
                'status': Approval.Status.PENDING,
            }
        )

        return request_obj
