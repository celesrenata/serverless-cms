"""
Email verification Lambda function.
Handles email verification callback from Cognito.
"""
import json
import os
import sys
import boto3
import logging
from botocore.exceptions import ClientError

# Add parent directory to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

cognito = boto3.client('cognito-idp')

USER_POOL_ID = os.environ['USER_POOL_ID']


def lambda_handler(event, context):
    """Handle email verification."""
    try:
        body = json.loads(event['body'])
        email = body.get('email', '').strip().lower()
        verification_code = body.get('code', '').strip()
        
        # Validate required fields
        if not email or not verification_code:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Email and verification code are required'})
            }
        
        # Verify the code with Cognito
        try:
            cognito.confirm_sign_up(
                ClientId=os.environ.get('USER_POOL_CLIENT_ID'),
                Username=email,
                ConfirmationCode=verification_code
            )
            
            logger.info(f"Email verified successfully: {email}")
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Email verified successfully',
                    'email': email
                })
            }
            
        except cognito.exceptions.CodeMismatchException:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid verification code'})
            }
        except cognito.exceptions.ExpiredCodeException:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Verification code has expired'})
            }
        except cognito.exceptions.UserNotFoundException:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'User not found'})
            }
        except ClientError as e:
            logger.error(f"Cognito error: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Failed to verify email'})
            }
        
    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }
