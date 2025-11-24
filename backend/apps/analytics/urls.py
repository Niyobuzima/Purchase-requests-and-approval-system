from django.urls import path
from .views import (
    DashboardStatsView,
    SpendingAnalyticsView,
    PendingReceiptsView,
    RequestStatusDistributionView,
)

urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('spending/', SpendingAnalyticsView.as_view(), name='spending-analytics'),
    path('receipts/pending/', PendingReceiptsView.as_view(), name='pending-receipts'),
    path('requests/status-distribution/', RequestStatusDistributionView.as_view(), name='status-distribution'),
]
