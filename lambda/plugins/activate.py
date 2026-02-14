"""
Plugin activation handler.
Activates an installed plugin.
"""
import json
from datetime import datetime
import boto3
import os

dynamodb = boto3.resource('dynamodb')


def handler(event, context):
    """
    Activate a plugin.
    POST /api/v1/plugins/{id}/activate
    
    Requirements: 16.2
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
        
        # Get plugins table
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
        
        # Check if already active
        if plugin.get('active', False):
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Plugin is already active',
                    'plugin': plugin
                })
            }
        
        # Update plugin to active
        now = int(datetime.now().timestamp())
        try:
            response = plugins_table.update_item(
                Key={'id': plugin_id},
                UpdateExpression='SET active = :active, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':active': True,
                    ':updated_at': now
                },
                ReturnValues='ALL_NEW'
            )
            
            updated_plugin = response['Attributes']
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Plugin activated successfully',
                    'plugin': updated_plugin
                })
            }
        except Exception as e:
            print(f"Error activating plugin: {e}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Failed to activate plugin',
                    'code': 'DATABASE_ERROR'
                })
            }
    
    except Exception as e:
        print(f"Error in activate handler: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'code': 'INTERNAL_ERROR'
            })
        }
