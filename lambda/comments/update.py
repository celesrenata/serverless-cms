"""
Update comment status (approve, reject, spam)
"""
import json
import os
import time
from typing import Any, Dict
from shared.db import get_dynamodb_resource
from shared.logger import create_logger
from shared.auth import require_auth

COMMENTS_TABLE = os.environ['COMMENTS_TABLE']

VALID_STATUSES = ['pending', 'approved', 'rejected', 'spam']


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
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Check user role (editor or admin required)
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
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        new_status = body.get('status', '').strip()
        
        if not new_status:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Status is required'})
            }
        
        if new_status not in VALID_STATUSES:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': f'Invalid status. Must be one of: {", ".join(VALID_STATUSES)}'
                })
            }
        
        # Get comment from database
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(COMMENTS_TABLE)
        
        response = table.get_item(Key={'id': comment_id})
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Comment not found'})
            }
        
        comment = response['Item']
        old_status = comment.get('status', 'pending')
        
        # Update status
        updated_at = int(time.time())
        
        table.update_item(
            Key={'id': comment_id},
            UpdateExpression='SET #status = :status, updated_at = :updated_at, moderated_by = :user_id',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': new_status,
                ':updated_at': updated_at,
                ':user_id': user['id']
            }
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
        
        # Return updated comment
        comment['status'] = new_status
        comment['updated_at'] = updated_at
        comment['moderated_by'] = user['id']
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Comment updated successfully',
                'comment': comment
            })
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        log.error(f"Error updating comment: {str(e)}", 
                 error=str(e), 
                 error_type=type(e).__name__)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed to update comment'})
        }
