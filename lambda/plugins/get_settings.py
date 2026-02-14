"""
Plugin settings retrieval handler.
Gets configuration settings for a specific plugin.
"""
import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')


def handler(event, context):
    """
    Get plugin settings.
    GET /api/v1/plugins/{id}/settings
    
    Requirements: 20.1, 20.2
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
        
        # Get plugins table to verify plugin exists
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
        
        # Get settings table
        settings_table_name = os.environ.get('SETTINGS_TABLE', 'cms-settings-dev')
        settings_table = dynamodb.Table(settings_table_name)
        
        # Get plugin settings with plugin-specific key
        settings_key = f'plugin:{plugin_id}:config'
        
        try:
            response = settings_table.get_item(Key={'key': settings_key})
            
            if 'Item' in response:
                settings_item = response['Item']
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'plugin_id': plugin_id,
                        'settings': settings_item.get('value', {}),
                        'updated_at': settings_item.get('updated_at'),
                        'updated_by': settings_item.get('updated_by'),
                        'schema': plugin.get('config_schema', {})
                    })
                }
            else:
                # No settings saved yet, return empty with schema
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'plugin_id': plugin_id,
                        'settings': {},
                        'schema': plugin.get('config_schema', {})
                    })
                }
        
        except Exception as e:
            print(f"Error fetching plugin settings: {e}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Database error',
                    'code': 'DATABASE_ERROR'
                })
            }
    
    except Exception as e:
        print(f"Error in get_settings handler: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'code': 'INTERNAL_ERROR'
            })
        }
