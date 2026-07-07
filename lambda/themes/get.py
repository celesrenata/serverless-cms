"""
Theme retrieval Lambda handler.
Handles GET /api/v1/themes, GET /api/v1/themes/{id}, GET /api/v1/themes/active requests.
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth, extract_user_from_event
from shared.db import SettingsRepository
from shared.themes_db import ThemeRepository
from themes.builtin_themes import (
    get_builtin_theme,
    is_builtin_theme,
    get_all_builtin_metadata,
)


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

theme_repo = ThemeRepository()
settings_repo = SettingsRepository()


def handler(event, context):
    """Get theme(s) - list all, get by ID, or get active theme."""
    try:
        path_params = event.get('pathParameters') or {}
        theme_id = path_params.get('id')
        path = event.get('path', '') or event.get('rawPath', '')

        # GET /themes/active — public endpoint, no auth
        if theme_id == 'active' or path.endswith('/themes/active'):
            return _get_active_theme(event, context)

        # GET /themes/{id} — single theme (auth required)
        if theme_id:
            return _get_theme_by_id(event, context, theme_id)

        # GET /themes — list all (auth required)
        return _list_all_themes(event, context)

    except Exception as e:
        print(f"Error in theme get handler: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
            }),
        }


def _get_active_theme(event, context):
    """
    GET /themes/active — PUBLIC (no auth required).
    Returns the active theme's full tokens and custom_css.
    """
    try:
        setting = settings_repo.get('active_theme_id')
        active_id = setting.get('value') if setting else None

        if not active_id:
            # Default to celestium-neon
            active_id = 'celestium-neon'

        # Check builtins first
        if is_builtin_theme(active_id):
            theme = get_builtin_theme(active_id)
            return {
                'statusCode': 200,
                'headers': HEADERS,
                'body': json.dumps({
                    'id': theme['id'],
                    'name': theme['name'],
                    'tokens': theme['tokens'],
                }, default=str),
            }

        # Look up custom theme in DB
        theme = theme_repo.get_by_id(active_id)
        if not theme:
            # Fallback to default builtin
            fallback = get_builtin_theme('celestium-neon')
            return {
                'statusCode': 200,
                'headers': HEADERS,
                'body': json.dumps({
                    'id': fallback['id'],
                    'name': fallback['name'],
                    'tokens': fallback['tokens'],
                }, default=str),
            }

        response_body = {
            'id': theme['id'],
            'name': theme['name'],
            'tokens': theme['tokens'],
        }
        if theme.get('custom_css'):
            response_body['custom_css'] = theme['custom_css']

        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps(response_body, default=str),
        }

    except Exception as e:
        print(f"Error getting active theme: {e}")
        # Graceful fallback — return default theme even on error
        fallback = get_builtin_theme('celestium-neon')
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({
                'id': fallback['id'],
                'name': fallback['name'],
                'tokens': fallback['tokens'],
            }, default=str),
        }


def _get_theme_by_id(event, context, theme_id):
    """GET /themes/{id} — requires auth (admin/editor)."""
    # Verify authentication
    user_info = extract_user_from_event(event)
    if not user_info:
        return {
            'statusCode': 401,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Unauthorized',
                'message': 'Missing authorization header',
            }),
        }

    user_id, role = user_info
    if role not in ('admin', 'editor'):
        return {
            'statusCode': 403,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Forbidden',
                'message': 'Insufficient permissions. Required roles: admin, editor',
            }),
        }

    # Check builtin first
    if is_builtin_theme(theme_id):
        theme = get_builtin_theme(theme_id)
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps(theme, default=str),
        }

    # Look up custom theme
    theme = theme_repo.get_by_id(theme_id)
    if not theme:
        return {
            'statusCode': 404,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Not found',
                'message': f'Theme {theme_id} not found',
            }),
        }

    theme['builtin'] = False
    return {
        'statusCode': 200,
        'headers': HEADERS,
        'body': json.dumps(theme, default=str),
    }


def _list_all_themes(event, context):
    """GET /themes — list all themes (builtins + custom). Requires auth."""
    # Verify authentication
    user_info = extract_user_from_event(event)
    if not user_info:
        return {
            'statusCode': 401,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Unauthorized',
                'message': 'Missing authorization header',
            }),
        }

    user_id, role = user_info
    if role not in ('admin', 'editor'):
        return {
            'statusCode': 403,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Forbidden',
                'message': 'Insufficient permissions. Required roles: admin, editor',
            }),
        }

    # Get active theme ID
    setting = settings_repo.get('active_theme_id')
    active_id = setting.get('value') if setting else 'celestium-neon'

    # Collect builtin metadata
    items = []
    for meta in get_all_builtin_metadata():
        meta['is_active'] = (meta['id'] == active_id)
        items.append(meta)

    # Collect custom themes from DB
    custom_themes = theme_repo.get_all()
    for theme in custom_themes:
        colors = theme.get('tokens', {}).get('colors', {})
        items.append({
            'id': theme['id'],
            'name': theme.get('name', ''),
            'description': theme.get('description', ''),
            'builtin': False,
            'is_active': (theme['id'] == active_id),
            'preview_colors': {
                'primary': colors.get('primary', ''),
                'background': colors.get('background', ''),
                'surface': colors.get('surface', ''),
                'accent': colors.get('accent', ''),
            },
            'created_at': theme.get('created_at'),
            'updated_at': theme.get('updated_at'),
        })

    return {
        'statusCode': 200,
        'headers': HEADERS,
        'body': json.dumps({'items': items}, default=str),
    }
