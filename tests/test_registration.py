"""
Integration tests for user registration system.
"""
import pytest
import json
import time
import sys
import os
from unittest.mock import patch, MagicMock, Mock

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

from auth import register, verify_email


@pytest.fixture(autouse=True)
def mock_registration_enabled():
    """Mock settings to enable registration for all tests."""
    with patch('shared.middleware.get_cached_settings') as mock_settings:
        mock_settings.return_value = {
            'registration_enabled': True,
            'comments_enabled': True,
            'captcha_enabled': False,
        }
        yield mock_settings


class TestUserRegistration:
    """Test user registration flow."""
    
    def test_register_invalid_email(self):
        """Test registration with invalid email format."""
        event = {
            'body': json.dumps({
                'email': 'invalid-email',
                'password': 'SecurePass123!',
                'name': 'Test User'
            })
        }
        
        response = register.lambda_handler(event, {})
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'Invalid email format' in body['error']
    
    def test_register_weak_password(self):
        """Test registration with weak password."""
        test_cases = [
            ('short', 'Password must be at least 8 characters'),
            ('nouppercase123!', 'must contain uppercase'),
            ('NOLOWERCASE123!', 'must contain uppercase'),
            ('NoNumbers!', 'must contain uppercase'),
            ('NoSpecial123', 'must contain uppercase')
        ]
        
        for password, expected_error in test_cases:
            event = {
                'body': json.dumps({
                    'email': 'test@example.com',
                    'password': password,
                    'name': 'Test User'
                })
            }
            
            response = register.lambda_handler(event, {})
            
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'error' in body
    
    def test_register_missing_fields(self):
        """Test registration with missing required fields."""
        test_cases = [
            {'password': 'SecurePass123!', 'name': 'Test'},  # Missing email
            {'email': 'test@example.com', 'name': 'Test'},   # Missing password
            {'email': 'test@example.com', 'password': 'SecurePass123!'}  # Missing name
        ]
        
        for body_data in test_cases:
            event = {'body': json.dumps(body_data)}
            response = register.lambda_handler(event, {})
            
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'required' in body['error'].lower()


class TestEmailVerification:
    """Test email verification flow."""
    
    def test_verify_email_missing_fields(self):
        """Test verification with missing required fields."""
        test_cases = [
            {'code': '123456'},  # Missing email
            {'email': 'test@example.com'}  # Missing code
        ]
        
        for body_data in test_cases:
            event = {'body': json.dumps(body_data)}
            response = verify_email.lambda_handler(event, {})
            
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'required' in body['error'].lower()


class TestPasswordValidation:
    """Test password validation logic."""
    
    def test_password_length_validation(self):
        """Test password minimum length requirement."""
        from auth.register import validate_password
        
        is_valid, error = validate_password('Short1!')
        assert not is_valid
        assert 'at least 8 characters' in error
    
    def test_password_complexity_validation(self):
        """Test password complexity requirements."""
        from auth.register import validate_password
        
        # Valid password
        is_valid, error = validate_password('ValidPass123!')
        assert is_valid
        assert error == ''
        
        # Missing uppercase
        is_valid, error = validate_password('lowercase123!')
        assert not is_valid
        
        # Missing lowercase
        is_valid, error = validate_password('UPPERCASE123!')
        assert not is_valid
        
        # Missing number
        is_valid, error = validate_password('NoNumbers!')
        assert not is_valid
        
        # Missing special character
        is_valid, error = validate_password('NoSpecial123')
        assert not is_valid


class TestEmailValidation:
    """Test email validation logic."""
    
    def test_valid_email_formats(self):
        """Test valid email formats."""
        from auth.register import validate_email
        
        valid_emails = [
            'user@example.com',
            'user.name@example.com',
            'user+tag@example.co.uk',
            'user123@test-domain.com'
        ]
        
        for email in valid_emails:
            assert validate_email(email), f"Should accept {email}"
    
    def test_invalid_email_formats(self):
        """Test invalid email formats."""
        from auth.register import validate_email
        
        invalid_emails = [
            'invalid',
            'invalid@',
            '@example.com',
            'user@',
            'user @example.com',
            'user@example',
            ''
        ]
        
        for email in invalid_emails:
            assert not validate_email(email), f"Should reject {email}"
