from rest_framework import permissions
from apps.users.models import User


class IsStaff(permissions.BasePermission):
    """Permission for staff users"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.STAFF
        )


class IsApproverL1(permissions.BasePermission):
    """Permission for Level 1 approvers"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.APPROVER_L1
        )


class IsApproverL2(permissions.BasePermission):
    """Permission for Level 2 approvers"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.APPROVER_L2
        )


class IsFinance(permissions.BasePermission):
    """Permission for finance users"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.FINANCE
        )


class IsApprover(permissions.BasePermission):
    """Permission for any approver (L1 or L2)"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [User.Role.APPROVER_L1, User.Role.APPROVER_L2]
        )


class IsAdmin(permissions.BasePermission):
    """Permission for admin users"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.ADMIN
        )
