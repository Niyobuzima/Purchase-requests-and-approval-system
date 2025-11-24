from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.user_notifications.models import Notification
from apps.user_notifications.serializers import NotificationSerializer, NotificationListSerializer


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
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Mark all unread notifications as read"""
        from django.utils import timezone

        updated_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )

        return Response({
            'message': f'{updated_count} notifications marked as read',
            'count': updated_count
        })

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()

        return Response({'count': count})
