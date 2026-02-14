"""
Plugin settings update handler.
Updates configuration settings for a specific plugin with validation.
"""
import json
from datetime import datetime
import boto3
import os
from jsonschema import validate, ValidationError

dynamodb = boto3.resource('dynamodb')


def validate_settings_against_schema(settings: dict, schema: dict) -> tuple:
    """
    Validate settings against plugin's config schema.
    
    Args:
        settings: Settings to validate
        schema: JSON schema to validate against
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not schema:
        # No schema defined, accept any settings
        return True, None
    
    try:
        validate(instance=settings, schema=schema)
        return True, None
    except ValidationError as e:
        return False, str(e.message)
    except Exception as e:
        return False, f"Schema validation error: {str(e)}"


def handler(event, context):
    """
    Update plugin settings.
    PUT /api/v1/plugins/{id}/settings
    
    Requirements: 20.3, 20.4, 20.5
    """
    try:
        # Get plugin ID from path parameters
        plugin_id = event.get('pathParameters', {}).get('id')
        if not plugin_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Plugin ID is required',
                    'code': 'MISSING_REQUIRED_FIELD'
                })
            }
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
            settings = body.get('settings', {})
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Invalid JSON in request body',
                    'code': 'INVALID_INPUT'
                })
            }
        
        # Get user ID from request context (set by authorizer)
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub', 'unknown')
        
        # Get plugins table to verify plugin exists and get schema
        plugins_table_name = os.environ.get('PLUGINS_TABLE', 'cms-plugins-dev')
        plugins_table = dynamodb.Table(plugins_table_name)
        
        # Check if plugin exists
        try:
            response = plugins_table.get_item(Key={'id': plugin_id})
            if 'Item' not in response:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': 'Plugin not found',
                        'code': 'NOT_FOUND'
                    })
                }
            
            plugin = response['Item']
            config_schema = plugin.get('config_schema', {})
        except Exception as e:
            print(f"Error fetching plugin: {e}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Database error',
                    'code': 'DATABASE_ERROR'
                })
            }
        
        # Validate settings against plugin schema
        is_valid, error_message = validate_settings_against_schema(settings, config_schema)
        if not is_valid:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': f'Settings validation failed: {error_message}',
                    'code': 'INVALID_INPUT'
                })
            }
        
        # Get settings table
        settings_table_name = os.environ.get('SETTINGS_TABLE', 'cms-settings-dev')
        settings_table = dynamodb.Table(settings_table_name)
        
        # Store plugin settings with plugin-specific key
        settings_key = f'plugin:{plugin_id}:config'
        now = int(datetime.now().timestamp())
        
        try:
            settings_item = {
                'key': settings_key,
                'value': settings,
                'updated_at': now,
                'updated_by': user_id
            }
            
            settings_table.put_item(Item=settings_item)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Plugin settings updated successfully',
                    'plugin_id': plugin_id,
                    'settings': settings,
                    'updated_at': now
                })
            }
        
        except Exception as e:
            print(f"Error updating plugin settings: {e}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Failed to update settings',
                    'code': 'DATABASE_ERROR'
                })
            }
    
    except Exception as e:
        print(f"Error in update_settings handler: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'code': 'INTERNAL_ERROR'
            })
        }
