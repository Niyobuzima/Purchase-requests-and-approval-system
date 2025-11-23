from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.purchase_orders import views

router = DefaultRouter()
router.register(r'purchase-orders', views.PurchaseOrderViewSet, basename='purchase-order')

urlpatterns = [
    path('', include(router.urls)),
]
