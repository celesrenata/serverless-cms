"""
Integration tests for theme Lambda handlers.

Tests the full workflow: create theme → activate → verify public endpoint returns it.
Also tests handler-level auth, builtin protection, and business logic.
"""
import json
import sys
import os
import time
from decimal import Decimal
from unittest.mock import patch

import boto3
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))


def valid_tokens():
    """Return a fully valid ThemeTokens dict."""
    return {
        'colors': {
            'primary': '139 92 246',
            'primaryHover': '124 58 237',
            'secondary': '236 72 153',
            'background': '3 7 18',
            'backgroundAlt': '15 23 42',
            'surface': '30 41 59',
            'surfaceAlt': '51 65 85',
            'text': '248 250 252',
            'textMuted': '148 163 184',
            'textInverse': '15 23 42',
            'border': '71 85 105',
            'borderLight': '100 116 139',
            'accent': '34 211 238',
            'success': '52 211 153',
            'warning': '251 191 36',
            'error': '248 113 113',
            'info': '96 165 250',
        },
        'typography': {
            'fontFamily': '"Inter", system-ui, sans-serif',
            'fontFamilyMono': '"JetBrains Mono", monospace',
            'fontSizeBase': '1rem',
            'fontSizeScale': 1.25,
            'lineHeight': '1.6',
            'fontWeightNormal': 400,
            'fontWeightBold': 700,
        },
        'radius': {'sm': '0.375rem', 'md': '0.5rem', 'lg': '0.75rem', 'full': '9999px'},
        'shadow': {
            'sm': '0 1px 3px rgba(0,0,0,0.1)',
            'md': '0 4px 12px rgba(0,0,0,0.15)',
            'lg': '0 12px 40px rgba(0,0,0,0.2)',
            'glow': '0 0 20px rgba(139, 92, 246, 0.4)',
        },
        'motion': {
            'durationFast': '150ms',
            'durationNormal': '300ms',
            'durationSlow': '600ms',
            'easing': 'cubic-bezier(0.4, 0, 0.2, 1)',
            'reducedMotion': False,
        },
    }


@pytest.fixture
def theme_tables(dynamodb_mock):
    """Create the themes table within the existing aws_mock context."""
    dynamodb = dynamodb_mock
    dynamodb.create_table(
        TableName='cms-themes-test',
        KeySchema=[
            {'AttributeName': 'id', 'KeyType': 'HASH'},
        ],
        AttributeDefinitions=[
            {'AttributeName': 'id', 'AttributeType': 'S'},
        ],
        BillingMode='PAY_PER_REQUEST',
    )
    yield dynamodb


@pytest.fixture
def env_vars():
    """Set up environment variables for test handlers."""
    with patch.dict(os.environ, {
        'THEMES_TABLE': 'cms-themes-test',
        'SETTINGS_TABLE': 'test-cms-settings',
    }):
        yield


@pytest.fixture
def mock_auth_admin(monkeypatch):
    """Mock the require_auth decorator to pass admin user."""
    from shared import auth

    def mock_require_auth(roles=None):
        def decorator(func):
            def wrapper(event, context, *args, **kwargs):
                return func(event, context, 'test-admin-id', 'admin', *args, **kwargs)
            return wrapper
        return decorator

    monkeypatch.setattr(auth, 'require_auth', mock_require_auth)


@pytest.fixture
def mock_auth_editor(monkeypatch):
    """Mock the require_auth decorator to pass editor user."""
    from shared import auth

    def mock_require_auth(roles=None):
        def decorator(func):
            def wrapper(event, context, *args, **kwargs):
                return func(event, context, 'test-editor-id', 'editor', *args, **kwargs)
            return wrapper
        return decorator

    monkeypatch.setattr(auth, 'require_auth', mock_require_auth)


@pytest.fixture
def mock_extract_user_admin(monkeypatch):
    """Mock extract_user_from_event to return admin."""
    from shared import auth
    monkeypatch.setattr(auth, 'extract_user_from_event', lambda event: ('test-admin-id', 'admin'))


