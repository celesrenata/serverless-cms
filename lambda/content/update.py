"""
Content update Lambda function.
Handles PUT /api/v1/content/{id} requests.
"""
import json
import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import ContentRepository
from shared.plugins import PluginManager
from boto3.dynamodb.conditions import Attr


content_repo = ContentRepository()
plugin_manager = PluginManager()


@require_auth(roles=['admin', 'editor', 'author'])
def handler(event, context, user_id, role):
    """
    Update existing content item.
    
    Requirements:
    - 3.2: Validate changes and update DynamoDB record
    - 3.3: Permit modifications for author or editor role
    - 3.4: Maintain original publication timestamp
    - 3.5: Remove content from visibility when changed to draft
    - 19.2: Execute plugin hooks for content_update
    """
    try:
        # Get content ID from path
        path_params = event.get('pathParameters', {})
        content_id = path_params.get('id')
        
        if not content_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'Content ID is required'
                })
            }
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Get existing content
        # Since we have composite key, we need to find the item first
        table = content_repo.table
        
        # Scan with pagination to find the item
        existing_content = None
        scan_kwargs = {
            'FilterExpression': Attr('id').eq(content_id),
            'Limit': 100
        }
        
        while True:
            response = table.scan(**scan_kwargs)
            items = response.get('Items', [])
            if items:
                existing_content = items[0]
                break
            
            # Check if there are more items to scan
            last_key = response.get('LastEvaluatedKey')
            if not last_key:
                break
                
            scan_kwargs['ExclusiveStartKey'] = last_key
        
        if not existing_content:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Not found',
                    'message': 'Content not found'
                })
            }
        
        existing_content = items[0]
        
        # Check permissions
        is_author = existing_content.get('author') == user_id
        is_editor_or_admin = role in ['admin', 'editor']
        
        if not (is_author or is_editor_or_admin):
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Forbidden',
                    'message': 'You do not have permission to update this content'
                })
            }
        
        # Prepare updates
        now = int(datetime.now().timestamp())
        updates = {
            'updated_at': now
        }
        
        # Update allowed fields
        if 'title' in body:
            updates['title'] = body['title']
        
        if 'content' in body:
            updates['content'] = body['content']
        
        if 'excerpt' in body:
            updates['excerpt'] = body['excerpt']
        
        if 'featured_image' in body:
            updates['featured_image'] = body['featured_image']
        
        if 'metadata' in body:
            updates['metadata'] = body['metadata']
        
        # Handle slug update with uniqueness check
        if 'slug' in body and body['slug'] != existing_content.get('slug'):
            new_slug = body['slug']
            existing_slug = content_repo.get_by_slug(new_slug)
            if existing_slug and existing_slug.get('id') != content_id:
                return {
                    'statusCode': 409,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Conflict',
                        'message': 'Slug already exists'
                    })
                }
            updates['slug'] = new_slug
        
        # Handle status changes
        if 'status' in body:
            new_status = body['status']
            old_status = existing_content.get('status')
            
            updates['status'] = new_status
            
            # If changing from draft to published, set published_at
            if old_status != 'published' and new_status == 'published':
                # Only set published_at if it doesn't exist (preserve original)
                if not existing_content.get('published_at') or existing_content.get('published_at') == 0:
                    updates['published_at'] = now
            
            # If changing to draft, clear published_at
            if new_status == 'draft':
                updates['published_at'] = 0
        
        # Handle scheduled publishing
        if 'scheduled_at' in body:
            updates['scheduled_at'] = body['scheduled_at']
            if body['scheduled_at'] > 0:
                updates['status'] = 'draft'  # Scheduled content must be draft
        
        # Execute plugin hook for content_update
        try:
            update_data = {
                'content_id': content_id,
                'updates': updates,
                'existing': existing_content
            }
            update_data = plugin_manager.execute_hook('content_update', update_data)
            if isinstance(update_data, dict) and 'updates' in update_data:
                updates = update_data['updates']
        except Exception as e:
            print(f"Plugin hook error: {e}")
            # Continue even if plugin fails
        
        # Update in database
        type_timestamp = existing_content.get('type#timestamp')
        result = content_repo.update(content_id, type_timestamp, updates)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(result, default=str)
        }
    
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Bad request',
                'message': 'Invalid JSON in request body'
            })
        }
    
    except Exception as e:
        print(f"Error updating content: {e}")
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
