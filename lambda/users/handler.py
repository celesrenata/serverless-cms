"""
Unified users Lambda handler.
Routes all user API requests to the appropriate sub-handler based on
HTTP method and path.

Routes:
  GET    /users/me              -> get current user
  PUT    /users/me              -> update current user
  GET    /users                 -> list users
  POST   /users                 -> create user
  PUT    /users/{id}            -> update user
  DELETE /users/{id}            -> delete user
  POST   /users/{id}/reset-password -> reset user password
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from users.get_me import handler as get_me_handler
from users.update_me import handler as update_me_handler
from users.list import handler as list_handler
from users.create import handler as create_handler
from users.update import handler as update_handler
from users.delete import handler as delete_handler
from users.reset_password import handler as reset_password_handler


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate user handler."""
    http_method = event.get('httpMethod', '').upper()
    path = event.get('path', '') or event.get('rawPath', '')
    path_params = event.get('pathParameters') or {}

    # Check for /users/me routes first (before {id} matching)
    if '/users/me' in path:
        if http_method == 'GET':
            return get_me_handler(event, context)
        elif http_method == 'PUT':
            return update_me_handler(event, context)

    # Check for reset-password sub-resource
    if path.endswith('/reset-password') and http_method == 'POST':
        return reset_password_handler(event, context)

    if http_method == 'GET':
        # GET /users -> list
        return list_handler(event, context)

    elif http_method == 'POST':
        # POST /users -> create
        return create_handler(event, context)

    elif http_method == 'PUT':
        # PUT /users/{id} -> update
        return update_handler(event, context)

    elif http_method == 'DELETE':
        # DELETE /users/{id} -> delete
        return delete_handler(event, context)

    # Method not allowed
    return {
        'statusCode': 405,
        'headers': HEADERS,
        'body': json.dumps({
            'error': 'Method not allowed',
            'message': f'HTTP method {http_method} is not supported for this endpoint',
        }),
    }
