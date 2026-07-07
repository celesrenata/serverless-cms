"""
Unified content Lambda handler.
Routes all content API requests to the appropriate sub-handler based on
HTTP method and path.

Routes:
  GET    /content           -> list content
  GET    /content/{id}      -> get content by ID
  GET    /content/slug/{slug} -> get content by slug
  POST   /content           -> create content
  PUT    /content/{id}      -> update content
  DELETE /content/{id}      -> delete content
"""
import json

from get import handler as get_handler
from list import handler as list_handler
from create import handler as create_handler
from update import handler as update_handler
from delete import handler as delete_handler


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate content handler."""
    http_method = event.get('httpMethod', '').upper()
    path = event.get('path', '') or event.get('rawPath', '')
    path_params = event.get('pathParameters') or {}

    if http_method == 'GET':
        # GET /content/slug/{slug} or GET /content/{id} -> get_handler
        if path_params.get('slug') or path_params.get('id'):
            return get_handler(event, context)
        # GET /content -> list_handler
        return list_handler(event, context)

    elif http_method == 'POST':
        return create_handler(event, context)

    elif http_method == 'PUT':
        return update_handler(event, context)

    elif http_method == 'DELETE':
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
