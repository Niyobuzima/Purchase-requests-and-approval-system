from django.contrib import admin
from .models import Receipt


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'purchase_order',
        'uploaded_by',
        'uploaded_at',
        'validation_status',
        'approved_by',
    ]
    list_filter = ['validation_status', 'uploaded_at']
    search_fields = [
        'purchase_order__po_number',
        'uploaded_by__username',
        'uploaded_by__email'
    ]
    readonly_fields = [
        'uploaded_at',
        'created_at',
        'updated_at',
        'extracted_receipt_data',
        'discrepancies'
    ]
    fieldsets = (
        ('Purchase Order', {
            'fields': ('purchase_order',)
        }),
        ('Receipt File', {
            'fields': ('receipt_file',)
        }),
        ('Upload Information', {
            'fields': ('uploaded_by', 'uploaded_at')
        }),
        ('Validation', {
            'fields': (
                'validation_status',
                'extracted_receipt_data',
                'discrepancies',
            )
        }),
        ('Finance Approval', {
            'fields': (
                'finance_comments',
                'approved_by',
                'approved_at'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
