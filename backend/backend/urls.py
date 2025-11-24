from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/requests/', include('apps.purchase_requests.urls')),
    path('api/approvals/', include('apps.approvals.urls')),
    path('api/', include('apps.purchase_orders.urls')),
    path('api/receipts/', include('apps.receipts.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/', include('apps.reports.urls')),
]
