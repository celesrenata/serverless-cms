"""
Delete a comment
"""
import json
import os
from typing import Any, Dict
from shared.db import get_dynamodb_resource
from shared.logger import create_logger
from shared.auth import require_auth

COMMENTS_TABLE = os.environ['COMMENTS_TABLE']

# CORS headers
CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


@require_auth(roles=['admin', 'editor'])
def handler(event: Dict[str, Any], context: Any, user_id: str, role: str) -> Dict[str, Any]:
    """
    Delete a comment
    
    Path parameters:
    - id: Comment ID
    """
    log = create_logger(event, context, user_id=user_id, user_role=role)
    
    try:
        # Get comment ID from path
        comment_id = event.get('pathParameters', {}).get('id')
        if not comment_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Comment ID is required'})
            }
        
        # Get comment from database to verify it exists and get created_at
        from shared.db import CommentRepository
        comment_repo = CommentRepository()
        
        comment = comment_repo.get_by_id(comment_id)
        if not comment:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Comment not found'})
            }
        
        # Delete comment using composite key
        comment_repo.delete(comment_id, created_at=comment['created_at'])
        
        log.info(f"Deleted comment {comment_id} by user {user_id}")
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Comment deleted successfully'})
        }
        
    except Exception as e:
        log.error(f"Error deleting comment: {str(e)}", error=str(e), error_type=type(e).__name__)
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Failed to delete comment'})
        }
