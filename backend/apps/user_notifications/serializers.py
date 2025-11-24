from rest_framework import serializers
from apps.user_notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    # Expose IDs for frontend compatibility while using ForeignKey relationships
    # Using PrimaryKeyRelatedField to safely handle None values
    request_id = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True, source='request')
    po_id = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True, source='purchase_order')
    receipt_id = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True, source='receipt')

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'link',
            'request_id',
            'po_id',
            'receipt_id',
            'is_read',
            'created_at',
            'read_at',
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing notifications"""

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'link',
            'is_read',
            'created_at',
        ]
        read_only_fields = fields