def _make_event(method='POST', path='/api/v1/themes', body=None, path_params=None, headers=None):
    """Build a Lambda event dict."""
    event = {
        'httpMethod': method,
        'path': path,
        'pathParameters': path_params or {},
        'headers': headers or {'Authorization': 'Bearer admin-token'},
        'requestContext': {'identity': {'sourceIp': '127.0.0.1'}},
    }
    if body is not None:
        event['body'] = json.dumps(body)
    return event


class TestCreateThemeHandler:
    """Tests for the create theme Lambda handler."""

    def test_create_valid_theme(self, theme_tables, env_vars, mock_auth_admin):
        """Creating a valid theme returns 201 with the created theme."""
        # Need fresh import after patching
        import importlib
        import themes.create
        importlib.reload(themes.create)
        from themes.create import handler

        event = _make_event(body={
            'name': 'My Custom Theme',
            'description': 'Test theme',
            'tokens': valid_tokens(),
        })

        response = handler(event, {})
        assert response['statusCode'] == 201

        body = json.loads(response['body'])
        assert body['name'] == 'My Custom Theme'
        assert 'id' in body
        assert body['builtin'] is False

    def test_create_with_invalid_tokens_returns_400(self, theme_tables, env_vars, mock_auth_admin):
        """Invalid tokens produce a 400 with validation errors."""
        import importlib
        import themes.create
        importlib.reload(themes.create)
        from themes.create import handler

        event = _make_event(body={
            'name': 'Bad Theme',
            'tokens': {'colors': {}},  # Missing required groups
        })

        response = handler(event, {})
        assert response['statusCode'] == 400

        body = json.loads(response['body'])
        assert body['error'] == 'Validation error'
        assert len(body['details']) > 0

    def test_create_enforces_50_theme_limit(self, theme_tables, env_vars, mock_auth_admin):
        """Cannot create theme when 50 already exist."""
        import importlib
        import themes.create
        importlib.reload(themes.create)
        from themes.create import handler
        from shared.themes_db import ThemeRepository

        repo = ThemeRepository(table_name='cms-themes-test')
        # Seed 50 themes
        for i in range(50):
            repo.create({
                'name': f'Theme {i}',
                'description': '',
                'tokens': valid_tokens(),
                'created_by': 'seeder',
            })

        event = _make_event(body={
            'name': 'Theme 51',
            'tokens': valid_tokens(),
        })

        response = handler(event, {})
        assert response['statusCode'] == 409
        body = json.loads(response['body'])
        assert 'Limit exceeded' in body['error']


class TestDeleteThemeHandler:
    """Tests for the delete theme Lambda handler."""

    def test_delete_custom_theme(self, theme_tables, env_vars, mock_auth_admin):
        """Deleting a custom theme succeeds."""
        import importlib
        import themes.delete
        importlib.reload(themes.delete)
        from themes.delete import handler
        from shared.themes_db import ThemeRepository

        repo = ThemeRepository(table_name='cms-themes-test')
        created = repo.create({
            'name': 'Deletable',
            'description': '',
            'tokens': valid_tokens(),
            'created_by': 'user',
        })

        event = _make_event(method='DELETE', path_params={'id': created['id']})
        response = handler(event, {})
        assert response['statusCode'] == 200

        # Verify it's gone
        assert repo.get_by_id(created['id']) is None

    def test_delete_builtin_theme_returns_403(self, theme_tables, env_vars, mock_auth_admin):
        """Cannot delete a builtin theme."""
        import importlib
        import themes.delete
        importlib.reload(themes.delete)
        from themes.delete import handler

        event = _make_event(method='DELETE', path_params={'id': 'celestium-neon'})
        response = handler(event, {})
        assert response['statusCode'] == 403

    def test_delete_active_theme_returns_409(self, theme_tables, env_vars, mock_auth_admin):
        """Cannot delete the currently active theme."""
        import importlib
        import themes.delete
        importlib.reload(themes.delete)
        from themes.delete import handler
        from shared.themes_db import ThemeRepository
        from shared.db import SettingsRepository

        repo = ThemeRepository(table_name='cms-themes-test')
        settings = SettingsRepository()
        created = repo.create({
            'name': 'Active Theme',
            'description': '',
            'tokens': valid_tokens(),
            'created_by': 'user',
        })

        # Make it active
        settings.set('active_theme_id', created['id'], 'admin', int(time.time()))

        event = _make_event(method='DELETE', path_params={'id': created['id']})
        response = handler(event, {})
        assert response['statusCode'] == 409


