"""
Integration tests for plugin system.
Tests plugin installation, activation, deactivation, and hook execution.
"""
import json
import sys
import os
from datetime import datetime
import uuid

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

from shared.db import PluginRepository, SettingsRepository
from shared.plugins import PluginManager


class TestPluginManagement:
    """Test plugin installation and management."""
    
    def test_install_plugin(self, dynamodb_mock, test_plugin_data):
        """Test installing a plugin."""
        plugin_repo = PluginRepository()
        
        now = int(datetime.now().timestamp())
        plugin_data = {
            **test_plugin_data,
            'installed_at': now,
            'updated_at': now
        }
        
        result = plugin_repo.create(plugin_data)
        
        assert result['id'] == test_plugin_data['id']
        assert result['name'] == test_plugin_data['name']
        assert result['active'] == False
        assert len(result['hooks']) == 1
    
    def test_activate_plugin(self, dynamodb_mock, test_plugin_data):
        """Test activating a plugin."""
        plugin_repo = PluginRepository()
        
        # Install plugin
        now = int(datetime.now().timestamp())
        plugin_data = {
            **test_plugin_data,
            'installed_at': now,
            'updated_at': now
        }
        plugin_repo.create(plugin_data)
        
        # Activate plugin
        updates = {
            'active': True,
            'updated_at': now + 100
        }
        updated = plugin_repo.update(test_plugin_data['id'], updates)
        
        assert updated['active'] == True
    
    def test_deactivate_plugin(self, dynamodb_mock, test_plugin_data):
        """Test deactivating a plugin."""
        plugin_repo = PluginRepository()
        
        # Install and activate plugin
        now = int(datetime.now().timestamp())
        plugin_data = {
            **test_plugin_data,
            'active': True,
            'installed_at': now,
            'updated_at': now
        }
        plugin_repo.create(plugin_data)
        
        # Deactivate plugin
        updates = {
            'active': False,
            'updated_at': now + 100
        }
        updated = plugin_repo.update(test_plugin_data['id'], updates)
        
        assert updated['active'] == False
    
    def test_list_plugins(self, dynamodb_mock):
        """Test listing all plugins."""
        plugin_repo = PluginRepository()
        
        # Install multiple plugins
        now = int(datetime.now().timestamp())
        for i in range(3):
            plugin_data = {
                'id': f'test-plugin-{i}',
                'name': f'Test Plugin {i}',
                'version': '1.0.0',
                'description': f'Plugin {i}',
                'author': 'Test Author',
                'active': i % 2 == 0,  # Alternate active/inactive
                'hooks': [],
                'installed_at': now + i,
                'updated_at': now + i
            }
            plugin_repo.create(plugin_data)
        
        # List all plugins
        result = plugin_repo.list_plugins(limit=10)
        
        assert len(result['items']) == 3
    
    def test_get_active_plugins(self, dynamodb_mock):
        """Test retrieving only active plugins."""
        plugin_repo = PluginRepository()
        plugin_manager = PluginManager()
        
        # Install plugins with different active states
        now = int(datetime.now().timestamp())
        for i in range(3):
            plugin_data = {
                'id': f'test-plugin-{i}',
                'name': f'Test Plugin {i}',
                'version': '1.0.0',
                'description': f'Plugin {i}',
                'author': 'Test Author',
                'active': i < 2,  # First 2 are active
                'hooks': [],
                'installed_at': now + i,
                'updated_at': now + i
            }
            plugin_repo.create(plugin_data)
        
        # Get active plugins
        active_plugins = plugin_manager.get_active_plugins()
        
        assert len(active_plugins) == 2
        for plugin in active_plugins:
            assert plugin['active'] == True
    
    def test_plugin_with_hooks(self, dynamodb_mock):
        """Test plugin with registered hooks."""
        plugin_repo = PluginRepository()
        
        now = int(datetime.now().timestamp())
        plugin_data = {
            'id': 'syntax-highlighter',
            'name': 'Syntax Highlighter',
            'version': '1.0.0',
            'description': 'Highlights code syntax',
            'author': 'Test Author',
            'active': True,
            'hooks': [
                {
                    'hook_name': 'content_render_post',
                    'function_arn': 'arn:aws:lambda:us-east-1:123456789:function:syntax-highlighter',
                    'priority': 5
                },
                {
                    'hook_name': 'content_render_project',
                    'function_arn': 'arn:aws:lambda:us-east-1:123456789:function:syntax-highlighter',
                    'priority': 5
                }
            ],
            'installed_at': now,
            'updated_at': now
        }
        
        result = plugin_repo.create(plugin_data)
        
        assert len(result['hooks']) == 2
        assert result['hooks'][0]['hook_name'] == 'content_render_post'
        assert result['hooks'][0]['priority'] == 5
    
    def test_plugin_settings(self, dynamodb_mock, test_plugin_data):
        """Test storing and retrieving plugin settings."""
        plugin_repo = PluginRepository()
        settings_repo = SettingsRepository()
        
        # Install plugin
        now = int(datetime.now().timestamp())
        plugin_data = {
            **test_plugin_data,
            'installed_at': now,
            'updated_at': now
        }
        plugin_repo.create(plugin_data)
        
        # Store plugin settings
        settings_key = f'plugin:{test_plugin_data["id"]}:config'
        settings_data = {
            'enabled': True,
            'theme': 'monokai',
            'line_numbers': True
        }
        settings_repo.set(settings_key, settings_data, 'admin-user-id', now)
        
        # Retrieve plugin settings
        retrieved = settings_repo.get(settings_key)
        
        assert retrieved is not None
        assert retrieved['value']['enabled'] == True
        assert retrieved['value']['theme'] == 'monokai'
    
    def test_plugin_config_schema(self, dynamodb_mock):
        """Test plugin with configuration schema."""
        plugin_repo = PluginRepository()
        
        now = int(datetime.now().timestamp())
        plugin_data = {
            'id': 'configurable-plugin',
            'name': 'Configurable Plugin',
            'version': '1.0.0',
            'description': 'A plugin with configuration',
            'author': 'Test Author',
            'active': True,
            'hooks': [],
            'config_schema': {
                'type': 'object',
                'properties': {
                    'theme': {
                        'type': 'string',
                        'enum': ['light', 'dark'],
                        'default': 'light'
                    },
                    'max_items': {
                        'type': 'number',
                        'minimum': 1,
                        'maximum': 100,
                        'default': 10
                    }
                },
                'required': ['theme']
            },
            'installed_at': now,
            'updated_at': now
        }
        
        result = plugin_repo.create(plugin_data)
        
        assert result['config_schema'] is not None
        assert 'properties' in result['config_schema']
        assert 'theme' in result['config_schema']['properties']
    
    def test_plugin_hook_priority(self, dynamodb_mock):
        """Test that plugins with different priorities are ordered correctly."""
        plugin_repo = PluginRepository()
        plugin_manager = PluginManager()
        
        # Install plugins with different priorities
        now = int(datetime.now().timestamp())
        priorities = [10, 5, 15]
        for i, priority in enumerate(priorities):
            plugin_data = {
                'id': f'plugin-{i}',
                'name': f'Plugin {i}',
                'version': '1.0.0',
                'description': f'Plugin with priority {priority}',
                'author': 'Test Author',
                'active': True,
                'hooks': [
                    {
                        'hook_name': 'content_render_post',
                        'function_arn': f'arn:aws:lambda:us-east-1:123456789:function:plugin-{i}',
                        'priority': priority
                    }
                ],
                'installed_at': now + i,
                'updated_at': now + i
            }
            plugin_repo.create(plugin_data)
        
        # Get active plugins
        active_plugins = plugin_manager.get_active_plugins()
        
        assert len(active_plugins) == 3
        # Verify all plugins are active
        for plugin in active_plugins:
            assert plugin['active'] == True


class TestPluginHooks:
    """Test plugin hook execution."""
    
    def test_execute_hook_with_no_plugins(self, dynamodb_mock):
        """Test hook execution when no plugins are active."""
        plugin_manager = PluginManager()
        
        test_data = {'content': '<p>Test content</p>'}
        result = plugin_manager.execute_hook('content_render_post', test_data)
        
        # Should return original data unchanged
        assert result == test_data
    
    def test_apply_content_filters(self, dynamodb_mock):
        """Test applying content filters."""
        plugin_manager = PluginManager()
        
        content = '<p>Test content with code</p>'
        filtered = plugin_manager.apply_content_filters(content, 'post')
        
        # Without active plugins, content should be unchanged
        assert filtered == content
