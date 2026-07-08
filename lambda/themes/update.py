"""
Theme update Lambda handler.
Handles PUT /api/v1/themes/{id} requests.
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.themes_db import ThemeRepository
try:
    from builtin_themes import is_builtin_theme
    from validator import (
        validate_tokens,
        sanitize_css,
        MAX_NAME_LENGTH,
        MAX_DESCRIPTION_LENGTH,
    )
except ImportError:
    from themes.builtin_themes import is_builtin_theme
    from themes.validator import (
        validate_tokens,
        sanitize_css,
        MAX_NAME_LENGTH,
        MAX_DESCRIPTION_LENGTH,
    )


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

theme_repo = ThemeRepository()


@require_auth(roles=['admin', 'editor'])
def handler(event, context, user_id, role):
    """Update an existing custom theme."""
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

    # Reject modifications to builtin themes
    if is_builtin_theme(theme_id):
        return {
            'statusCode': 403,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Forbidden',
                'message': 'Builtin themes cannot be modified',
            }),
        }

    # Parse body
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

    if not body:
        return {
            'statusCode': 400,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Bad request',
                'message': 'Request body cannot be empty',
            }),
        }

    # Validate fields that are provided
    errors = []

    if 'name' in body:
        name = body['name']
        if not isinstance(name, str) or len(name.strip()) == 0:
            errors.append({'path': 'name', 'message': 'Name cannot be empty'})
        elif len(name) > MAX_NAME_LENGTH:
            errors.append({'path': 'name', 'message': f'Name exceeds maximum length of {MAX_NAME_LENGTH} characters'})

    if 'description' in body:
        desc = body['description']
        if not isinstance(desc, str):
            errors.append({'path': 'description', 'message': 'Description must be a string'})
        elif len(desc) > MAX_DESCRIPTION_LENGTH:
            errors.append({'path': 'description', 'message': f'Description exceeds maximum length of {MAX_DESCRIPTION_LENGTH} characters'})

    if 'tokens' in body:
        token_result = validate_tokens(body['tokens'])
        if not token_result.valid:
            errors.extend(token_result.errors)

    if 'custom_css' in body:
        if body['custom_css'] is not None:
            if not isinstance(body['custom_css'], str):
                errors.append({'path': 'custom_css', 'message': 'custom_css must be a string'})
            else:
                css_valid, css_error = sanitize_css(body['custom_css'])
                if not css_valid:
                    errors.append({'path': 'custom_css', 'message': css_error})

    if errors:
        return {
            'statusCode': 400,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Validation error',
                'message': 'Update data is invalid',
                'details': errors,
            }),
        }

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

    # Build update dict
    updates = {}
    if 'name' in body:
        updates['name'] = body['name'].strip()
    if 'description' in body:
        updates['description'] = body['description'].strip() if body['description'] else ''
    if 'tokens' in body:
        updates['tokens'] = body['tokens']
    if 'custom_css' in body:
        updates['custom_css'] = body['custom_css'] if body['custom_css'] else ''

    # Perform update
    try:
        updated = theme_repo.update(theme_id, updates)
        if not updated:
            return {
                'statusCode': 404,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Not found',
                    'message': f'Theme {theme_id} not found',
                }),
            }
        updated['builtin'] = False
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps(updated, default=str),
        }
    except Exception as e:
        print(f"Error updating theme: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
            }),
        }
