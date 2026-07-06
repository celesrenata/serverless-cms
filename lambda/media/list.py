"""
Media listing Lambda function.
Handles fetching paginated list of media items.
Updated: 2026-02-15 - Convert S3 URLs to CloudFront URLs
"""
import json
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.db import MediaRepository
from shared.s3 import convert_s3_url_to_cdn


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
                # Ensure numeric keys are proper types for DynamoDB
                if last_key and 'uploaded_at' in last_key:
                    last_key['uploaded_at'] = int(last_key['uploaded_at'])
            except (json.JSONDecodeError, ValueError):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Invalid last_key format'})
                }
        
        # Get media list
        result = media_repo.list_media(limit=limit, last_key=last_key)
        
        # Convert S3 URLs to CloudFront URLs
        for item in result['items']:
            if 's3_url' in item:
                item['s3_url'] = convert_s3_url_to_cdn(item['s3_url'])
            if 'thumbnails' in item:
                for size, url in item['thumbnails'].items():
                    item['thumbnails'][size] = convert_s3_url_to_cdn(url)
        
        # Ensure last_key values are JSON-serializable as correct types
        response_last_key = result['last_key']
        if response_last_key and 'uploaded_at' in response_last_key:
            response_last_key['uploaded_at'] = int(response_last_key['uploaded_at'])

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'items': result['items'],
                'last_key': response_last_key
            }, default=str)
        }
    
    except Exception as e:
        print(f"Error listing media: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Failed to list media: {str(e)}'})
        }
