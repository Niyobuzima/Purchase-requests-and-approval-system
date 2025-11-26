"""
User Notification Views.

This module handles user notification operations including:
- Listing notifications
- Marking notifications as read
- Getting unread counts
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.user_notifications.models import Notification
from apps.user_notifications.serializers import NotificationSerializer, NotificationListSerializer

# Import core utilities
from core.responses import APIResponse


@extend_schema(tags=['Notifications'])
@extend_schema_view(
    list=extend_schema(description='List user notifications'),
    retrieve=extend_schema(description='Get notification details'),
)
class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user notifications

    Endpoints:
    - GET /api/notifications/ - List user's notifications (paginated)
    - GET /api/notifications/{id}/ - Get notification detail
    - PATCH /api/notifications/{id}/mark-read/ - Mark notification as read
    - POST /api/notifications/mark-all-read/ - Mark all notifications as read
    - GET /api/notifications/unread-count/ - Get unread notification count
    """

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        """Return only current user's notifications"""
        return Notification.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Use list serializer for list action"""
        if self.action == 'list':
            return NotificationListSerializer
        return NotificationSerializer

    @action(detail=True, methods=['patch'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return APIResponse.success(data=serializer.data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Mark all unread notifications as read"""
        updated_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )

        return APIResponse.success(
            data={'count': updated_count},
            message=f'{updated_count} notifications marked as read'
        )

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()

        return APIResponse.success(data={'count': count})
