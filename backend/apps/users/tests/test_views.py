import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestAuthenticationAPI:

    def test_register_user(self, api_client):
        url = reverse('register')
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'role': 'STAFF',
            'first_name': 'Test',
            'last_name': 'User',
        }

        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert 'user' in response.data
        assert 'tokens' in response.data
        assert response.data['user']['email'] == 'test@example.com'
        assert 'access' in response.data['tokens']
        assert 'refresh' in response.data['tokens']

    def test_register_password_mismatch(self, api_client):
        url = reverse('register')
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password2': 'DifferentPass123!',
            'role': 'STAFF',
        }

        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data

    def test_login_success(self, api_client):
        # Create user
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!',
            role=User.Role.STAFF,
        )

        url = reverse('login')
        data = {
            'email': 'test@example.com',
            'password': 'SecurePass123!',
        }

        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'user' in response.data
        assert 'tokens' in response.data
        assert response.data['user']['email'] == 'test@example.com'

    def test_login_invalid_credentials(self, api_client):
        url = reverse('login')
        data = {
            'email': 'wrong@example.com',
            'password': 'wrongpassword',
        }

        response = api_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_profile(self, api_client):
        # Create and authenticate user
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!',
            role=User.Role.STAFF,
        )
        api_client.force_authenticate(user=user)

        url = reverse('user-profile')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'test@example.com'
        assert response.data['role'] == 'STAFF'

    def test_get_profile_unauthenticated(self, api_client):
        url = reverse('user-profile')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
