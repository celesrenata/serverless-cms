"""
Create a new comment with validation, sanitization, and rate limiting
"""
import json
import os
import time
import uuid
import html
from decimal import Decimal
from typing import Any, Dict
from shared.db import get_dynamodb_resource
from shared.logger import create_logger
from shared.middleware import require_setting, check_setting

COMMENTS_TABLE = os.environ['COMMENTS_TABLE']
CONTENT_TABLE = os.environ['CONTENT_TABLE']

# Rate limiting: 5 comments per hour per IP
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds
RATE_LIMIT_MAX = 5

# CORS headers
CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


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
    Create a new comment
    
    Request body:
    - content_id: ID of the content being commented on (required)
    - author_name: Name of the commenter (required)
    - author_email: Email of the commenter (required)
    - comment_text: Comment content (required)
    - parent_id: ID of parent comment for replies (optional)
    """
    log = create_logger(event, context)
    
    try:
        # Check if comments are enabled
        try:
            require_setting('comments_enabled', 'Comments')
        except ValueError as e:
            return {
                'statusCode': 403,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Feature disabled',
                    'message': str(e)
                })
            }
        
        # Get client IP for rate limiting
        source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
        
        # Check if CAPTCHA is enabled and required
        captcha_enabled = check_setting('captcha_enabled', False)
        captcha_verified = False
        
        if captcha_enabled:
            # Check if CAPTCHA was verified by WAF
            # WAF adds x-captcha-verified header when CAPTCHA is solved
            headers = event.get('headers', {})
            captcha_verified = headers.get('x-captcha-verified') == 'true'
            
            if captcha_verified:
                # Emit CAPTCHA success metric
                log.metric('CaptchaValidationSuccess', 1, 'Count')
                log.info('CAPTCHA verification successful', ip_address=source_ip)
        
        # Check rate limiting
        # - If CAPTCHA is enabled and verified, skip rate limiting (CAPTCHA is primary protection)
        # - Otherwise, check rate limit
        should_check_rate_limit = not (captcha_enabled and captcha_verified)
        
        if should_check_rate_limit and not check_rate_limit(source_ip, log):
            log.warning(f"Rate limit exceeded for IP: {source_ip}")
            return {
                'statusCode': 429,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Rate limit exceeded',
                    'message': 'Rate limit exceeded. Maximum 5 comments per hour.'
                })
            }
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Get content_id from path parameters or body
        path_params = event.get('pathParameters', {})
        content_id = path_params.get('id') or path_params.get('content_id') or body.get('content_id', '').strip()
        
        # Validate required fields
        author_name = body.get('author_name', '').strip()
        author_email = body.get('author_email', '').strip()
        comment_text = body.get('comment_text', '').strip()
        parent_id = body.get('parent_id', '').strip() or None
        
        if not all([content_id, author_name, author_email, comment_text]):
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Validation error',
                    'message': 'Missing required fields: content_id, author_name, author_email, comment_text'
                })
            }
        
        # Validate email format
        if '@' not in author_email or '.' not in author_email:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Validation error',
                    'message': 'Invalid email format'
                })
            }
        
        # Validate comment length
        if len(comment_text) < 1 or len(comment_text) > 5000:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Validation error',
                    'message': 'Comment text is too long. Maximum length is 5000 characters.'
                })
            }
        
        # Verify content exists and is published
        from boto3.dynamodb.conditions import Attr
        dynamodb = get_dynamodb_resource()
        content_table = dynamodb.Table(CONTENT_TABLE)
        
        # Scan for content by ID
        try:
            log.info(f"Looking for content with id: {content_id}")
            content_response = content_table.scan(
                FilterExpression=Attr('id').eq(content_id),
                Limit=1
            )
            
            log.info(f"Scan returned {len(content_response.get('Items', []))} items")
            
            if not content_response.get('Items'):
                log.warning(f"Content not found: {content_id}")
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Content not found'})
                }
            
            content = content_response['Items'][0]
            log.info(f"Found content with status: {content.get('status')}")
            
            # Check if content is published
            if content.get('status') != 'published':
                return {
                    'statusCode': 403,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Comments not allowed',
                        'message': 'Comments are only allowed on published content'
                    })
                }
        except Exception as e:
            log.error(f"Error verifying content: {str(e)}")
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Content not found'})
            }
        
        # Verify parent comment exists if provided
        if parent_id:
            from shared.db import CommentRepository
            comment_repo = CommentRepository()
            parent_comment = comment_repo.get_by_id(parent_id)
            if not parent_comment:
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Not found',
                        'message': 'Parent comment not found'
                    })
                }
        
        # Sanitize input to prevent XSS
        sanitized_name = html.escape(author_name)
        sanitized_email = html.escape(author_email)
        sanitized_text = html.escape(comment_text)
        
        # Create comment
        comment_id = str(uuid.uuid4())
        created_at = int(time.time())
        
        comment = {
            'id': comment_id,
            'content_id': content_id,
            'author_name': sanitized_name,
            'author_email': sanitized_email,
            'comment_text': sanitized_text,
            'parent_id': parent_id,
            'status': 'pending',  # Requires moderation
            'ip_address': source_ip,
            'created_at': created_at,
            'updated_at': created_at,
        }
        
        # Save to DynamoDB
        comments_table = dynamodb.Table(COMMENTS_TABLE)
        comments_table.put_item(Item=comment)
        
        log.info(f"Created comment {comment_id} for content {content_id}", 
                comment_id=comment_id, content_id=content_id)
        
        # Return comment without sensitive data
        response_comment = {k: v for k, v in comment.items() if k not in ['ip_address', 'author_email']}
        response_comment['message'] = 'Comment submitted successfully. It will appear after moderation.'
        
        # Convert Decimals to int for JSON serialization
        response_comment = decimal_to_int(response_comment)
        
        return {
            'statusCode': 201,
            'headers': CORS_HEADERS,
            'body': json.dumps(response_comment)
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        log.error(f"Error creating comment: {str(e)}", error=str(e), error_type=type(e).__name__)
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Failed to create comment'})
        }


def check_rate_limit(ip_address: str, log) -> bool:
    """
    Check if IP address has exceeded rate limit
    Returns True if within limit, False if exceeded
    """
    try:
        dynamodb = get_dynamodb_resource()
        table = dynamodb.Table(COMMENTS_TABLE)
        
        # Query comments from this IP in the last hour
        current_time = int(time.time())
        cutoff_time = current_time - RATE_LIMIT_WINDOW
        
        response = table.scan(
            FilterExpression='ip_address = :ip AND created_at > :cutoff',
            ExpressionAttributeValues={
                ':ip': ip_address,
                ':cutoff': cutoff_time
            }
        )
        
        comment_count = len(response.get('Items', []))
        
        return comment_count < RATE_LIMIT_MAX
        
    except Exception as e:
        log.error(f"Error checking rate limit: {str(e)}", error=str(e))
        # Allow comment on error to avoid blocking legitimate users
        return True
