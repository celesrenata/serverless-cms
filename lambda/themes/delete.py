"""
Theme deletion Lambda handler.
Handles DELETE /api/v1/themes/{id} requests.
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import SettingsRepository
from shared.themes_db import ThemeRepository
from themes.builtin_themes import is_builtin_theme


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

theme_repo = ThemeRepository()
settings_repo = SettingsRepository()


@require_auth(roles=['admin'])
def handler(event, context, user_id, role):
    """Delete a custom theme."""
    path_params = event.get('pathParameters') or {}
    theme_id = path_params.get('id')

    if not theme_id:
        return {
            'statusCode': 400,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Bad request',
                'message': 'Theme ID is required',
            }),
        }

    # Reject deletion of builtin themes
    if is_builtin_theme(theme_id):
        return {
            'statusCode': 403,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Forbidden',
                'message': 'Builtin themes cannot be deleted',
            }),
        }

    # Check if theme is currently active
    try:
        setting = settings_repo.get('active_theme_id')
        active_id = setting.get('value') if setting else None
        if active_id == theme_id:
            return {
                'statusCode': 409,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Conflict',
                    'message': 'Cannot delete the currently active theme. Activate a different theme first.',
                }),
            }
    except Exception as e:
        print(f"Error checking active theme: {e}")
        # Continue with deletion even if settings check fails

    # Verify theme exists
    existing = theme_repo.get_by_id(theme_id)
    if not existing:
        return {
            'statusCode': 404,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Not found',
                'message': f'Theme {theme_id} not found',
            }),
        }

    # Delete theme
    try:
        theme_repo.delete(theme_id)
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({
                'message': f'Theme {theme_id} deleted successfully',
            }),
        }
    except Exception as e:
        print(f"Error deleting theme: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
            }),
        }
