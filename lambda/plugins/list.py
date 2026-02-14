"""
Plugin listing handler.
Lists all installed plugins with their status.
"""
import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')


def handler(event, context):
    """
    List all installed plugins.
    GET /api/v1/plugins
    
    Requirements: 16.5
    """
    try:
        # Get plugins table
        plugins_table_name = os.environ.get('PLUGINS_TABLE', 'cms-plugins-dev')
        plugins_table = dynamodb.Table(plugins_table_name)
        
        # Get query parameters for filtering
        params = event.get('queryStringParameters') or {}
        active_filter = params.get('active')
        
        # Scan plugins table
        try:
            if active_filter is not None:
                # Filter by active status
                active_bool = active_filter.lower() in ['true', '1', 'yes']
                response = plugins_table.scan(
                    FilterExpression='active = :active',
                    ExpressionAttributeValues={':active': active_bool}
                )
            else:
                # Get all plugins
                response = plugins_table.scan()
            
            plugins = response.get('Items', [])
            
            # Sort by name
            plugins.sort(key=lambda p: p.get('name', '').lower())
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'plugins': plugins,
                    'count': len(plugins)
                })
            }
        
        except Exception as e:
            print(f"Error scanning plugins: {e}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Database error',
                    'code': 'DATABASE_ERROR'
                })
            }
    
    except Exception as e:
        print(f"Error in list handler: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'code': 'INTERNAL_ERROR'
            })
        }