class TestActivateThemeHandler:
    """Tests for the activate theme Lambda handler."""

    def test_activate_builtin_theme(self, theme_tables, env_vars, mock_auth_admin):
        """Can activate a builtin theme."""
        import importlib
        import themes.activate
        importlib.reload(themes.activate)
        from themes.activate import handler

        event = _make_event(method='POST', path_params={'id': 'celestium-bromide'})
        response = handler(event, {})
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['active_theme_id'] == 'celestium-bromide'

    def test_activate_nonexistent_custom_returns_404(self, theme_tables, env_vars, mock_auth_admin):
        """Cannot activate a non-existent custom theme."""
        import importlib
        import themes.activate
        importlib.reload(themes.activate)
        from themes.activate import handler

        event = _make_event(method='POST', path_params={'id': 'nonexistent-uuid'})
        response = handler(event, {})
        assert response['statusCode'] == 404


class TestDuplicateThemeHandler:
    """Tests for the duplicate theme Lambda handler."""

    def test_duplicate_builtin_theme(self, theme_tables, env_vars, mock_auth_admin):
        """Duplicating a builtin theme creates a custom copy."""
        import importlib
        import themes.duplicate
        importlib.reload(themes.duplicate)
        from themes.duplicate import handler

        event = _make_event(method='POST', path_params={'id': 'celestium-neon'})
        response = handler(event, {})
        assert response['statusCode'] == 201

        body = json.loads(response['body'])
        assert body['name'] == 'Copy of Celestium Neon'
        assert body['builtin'] is False
        assert 'id' in body
        assert body['id'] != 'celestium-neon'

    def test_duplicate_with_custom_name(self, theme_tables, env_vars, mock_auth_admin):
        """Duplicating with a custom name uses the provided name."""
        import importlib
        import themes.duplicate
        importlib.reload(themes.duplicate)
        from themes.duplicate import handler

        event = _make_event(
            method='POST',
            path_params={'id': 'celestium-neon'},
            body={'name': 'My Neon Clone'},
        )
        response = handler(event, {})
        assert response['statusCode'] == 201
        body = json.loads(response['body'])
        assert body['name'] == 'My Neon Clone'


class TestUpdateThemeHandler:
    """Tests for the update theme Lambda handler."""

    def test_update_custom_theme_name(self, theme_tables, env_vars, mock_auth_admin):
        """Can update a custom theme's name."""
        import importlib
        import themes.update
        importlib.reload(themes.update)
        from themes.update import handler
        from shared.themes_db import ThemeRepository

        repo = ThemeRepository(table_name='cms-themes-test')
        created = repo.create({
            'name': 'Original',
            'description': '',
            'tokens': valid_tokens(),
            'created_by': 'user',
        })

        event = _make_event(
            method='PUT',
            path_params={'id': created['id']},
            body={'name': 'Updated Name'},
        )
        response = handler(event, {})
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['name'] == 'Updated Name'

    def test_update_builtin_theme_returns_403(self, theme_tables, env_vars, mock_auth_admin):
        """Cannot update a builtin theme."""
        import importlib
        import themes.update
        importlib.reload(themes.update)
        from themes.update import handler

        event = _make_event(
            method='PUT',
            path_params={'id': 'celestium-neon'},
            body={'name': 'Hacked'},
        )
        response = handler(event, {})
        assert response['statusCode'] == 403


