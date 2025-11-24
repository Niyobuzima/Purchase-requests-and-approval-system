from django.apps import AppConfig


class UserNotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.user_notifications'

    def ready(self):
        import apps.user_notifications.signals
