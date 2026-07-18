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

from shared.auth import require_auth, check_permission
from shared.db import ContentRepository
from shared.plugins import PluginManager
try:
    from section_helpers import (
        validate_section_assignment,
        compute_section_path_ids,
        validate_content_markdown,
    )
except ImportError:
    from content.section_helpers import (
        validate_section_assignment,
        compute_section_path_ids,
        validate_content_markdown,
    )
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
        
        # Check permissions - use hierarchy check for robustness
        is_author = existing_content.get('author') == user_id
        is_editor_or_admin = check_permission(role, ['editor'])  # admin >= editor in hierarchy
        
        if not (is_author or is_editor_or_admin):
            print(f"PERMISSION DENIED: user_id={user_id}, role={role!r}, content_author={existing_content.get('author')!r}, is_author={is_author}, is_editor_or_admin={is_editor_or_admin}")
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
        
        if 'type' in body:
            updates['type'] = body['type']
        
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
        
        # Validate and store section assignment
        if 'section_id' in body:
            section_id = body['section_id']
            is_valid, error_msg, section_record = validate_section_assignment(section_id)
            if not is_valid:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Validation error',
                        'message': error_msg
                    })
                }
            if section_record:
                updates['section_id'] = section_id
                updates['section_path_ids'] = compute_section_path_ids(section_record)
            else:
                # Empty/null section_id means unassign
                updates['section_id'] = ''
                updates['section_path_ids'] = []
        
        # Validate and store content_markdown
        if 'content_markdown' in body:
            content_markdown = body['content_markdown']
            is_valid, error_msg = validate_content_markdown(content_markdown)
            if not is_valid:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Validation error',
                        'message': error_msg
                    })
                }
            updates['content_markdown'] = content_markdown
        
        # Store content_format if provided
        if body.get('content_format') in ('markdown', 'html'):
            updates['content_format'] = body['content_format']
        
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
        created_at = existing_content.get('created_at')
        result = content_repo.update(content_id, created_at, updates)
        
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
