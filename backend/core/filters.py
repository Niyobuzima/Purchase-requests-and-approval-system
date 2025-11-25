"""
Filter utilities and mixins.

This module provides centralized filtering utilities to eliminate
duplicated filtering logic across the codebase.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from django.db.models import QuerySet, Q

from .constants import UserRole


def apply_date_range_filter(
    queryset: QuerySet,
    field_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    date_format: str = '%Y-%m-%d'
) -> QuerySet:
    """
    Apply date range filter to queryset.

    Args:
        queryset: Django queryset
        field_name: Name of the date field to filter
        start_date: Start date string or datetime
        end_date: End date string or datetime
        date_format: Format string for parsing date strings

    Returns:
        Filtered queryset
    """
    if start_date:
        if isinstance(start_date, str):
            try:
                start_date = datetime.strptime(start_date, date_format)
            except ValueError:
                pass  # Invalid date format, skip filter
        if isinstance(start_date, datetime):
            queryset = queryset.filter(**{f'{field_name}__date__gte': start_date.date()})
        elif hasattr(start_date, 'date'):
            queryset = queryset.filter(**{f'{field_name}__date__gte': start_date})

    if end_date:
        if isinstance(end_date, str):
            try:
                end_date = datetime.strptime(end_date, date_format)
            except ValueError:
                pass  # Invalid date format, skip filter
        if isinstance(end_date, datetime):
            queryset = queryset.filter(**{f'{field_name}__date__lte': end_date.date()})
        elif hasattr(end_date, 'date'):
            queryset = queryset.filter(**{f'{field_name}__date__lte': end_date})

    return queryset


def apply_search_filter(
    queryset: QuerySet,
    search_value: str,
    search_fields: List[str],
    include_id_search: bool = True
) -> QuerySet:
    """
    Apply text search across multiple fields.

    Args:
        queryset: Django queryset
        search_value: Search string
        search_fields: List of field names to search
        include_id_search: Whether to also search by ID if value is numeric

    Returns:
        Filtered queryset
    """
    if not search_value:
        return queryset

    search_value = search_value.strip()
    if not search_value:
        return queryset

    # Build Q objects for each field
    conditions = Q()
    for field in search_fields:
        conditions |= Q(**{f'{field}__icontains': search_value})

    # Add ID search if value is numeric
    if include_id_search:
        try:
            id_value = int(search_value)
            conditions |= Q(id=id_value)
        except (ValueError, TypeError):
            pass

    return queryset.filter(conditions)


class RoleBasedQuerysetMixin:
    """
    Mixin for role-based queryset filtering.

    Eliminates the duplicated pattern of filtering querysets based on user role
    that appears 6+ times in the codebase.

    Usage:
        class MyViewSet(RoleBasedQuerysetMixin, viewsets.ModelViewSet):
            # Define role filters for each role
            role_filters = {
                'STAFF': {'requester': 'user'},  # 'user' means request.user
                'APPROVER_L1': {'status__in': ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'REJECTED']},
                'APPROVER_L2': {'status__in': ['PENDING_L2', 'APPROVED', 'REJECTED']},
                'FINANCE': {},  # No filter - see all
                'ADMIN': {},    # No filter - see all
            }

            def get_queryset(self):
                queryset = super().get_queryset()
                return self.filter_queryset_by_role(queryset)
    """

    # Override this in your view
    role_filters: Dict[str, Dict[str, Any]] = {}

    # Field name for filtering by current user
    user_field = 'requester'

    def filter_queryset_by_role(
        self,
        queryset: QuerySet,
        user=None
    ) -> QuerySet:
        """
        Filter queryset based on user role.

        Args:
            queryset: Base queryset
            user: User instance (defaults to request.user)

        Returns:
            Filtered queryset
        """
        if user is None:
            user = self.request.user

        role = getattr(user, 'role', None)

        if not role or role not in self.role_filters:
            # Default to filtering by user if no role filter defined
            return queryset.filter(**{self.user_field: user})

        filters = self.role_filters.get(role, {})

        if not filters:
            # Empty dict means no filtering (see all)
            return queryset

        # Process filters
        processed_filters = {}
        for key, value in filters.items():
            if value == 'user':
                # Special value to filter by current user
                processed_filters[key] = user
            else:
                processed_filters[key] = value

        return queryset.filter(**processed_filters)

    def get_queryset_for_staff(self, queryset: QuerySet, user) -> QuerySet:
        """Override to customize staff queryset"""
        return queryset.filter(**{self.user_field: user})

    def get_queryset_for_approver_l1(self, queryset: QuerySet, user) -> QuerySet:
        """Override to customize L1 approver queryset"""
        return queryset

    def get_queryset_for_approver_l2(self, queryset: QuerySet, user) -> QuerySet:
        """Override to customize L2 approver queryset"""
        return queryset

    def get_queryset_for_finance(self, queryset: QuerySet, user) -> QuerySet:
        """Override to customize finance queryset"""
        return queryset

    def get_queryset_for_admin(self, queryset: QuerySet, user) -> QuerySet:
        """Override to customize admin queryset"""
        return queryset


# Pre-defined role filter configurations for common models

PURCHASE_REQUEST_ROLE_FILTERS = {
    UserRole.STAFF: {'requester': 'user'},
    UserRole.APPROVER_L1: {},  # See all for approval
    UserRole.APPROVER_L2: {},  # See all for approval
    UserRole.FINANCE: {},      # See all
    UserRole.ADMIN: {},        # See all
}

PURCHASE_ORDER_ROLE_FILTERS = {
    UserRole.STAFF: {'request__requester': 'user'},
    UserRole.APPROVER_L1: {},
    UserRole.APPROVER_L2: {},
    UserRole.FINANCE: {},
    UserRole.ADMIN: {},
}

RECEIPT_ROLE_FILTERS = {
    UserRole.STAFF: {'uploaded_by': 'user'},
    UserRole.APPROVER_L1: {},
    UserRole.APPROVER_L2: {},
    UserRole.FINANCE: {},
    UserRole.ADMIN: {},
}

APPROVAL_ROLE_FILTERS = {
    UserRole.STAFF: {},  # Staff can see approvals on their requests
    UserRole.APPROVER_L1: {'level': 'L1'},
    UserRole.APPROVER_L2: {'level': 'L2'},
    UserRole.FINANCE: {},
    UserRole.ADMIN: {},
}


class DateRangeFilterMixin:
    """
    Mixin for adding date range filtering to views.

    Usage:
        class MyViewSet(DateRangeFilterMixin, viewsets.ModelViewSet):
            date_field = 'created_at'  # Field to filter on

            def get_queryset(self):
                queryset = super().get_queryset()
                return self.apply_date_filters(queryset)
    """

    date_field = 'created_at'
    start_date_param = 'start_date'
    end_date_param = 'end_date'

    def apply_date_filters(self, queryset: QuerySet) -> QuerySet:
        """Apply date range filters from request params"""
        start_date = self.request.query_params.get(self.start_date_param)
        end_date = self.request.query_params.get(self.end_date_param)

        return apply_date_range_filter(
            queryset,
            self.date_field,
            start_date,
            end_date
        )


class SearchFilterMixin:
    """
    Mixin for adding search functionality to views.

    Usage:
        class MyViewSet(SearchFilterMixin, viewsets.ModelViewSet):
            search_fields = ['title', 'description', 'vendor_name']

            def get_queryset(self):
                queryset = super().get_queryset()
                return self.apply_search_filters(queryset)
    """

    search_param = 'search'
    search_fields: List[str] = []
    include_id_search = True

    def apply_search_filters(self, queryset: QuerySet) -> QuerySet:
        """Apply search filters from request params"""
        search_value = self.request.query_params.get(self.search_param)

        if not search_value or not self.search_fields:
            return queryset

        return apply_search_filter(
            queryset,
            search_value,
            self.search_fields,
            self.include_id_search
        )
