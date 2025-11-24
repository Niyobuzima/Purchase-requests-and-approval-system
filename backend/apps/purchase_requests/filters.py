import django_filters
from django.db.models import Q
from .models import PurchaseRequest, RequestItem


class PurchaseRequestFilter(django_filters.FilterSet):
    """FilterSet for Purchase Requests with advanced filtering"""
    search = django_filters.CharFilter(method='search_filter', label='Search')
    status = django_filters.MultipleChoiceFilter(
        choices=PurchaseRequest.Status.choices,
        label='Status'
    )
    created_after = django_filters.DateFilter(
        field_name='created_at',
        lookup_expr='gte',
        label='Created After'
    )
    created_before = django_filters.DateFilter(
        field_name='created_at',
        lookup_expr='lte',
        label='Created Before'
    )
    amount_min = django_filters.NumberFilter(
        field_name='total_amount',
        lookup_expr='gte',
        label='Minimum Amount'
    )
    amount_max = django_filters.NumberFilter(
        field_name='total_amount',
        lookup_expr='lte',
        label='Maximum Amount'
    )
    vendor = django_filters.CharFilter(
        field_name='vendor_name',
        lookup_expr='icontains',
        label='Vendor Name'
    )

    class Meta:
        model = PurchaseRequest
        fields = ['status', 'requester']

    def search_filter(self, queryset, name, value):
        """Search across title, description, vendor name, and ID"""
        # Build base text search conditions
        search_conditions = (
            Q(title__icontains=value) |
            Q(description__icontains=value) |
            Q(vendor_name__icontains=value)
        )
        
        # Try to convert value to integer for ID search
        try:
            id_value = int(value.strip())
            # If successful, add ID equality check
            search_conditions |= Q(id=id_value)
        except (ValueError, AttributeError):
            # If conversion fails, skip ID filter (value is not numeric)
            pass
        
        return queryset.filter(search_conditions)


class RequestItemFilter(django_filters.FilterSet):
    """FilterSet for Request Items"""
    search = django_filters.CharFilter(method='search_filter', label='Search')
    quantity_min = django_filters.NumberFilter(
        field_name='quantity',
        lookup_expr='gte',
        label='Minimum Quantity'
    )
    quantity_max = django_filters.NumberFilter(
        field_name='quantity',
        lookup_expr='lte',
        label='Maximum Quantity'
    )
    unit_price_min = django_filters.NumberFilter(
        field_name='unit_price',
        lookup_expr='gte',
        label='Minimum Unit Price'
    )
    unit_price_max = django_filters.NumberFilter(
        field_name='unit_price',
        lookup_expr='lte',
        label='Maximum Unit Price'
    )

    class Meta:
        model = RequestItem
        fields = ['request']

    def search_filter(self, queryset, name, value):
        """Search across item description"""
        return queryset.filter(
            Q(description__icontains=value)
        )
