"""
Update comment status (approve, reject, spam)
"""
import json
import os
import time
from decimal import Decimal
from typing import Any, Dict
from shared.db import get_dynamodb_resource
from shared.logger import create_logger
from shared.auth import require_auth

COMMENTS_TABLE = os.environ['COMMENTS_TABLE']

VALID_STATUSES = ['pending', 'approved', 'rejected', 'spam']

# CORS headers
CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def decimal_to_int(obj):
    """Convert Decimal objects to int for JSON serialization."""
    if isinstance(obj, dict):
        return {k: decimal_to_int(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_int(item) for item in obj]
    elif isinstance(obj, Decimal):
        return int(obj)
    return obj


@require_auth(roles=['admin', 'editor'])
def handler(event: Dict[str, Any], context: Any, user_id: str, role: str) -> Dict[str, Any]:
    """
    Update comment status
    
    Path parameters:
    - id: Comment ID
    
    Request body:
    - status: New status (pending, approved, rejected, spam)
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
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        new_status = body.get('status', '').strip()
        
        if not new_status:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Status is required'})
            }
        
        if new_status not in VALID_STATUSES:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': f'Invalid status. Must be one of: {", ".join(VALID_STATUSES)}'
                })
            }
        
        # Get comment from database
        from shared.db import CommentRepository
        comment_repo = CommentRepository()
        
        log.info(f"Looking up comment: {comment_id}")
        comment = comment_repo.get_by_id(comment_id)
        log.info(f"Comment found: {comment is not None}")
        if not comment:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Comment not found'})
            }
        
        old_status = comment.get('status', 'pending')
        
        # Update status
        updated_at = int(time.time())
        
        comment_repo.update(
            comment_id,
            {
                'status': new_status,
                'updated_at': updated_at,
                'moderated_by': user_id
            },
            created_at=comment['created_at']
        )
        
        # Emit spam detection metric if comment is marked as spam
        if new_status == 'spam' and old_status != 'spam':
            log.metric('CommentSpamDetected', 1, 'Count', 
                      comment_id=comment_id, 
                      content_id=comment.get('content_id'))
            log.info('Comment marked as spam', 
                    comment_id=comment_id, 
                    old_status=old_status, 
                    new_status=new_status)
        
        log.info(f"Updated comment {comment_id} status to {new_status}",
                comment_id=comment_id, 
                old_status=old_status, 
                new_status=new_status)
        
        # Return updated comment (convert Decimals for JSON)
        comment['status'] = new_status
        comment['updated_at'] = updated_at
        comment['moderated_by'] = user_id
        
        # Convert Decimals to int for JSON serialization
        comment = decimal_to_int(comment)
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(comment)
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        log.error(f"Error updating comment: {str(e)}", 
                 error=str(e), 
                 error_type=type(e).__name__)
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Failed to update comment'})
        }
