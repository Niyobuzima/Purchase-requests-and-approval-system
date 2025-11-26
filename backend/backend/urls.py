from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)


def health_check(request):
    """Health check endpoint"""
    return JsonResponse({'status': 'healthy'})


def api_root(request):
    """API root view with navigation links"""
    base_url = request.build_absolute_uri('/').rstrip('/')
    return JsonResponse({
        'message': 'Welcome to ProcureFlow API',
        'version': '1.0.0',
        'documentation': {
            'swagger': f'{base_url}/api/docs/',
            'redoc': f'{base_url}/api/redoc/',
            'schema': f'{base_url}/api/schema/',
        },
        'endpoints': {
            'authentication': {
                'login': f'{base_url}/api/auth/login/',
                'register': f'{base_url}/api/auth/register/',
                'logout': f'{base_url}/api/auth/logout/',
                'refresh': f'{base_url}/api/auth/refresh/',
                'profile': f'{base_url}/api/auth/profile/',
            },
            'purchase_requests': f'{base_url}/api/requests/',
            'approvals': f'{base_url}/api/approvals/',
            'purchase_orders': f'{base_url}/api/purchase-orders/',
            'receipts': f'{base_url}/api/receipts/',
            'analytics': {
                'dashboard': f'{base_url}/api/analytics/dashboard/',
                'spending': f'{base_url}/api/analytics/spending/',
                'status_distribution': f'{base_url}/api/analytics/status-distribution/',
            },
            'reports': f'{base_url}/api/reports/',
            'notifications': f'{base_url}/api/notifications/',
        },
        'admin': f'{base_url}/admin/',
        'health': f'{base_url}/api/health/',
    })


urlpatterns = [
    # Root API view
    path('', api_root, name='api_root'),

    # Health check
    path('api/health/', health_check, name='health_check'),

    # Admin
    path('admin/', admin.site.urls),

    # API Documentation (Swagger/OpenAPI)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API Endpoints
    path('api/auth/', include('apps.users.urls')),
    path('api/requests/', include('apps.purchase_requests.urls')),
    path('api/approvals/', include('apps.approvals.urls')),
    path('api/', include('apps.purchase_orders.urls')),
    path('api/receipts/', include('apps.receipts.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/', include('apps.reports.urls')),
    path('api/', include('apps.user_notifications.urls')),
]
