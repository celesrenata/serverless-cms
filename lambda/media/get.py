"""
Media retrieval Lambda function.
Handles fetching media metadata by ID.
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
    Get media metadata by ID.
    
    GET /api/v1/media/{id}
    
    Returns media metadata including URLs for original and thumbnails.
    """
    try:
        # Get media ID from path parameters
        media_id = event.get('pathParameters', {}).get('id')
        
        if not media_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Media ID is required'})
            }
        
        # Get media from database
        media = media_repo.get_by_id(media_id)
        
        if not media:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Media not found'})
            }
        
        # Convert S3 URLs to CloudFront URLs
        if 'url' in media:
            media['url'] = convert_s3_url_to_cdn(media['url'])
        if 'thumbnails' in media:
            for size, url in media['thumbnails'].items():
                media['thumbnails'][size] = convert_s3_url_to_cdn(url)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(media, default=str)
        }
    
    except Exception as e:
        print(f"Error retrieving media: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Failed to retrieve media: {str(e)}'})
        }
