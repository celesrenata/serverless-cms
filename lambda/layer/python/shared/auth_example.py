"""
Example usage of authentication utilities.
This file demonstrates how to use the auth decorators in Lambda functions.
"""

import json
from shared.auth import require_auth, extract_user_from_event

# Example 1: Protected endpoint requiring authentication
@require_auth()
def protected_handler(event, context, user_id, role):
    """
    Any authenticated user can access this endpoint.
    The decorator automatically injects user_id and role parameters.
    """
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'message': 'Success',
            'user_id': user_id,
            'role': role
        })
    }


# Example 2: Admin-only endpoint
@require_auth(roles=['admin'])
def admin_only_handler(event, context, user_id, role):
    """
    Only users with 'admin' role can access this endpoint.
    Returns 403 Forbidden for other roles.
    """
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'message': 'Admin action completed',
            'user_id': user_id
        })
    }


# Example 3: Editor or Admin endpoint
@require_auth(roles=['admin', 'editor'])
def editor_handler(event, context, user_id, role):
    """
    Users with 'admin' or 'editor' role can access this endpoint.
    The role hierarchy is respected (admin > editor > author > viewer).
    """
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'message': 'Content updated',
            'updated_by': user_id,
            'role': role
        })
    }


# Example 4: Optional authentication
def public_with_optional_auth_handler(event, context):
    """
    Public endpoint that provides additional features for authenticated users.
    Uses extract_user_from_event to check for authentication without requiring it.
    """
    user_info = extract_user_from_event(event)
    
    if user_info:
        user_id, role = user_info
        # Authenticated user - show draft content
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'message': 'Content with drafts',
                'authenticated': True,
                'user_id': user_id,
                'role': role
            })
        }
    else:
        # Anonymous user - show only published content
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'message': 'Public content only',
                'authenticated': False
            })
        }
