from rest_framework.permissions import BasePermission


class IsFinanceUser(BasePermission):
    """
    Custom permission to only allow finance users to access reports
    """
    message = 'Only Finance users can access this resource.'

    def has_permission(self, request, view):
        """
        Check if user is authenticated and has FINANCE role
        """
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role == 'FINANCE'
        )
