"""
Plugin installation handler.
Validates and installs plugin packages.
"""
import json
import uuid
from datetime import datetime
from typing import Dict, Any
import boto3
import os

dynamodb = boto3.resource('dynamodb')


def handler(event, context):
    """
    Install a new plugin.
    POST /api/v1/plugins/install
    
    Requirements: 16.1
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        required_fields = ['id', 'name', 'version', 'description', 'author']
        for field in required_fields:
            if not body.get(field):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': f'Missing required field: {field}',
                        'code': 'MISSING_REQUIRED_FIELD'
                    })
                }
        
        # Validate plugin structure
        plugin_id = body['id']
        if not isinstance(plugin_id, str) or len(plugin_id) < 3:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Invalid plugin ID',
                    'code': 'INVALID_INPUT'
                })
            }
        
        # Validate hooks structure if provided
        hooks = body.get('hooks', [])
        if not isinstance(hooks, list):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Hooks must be an array',
                    'code': 'INVALID_INPUT'
                })
            }
        
        for hook in hooks:
            if not isinstance(hook, dict):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': 'Each hook must be an object',
                        'code': 'INVALID_INPUT'
                    })
                }
            if not hook.get('hook_name') or not hook.get('function_arn'):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': 'Each hook must have hook_name and function_arn',
                        'code': 'INVALID_INPUT'
                    })
                }
            # Set default priority if not provided
            if 'priority' not in hook:
                hook['priority'] = 10
        
        # Get plugins table
        plugins_table_name = os.environ.get('PLUGINS_TABLE', 'cms-plugins-dev')
        plugins_table = dynamodb.Table(plugins_table_name)
        
        # Check if plugin already exists
        try:
            existing = plugins_table.get_item(Key={'id': plugin_id})
            if 'Item' in existing:
                return {
                    'statusCode': 409,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': 'Plugin already installed',
                        'code': 'RESOURCE_CONFLICT'
                    })
                }
        except Exception as e:
            print(f"Error checking existing plugin: {e}")
        
        # Create plugin record
        now = int(datetime.now().timestamp())
        plugin_item = {
            'id': plugin_id,
            'name': body['name'],
            'version': body['version'],
            'description': body['description'],
            'author': body['author'],
            'active': False,  # Plugins start inactive
            'hooks': hooks,
            'config_schema': body.get('config_schema', {}),
            'installed_at': now,
            'updated_at': now
        }
        
        # Store plugin metadata in DynamoDB
        plugins_table.put_item(Item=plugin_item)
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(plugin_item)
        }
    
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Invalid JSON in request body',
                'code': 'INVALID_INPUT'
            })
        }
    except Exception as e:
        print(f"Error installing plugin: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'code': 'INTERNAL_ERROR'
            })
        }
