import django_filters
from django.db.models import Q
from .models import PurchaseOrder


class PurchaseOrderFilter(django_filters.FilterSet):
    """FilterSet for Purchase Orders with advanced filtering"""
    search = django_filters.CharFilter(method='search_filter', label='Search')
    status = django_filters.MultipleChoiceFilter(
        field_name='request__status',
        choices=[
            ('APPROVED', 'Approved'),
        ],
        label='Request Status'
    )
    generated_after = django_filters.DateFilter(
        field_name='generated_at',
        lookup_expr='gte',
        label='Generated After'
    )
    generated_before = django_filters.DateFilter(
        field_name='generated_at',
        lookup_expr='lte',
        label='Generated Before'
    )
    amount_min = django_filters.NumberFilter(
        field_name='request__total_amount',
        lookup_expr='gte',
        label='Minimum Amount'
    )
    amount_max = django_filters.NumberFilter(
        field_name='request__total_amount',
        lookup_expr='lte',
        label='Maximum Amount'
    )
    vendor = django_filters.CharFilter(
        field_name='request__vendor_name',
        lookup_expr='icontains',
        label='Vendor Name'
    )

    class Meta:
        model = PurchaseOrder
        fields = ['request__requester']

    def search_filter(self, queryset, name, value):
        """Search across PO number, request title, vendor name, description, and requester"""
        return queryset.filter(
            Q(po_number__icontains=value) |
            Q(request__title__icontains=value) |
            Q(request__vendor_name__icontains=value) |
            Q(request__description__icontains=value) |
            Q(request__requester__first_name__icontains=value) |
            Q(request__requester__last_name__icontains=value) |
            Q(request__requester__username__icontains=value)
        )
