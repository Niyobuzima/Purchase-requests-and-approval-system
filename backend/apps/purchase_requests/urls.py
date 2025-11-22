from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.purchase_requests.views import PurchaseRequestViewSet

router = DefaultRouter()
router.register(r'', PurchaseRequestViewSet, basename='purchase-request')

urlpatterns = [
    path('', include(router.urls)),
]
