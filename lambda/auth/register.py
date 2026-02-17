"""
User registration Lambda function.
Handles self-service user registration with email verification.
"""
import json
import os
import re
import sys
import boto3
import logging
from botocore.exceptions import ClientError

# Add parent directory to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.email import send_email
from shared.middleware import require_setting

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

USER_POOL_ID = os.environ['USER_POOL_ID']
USERS_TABLE = os.environ['USERS_TABLE']

users_table = dynamodb.Table(USERS_TABLE)

# Password validation regex
PASSWORD_MIN_LENGTH = 8
PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$')
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


def validate_email(email: str) -> bool:
    """Validate email format."""
    return bool(EMAIL_PATTERN.match(email))


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    Returns (is_valid, error_message).
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters"
    
    if not PASSWORD_PATTERN.match(password):
        return False, "Password must contain uppercase, lowercase, number, and special character"
    
    return True, ""


def lambda_handler(event, context):
    """Handle user registration."""
    try:
        # Check if registration is enabled
        try:
            require_setting('registration_enabled', 'User registration')
        except ValueError as e:
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': str(e)})
            }
        
        body = json.loads(event['body'])
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        name = body.get('name', '').strip()
        
        # Validate required fields
        if not email or not password or not name:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Email, password, and name are required'})
            }
        
        # Validate email format
        if not validate_email(email):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid email format'})
            }
        
        # Validate password strength
        is_valid, error_msg = validate_password(password)
        if not is_valid:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': error_msg})
            }
        
        # Check if user already exists in Cognito
        try:
            cognito.admin_get_user(
                UserPoolId=USER_POOL_ID,
                Username=email
            )
            # User exists
            return {
                'statusCode': 409,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'User with this email already exists'})
            }
        except cognito.exceptions.UserNotFoundException:
            # User doesn't exist, proceed with registration
            pass
        
        # Create user in Cognito
        try:
            response = cognito.admin_create_user(
                UserPoolId=USER_POOL_ID,
                Username=email,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'email_verified', 'Value': 'false'},
                    {'Name': 'name', 'Value': name}
                ],
                TemporaryPassword=password,
                MessageAction='SUPPRESS'  # We'll send our own email
            )
            
            user_sub = None
            for attr in response['User']['Attributes']:
                if attr['Name'] == 'sub':
                    user_sub = attr['Value']
                    break
            
            if not user_sub:
                raise Exception("Failed to get user sub from Cognito")
            
            # Set permanent password
            cognito.admin_set_user_password(
                UserPoolId=USER_POOL_ID,
                Username=email,
                Password=password,
                Permanent=True
            )
            
            # Create user record in DynamoDB with default viewer role
            import time
            current_time = int(time.time())
            
            users_table.put_item(
                Item={
                    'id': user_sub,
                    'email': email,
                    'name': name,
                    'display_name': name,  # For backwards compatibility
                    'role': 'viewer',  # Default role for self-registered users
                    'created_at': current_time,
                    'last_login': 0
                }
            )
            
            # Send welcome email
            try:
                send_email(
                    to_email=email,
                    subject='Welcome to Celestium CMS',
                    template='welcome',
                    template_data={
                        'name': name,
                        'email': email
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send welcome email: {str(e)}")
                # Don't fail registration if email fails
            
            logger.info(f"User registered successfully: {email}")
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Registration successful',
                    'user': {
                        'id': user_sub,
                        'email': email,
                        'name': name,
                        'role': 'viewer'
                    }
                })
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UsernameExistsException':
                return {
                    'statusCode': 409,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'User with this email already exists'})
                }
            else:
                logger.error(f"Cognito error: {str(e)}")
                raise
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }
