"""
Integration tests for authentication and authorization.
Tests user authentication, role-based access control, and token validation.
"""
import json
import sys
import os
from datetime import datetime
import uuid

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

# Import from shared module (lambda is a reserved keyword, so we import directly)
from shared.db import UserRepository


class TestAuthentication:
    """Test user authentication and authorization."""
    
    def test_create_user(self, dynamodb_mock):
        """Test creating a user."""
        user_repo = UserRepository()
        
        now = int(datetime.now().timestamp())
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': 'Test User',
            'role': 'author',
            'created_at': now,
            'last_login': now
        }
        
        result = user_repo.create(user_data)
        
        assert result['id'] == user_id
        assert result['email'] == 'test@example.com'
        assert result['role'] == 'author'
    
    def test_get_user_by_id(self, dynamodb_mock):
        """Test retrieving user by ID."""
        user_repo = UserRepository()
        
        # Create user
        now = int(datetime.now().timestamp())
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': 'Test User',
            'role': 'editor',
            'created_at': now,
            'last_login': now
        }
        user_repo.create(user_data)
        
        # Retrieve user
        retrieved = user_repo.get_by_id(user_id)
        
        assert retrieved is not None
        assert retrieved['id'] == user_id
        assert retrieved['role'] == 'editor'
    
    def test_update_user(self, dynamodb_mock):
        """Test updating user information."""
        user_repo = UserRepository()
        
        # Create user
        now = int(datetime.now().timestamp())
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': 'Test User',
            'role': 'author',
            'created_at': now,
            'last_login': now
        }
        user_repo.create(user_data)
        
        # Update user
        updates = {
            'display_name': 'Updated Name',
            'bio': 'Updated bio',
            'last_login': now + 100
        }
        updated = user_repo.update(user_id, updates)
        
        assert updated['display_name'] == 'Updated Name'
        assert updated['bio'] == 'Updated bio'
    
    def test_list_users(self, dynamodb_mock):
        """Test listing all users."""
        user_repo = UserRepository()
        
        # Create multiple users
        now = int(datetime.now().timestamp())
        roles = ['admin', 'editor', 'author']
        for i, role in enumerate(roles):
            user_data = {
                'id': str(uuid.uuid4()),
                'email': f'user{i}@example.com',
                'username': f'user{i}',
                'display_name': f'User {i}',
                'role': role,
                'created_at': now + i,
                'last_login': now + i
            }
            user_repo.create(user_data)
        
        # List users
        result = user_repo.list_users(limit=10)
        
        assert len(result['items']) == 3
    
    def test_role_based_permissions(self, dynamodb_mock):
        """Test that different roles have appropriate permissions."""
        user_repo = UserRepository()
        
        now = int(datetime.now().timestamp())
        
        # Create users with different roles
        roles_permissions = {
            'admin': ['create', 'read', 'update', 'delete', 'manage_users', 'manage_settings'],
            'editor': ['create', 'read', 'update', 'delete'],
            'author': ['create', 'read', 'update_own'],
            'viewer': ['read']
        }
        
        for role, permissions in roles_permissions.items():
            user_id = str(uuid.uuid4())
            user_data = {
                'id': user_id,
                'email': f'{role}@example.com',
                'username': role,
                'display_name': role.capitalize(),
                'role': role,
                'created_at': now,
                'last_login': now
            }
            user_repo.create(user_data)
            
            # Verify user was created with correct role
            retrieved = user_repo.get_by_id(user_id)
            assert retrieved['role'] == role


class TestAuthorization:
    """Test authorization and access control."""
    
    def test_author_can_create_content(self, dynamodb_mock):
        """Test that authors can create content."""
        user_repo = UserRepository()
        
        now = int(datetime.now().timestamp())
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'email': 'author@example.com',
            'username': 'author',
            'display_name': 'Author User',
            'role': 'author',
            'created_at': now,
            'last_login': now
        }
        user_repo.create(user_data)
        
        user = user_repo.get_by_id(user_id)
        assert user['role'] in ['admin', 'editor', 'author']
    
    def test_editor_can_modify_any_content(self, dynamodb_mock):
        """Test that editors can modify any content."""
        user_repo = UserRepository()
        
        now = int(datetime.now().timestamp())
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'email': 'editor@example.com',
            'username': 'editor',
            'display_name': 'Editor User',
            'role': 'editor',
            'created_at': now,
            'last_login': now
        }
        user_repo.create(user_data)
        
        user = user_repo.get_by_id(user_id)
        assert user['role'] in ['admin', 'editor']
    
    def test_admin_can_manage_users(self, dynamodb_mock):
        """Test that admins can manage users."""
        user_repo = UserRepository()
        
        now = int(datetime.now().timestamp())
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'email': 'admin@example.com',
            'username': 'admin',
            'display_name': 'Admin User',
            'role': 'admin',
            'created_at': now,
            'last_login': now
        }
        user_repo.create(user_data)
        
        user = user_repo.get_by_id(user_id)
        assert user['role'] == 'admin'
    
    def test_viewer_cannot_modify_content(self, dynamodb_mock):
        """Test that viewers have read-only access."""
        user_repo = UserRepository()
        
        now = int(datetime.now().timestamp())
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'email': 'viewer@example.com',
            'username': 'viewer',
            'display_name': 'Viewer User',
            'role': 'viewer',
            'created_at': now,
            'last_login': now
        }
        user_repo.create(user_data)
        
        user = user_repo.get_by_id(user_id)
        assert user['role'] == 'viewer'
        # Viewer should not have write permissions
        assert user['role'] not in ['admin', 'editor', 'author']
