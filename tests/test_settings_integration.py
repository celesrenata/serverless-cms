"""
Integration tests for settings management.
Tests settings update validation and retrieval.
"""
import json
import sys
import os

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

from shared.db import SettingsRepository


class TestSettingsManagement:
    """Test settings CRUD operations."""
    
    def test_set_and_get_settings(self, dynamodb_mock, test_user_id):
        """Test setting and retrieving settings."""
        settings_repo = SettingsRepository()
        
        # Set various settings
        settings_repo.set('site_title', 'Test Site', test_user_id, 1234567890)
        settings_repo.set('registration_enabled', True, test_user_id, 1234567890)
        settings_repo.set('comments_enabled', False, test_user_id, 1234567890)
        
        # Retrieve settings
        site_title = settings_repo.get('site_title')
        registration = settings_repo.get('registration_enabled')
        comments = settings_repo.get('comments_enabled')
        
        assert site_title['value'] == 'Test Site'
        assert registration['value'] is True
        assert comments['value'] is False
    
    def test_get_all_settings(self, dynamodb_mock, test_user_id):
        """Test retrieving all settings."""
        settings_repo = SettingsRepository()
        
        # Set multiple settings
        settings_repo.set('site_title', 'Test Site', test_user_id, 1234567890)
        settings_repo.set('site_description', 'Test Description', test_user_id, 1234567890)
        settings_repo.set('theme', 'dark', test_user_id, 1234567890)
        settings_repo.set('registration_enabled', True, test_user_id, 1234567890)
        settings_repo.set('comments_enabled', False, test_user_id, 1234567890)
        settings_repo.set('captcha_enabled', True, test_user_id, 1234567890)
        
        # Get all settings
        all_settings_list = settings_repo.get_all()
        
        # Convert list to dict for easier testing
        all_settings = {item['key']: item['value'] for item in all_settings_list}
        
        assert all_settings['site_title'] == 'Test Site'
        assert all_settings['site_description'] == 'Test Description'
        assert all_settings['theme'] == 'dark'
        assert all_settings['registration_enabled'] is True
        assert all_settings['comments_enabled'] is False
        assert all_settings['captcha_enabled'] is True
    
    def test_update_existing_setting(self, dynamodb_mock, test_user_id):
        """Test updating an existing setting."""
        settings_repo = SettingsRepository()
        
        # Set initial value
        settings_repo.set('registration_enabled', False, test_user_id, 1234567890)
        assert settings_repo.get('registration_enabled')['value'] is False
        
        # Update value
        settings_repo.set('registration_enabled', True, test_user_id, 1234567891)
        assert settings_repo.get('registration_enabled')['value'] is True
    
    def test_get_nonexistent_setting(self, dynamodb_mock):
        """Test retrieving a setting that doesn't exist."""
        settings_repo = SettingsRepository()
        
        result = settings_repo.get('nonexistent_key')
        assert result is None

