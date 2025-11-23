from rest_framework import permissions


class IsApproverL1(permissions.BasePermission):
    """Permission class for Level 1 approvers"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'APPROVER_L1'
        )


class IsApproverL2(permissions.BasePermission):
    """Permission class for Level 2 approvers"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'APPROVER_L2'
        )


class IsApprover(permissions.BasePermission):
    """Permission class for any approver (L1 or L2)"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['APPROVER_L1', 'APPROVER_L2']
        )
