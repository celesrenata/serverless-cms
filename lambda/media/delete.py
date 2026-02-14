"""
Media deletion Lambda function.
Handles deleting media files from S3 and metadata from DynamoDB.
"""
import json
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import MediaRepository
from shared.s3 import delete_file
from shared.plugins import PluginManager


media_repo = MediaRepository()
plugin_manager = PluginManager()


@require_auth(roles=['admin', 'editor'])
def handler(event, context, user_id, role):
    """
    Delete media file and metadata.
    
    DELETE /api/v1/media/{id}
    
    Removes file from S3 (including thumbnails) and deletes metadata from DynamoDB.
    Requires editor or admin role.
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
        
        # Get media metadata
        media = media_repo.get_by_id(media_id)
        
        if not media:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Media not found'})
            }
        
        # Execute plugin hook before deletion
        plugin_manager.execute_hook('media_delete', {
            'media_id': media_id,
            'media': media,
            'user_id': user_id
        })
        
        # Delete file from S3 (including thumbnails)
        try:
            delete_file(media['s3_key'])
        except Exception as e:
            print(f"Warning: Failed to delete file from S3: {e}")
            # Continue with metadata deletion even if S3 deletion fails
        
        # Delete metadata from DynamoDB
        media_repo.delete(media_id)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Media deleted successfully',
                'id': media_id
            })
        }
    
    except Exception as e:
        print(f"Error deleting media: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Failed to delete media: {str(e)}'})
        }
