"""
Get current user profile Lambda function.
Handles GET /api/v1/users/me requests.
"""
import json
import sys
import os
import boto3

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import UserRepository


user_repo = UserRepository()
cognito_client = boto3.client('cognito-idp')


@require_auth()
def handler(event, context, user_id, role):
    """
    Get current user profile.
    
    Requirements:
    - 5.1: Get authenticated user information
    - 5.2: Sync with Cognito user attributes
    """
    try:
        # Get user from DynamoDB
        user = user_repo.get_by_id(user_id)
        
        if not user:
            # User doesn't exist in DynamoDB yet, fetch from Cognito and create
            try:
                cognito_response = cognito_client.admin_get_user(
                    UserPoolId=os.environ.get('USER_POOL_ID'),
                    Username=user_id
                )
                
                # Extract user attributes
                attributes = {attr['Name']: attr['Value'] for attr in cognito_response.get('UserAttributes', [])}
                
                # Create user in DynamoDB
                import time
                user = {
                    'id': user_id,
                    'email': attributes.get('email', ''),
                    'name': attributes.get('name', attributes.get('email', '').split('@')[0]),
                    'username': cognito_response.get('Username', ''),
                    'role': 'viewer',  # Default role
                    'avatar_url': '',
                    'bio': '',
                    'created_at': int(time.time()),
                    'last_login': int(time.time())
                }
                
                user_repo.create(user)
                
            except Exception as e:
                print(f"Error fetching user from Cognito: {e}")
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
        
        # Update last_login timestamp
        import time
        user_repo.update(user_id, {'last_login': int(time.time())})
        user['last_login'] = int(time.time())
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(user, default=str)
        }
    
    except Exception as e:
        print(f"Error getting user profile: {e}")
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
