from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with role-based access"""

    class Role(models.TextChoices):
        STAFF = 'STAFF', 'Staff'
        APPROVER_L1 = 'APPROVER_L1', 'Approver Level 1'
        APPROVER_L2 = 'APPROVER_L2', 'Approver Level 2'
        FINANCE = 'FINANCE', 'Finance'
        ADMIN = 'ADMIN', 'Administrator'

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STAFF,
    )
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def full_name(self) -> str:
        """
        Return user's full name or username as fallback.
        
        """
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        return self.username

    @property
    def is_staff_user(self):
        return self.role == self.Role.STAFF

    @property
    def is_approver_l1(self):
        return self.role == self.Role.APPROVER_L1

    @property
    def is_approver_l2(self):
        return self.role == self.Role.APPROVER_L2

    @property
    def is_finance_user(self):
        return self.role == self.Role.FINANCE

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN
