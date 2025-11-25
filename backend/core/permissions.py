"""
Reusable permission classes.

This module provides centralized permission classes to eliminate
duplicated permission checking logic in views.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS
from typing import List, Optional

from .constants import UserRole


class IsOwner(BasePermission):
    """
    Permission check for object ownership.

    Allows access if the user owns the object (specified by owner_field).
    Read operations (GET, HEAD, OPTIONS) are allowed for all authenticated users.

    Usage:
        class MyView(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, IsOwner]
    """

    # Override this in subclass or view to specify different owner field
    owner_field = 'requester'

    def has_object_permission(self, request, view, obj):
        # Allow read operations
        if request.method in SAFE_METHODS:
            return True

        # Check ownership
        owner = getattr(obj, self.owner_field, None)
        return owner == request.user


class IsRequesterOrReadOnly(IsOwner):
    """
    Permission for resources owned by 'requester' field.
    """
    owner_field = 'requester'


class IsUploaderOrReadOnly(IsOwner):
    """
    Permission for resources owned by 'uploaded_by' field.
    """
    owner_field = 'uploaded_by'


class IsCreatorOrReadOnly(IsOwner):
    """
    Permission for resources owned by 'created_by' field.
    """
    owner_field = 'created_by'


class RolePermission(BasePermission):
    """
    Base permission class for role-based access.

    Override allowed_roles in subclass or set on view.

    Usage:
        class MyView(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, RolePermission]
            allowed_roles = ['FINANCE', 'ADMIN']
    """

    allowed_roles: List[str] = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Get allowed roles from view if specified
        view_roles = getattr(view, 'allowed_roles', None)
        roles = view_roles or self.allowed_roles

        if not roles:
            return True  # No role restriction

        user_role = getattr(request.user, 'role', None)
        return user_role in roles


class IsStaff(RolePermission):
    """Permission allowing only STAFF users"""
    allowed_roles = [UserRole.STAFF]


class IsApproverL1(RolePermission):
    """Permission allowing only APPROVER_L1 users"""
    allowed_roles = [UserRole.APPROVER_L1]


class IsApproverL2(RolePermission):
    """Permission allowing only APPROVER_L2 users"""
    allowed_roles = [UserRole.APPROVER_L2]


class IsApprover(RolePermission):
    """Permission allowing any approver (L1 or L2)"""
    allowed_roles = [UserRole.APPROVER_L1, UserRole.APPROVER_L2]


class IsFinanceUser(RolePermission):
    """Permission allowing only FINANCE users"""
    allowed_roles = [UserRole.FINANCE]


class IsAdminUser(RolePermission):
    """Permission allowing only ADMIN users"""
    allowed_roles = [UserRole.ADMIN]


class IsFinanceOrAdmin(RolePermission):
    """Permission allowing FINANCE or ADMIN users"""
    allowed_roles = [UserRole.FINANCE, UserRole.ADMIN]


class IsElevatedUser(RolePermission):
    """Permission allowing users with elevated access (FINANCE, ADMIN)"""
    allowed_roles = [UserRole.FINANCE, UserRole.ADMIN]


class CanApproveLevel(BasePermission):
    """
    Permission to check if user can approve at the required level.

    Checks the object's current status and ensures the user has
    the appropriate approver role for that level.

    Usage:
        class ApprovalView(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, CanApproveLevel]
    """

    # Status field on the object that determines approval level
    status_field = 'status'

    # Mapping of statuses to required roles
    status_role_map = {
        'PENDING_L1': UserRole.APPROVER_L1,
        'PENDING_L2': UserRole.APPROVER_L2,
    }

    def has_object_permission(self, request, view, obj):
        # Get current status
        current_status = getattr(obj, self.status_field, None)

        # Check if status requires specific role
        required_role = self.status_role_map.get(current_status)

        if required_role is None:
            # Status doesn't require approval, deny
            return False

        # Safely get user role
        user_role = getattr(request.user, 'role', None)
        if user_role is None:
            return False

        return user_role == required_role


class CanApproveRequest(CanApproveLevel):
    """Permission for approving purchase requests"""
    status_field = 'status'


class CanApproveAtLevel(BasePermission):
    """
    Permission to approve at a specific level (L1 or L2).

    Used with approval actions where the level is specified in the request.

    Usage:
        @action(detail=True, methods=['post'])
        def approve(self, request, pk=None):
            self.check_object_permissions(request, approval)
    """

    def has_object_permission(self, request, view, obj):
        # Safely get user role
        user_role = getattr(request.user, 'role', None)
        if user_role is None:
            return False

        # For approval objects
        if hasattr(obj, 'level'):
            if obj.level == 'L1':
                return user_role == UserRole.APPROVER_L1
            elif obj.level == 'L2':
                return user_role == UserRole.APPROVER_L2

        # For request objects, check status
        if hasattr(obj, 'status'):
            status = obj.status
            if status == 'PENDING_L1':
                return user_role == UserRole.APPROVER_L1
            elif status == 'PENDING_L2':
                return user_role == UserRole.APPROVER_L2

        return False


class IsOwnerOrElevated(BasePermission):
    """
    Permission allowing owner OR elevated users (FINANCE, ADMIN).

    Useful for resources that should be editable by owner
    but viewable by finance/admin.
    """

    owner_field = 'requester'

    def has_object_permission(self, request, view, obj):
        # Elevated users can do anything
        if request.user.role in [UserRole.FINANCE, UserRole.ADMIN]:
            return True

        # For safe methods, anyone can read
        if request.method in SAFE_METHODS:
            return True

        # For write operations, must be owner
        owner = getattr(obj, self.owner_field, None)
        return owner == request.user


class CanViewOrEditBasedOnRole(BasePermission):
    """
    Complex permission for role-based view/edit access.

    Configurable for different access patterns.

    Usage:
        class MyView(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, CanViewOrEditBasedOnRole]

            # Roles that can view
            view_roles = ['STAFF', 'APPROVER_L1', 'APPROVER_L2', 'FINANCE']

            # Roles that can edit
            edit_roles = ['STAFF']

            # Only owner can edit (combined with edit_roles)
            owner_can_edit = True
            owner_field = 'requester'
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            # Check view permissions
            view_roles = getattr(view, 'view_roles', None)
            if view_roles:
                return request.user.role in view_roles
            return True

        # Check edit permissions
        edit_roles = getattr(view, 'edit_roles', None)
        if edit_roles:
            return request.user.role in edit_roles
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        # Check if owner can edit
        owner_can_edit = getattr(view, 'owner_can_edit', False)
        if owner_can_edit:
            owner_field = getattr(view, 'owner_field', 'requester')
            owner = getattr(obj, owner_field, None)
            if owner != request.user:
                return False

        return True
