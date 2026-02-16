"""
List comments by content_id or status with pagination
"""
import json
import os
from typing import Any, Dict, Optional
from shared.db import get_dynamodb_resource
from shared.logger import get_logger

logger = get_logger(__name__)

COMMENTS_TABLE = os.environ['COMMENTS_TABLE']


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    List comments with filtering and pagination
    
    Query params:
    - content_id: Filter by content ID (public endpoint)
    - status: Filter by status (moderation endpoint)
    - limit: Number of results per page (default 50, max 100)
    - last_key: Pagination token
    """
    try:
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(COMMENTS_TABLE)
        
        # Get query parameters
        params = event.get('queryStringParameters') or {}
        content_id = params.get('content_id')
        status = params.get('status')
        limit = min(int(params.get('limit', 50)), 100)
        last_key_str = params.get('last_key')
        
        # Decode pagination token if provided
        exclusive_start_key = None
        if last_key_str:
            try:
                exclusive_start_key = json.loads(last_key_str)
            except json.JSONDecodeError:
                logger.warning(f"Invalid last_key format: {last_key_str}")
        
        # Build query parameters
        query_params = {
            'Limit': limit,
            'ScanIndexForward': False,  # Newest first
        }
        
        if exclusive_start_key:
            query_params['ExclusiveStartKey'] = exclusive_start_key
        
        # Query by content_id or status
        if content_id:
            # Public endpoint - list comments for a specific content item
            # Only show approved comments
            query_params['IndexName'] = 'content_id-created_at-index'
            query_params['KeyConditionExpression'] = 'content_id = :content_id'
            query_params['FilterExpression'] = '#status = :status'
            query_params['ExpressionAttributeNames'] = {'#status': 'status'}
            query_params['ExpressionAttributeValues'] = {
                ':content_id': content_id,
                ':status': 'approved'
            }
            response = table.query(**query_params)
            
        elif status:
            # Moderation endpoint - list comments by status
            # Requires authentication (checked by API Gateway)
            query_params['IndexName'] = 'status-created_at-index'
            query_params['KeyConditionExpression'] = '#status = :status'
            query_params['ExpressionAttributeNames'] = {'#status': 'status'}
            query_params['ExpressionAttributeValues'] = {':status': status}
            response = table.query(**query_params)
            
        else:
            # List all comments (moderation endpoint)
            # Requires authentication
            response = table.scan(**{
                'Limit': limit,
                'ExclusiveStartKey': exclusive_start_key
            } if exclusive_start_key else {'Limit': limit})
        
        items = response.get('Items', [])
        
        # Build threaded structure if listing by content_id
        if content_id:
            items = build_comment_tree(items)
        
        # Prepare response
        result = {
            'comments': items,
            'count': len(items)
        }
        
        # Add pagination token if there are more results
        if 'LastEvaluatedKey' in response:
            result['last_key'] = json.dumps(response['LastEvaluatedKey'])
        
        logger.info(f"Listed {len(items)} comments")
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
        
    except Exception as e:
        logger.error(f"Error listing comments: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed to list comments'})
        }


def build_comment_tree(comments: list) -> list:
    """
    Build threaded comment structure with parent-child relationships
    """
    # Create lookup dict
    comment_dict = {c['id']: {**c, 'replies': []} for c in comments}
    
    # Build tree
    root_comments = []
    for comment in comments:
        parent_id = comment.get('parent_id')
        if parent_id and parent_id in comment_dict:
            # Add as reply to parent
            comment_dict[parent_id]['replies'].append(comment_dict[comment['id']])
        else:
            # Top-level comment
            root_comments.append(comment_dict[comment['id']])
    
    return root_comments
