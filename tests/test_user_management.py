"""
Integration tests for user management operations.

Tests user CRUD operations including:
- Creating users with different roles
- Updating user details and roles
- Deleting users
- Password reset functionality
- User listing and filtering
"""

import pytest
import time
from typing import Dict, Any


class TestUserManagement:
    """Test suite for user management operations."""

    def test_create_user_success(self, api_client, admin_token):
        """Test creating a new user successfully."""
        user_data = {
            "email": f"testuser_{int(time.time())}@example.com",
            "name": "Test User",
            "role": "author",
            "password": "TestPassword123!"
        }
        
        response = api_client.post(
            "/api/v1/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["name"] == user_data["name"]
        assert data["role"] == user_data["role"]
        assert "id" in data
        assert "password" not in data
        assert "created_at" in data

    def test_create_user_invalid_email(self, api_client, admin_token):
        """Test creating user with invalid email format."""
        user_data = {
            "email": "invalid-email",
            "name": "Test User",
            "role": "author",
            "password": "TestPassword123!"
        }
        
        response = api_client.post(
            "/api/v1/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400
        assert "email" in response.json()["message"].lower()

    @pytest.mark.skip(reason="Requires real Cognito password validation")
    def test_create_user_weak_password(self, api_client, admin_token):
        """Test creating user with weak password."""
        user_data = {
            "email": f"testuser_{int(time.time())}@example.com",
            "name": "Test User",
            "role": "author",
            "password": "weak"
        }
        
        response = api_client.post(
            "/api/v1/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400
        assert "password" in response.json()["message"].lower()

    def test_create_user_invalid_role(self, api_client, admin_token):
        """Test creating user with invalid role."""
        user_data = {
            "email": f"testuser_{int(time.time())}@example.com",
            "name": "Test User",
            "role": "superadmin",
            "password": "TestPassword123!"
        }
        
        response = api_client.post(
            "/api/v1/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400
        assert "role" in response.json()["message"].lower()

    def test_create_user_duplicate_email(self, api_client, admin_token, test_user):
        """Test creating user with duplicate email."""
        user_data = {
            "email": test_user["email"],
            "name": "Duplicate User",
            "role": "author",
            "password": "TestPassword123!"
        }
        
        response = api_client.post(
            "/api/v1/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 409
        assert "already exists" in response.json()["message"].lower()

    def test_create_user_unauthorized(self, api_client, author_token):
        """Test creating user without admin privileges."""
        user_data = {
            "email": f"testuser_{int(time.time())}@example.com",
            "name": "Test User",
            "role": "author",
            "password": "TestPassword123!"
        }
        
        response = api_client.post(
            "/api/v1/users",
            json=user_data,
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        assert response.status_code == 403

    def test_update_user_success(self, api_client, admin_token, test_user):
        """Test updating user details successfully."""
        update_data = {
            "name": "Updated Name",
            "role": "editor"
        }
        
        response = api_client.put(
            f"/api/v1/users/{test_user['id']}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["role"] == update_data["role"]

    def test_update_user_email(self, api_client, admin_token, test_user):
        """Test updating user email."""
        update_data = {
            "email": f"newemail_{int(time.time())}@example.com"
        }
        
        response = api_client.put(
            f"/api/v1/users/{test_user['id']}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == update_data["email"]

    def test_update_user_invalid_role(self, api_client, admin_token, test_user):
        """Test updating user with invalid role."""
        update_data = {
            "role": "invalid_role"
        }
        
        response = api_client.put(
            f"/api/v1/users/{test_user['id']}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400

    def test_update_user_not_found(self, api_client, admin_token):
        """Test updating non-existent user."""
        update_data = {
            "name": "Updated Name"
        }
        
        response = api_client.put(
            "/api/v1/users/nonexistent-id",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404

    def test_update_user_unauthorized(self, api_client, author_token, test_user):
        """Test updating user without admin privileges."""
        update_data = {
            "name": "Updated Name"
        }
        
        response = api_client.put(
            f"/api/v1/users/{test_user['id']}",
            json=update_data,
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        assert response.status_code == 403

    def test_delete_user_success(self, api_client, admin_token):
        """Test deleting user successfully."""
        # Create a user to delete
        user_data = {
            "email": f"todelete_{int(time.time())}@example.com",
            "name": "To Delete",
            "role": "author",
            "password": "TestPassword123!"
        }
        
        create_response = api_client.post(
            "/api/v1/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        user_id = create_response.json()["id"]
        
        # Delete the user
        response = api_client.delete(
            f"/api/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

    @pytest.mark.skip(reason="Flaky due to fixture ordering - works in isolation")
    def test_delete_user_self_prevention(self, api_client, admin_token, admin_user):
        """Test that users cannot delete themselves."""
        response = api_client.delete(
            f"/api/v1/users/{admin_user['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400
        assert "cannot delete yourself" in response.json()["message"].lower()

    def test_delete_user_not_found(self, api_client, admin_token):
        """Test deleting non-existent user."""
        response = api_client.delete(
            "/api/v1/users/nonexistent-id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404

    def test_delete_user_unauthorized(self, api_client, author_token, test_user):
        """Test deleting user without admin privileges."""
        response = api_client.delete(
            f"/api/v1/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        assert response.status_code == 403

    def test_reset_password_success(self, api_client, admin_token, test_user):
        """Test password reset successfully."""
        response = api_client.post(
            f"/api/v1/users/{test_user['id']}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        assert "password reset" in response.json()["message"].lower()

    def test_reset_password_not_found(self, api_client, admin_token):
        """Test password reset for non-existent user."""
        response = api_client.post(
            "/api/v1/users/nonexistent-id/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404

    def test_reset_password_unauthorized(self, api_client, author_token, test_user):
        """Test password reset without admin privileges."""
        response = api_client.post(
            f"/api/v1/users/{test_user['id']}/reset-password",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        assert response.status_code == 403

    def test_list_users(self, api_client, admin_token, test_user):
        """Test listing all users."""
        response = api_client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) > 0
        
        # Check user structure
        user = data["items"][0]
        assert "id" in user
        assert "email" in user
        assert "name" in user
        assert "role" in user
        assert "created_at" in user
        assert "last_login" in user
        assert "password" not in user

    def test_list_users_unauthorized(self, api_client, author_token):
        """Test listing users without admin privileges."""
        response = api_client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        assert response.status_code == 403

    def test_user_role_hierarchy(self, api_client, admin_token):
        """Test that role hierarchy is enforced."""
        # Create users with different roles
        roles = ["viewer", "author", "editor", "admin"]
        
        for role in roles:
            user_data = {
                "email": f"{role}_{int(time.time())}@example.com",
                "name": f"{role.title()} User",
                "role": role,
                "password": "TestPassword123!"
            }
            
            response = api_client.post(
                "/api/v1/users",
                json=user_data,
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            assert response.status_code == 201
            assert response.json()["role"] == role


class TestUserManagementEdgeCases:
    """Test edge cases and error handling."""

    def test_create_user_missing_fields(self, api_client, admin_token):
        """Test creating user with missing required fields."""
        user_data = {
            "email": f"testuser_{int(time.time())}@example.com"
            # Missing name, role, password
        }
        
        response = api_client.post(
            "/api/v1/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400

    def test_update_user_empty_data(self, api_client, admin_token, test_user):
        """Test updating user with empty data."""
        response = api_client.put(
            f"/api/v1/users/{test_user['id']}",
            json={},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400

    def test_concurrent_user_creation(self, api_client, admin_token):
        """Test creating multiple users concurrently."""
        import concurrent.futures
        
        def create_user(index):
            user_data = {
                "email": f"concurrent_{index}_{int(time.time())}@example.com",
                "name": f"Concurrent User {index}",
                "role": "author",
                "password": "TestPassword123!"
            }
            
            return api_client.post(
                "/api/v1/users",
                json=user_data,
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_user, i) for i in range(5)]
            responses = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        # All should succeed
        for response in responses:
            assert response.status_code == 201

    def test_user_timestamps(self, api_client, admin_token):
        """Test that user timestamps are properly set."""
        user_data = {
            "email": f"timestamp_{int(time.time())}@example.com",
            "name": "Timestamp Test",
            "role": "author",
            "password": "TestPassword123!"
        }
        
        before_create = int(time.time())
        
        response = api_client.post(
            "/api/v1/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        after_create = int(time.time())
        
        assert response.status_code == 201
        data = response.json()
        
        # Check created_at is within reasonable range
        assert before_create <= data["created_at"] <= after_create
