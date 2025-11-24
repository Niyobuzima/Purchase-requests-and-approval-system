from rest_framework import serializers
from .models import ExportLog


class ExportRequestSerializer(serializers.Serializer):
    """Serializer for export request parameters"""

    export_type = serializers.ChoiceField(
        choices=['PURCHASE_ORDERS', 'RECEIPTS', 'SPENDING_SUMMARY', 'APPROVAL_TIMELINE'],
        required=True,
        help_text="Type of data to export"
    )
    export_format = serializers.ChoiceField(
        choices=['CSV', 'PDF'],
        default='CSV',
        help_text="Export file format"
    )
    start_date = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="Start date for filtering (YYYY-MM-DD)"
    )
    end_date = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="End date for filtering (YYYY-MM-DD)"
    )
    status_filter = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Filter by status"
    )
    vendor_filter = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Filter by vendor name"
    )

    def validate(self, data):
        """Validate date range"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'start_date': 'Start date must be before end date'
            })

        return data


class ExportLogSerializer(serializers.ModelSerializer):
    """Serializer for export log records"""

    user_name = serializers.SerializerMethodField()
    file_size_mb = serializers.SerializerMethodField()

    class Meta:
        model = ExportLog
        fields = [
            'id',
            'user',
            'user_name',
            'export_type',
            'export_format',
            'start_date',
            'end_date',
            'filters_applied',
            'record_count',
            'file_size_kb',
            'file_size_mb',
            'generated_at',
            'download_count',
        ]
        read_only_fields = ['generated_at', 'download_count']

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Unknown"

    def get_file_size_mb(self, obj):
        if obj.file_size_kb:
            return round(obj.file_size_kb / 1024, 2)
        return None
