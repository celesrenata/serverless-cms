"""
Create user Lambda function.
Handles POST /api/v1/users requests (admin only).
Creates user in Cognito and DynamoDB, sends welcome email.
"""
import json
import sys
import os
import time
import re
import secrets
import string
import boto3

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import UserRepository
from shared.email import send_welcome_email


user_repo = UserRepository()
cognito_client = boto3.client('cognito-idp')

# Valid roles
VALID_ROLES = ['admin', 'editor', 'author', 'viewer']

# Email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


def generate_temporary_password():
    """Generate a secure temporary password."""
    # Password must have uppercase, lowercase, numbers, and special chars
    chars = string.ascii_letters + string.digits + '!@#$%^&*'
    password = ''.join(secrets.choice(chars) for _ in range(12))
    # Ensure it has at least one of each required type
    if not any(c.isupper() for c in password):
        password = password[:-1] + secrets.choice(string.ascii_uppercase)
    if not any(c.islower() for c in password):
        password = password[:-2] + secrets.choice(string.ascii_lowercase) + password[-1]
    if not any(c.isdigit() for c in password):
        password = password[:-3] + secrets.choice(string.digits) + password[-2:]
    return password


@require_auth(roles=['admin'])
def handler(event, context, user_id, role):
    """
    Create a new user in Cognito and DynamoDB.
    
    Requirements:
    - 21.1: Admin can create users
    - 21.2: Email format validation
    - 21.3: Role validation
    - 21.5: Send welcome email with temporary password
    - 21.6: Store user in DynamoDB
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        email = body.get('email', '').strip()
        name = body.get('name', '').strip()
        user_role = body.get('role', 'viewer')
        
        if not email:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'Email is required'
                })
            }
        
        if not name:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'Name is required'
                })
            }
        
        # Validate email format
        if not EMAIL_REGEX.match(email):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'Invalid email format'
                })
            }
        
        # Validate role
        if user_role not in VALID_ROLES:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': f'Invalid role. Must be one of: {", ".join(VALID_ROLES)}'
                })
            }
        
        # Generate temporary password
        temp_password = generate_temporary_password()
        
        # Create user in Cognito
        try:
            cognito_response = cognito_client.admin_create_user(
                UserPoolId=os.environ.get('USER_POOL_ID'),
                Username=email,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'email_verified', 'Value': 'true'},
                    {'Name': 'name', 'Value': name}
                ],
                TemporaryPassword=temp_password,
                MessageAction='SUPPRESS'  # We'll send our own email
            )
            
            cognito_user_id = cognito_response['User']['Username']
            
        except cognito_client.exceptions.UsernameExistsException:
            return {
                'statusCode': 409,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Conflict',
                    'message': 'User with this email already exists'
                })
            }
        except Exception as e:
            print(f"Error creating user in Cognito: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': f'Failed to create user in Cognito: {str(e)}'
                })
            }
        
        # Create user in DynamoDB
        current_time = int(time.time())
        user_data = {
            'id': cognito_user_id,
            'email': email,
            'name': name,
            'display_name': name,  # For backwards compatibility
            'role': user_role,
            'avatar_url': body.get('avatar_url', ''),
            'bio': body.get('bio', ''),
            'created_at': current_time,
            'last_login': 0
        }
        
        try:
            user_repo.create(user_data)
        except Exception as e:
            # Rollback: delete user from Cognito
            try:
                cognito_client.admin_delete_user(
                    UserPoolId=os.environ.get('USER_POOL_ID'),
                    Username=cognito_user_id
                )
            except Exception as rollback_error:
                print(f"Error rolling back Cognito user: {rollback_error}")
            
            print(f"Error creating user in DynamoDB: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': f'Failed to create user in database: {str(e)}'
                })
            }
        
        # Send welcome email
        try:
            send_welcome_email(email, name, temp_password)
        except Exception as e:
            print(f"Error sending welcome email: {e}")
            # Don't fail the request if email fails
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(user_data, default=str)
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
        print(f"Error creating user: {e}")
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
