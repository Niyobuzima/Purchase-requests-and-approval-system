import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:

    def test_create_user(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            role=User.Role.STAFF,
        )

        assert user.id is not None
        assert user.email == 'test@example.com'
        assert user.role == User.Role.STAFF
        assert user.check_password('password123')

    def test_user_role_properties(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            role=User.Role.APPROVER_L1,
        )

        assert user.is_approver_l1 is True
        assert user.is_staff_user is False
        assert user.is_approver_l2 is False
        assert user.is_finance_user is False

    def test_email_unique_constraint(self):
        User.objects.create_user(
            username='user1',
            email='test@example.com',
            password='password123',
        )

        with pytest.raises(Exception):
            User.objects.create_user(
                username='user2',
                email='test@example.com',
                password='password123',
            )
