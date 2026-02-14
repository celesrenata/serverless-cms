"""
Content deletion Lambda function.
Handles DELETE /api/v1/content/{id} requests.
"""
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import ContentRepository
from shared.plugins import PluginManager
from boto3.dynamodb.conditions import Attr


content_repo = ContentRepository()
plugin_manager = PluginManager()


@require_auth(roles=['admin', 'editor'])
def handler(event, context, user_id, role):
    """
    Delete content item.
    
    Requirements:
    - 19.3: Verify user has editor or admin role
    - 19.3: Remove content from DynamoDB
    - 19.3: Execute plugin hooks for content_delete
    """
    try:
        # Get content ID from path
        path_params = event.get('pathParameters', {})
        content_id = path_params.get('id')
        
        if not content_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'Content ID is required'
                })
            }
        
        # Get existing content to verify it exists and get composite key
        table = content_repo.table
        response = table.scan(
            FilterExpression=Attr('id').eq(content_id),
            Limit=1
        )
        items = response.get('Items', [])
        
        if not items:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Not found',
                    'message': 'Content not found'
                })
            }
        
        existing_content = items[0]
        type_timestamp = existing_content.get('type#timestamp')
        
        # Execute plugin hook for content_delete
        try:
            delete_data = {
                'content_id': content_id,
                'content': existing_content
            }
            plugin_manager.execute_hook('content_delete', delete_data)
        except Exception as e:
            print(f"Plugin hook error: {e}")
            # Continue even if plugin fails
        
        # Delete from database
        content_repo.delete(content_id, type_timestamp)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'message': 'Content deleted successfully',
                'id': content_id
            })
        }
    
    except Exception as e:
        print(f"Error deleting content: {e}")
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
