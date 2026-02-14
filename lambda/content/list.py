"""
Content listing Lambda function.
Handles GET /api/v1/content requests with filtering and pagination.
"""
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.db import ContentRepository


content_repo = ContentRepository()


def handler(event, context):
    """
    List content with filters and pagination.
    
    Requirements:
    - 4.1: Return published content sorted by publication timestamp
    - 6.3: Filter content by category
    - 6.4: Filter content by tag
    - 13.1: Support search query in title or content
    - 13.2: Return search results within 3 seconds
    """
    try:
        # Parse query parameters
        params = event.get('queryStringParameters', {}) or {}
        
        content_type = params.get('type', 'post')
        status = params.get('status', 'published')
        limit = int(params.get('limit', '20'))
        last_key_str = params.get('last_key')
        
        # Additional filter parameters
        category = params.get('category')
        tag = params.get('tag')
        author = params.get('author')
        search = params.get('search')
        
        # Parse last_key if provided
        last_key = None
        if last_key_str:
            try:
                last_key = json.loads(last_key_str)
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Bad request',
                        'message': 'Invalid last_key format'
                    })
                }
        
        # Validate limit
        if limit < 1 or limit > 100:
            limit = 20
        
        # Get content from repository
        result = content_repo.list_by_type(
            content_type=content_type,
            status=status,
            limit=limit,
            last_key=last_key
        )
        
        items = result['items']
        
        # Apply additional filters in memory
        # (In production, consider using DynamoDB filter expressions or ElasticSearch)
        
        if category:
            items = [
                item for item in items
                if category in item.get('metadata', {}).get('categories', [])
            ]
        
        if tag:
            items = [
                item for item in items
                if tag in item.get('metadata', {}).get('tags', [])
            ]
        
        if author:
            items = [
                item for item in items
                if item.get('author') == author
            ]
        
        if search:
            search_lower = search.lower()
            items = [
                item for item in items
                if search_lower in item.get('title', '').lower() or
                   search_lower in item.get('content', '').lower() or
                   search_lower in item.get('excerpt', '').lower()
            ]
        
        # Prepare response
        response_data = {
            'items': items,
            'count': len(items),
            'last_key': result['last_key']
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(response_data, default=str)
        }
    
    except ValueError as e:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Bad request',
                'message': f'Invalid parameter: {str(e)}'
            })
        }
    
    except Exception as e:
        print(f"Error listing content: {e}")
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
