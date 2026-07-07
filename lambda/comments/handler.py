"""
Unified comments Lambda handler.
Routes all comment API requests to the appropriate sub-handler based on
HTTP method and path.

Routes (public, no auth):
  GET    /content/{id}/comments  -> list comments for content
  POST   /content/{id}/comments  -> create comment

Routes (admin, authenticated):
  GET    /comments               -> list all comments (moderation)
  PUT    /comments/{id}          -> update/moderate comment
  DELETE /comments/{id}          -> delete comment
"""
import json

from list import handler as list_handler
from create import handler as create_handler
from update import handler as update_handler
from delete import handler as delete_handler


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate comment handler."""
    http_method = event.get('httpMethod', '').upper()
    path = event.get('path', '') or event.get('rawPath', '')

    if http_method == 'GET':
        # Both /content/{id}/comments and /comments use list handler
        return list_handler(event, context)

    elif http_method == 'POST':
        # POST /content/{id}/comments -> create
        return create_handler(event, context)

    elif http_method == 'PUT':
        # PUT /comments/{id} -> update
        return update_handler(event, context)

    elif http_method == 'DELETE':
        # DELETE /comments/{id} -> delete
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
