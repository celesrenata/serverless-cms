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
import traceback


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate user handler."""
    try:
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '') or event.get('rawPath', '')
        path_params = event.get('pathParameters') or {}

        # Check for /users/me routes first (before {id} matching)
        if '/users/me' in path:
            if http_method == 'GET':
                from get_me import handler as get_me_handler
                return get_me_handler(event, context)
            elif http_method == 'PUT':
                from update_me import handler as update_me_handler
                return update_me_handler(event, context)

        # Check for reset-password sub-resource
        if path.endswith('/reset-password') and http_method == 'POST':
            from reset_password import handler as reset_password_handler
            return reset_password_handler(event, context)

        if http_method == 'GET':
            from list import handler as list_handler
            return list_handler(event, context)

        elif http_method == 'POST':
            from create import handler as create_handler
            return create_handler(event, context)

        elif http_method == 'PUT':
            from update import handler as update_handler
            return update_handler(event, context)

        elif http_method == 'DELETE':
            from delete import handler as delete_handler
            return delete_handler(event, context)

        return {
            'statusCode': 405,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Method not allowed',
                'message': f'HTTP method {http_method} is not supported for this endpoint',
            }),
        }
    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"USERS HANDLER ERROR: {error_detail}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'trace': error_detail,
            }),
        }
