from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsStaffUser(permissions.BasePermission):
    """Permission check for STAFF role"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.STAFF
        )


class IsRequesterOrReadOnly(permissions.BasePermission):
    """
    Allow requester to edit/delete their own requests.
    Others can only read.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions for anyone authenticated
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for the requester
        return obj.requester == request.user


class CanCreatePurchaseRequest(permissions.BasePermission):
    """Only STAFF users can create purchase requests"""

    def has_permission(self, request, view):
        if request.method == 'POST':
            return (
                request.user and
                request.user.is_authenticated and
                request.user.role == User.Role.STAFF
            )
        return request.user and request.user.is_authenticated
