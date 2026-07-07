"""
Theme duplication Lambda handler.
Handles POST /api/v1/themes/{id}/duplicate requests.
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.themes_db import ThemeRepository
from themes.builtin_themes import is_builtin_theme, get_builtin_theme


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

MAX_CUSTOM_THEMES = 50

theme_repo = ThemeRepository()


@require_auth(roles=['admin', 'editor'])
def handler(event, context, user_id, role):
    """Duplicate an existing theme with a new ID and name."""
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

    # Resolve source theme (builtin or custom)
    source_theme = None
    if is_builtin_theme(theme_id):
        source_theme = get_builtin_theme(theme_id)
    else:
        source_theme = theme_repo.get_by_id(theme_id)

    if not source_theme:
        return {
            'statusCode': 404,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Not found',
                'message': f'Theme {theme_id} not found',
            }),
        }

    # Enforce 50-theme limit
    try:
        current_count = theme_repo.count()
        if current_count >= MAX_CUSTOM_THEMES:
            return {
                'statusCode': 409,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Limit exceeded',
                    'message': f'Maximum of {MAX_CUSTOM_THEMES} custom themes reached. Delete an existing theme to create a new one.',
                }),
            }
    except Exception as e:
        print(f"Error counting themes: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': 'Failed to check theme count',
            }),
        }

    # Parse optional body for custom name
    custom_name = None
    try:
        body = json.loads(event.get('body') or '{}')
        custom_name = body.get('name')
    except (json.JSONDecodeError, TypeError):
        pass

    # Build new theme data
    new_name = custom_name or f"Copy of {source_theme['name']}"
    theme_data = {
        'name': new_name,
        'description': source_theme.get('description', ''),
        'tokens': source_theme['tokens'],
        'created_by': user_id,
    }
    if source_theme.get('custom_css'):
        theme_data['custom_css'] = source_theme['custom_css']

    # Create the duplicate
    try:
        created = theme_repo.create(theme_data)
        created['builtin'] = False
        return {
            'statusCode': 201,
            'headers': HEADERS,
            'body': json.dumps(created, default=str),
        }
    except Exception as e:
        print(f"Error duplicating theme: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
            }),
        }
