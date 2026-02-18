"""
Update settings Lambda function.
Handles PUT /api/v1/settings requests.
"""
import json
import sys
import os
import time

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import SettingsRepository


settings_repo = SettingsRepository()


@require_auth(roles=['admin'])
def handler(event, context, user_id, role):
    """
    Update settings (admin only).
    
    Requirements:
    - 9.1: Store settings in DynamoDB settings table
    - 9.2: Admin-only access for updates
    - 9.4: Support settings for site title, site description, and theme selection
    - 9.5: Record timestamp and user for updates
    - 22.1: Support registration_enabled, comments_enabled, captcha_enabled settings
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        if not body:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'Request body is required'
                })
            }
        
        # Define allowed settings keys and their types
        allowed_settings = {
            'site_title': str,
            'site_description': str,
            'theme': str,
            'registration_enabled': bool,
            'comments_enabled': bool,
            'comment_moderation_enabled': bool,
            'captcha_enabled': bool,
        }
        
        # Validate settings keys
        for key in body.keys():
            if key not in allowed_settings:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Bad request',
                        'message': f'Invalid setting key: {key}. Allowed keys: {", ".join(allowed_settings.keys())}'
                    })
                }
            
            # Validate value type
            expected_type = allowed_settings[key]
            value = body[key]
            if not isinstance(value, expected_type):
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Bad request',
                        'message': f'Invalid type for {key}. Expected {expected_type.__name__}, got {type(value).__name__}'
                    })
                }
        
        # Get current timestamp
        current_time = int(time.time())
        
        # Update each setting in the request
        updated_settings = {}
        for key, value in body.items():
            # Store setting with timestamp and user
            setting = settings_repo.set(
                key=key,
                value=value,
                updated_by=user_id,
                updated_at=current_time
            )
            updated_settings[key] = value
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'message': 'Settings updated successfully',
                'settings': updated_settings,
                'updated_at': current_time,
                'updated_by': user_id
            }, default=str)
        }
    
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Bad request',
                'message': 'Invalid JSON in request body'
            })
        }
    
    except Exception as e:
        print(f"Error updating settings: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
