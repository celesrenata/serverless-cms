"""
Media listing Lambda function.
Handles fetching paginated list of media items.
"""
import json
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.db import MediaRepository


media_repo = MediaRepository()


def handler(event, context):
    """
    List media with pagination.
    
    GET /api/v1/media
    
    Query parameters:
    - limit: Number of items to return (default: 20, max: 100)
    - last_key: Pagination token from previous response
    
    Returns paginated list of media items.
    """
    try:
        # Get query parameters
        params = event.get('queryStringParameters') or {}
        
        # Parse limit
        limit = int(params.get('limit', 20))
        if limit > 100:
            limit = 100
        
        # Parse last_key for pagination
        last_key = None
        if params.get('last_key'):
            try:
                last_key = json.loads(params['last_key'])
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Invalid last_key format'})
                }
        
        # Get media list
        result = media_repo.list_media(limit=limit, last_key=last_key)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'items': result['items'],
                'last_key': result['last_key']
            }, default=str)
        }
    
    except Exception as e:
        print(f"Error listing media: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Failed to list media: {str(e)}'})
        }
