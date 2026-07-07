"""
Theme activation Lambda handler.
Handles POST /api/v1/themes/{id}/activate requests.
"""
import json
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import SettingsRepository
from shared.themes_db import ThemeRepository
from themes.builtin_themes import is_builtin_theme, get_builtin_theme


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

theme_repo = ThemeRepository()
settings_repo = SettingsRepository()


@require_auth(roles=['admin'])
def handler(event, context, user_id, role):
    """Activate a theme as the site default."""
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

    # Verify theme exists (builtin or custom)
    if is_builtin_theme(theme_id):
        # Builtin themes are always valid to activate
        pass
    else:
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

    # Update settings table
    try:
        now = int(time.time())
        settings_repo.set('active_theme_id', theme_id, user_id, now)
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({
                'active_theme_id': theme_id,
            }),
        }
    except Exception as e:
        print(f"Error activating theme: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
            }),
        }
