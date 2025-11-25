from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    """Health check endpoint"""
    return JsonResponse({'status': 'healthy'})


urlpatterns = [
    path('api/health/', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/requests/', include('apps.purchase_requests.urls')),
    path('api/approvals/', include('apps.approvals.urls')),
    path('api/', include('apps.purchase_orders.urls')),
    path('api/receipts/', include('apps.receipts.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/', include('apps.reports.urls')),
    path('api/', include('apps.user_notifications.urls')),
]
