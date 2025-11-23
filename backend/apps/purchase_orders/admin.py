from django.contrib import admin
from apps.purchase_orders.models import PurchaseOrder


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'request', 'generated_at', 'has_pdf')
    list_filter = ('generated_at',)
    search_fields = ('po_number', 'request__title')
    readonly_fields = ('po_number', 'generated_at', 'created_at', 'updated_at')

    def has_pdf(self, obj):
        return bool(obj.pdf_file)
    has_pdf.boolean = True
    has_pdf.short_description = 'PDF Generated'
