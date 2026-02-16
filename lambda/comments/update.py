"""
Update comment status (approve, reject, spam)
"""
import json
import os
import time
from typing import Any, Dict
from shared.db import get_dynamodb_resource
from shared.logger import get_logger
from shared.auth import get_user_from_event

logger = get_logger(__name__)

COMMENTS_TABLE = os.environ['COMMENTS_TABLE']

VALID_STATUSES = ['pending', 'approved', 'rejected', 'spam']


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Update comment status
    
    Path parameters:
    - id: Comment ID
    
    Request body:
    - status: New status (pending, approved, rejected, spam)
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
        
        logger.info(f"Updated comment {comment_id} status to {new_status} by user {user['id']}")
        
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
        logger.error(f"Error updating comment: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed to update comment'})
        }
