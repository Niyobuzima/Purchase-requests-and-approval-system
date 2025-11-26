"""
Custom pagination classes for the API.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class SafePageNumberPagination(PageNumberPagination):
    """
    Custom pagination that returns an empty page instead of 404 for out-of-range pages.

    This prevents race conditions on the frontend where:
    1. User is on page 2 with page_size=20
    2. User changes page_size to 10 (which resets to page 1)
    3. But a stale request for page 2 with new page_size might still be in flight
    4. Standard DRF pagination would return 404, causing errors

    With this class, out-of-range pages return an empty results list with correct metadata.
    """

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        """
        Override to handle out-of-range pages gracefully.
        """
        from django.core.paginator import InvalidPage

        page_size = self.get_page_size(request)
        if not page_size:
            return None

        paginator = self.django_paginator_class(queryset, page_size)
        page_number = self.get_page_number(request, paginator)

        try:
            self.page = paginator.page(page_number)
        except InvalidPage:
            # Instead of raising NotFound, return empty results
            # Store metadata for get_paginated_response
            self.page = None
            self._paginator = paginator
            self._page_number = page_number
            self._page_size = page_size
            return []

        if paginator.num_pages > 1 and self.template is not None:
            self.display_page_controls = True

        self.request = request
        return list(self.page)

    def get_paginated_response(self, data):
        """
        Override to handle empty page case.
        """
        if self.page is None:
            # Out-of-range page - return empty results with correct metadata
            return Response({
                'count': self._paginator.count,
                'next': None,
                'previous': None,
                'results': []
            })

        return super().get_paginated_response(data)
