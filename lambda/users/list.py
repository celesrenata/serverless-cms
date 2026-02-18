"""
List users Lambda function.
Handles GET /api/v1/users requests (admin only).
"""
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import UserRepository


user_repo = UserRepository()


@require_auth(roles=['admin'])
def handler(event, context, user_id, role):
    """
    List all users (admin only).
    
    Requirements:
    - 5.1: Admin can view all users
    - 5.2: Retrieve user data from DynamoDB
    - 21.5: Include last_login and created_at timestamps
    """
    try:
        # Get query parameters
        params = event.get('queryStringParameters') or {}
        
        # Parse pagination parameters
        limit = int(params.get('limit', 50))
        last_key = params.get('last_key')
        
        # Parse last_key if provided
        if last_key:
            try:
                last_key = json.loads(last_key)
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Bad request',
                        'message': 'Invalid last_key format'
                    })
                }
        
        # Validate limit
        if limit < 1 or limit > 100:
            limit = 50
        
        # Get users from DynamoDB
        result = user_repo.list_users(limit=limit, last_key=last_key)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'users': result['items'],
                'last_key': result['last_key']
            }, default=str)
        }
    
    except ValueError as e:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Bad request',
                'message': f'Invalid parameter: {str(e)}'
            })
        }
    
    except Exception as e:
        print(f"Error listing users: {e}")
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
