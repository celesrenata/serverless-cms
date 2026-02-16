"""
Delete a comment
"""
import json
import os
from typing import Any, Dict
from shared.db import get_dynamodb_resource
from shared.logger import get_logger
from shared.auth import get_user_from_event

logger = get_logger(__name__)

COMMENTS_TABLE = os.environ['COMMENTS_TABLE']


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Delete a comment
    
    Path parameters:
    - id: Comment ID
    """
    try:
        # Get authenticated user
        user = get_user_from_event(event)
        if not user:
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Check user role (editor or admin required)
        user_role = user.get('role', 'viewer')
        if user_role not in ['editor', 'admin']:
            return {
                'statusCode': 403,
                'body': json.dumps({
                    'error': 'Insufficient permissions. Editor or admin role required.'
                })
            }
        
        # Get comment ID from path
        comment_id = event.get('pathParameters', {}).get('id')
        if not comment_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Comment ID is required'})
            }
        
        # Get comment from database to verify it exists
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(COMMENTS_TABLE)
        
        response = table.get_item(Key={'id': comment_id})
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Comment not found'})
            }
        
        # Delete comment
        table.delete_item(Key={'id': comment_id})
        
        logger.info(f"Deleted comment {comment_id} by user {user['id']}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Comment deleted successfully'})
        }
        
    except Exception as e:
        logger.error(f"Error deleting comment: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed to delete comment'})
        }
