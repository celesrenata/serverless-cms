"""
Update current user profile Lambda function.
Handles PUT /api/v1/users/me requests.
"""
import json
import sys
import os
import boto3
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import UserRepository


user_repo = UserRepository()
cognito_client = boto3.client('cognito-idp')


@require_auth()
def handler(event, context, user_id, role):
    """
    Update current user profile.
    
    Requirements:
    - 5.1: Update user profile information
    - 5.2: Sync with Cognito user attributes
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Get current user
        user = user_repo.get_by_id(user_id)
        if not user:
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
        
        # Prepare updates (only allow certain fields to be updated by user)
        updates = {}
        allowed_fields = ['name', 'display_name', 'bio', 'avatar_url']
        
        for field in allowed_fields:
            if field in body:
                updates[field] = body[field]
        
        # If name is provided, also update display_name for backwards compatibility
        if 'name' in body and 'display_name' not in body:
            updates['display_name'] = body['name']
        # If display_name is provided, also update name for consistency
        if 'display_name' in body and 'name' not in body:
            updates['name'] = body['display_name']
        
        # Users cannot change their own role
        # Role changes must be done by admins through the admin endpoint
        
        if not updates:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'No valid fields to update'
                })
            }
        
        # Update user in DynamoDB
        updated_user = user_repo.update(user_id, updates)
        
        # Sync display_name/name to Cognito if changed
        if 'display_name' in updates or 'name' in updates:
            try:
                name_value = updates.get('name') or updates.get('display_name')
                cognito_client.admin_update_user_attributes(
                    UserPoolId=os.environ.get('USER_POOL_ID'),
                    Username=user_id,
                    UserAttributes=[
                        {
                            'Name': 'name',
                            'Value': name_value
                        }
                    ]
                )
            except Exception as e:
                print(f"Warning: Failed to sync name to Cognito: {e}")
                # Continue even if Cognito sync fails
        
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
        print(f"Error updating user profile: {e}")
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
