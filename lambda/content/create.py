"""
Content creation Lambda function.
Handles POST /api/v1/content requests.
"""
import json
import uuid
import sys
import os
from datetime import datetime
import time

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import ContentRepository, UserRepository
from shared.plugins import PluginManager
from shared.logger import create_logger, log_performance
import boto3


content_repo = ContentRepository()
user_repo = UserRepository()
plugin_manager = PluginManager()
cognito_client = boto3.client('cognito-idp')


@require_auth(roles=['admin', 'editor', 'author'])
def handler(event, context, user_id, role):
    """
    Create new content item.
    
    Requirements:
    - 1.1: Store content in DynamoDB with unique identifier
    - 1.3: Validate slug uniqueness
    - 1.4: Permit creation for author role or higher
    - 19.1: Execute plugin hooks for content_create
    """
    # Initialize structured logger
    log = create_logger(event, context, user_id=user_id, user_role=role)
    start_time = time.time()
    
    log.info('Content creation request received', 
             method='POST',
             path='/api/v1/content')
    
    try:
        # Ensure user exists in users table
        user = user_repo.get_by_id(user_id)
        if not user:
            try:
                cognito_response = cognito_client.admin_get_user(
                    UserPoolId=os.environ.get('USER_POOL_ID'),
                    Username=user_id
                )
                attributes = {attr['Name']: attr['Value'] for attr in cognito_response.get('UserAttributes', [])}
                user = {
                    'id': user_id,
                    'email': attributes.get('email', ''),
                    'name': attributes.get('name', attributes.get('email', '').split('@')[0]),
                    'role': role,
                    'created_at': int(time.time())
                }
                user_repo.create(user)
                log.info('Auto-created user in users table', user_id=user_id)
            except Exception as e:
                log.warning('Failed to auto-create user', user_id=user_id, error=str(e))
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        content_type = body.get('type', 'post')
        
        log.debug('Request body parsed', 
                 content_type=content_type,
                 has_title=bool(body.get('title')),
                 has_content=bool(body.get('content')))
        
        # Validate required fields
        if not body.get('title'):
            log.warning('Validation failed: missing title')
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Validation error',
                    'message': 'Title is required'
                })
            }
        
        if not body.get('content'):
            log.warning('Validation failed: missing content')
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Validation error',
                    'message': 'Content is required'
                })
            }
        
        # Generate or validate slug
        slug = body.get('slug')
        if not slug:
            # Auto-generate slug from title
            slug = body['title'].lower()
            slug = slug.replace(' ', '-')
            # Remove special characters
            slug = ''.join(c for c in slug if c.isalnum() or c == '-')
            # Remove consecutive dashes
            while '--' in slug:
                slug = slug.replace('--', '-')
            slug = slug.strip('-')
            log.debug('Auto-generated slug', slug=slug)
        
        # Check slug uniqueness
        slug_check_start = time.time()
        existing = content_repo.get_by_slug(slug)
        slug_check_duration = (time.time() - slug_check_start) * 1000
        
        log.metric('slug_uniqueness_check_duration', slug_check_duration, 'Milliseconds')
        
        if existing:
            log.warning('Slug conflict detected', slug=slug, existing_id=existing.get('id'))
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
        
        # Create content item
        now = int(datetime.now().timestamp())
        content_id = str(uuid.uuid4())
        
        content_item = {
            'id': content_id,
            'type#timestamp': f"{content_type}#{now}",
            'type': content_type,
            'title': body['title'],
            'slug': slug,
            'content': body['content'],
            'excerpt': body.get('excerpt', ''),
            'author': user_id,
            'status': body.get('status', 'draft'),
            'featured_image': body.get('featured_image', ''),
            'metadata': body.get('metadata', {}),
            'created_at': now,
            'updated_at': now
        }
        
        # Set published_at if status is published
        if content_item['status'] == 'published':
            content_item['published_at'] = now
        else:
            content_item['published_at'] = 0
        
        # Set scheduled_at if provided
        if body.get('scheduled_at'):
            content_item['scheduled_at'] = body['scheduled_at']
            content_item['status'] = 'draft'  # Scheduled content starts as draft
            log.info('Content scheduled for future publication',
                    content_id=content_id,
                    scheduled_at=body['scheduled_at'])
        else:
            content_item['scheduled_at'] = 0
        
        # Execute plugin hook for content_create
        plugin_start = time.time()
        try:
            content_item = plugin_manager.execute_hook('content_create', content_item)
            plugin_duration = (time.time() - plugin_start) * 1000
            log.metric('plugin_hook_duration', plugin_duration, 'Milliseconds',
                      hook='content_create')
            log.debug('Plugin hooks executed successfully', hook='content_create')
        except Exception as e:
            plugin_duration = (time.time() - plugin_start) * 1000
            log.error('Plugin hook failed',
                     hook='content_create',
                     error=str(e),
                     error_type=type(e).__name__,
                     duration_ms=plugin_duration)
            # Continue even if plugin fails
        
        # Save to database
        db_start = time.time()
        result = content_repo.create(content_item)
        db_duration = (time.time() - db_start) * 1000
        
        log.metric('dynamodb_write_duration', db_duration, 'Milliseconds',
                  operation='create')
        
        total_duration = (time.time() - start_time) * 1000
        log.metric('content_create_total_duration', total_duration, 'Milliseconds',
                  content_type=content_type,
                  status=content_item['status'])
        
        log.info('Content created successfully',
                content_id=content_id,
                content_type=content_type,
                slug=slug,
                status=content_item['status'],
                duration_ms=total_duration)
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(result, default=str)
        }
    
    except json.JSONDecodeError as e:
        log.error('JSON decode error',
                 error=str(e),
                 error_type='JSONDecodeError')
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
        total_duration = (time.time() - start_time) * 1000
        log.error('Content creation failed',
                 error=str(e),
                 error_type=type(e).__name__,
                 duration_ms=total_duration)
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