class TestGetThemeHandler:
    """Tests for the get theme Lambda handler."""

    def test_get_active_theme_public_no_auth(self, theme_tables, env_vars, mock_extract_user_admin):
        """GET /themes/active works without auth and returns active theme tokens."""
        import importlib
        import themes.get
        importlib.reload(themes.get)
        from themes.get import handler

        event = _make_event(
            method='GET',
            path='/api/v1/themes/active',
            path_params={'id': 'active'},
            headers={},
        )
        response = handler(event, {})
        assert response['statusCode'] == 200

        body = json.loads(response['body'])
        # Default is celestium-neon when no active_theme_id setting
        assert body['id'] == 'celestium-neon'
        assert 'tokens' in body

    def test_get_active_returns_custom_theme(self, theme_tables, env_vars, mock_extract_user_admin):
        """GET /themes/active returns a custom theme when one is activated."""
        import importlib
        import themes.get
        importlib.reload(themes.get)
        from themes.get import handler
        from shared.themes_db import ThemeRepository
        from shared.db import SettingsRepository

        repo = ThemeRepository(table_name='cms-themes-test')
        settings = SettingsRepository()

        custom = repo.create({
            'name': 'Custom Active',
            'description': 'Test active',
            'tokens': valid_tokens(),
            'custom_css': '.test { color: blue; }',
            'created_by': 'admin',
        })

        settings.set('active_theme_id', custom['id'], 'admin', int(time.time()))

        event = _make_event(
            method='GET',
            path='/api/v1/themes/active',
            path_params={'id': 'active'},
            headers={},
        )
        response = handler(event, {})
        assert response['statusCode'] == 200

        body = json.loads(response['body'])
        assert body['id'] == custom['id']
        assert body['name'] == 'Custom Active'
        assert body['custom_css'] == '.test { color: blue; }'
        assert 'tokens' in body

    def test_list_themes_returns_builtin_and_custom(self, theme_tables, env_vars, mock_extract_user_admin):
        """GET /themes returns both builtin and custom themes."""
        import importlib
        import themes.get
        importlib.reload(themes.get)
        from themes.get import handler
        from shared.themes_db import ThemeRepository

        repo = ThemeRepository(table_name='cms-themes-test')
        repo.create({
            'name': 'My Custom',
            'description': '',
            'tokens': valid_tokens(),
            'created_by': 'user',
        })

        event = _make_event(
            method='GET',
            path='/api/v1/themes',
            path_params={},
            headers={'Authorization': 'Bearer admin-token'},
        )
        response = handler(event, {})
        assert response['statusCode'] == 200

        body = json.loads(response['body'])
        items = body['items']
        # Should have 6 builtins + 1 custom
        assert len(items) == 7
        builtins = [i for i in items if i['builtin']]
        customs = [i for i in items if not i['builtin']]
        assert len(builtins) == 6
        assert len(customs) == 1
        assert customs[0]['name'] == 'My Custom'


class TestIntegrationWorkflow:
    """End-to-end workflow: create → activate → verify public endpoint."""

    def test_create_activate_get_active(self, theme_tables, env_vars, mock_auth_admin, mock_extract_user_admin):
        """Full workflow: create a custom theme, activate it, verify /themes/active returns it."""
        import importlib
        import themes.create
        import themes.activate
        import themes.get
        importlib.reload(themes.create)
        importlib.reload(themes.activate)
        importlib.reload(themes.get)

        from themes.create import handler as create_handler
        from themes.activate import handler as activate_handler
        from themes.get import handler as get_handler

        # Step 1: Create a custom theme
        create_event = _make_event(body={
            'name': 'Integration Theme',
            'description': 'Created during integration test',
            'tokens': valid_tokens(),
            'custom_css': '.integration { display: grid; }',
        })
        create_response = create_handler(create_event, {})
        assert create_response['statusCode'] == 201
        created = json.loads(create_response['body'])
        theme_id = created['id']

        # Step 2: Activate it
        activate_event = _make_event(method='POST', path_params={'id': theme_id})
        activate_response = activate_handler(activate_event, {})
        assert activate_response['statusCode'] == 200
        activate_body = json.loads(activate_response['body'])
        assert activate_body['active_theme_id'] == theme_id

        # Step 3: Verify /themes/active returns this theme
        get_event = _make_event(
            method='GET',
            path='/api/v1/themes/active',
            path_params={'id': 'active'},
            headers={},
        )
        get_response = get_handler(get_event, {})
        assert get_response['statusCode'] == 200

        active_body = json.loads(get_response['body'])
        assert active_body['id'] == theme_id
        assert active_body['name'] == 'Integration Theme'
        assert active_body['custom_css'] == '.integration { display: grid; }'
        assert active_body['tokens']['colors']['primary'] == '139 92 246'
