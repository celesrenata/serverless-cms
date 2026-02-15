"""
Content retrieval Lambda functions.
Handles GET /api/v1/content/{id} and GET /api/v1/content/slug/{slug} requests.
"""
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.db import ContentRepository, UserRepository
from shared.plugins import PluginManager
from shared.auth import extract_user_from_event


content_repo = ContentRepository()
user_repo = UserRepository()
plugin_manager = PluginManager()


def handler(event, context):
    """
    Get content by ID or slug.
    
    Requirements:
    - 3.1: Retrieve content from DynamoDB within 2 seconds
    - 4.2: Display content on Public Website
    - 4.5: Return error for draft content without authentication
    - 17.1: Execute plugin filter hooks
    - 17.2: Apply plugin transformations before rendering
    """
    try:
        # Determine if this is a slug or ID lookup
        path_params = event.get('pathParameters', {})
        content_id = path_params.get('id')
        slug = path_params.get('slug')
        
        # Get content
        content = None
        if slug:
            content = content_repo.get_by_slug(slug)
        elif content_id:
            # For ID lookup, we need to query by id
            # Since we have a composite key, we'll use query on the base table
            # For now, use slug index as primary lookup method
            # In production, you might want to add a GSI on just 'id'
            content = content_repo.get_by_slug(content_id)
            
            # If not found by slug, try as actual ID with scan (less efficient)
            if not content:
                # This is a fallback - in production consider adding id-only GSI
                from boto3.dynamodb.conditions import Attr
                table = content_repo.table
                response = table.scan(
                    FilterExpression=Attr('id').eq(content_id),
                    Limit=1
                )
                items = response.get('Items', [])
                content = items[0] if items else None
        
        if not content:
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
        
        # Check if user can view draft content
        if content.get('status') == 'draft':
            # Extract user info if present
            user_info = extract_user_from_event(event)
            
            if not user_info:
                return {
                    'statusCode': 403,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Forbidden',
                        'message': 'Draft content requires authentication'
                    })
                }
            
            # Check if user is author or has editor/admin role
            user_id, role = user_info
            is_author = content.get('author') == user_id
            is_privileged = role in ['admin', 'editor']
            
            if not (is_author or is_privileged):
                return {
                    'statusCode': 403,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Forbidden',
                        'message': 'You do not have permission to view this draft'
                    })
                }
        
        # Apply content filters through plugins
        try:
            content_text = content.get('content', '')
            content_type = content.get('type', 'post')
            filtered_content = plugin_manager.apply_content_filters(content_text, content_type)
            content['content'] = filtered_content
        except Exception as e:
            print(f"Plugin filter error: {e}")
            # Continue with unfiltered content
        
        # Enrich author field with user name
        author_id = content.get('author')
        if author_id:
            try:
                user = user_repo.get_by_id(author_id)
                if user:
                    # Add author_name field while keeping author ID
                    content['author_name'] = user.get('name', user.get('email', 'Unknown Author'))
                else:
                    content['author_name'] = 'Unknown Author'
            except Exception as e:
                print(f"Error fetching author info: {e}")
                content['author_name'] = 'Unknown Author'
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(content, default=str)
        }
    
    except Exception as e:
        print(f"Error retrieving content: {e}")
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
