"""
Theme creation Lambda handler.
Handles POST /api/v1/themes requests.
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.themes_db import ThemeRepository
try:
    from validator import validate_theme
except ImportError:
    from themes.validator import validate_theme


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

MAX_CUSTOM_THEMES = 50

theme_repo = ThemeRepository()


@require_auth(roles=['admin', 'editor'])
def handler(event, context, user_id, role):
    """Create a new custom theme."""
    try:
        body = json.loads(event.get('body', '{}'))
    except (json.JSONDecodeError, TypeError):
        return {
            'statusCode': 400,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Bad request',
                'message': 'Invalid JSON in request body',
            }),
        }

    # Validate theme data
    validation = validate_theme(body)
    if not validation.valid:
        return {
            'statusCode': 400,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Validation error',
                'message': 'Theme data is invalid',
                'details': validation.errors,
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

    # Build theme data
    theme_data = {
        'name': body['name'].strip(),
        'description': body.get('description', '').strip(),
        'tokens': body['tokens'],
        'created_by': user_id,
    }
    if body.get('custom_css'):
        theme_data['custom_css'] = body['custom_css']

    # Create theme
    try:
        created = theme_repo.create(theme_data)
        created['builtin'] = False
        return {
            'statusCode': 201,
            'headers': HEADERS,
            'body': json.dumps(created, default=str),
        }
    except Exception as e:
        print(f"Error creating theme: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
            }),
        }
