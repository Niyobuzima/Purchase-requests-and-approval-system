"""
User Views.

This module handles user management operations including:
- Registration and authentication
- Profile management
- Password changes
- Admin user management
"""

from rest_framework import status, generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from django_filters import rest_framework as filters

from apps.users.serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    AdminCreateUserSerializer,
)
from apps.users.permissions import IsAdmin

# Import core utilities
from core.responses import APIResponse
from core.logging_utils import app_logger, log_view_action, audit_log
from core.constants import ErrorCode

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """User registration endpoint"""

    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        # Audit log
        audit_log(
            action='REGISTER',
            user=user,
            resource_type='User',
            resource_id=user.id,
            details={'email': user.email},
            request=request
        )

        app_logger.info(
            f"New user registered: {user.email}",
            user_id=user.id
        )

        return APIResponse.created(
            data={
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            },
            message="Registration successful"
        )


class LoginView(generics.GenericAPIView):
    """User login endpoint"""

    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Authenticate using email (USERNAME_FIELD)
        user = authenticate(request, username=email, password=password)

        if not user:
            app_logger.warning(
                f"Failed login attempt for email: {email}",
                email=email
            )
            return APIResponse.unauthorized(
                message="Invalid credentials"
            )

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        # Audit log
        audit_log(
            action='LOGIN',
            user=user,
            resource_type='User',
            resource_id=user.id,
            request=request
        )

        app_logger.info(
            f"User logged in: {user.email}",
            user_id=user.id
        )

        return APIResponse.success(
            data={
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            },
            message="Login successful"
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get/Update user profile"""

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """Change user password"""

    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        # Check old password
        if not user.check_password(serializer.validated_data['old_password']):
            return APIResponse.validation_error(
                errors={'old_password': ['Wrong password']},
                message="Current password is incorrect"
            )

        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        # Audit log
        audit_log(
            action='CHANGE_PASSWORD',
            user=user,
            resource_type='User',
            resource_id=user.id,
            request=request
        )

        app_logger.info(
            f"Password changed for user: {user.email}",
            user_id=user.id
        )

        return APIResponse.success(message="Password updated successfully")


class LogoutView(generics.GenericAPIView):
    """Logout endpoint - blacklist refresh token"""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data.get('refresh_token')
            if not refresh_token:
                return APIResponse.validation_error(
                    errors={'refresh_token': ['Refresh token is required']},
                    message="Refresh token is required"
                )

            # Blacklist the refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()

            # Audit log
            audit_log(
                action='LOGOUT',
                user=request.user,
                resource_type='User',
                resource_id=request.user.id,
                request=request
            )

            app_logger.info(
                f"User logged out: {request.user.email}",
                user_id=request.user.id
            )

            return APIResponse.success(
                message="Logout successful",
                status_code=status.HTTP_205_RESET_CONTENT
            )
        except TokenError:
            return APIResponse.error(
                message="Invalid or expired token",
                code=ErrorCode.INVALID_TOKEN
            )
        except Exception as e:
            app_logger.error(
                f"Unexpected error during logout: {e}",
                exc_info=True,
                user_id=request.user.id
            )
            return APIResponse.server_error(
                message="Logout failed due to an unexpected error"
            )


# ========================================
# Admin Dashboard Views
# ========================================

class UserFilter(filters.FilterSet):
    """Filter for user list"""
    role = filters.CharFilter(field_name='role')
    is_active = filters.BooleanFilter(field_name='is_active')
    search = filters.CharFilter(method='filter_search')

    class Meta:
        model = User
        fields = ['role', 'is_active']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(email__icontains=value) |
            Q(username__icontains=value) |
            Q(first_name__icontains=value) |
            Q(last_name__icontains=value)
        )


class AdminUserListView(generics.ListCreateAPIView):
    """Admin view to list all users and create new users"""

    permission_classes = [IsAdmin]
    filterset_class = UserFilter
    filter_backends = [filters.DjangoFilterBackend]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminCreateUserSerializer
        return AdminUserSerializer

    def get_queryset(self):
        return User.objects.all().order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Audit log
        audit_log(
            action='ADMIN_CREATE_USER',
            user=request.user,
            resource_type='User',
            resource_id=user.id,
            details={
                'created_email': user.email,
                'created_role': user.role,
            },
            request=request
        )

        app_logger.info(
            f"Admin {request.user.email} created user: {user.email}",
            admin_id=request.user.id,
            created_user_id=user.id
        )

        return APIResponse.created(
            data=AdminUserSerializer(user).data,
            message="User created successfully"
        )


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin view to get, update, or delete a single user"""

    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AdminUserUpdateSerializer
        return AdminUserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # Prevent admin from changing their own role
        if instance == request.user and 'role' in serializer.validated_data:
            if serializer.validated_data['role'] != instance.role:
                return APIResponse.error(
                    message="You cannot change your own role",
                    code=ErrorCode.PERMISSION_DENIED
                )

        # Prevent admin from deactivating themselves
        if instance == request.user and 'is_active' in serializer.validated_data:
            if serializer.validated_data['is_active'] is False:
                return APIResponse.error(
                    message="You cannot deactivate your own account",
                    code=ErrorCode.PERMISSION_DENIED
                )

        self.perform_update(serializer)

        # Audit log
        audit_log(
            action='ADMIN_UPDATE_USER',
            user=request.user,
            resource_type='User',
            resource_id=instance.id,
            details={
                'updated_email': instance.email,
                'changes': list(serializer.validated_data.keys()),
            },
            request=request
        )

        app_logger.info(
            f"Admin {request.user.email} updated user: {instance.email}",
            admin_id=request.user.id,
            updated_user_id=instance.id
        )

        return APIResponse.success(
            data=AdminUserSerializer(instance).data,
            message="User updated successfully"
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Prevent admin from deleting themselves
        if instance == request.user:
            return APIResponse.error(
                message="You cannot delete your own account",
                code=ErrorCode.PERMISSION_DENIED
            )

        # Audit log before deletion
        audit_log(
            action='ADMIN_DELETE_USER',
            user=request.user,
            resource_type='User',
            resource_id=instance.id,
            details={
                'deleted_email': instance.email,
                'deleted_role': instance.role,
            },
            request=request
        )

        app_logger.info(
            f"Admin {request.user.email} deleted user: {instance.email}",
            admin_id=request.user.id,
            deleted_user_id=instance.id
        )

        self.perform_destroy(instance)
        return APIResponse.success(
            message="User deleted successfully",
            status_code=status.HTTP_204_NO_CONTENT
        )


class AdminDashboardStatsView(APIView):
    """Admin dashboard statistics"""

    permission_classes = [IsAdmin]

    def get(self, request):
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        inactive_users = User.objects.filter(is_active=False).count()

        # Users by role
        users_by_role = User.objects.values('role').annotate(
            count=Count('id')
        ).order_by('role')

        role_stats = {item['role']: item['count'] for item in users_by_role}

        # Recent users (last 10)
        recent_users = User.objects.order_by('-created_at')[:10]

        return APIResponse.success(data={
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'users_by_role': role_stats,
            'recent_users': AdminUserSerializer(recent_users, many=True).data,
        })
