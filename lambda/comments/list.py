"""
List comments by content_id or status with pagination
"""
import json
import os
from decimal import Decimal
from typing import Any, Dict, Optional
from boto3.dynamodb.conditions import Key, Attr
from shared.db import get_dynamodb_resource
from shared.logger import create_logger

COMMENTS_TABLE = os.environ['COMMENTS_TABLE']


def decimal_to_int(obj):
    """Convert Decimal objects to int for JSON serialization."""
    if isinstance(obj, dict):
        return {k: decimal_to_int(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_int(item) for item in obj]
    elif isinstance(obj, Decimal):
        return int(obj)
    return obj


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    List comments with filtering and pagination
    
    Query params:
    - content_id: Filter by content ID (public endpoint)
    - status: Filter by status (moderation endpoint)
    - limit: Number of results per page (default 50, max 100)
    - last_key: Pagination token
    """
    log = create_logger(event, context)
    
    try:
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(COMMENTS_TABLE)
        
        # Get query parameters
        params = event.get('queryStringParameters') or {}
        path_params = event.get('pathParameters') or {}
        
        # content_id can come from path or query params
        content_id = path_params.get('content_id') or params.get('content_id')
        status = params.get('status')
        limit = min(int(params.get('limit', 50)), 100)
        last_key_str = params.get('last_key')
        
        # Decode pagination token if provided
        exclusive_start_key = None
        if last_key_str:
            try:
                exclusive_start_key = json.loads(last_key_str)
            except json.JSONDecodeError:
                log.warning(f"Invalid last_key format: {last_key_str}")
        
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
            query_params['KeyConditionExpression'] = Key('content_id').eq(content_id)
            query_params['FilterExpression'] = Attr('status').eq('approved')
            response = table.query(**query_params)
            
        elif status:
            # Moderation endpoint - list comments by status
            # Requires authentication (checked by API Gateway)
            query_params['IndexName'] = 'status-created_at-index'
            query_params['KeyConditionExpression'] = Key('status').eq(status)
            response = table.query(**query_params)
            
        else:
            # List all comments (moderation endpoint)
            # Requires authentication
            response = table.scan(**{
                'Limit': limit,
                'ExclusiveStartKey': exclusive_start_key
            } if exclusive_start_key else {'Limit': limit})
        
        items = response.get('Items', [])
        
        # Convert Decimals to int for JSON serialization
        items = decimal_to_int(items)
        
        # Remove sensitive fields from public listing (before building tree)
        if content_id:
            # Public endpoint - remove sensitive data
            items = [{k: v for k, v in item.items() if k not in ['author_email', 'ip_address']} for item in items]
        
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
        
        log.info(f"Listed {len(items)} comments")
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
        
    except Exception as e:
        log.error(f"Error listing comments: {str(e)}", error=str(e), error_type=type(e).__name__)
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
