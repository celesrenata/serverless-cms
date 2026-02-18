"""
Update user Lambda function.
Handles PUT /api/v1/users/{id} requests (admin only).
Updates user details and role in Cognito and DynamoDB.
"""
import json
import sys
import os
import time
import re
import boto3

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import UserRepository


user_repo = UserRepository()
cognito_client = boto3.client('cognito-idp')

# Valid roles
VALID_ROLES = ['admin', 'editor', 'author', 'viewer']

# Email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


@require_auth(roles=['admin'])
def handler(event, context, user_id, role):
    """
    Update user details and role.
    
    Requirements:
    - 21.2: Admin can update users
    - 21.3: Email format validation
    - 21.4: Role validation
    - 21.7: Update in both Cognito and DynamoDB
    """
    try:
        # Get user ID from path parameters
        path_params = event.get('pathParameters', {})
        target_user_id = path_params.get('id')
        
        if not target_user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'User ID is required'
                })
            }
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Validate that at least one field is provided
        if not body or not any(key in body for key in ['name', 'email', 'role', 'avatar_url', 'bio']):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'At least one field must be provided for update'
                })
            }
        
        # Check if user exists
        existing_user = user_repo.get_by_id(target_user_id)
        if not existing_user:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Not found',
                    'message': 'User not found'
                })
            }
        
        # Prepare updates
        updates = {}
        cognito_updates = []
        
        # Update email
        if 'email' in body:
            email = body['email'].strip()
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
            updates['email'] = email
            cognito_updates.append({'Name': 'email', 'Value': email})
        
        # Update name
        if 'name' in body:
            name = body['name'].strip()
            if name:
                updates['name'] = name
                updates['display_name'] = name  # For backwards compatibility
                cognito_updates.append({'Name': 'name', 'Value': name})
        
        # Update role
        if 'role' in body:
            new_role = body['role']
            if new_role not in VALID_ROLES:
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
            updates['role'] = new_role
        
        # Update avatar_url
        if 'avatar_url' in body:
            updates['avatar_url'] = body['avatar_url']
        
        # Update bio
        if 'bio' in body:
            updates['bio'] = body['bio']
        
        # Update timestamp
        updates['updated_at'] = int(time.time())
        
        # Update Cognito if there are attribute changes
        if cognito_updates:
            try:
                cognito_client.admin_update_user_attributes(
                    UserPoolId=os.environ.get('USER_POOL_ID'),
                    Username=target_user_id,
                    UserAttributes=cognito_updates
                )
            except Exception as e:
                print(f"Error updating user in Cognito: {e}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Internal server error',
                        'message': f'Failed to update user in Cognito: {str(e)}'
                    })
                }
        
        # Update DynamoDB
        try:
            updated_user = user_repo.update(target_user_id, updates)
        except Exception as e:
            print(f"Error updating user in DynamoDB: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': f'Failed to update user in database: {str(e)}'
                })
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(updated_user, default=str)
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
        print(f"Error updating user: {e}")
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
