"""
Reset password Lambda function.
Handles POST /api/v1/users/{id}/reset-password requests (admin only).
Triggers Cognito password reset with email notification.
"""
import json
import sys
import os
import boto3

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import UserRepository
from shared.email import send_password_reset_email


user_repo = UserRepository()
cognito_client = boto3.client('cognito-idp')


@require_auth(roles=['admin'])
def handler(event, context, user_id, role):
    """
    Reset user password and send notification email.
    
    Requirements:
    - 21.4: Admin can reset user passwords
    - 21.5: Send password reset email
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
        
        # Check if user exists in DynamoDB
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
        
        # Trigger password reset in Cognito
        try:
            # Admin reset password - this will send a verification code
            cognito_client.admin_reset_user_password(
                UserPoolId=os.environ.get('USER_POOL_ID'),
                Username=target_user_id
            )
            
            # Get the verification code from Cognito (for email)
            # Note: In production, Cognito sends the code directly
            # We're using a custom email for better UX
            
        except cognito_client.exceptions.UserNotFoundException:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Not found',
                    'message': 'User not found in Cognito'
                })
            }
        except Exception as e:
            print(f"Error resetting password in Cognito: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': f'Failed to reset password: {str(e)}'
                })
            }
        
        # Send custom password reset email
        # Note: The actual reset code is sent by Cognito
        # This is an additional notification for better UX
        try:
            send_password_reset_email(
                existing_user['email'],
                existing_user['name'],
                'Check your email for the password reset code from Cognito'
            )
        except Exception as e:
            print(f"Error sending password reset email: {e}")
            # Don't fail the request if email fails
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'message': 'Password reset initiated. User will receive an email with instructions.'
            })
        }
    
    except Exception as e:
        print(f"Error resetting password: {e}")
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
