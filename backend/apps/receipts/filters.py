import django_filters
from django.db.models import Q
from .models import Receipt


class ReceiptFilter(django_filters.FilterSet):
    """FilterSet for Receipts with advanced filtering"""
    search = django_filters.CharFilter(method='search_filter', label='Search')
    validation_status = django_filters.MultipleChoiceFilter(
        choices=Receipt.VALIDATION_STATUS_CHOICES,
        label='Validation Status'
    )
    uploaded_after = django_filters.DateFilter(
        field_name='uploaded_at',
        lookup_expr='gte',
        label='Uploaded After'
    )
    uploaded_before = django_filters.DateFilter(
        field_name='uploaded_at',
        lookup_expr='lte',
        label='Uploaded Before'
    )
    approved_after = django_filters.DateFilter(
        field_name='approved_at',
        lookup_expr='gte',
        label='Approved After'
    )
    approved_before = django_filters.DateFilter(
        field_name='approved_at',
        lookup_expr='lte',
        label='Approved Before'
    )
    po_number = django_filters.CharFilter(
        field_name='purchase_order__po_number',
        lookup_expr='icontains',
        label='PO Number'
    )
    vendor = django_filters.CharFilter(
        field_name='purchase_order__request__vendor_name',
        lookup_expr='icontains',
        label='Vendor Name'
    )
    has_discrepancies = django_filters.BooleanFilter(
        method='filter_has_discrepancies',
        label='Has Discrepancies'
    )

    class Meta:
        model = Receipt
        fields = ['uploaded_by', 'approved_by']

    def search_filter(self, queryset, name, value):
        """
        Search across all visible fields:
        - Receipt ID (exact match if number)
        - PO Number
        - Request Title
        - Vendor Name
        - Uploaded By (first name, last name, username)
        - Finance Comments
        """
        # Try to convert value to int for ID search
        try:
            id_value = int(value)
            return queryset.filter(
                Q(id=id_value) |
                Q(purchase_order__po_number__icontains=value) |
                Q(purchase_order__request__title__icontains=value) |
                Q(purchase_order__request__vendor_name__icontains=value) |
                Q(uploaded_by__first_name__icontains=value) |
                Q(uploaded_by__last_name__icontains=value) |
                Q(uploaded_by__username__icontains=value) |
                Q(finance_comments__icontains=value)
            )
        except ValueError:
            # If not a number, search text fields
            return queryset.filter(
                Q(purchase_order__po_number__icontains=value) |
                Q(purchase_order__request__title__icontains=value) |
                Q(purchase_order__request__vendor_name__icontains=value) |
                Q(uploaded_by__first_name__icontains=value) |
                Q(uploaded_by__last_name__icontains=value) |
                Q(uploaded_by__username__icontains=value) |
                Q(finance_comments__icontains=value)
            )

    def filter_has_discrepancies(self, queryset, name, value):
        """Filter receipts with or without discrepancies"""
        if value:
            return queryset.filter(validation_status='DISCREPANCY')
        else:
            return queryset.exclude(validation_status='DISCREPANCY')
