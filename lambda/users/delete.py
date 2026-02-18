"""
Delete user Lambda function.
Handles DELETE /api/v1/users/{id} requests (admin only).
Deletes user from Cognito and DynamoDB, marks content as orphaned.
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


@require_auth(roles=['admin'])
def handler(event, context, user_id, role):
    """
    Delete a user from Cognito and DynamoDB.
    
    Requirements:
    - 21.3: Admin can delete users
    - 21.8: Prevent self-deletion
    - 21.9: Mark content as orphaned (content keeps author ID but user is deleted)
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
        
        # Prevent self-deletion
        if target_user_id == user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Bad request',
                    'message': 'Cannot delete yourself'
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
        
        # Delete from Cognito
        try:
            cognito_client.admin_delete_user(
                UserPoolId=os.environ.get('USER_POOL_ID'),
                Username=target_user_id
            )
        except cognito_client.exceptions.UserNotFoundException:
            # User doesn't exist in Cognito, continue with DynamoDB deletion
            print(f"User {target_user_id} not found in Cognito, continuing with DynamoDB deletion")
        except Exception as e:
            print(f"Error deleting user from Cognito: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': f'Failed to delete user from Cognito: {str(e)}'
                })
            }
        
        # Delete from DynamoDB
        try:
            user_repo.delete(target_user_id)
        except Exception as e:
            print(f"Error deleting user from DynamoDB: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': f'Failed to delete user from database: {str(e)}'
                })
            }
        
        # Note: Content created by this user will remain in the database
        # The author field will still reference the deleted user ID
        # This is intentional to preserve content history
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'message': 'User deleted successfully'
            })
        }
    
    except Exception as e:
        print(f"Error deleting user: {e}")
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
