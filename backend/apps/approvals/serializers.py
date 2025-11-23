from rest_framework import serializers
from apps.approvals.models import Approval
from apps.users.serializers import UserSerializer


class ApprovalSerializer(serializers.ModelSerializer):
    """Serializer for Approval model"""

    approver_details = UserSerializer(source='approver', read_only=True)
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    request_title = serializers.CharField(source='request.title', read_only=True)
    request_total = serializers.DecimalField(
        source='request.total_amount',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    requester_name = serializers.SerializerMethodField()

    class Meta:
        model = Approval
        fields = [
            'id',
            'request',
            'request_title',
            'request_total',
            'requester_name',
            'approver',
            'approver_details',
            'level',
            'level_display',
            'status',
            'status_display',
            'comments',
            'approved_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'approver',
            'approved_at',
            'created_at',
            'updated_at',
        ]

    def get_requester_name(self, obj):
        """Get requester's full name"""
        if obj.request and obj.request.requester:
            user = obj.request.requester
            if user.first_name and user.last_name:
                return f"{user.first_name} {user.last_name}"
            return user.username
        return "Unknown"


class ApprovalActionSerializer(serializers.Serializer):
    """Serializer for approve/reject actions"""

    comments = serializers.CharField(required=False, allow_blank=True)

    def validate_comments(self, value):
        """Ensure comments are provided for rejections"""
        # This will be checked in the view if action is 'reject'
        return value
