from django.contrib import admin
from .models import ExportLog


@admin.register(ExportLog)
class ExportLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'export_type', 'export_format', 'record_count', 'generated_at']
    list_filter = ['export_type', 'export_format', 'generated_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['generated_at']
    date_hierarchy = 'generated_at'
