"""
Create a new comment with validation, sanitization, and rate limiting
"""
import json
import os
import time
import uuid
import html
from typing import Any, Dict
from shared.db import get_dynamodb_resource
from shared.logger import create_logger
from shared.middleware import require_setting, check_setting

COMMENTS_TABLE = os.environ['COMMENTS_TABLE']
CONTENT_TABLE = os.environ['CONTENT_TABLE']

# Rate limiting: 5 comments per hour per IP
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds
RATE_LIMIT_MAX = 5


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
                'body': json.dumps({'error': str(e)})
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
            
            if not captcha_verified:
                # Emit CAPTCHA failure metric
                log.metric('CaptchaValidationFailed', 1, 'Count')
                log.warning('CAPTCHA verification failed', ip_address=source_ip)
                
                return {
                    'statusCode': 403,
                    'body': json.dumps({
                        'error': 'CAPTCHA verification required'
                    })
                }
            else:
                # Emit CAPTCHA success metric
                log.metric('CaptchaValidationSuccess', 1, 'Count')
                log.info('CAPTCHA verification successful', ip_address=source_ip)
        
        # If CAPTCHA is not enabled or verified, check rate limit as fallback
        if not captcha_verified and not check_rate_limit(source_ip, log):
            log.warning(f"Rate limit exceeded for IP: {source_ip}")
            return {
                'statusCode': 429,
                'body': json.dumps({
                    'error': 'Rate limit exceeded. Maximum 5 comments per hour.'
                })
            }
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Get content_id from path parameters or body
        path_params = event.get('pathParameters', {})
        content_id = path_params.get('content_id') or body.get('content_id', '').strip()
        
        # Validate required fields
        author_name = body.get('author_name', '').strip()
        author_email = body.get('author_email', '').strip()
        comment_text = body.get('comment_text', '').strip()
        parent_id = body.get('parent_id', '').strip() or None
        
        if not all([content_id, author_name, author_email, comment_text]):
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing required fields: content_id, author_name, author_email, comment_text'
                })
            }
        
        # Validate email format
        if '@' not in author_email or '.' not in author_email:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid email format'})
            }
        
        # Validate comment length
        if len(comment_text) < 1 or len(comment_text) > 5000:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Comment must be between 1 and 5000 characters'
                })
            }
        
        # Verify content exists
        dynamodb = get_dynamodb_resource()
        content_table = dynamodb.Table(CONTENT_TABLE)
        
        # Scan for content by ID (content table has composite key)
        try:
            content_response = content_table.scan(
                FilterExpression='id = :id',
                ExpressionAttributeValues={':id': content_id},
                Limit=1
            )
            if not content_response.get('Items'):
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'Content not found'})
                }
        except Exception:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Content not found'})
            }
        
        # Verify parent comment exists if provided
        if parent_id:
            comments_table = dynamodb.Table(COMMENTS_TABLE)
            parent_response = comments_table.get_item(Key={'id': parent_id})
            if 'Item' not in parent_response:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'Parent comment not found'})
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
        
        return {
            'statusCode': 201,
            'body': json.dumps(response_comment)
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        log.error(f"Error creating comment: {str(e)}", error=str(e), error_type=type(e).__name__)
        return {
            'statusCode': 500,
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
