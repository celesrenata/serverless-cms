"""
Unified section Lambda handler.
Routes all section API requests to the appropriate sub-handler based on
HTTP method and path.

Routes (authenticated):
  GET    /sections          -> list sections (tree)
  GET    /sections/{id}     -> get section by ID
  POST   /sections          -> create section
  PUT    /sections/{id}     -> update section
  DELETE /sections/{id}     -> delete section

Routes (public, no auth):
  GET    /public/sections/tree         -> get section tree
  GET    /public/sections/path/{path+} -> resolve section by path
  GET    /public/sections/{id}/posts   -> get posts for section
"""
import json

from get import handler as get_handler
from create import handler as create_handler
from update import handler as update_handler
from delete import handler as delete_handler
from public import handler as public_handler


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate section handler."""
    http_method = event.get('httpMethod', '').upper()
    path = event.get('path', '') or event.get('rawPath', '')
    resource = event.get('resource', '')

    # Public endpoints: /api/v1/public/sections/...
    if '/public/sections' in path or '/public/sections' in resource:
        return public_handler(event, context)

    # Authenticated endpoints
    if http_method == 'GET':
        return get_handler(event, context)

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
