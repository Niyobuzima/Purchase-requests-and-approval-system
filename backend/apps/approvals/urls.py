from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.approvals.views import ApprovalViewSet

router = DefaultRouter()
router.register(r'', ApprovalViewSet, basename='approval')

urlpatterns = [
    path('', include(router.urls)),
]
