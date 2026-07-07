"""
Unified theme Lambda handler.
Routes all theme API requests to the appropriate sub-handler based on
HTTP method and path.

Routes:
  GET    /themes          -> list all themes
  GET    /themes/active   -> get active theme (public, no auth)
  GET    /themes/{id}     -> get single theme
  POST   /themes          -> create theme
  PUT    /themes/{id}     -> update theme
  DELETE /themes/{id}     -> delete theme
  POST   /themes/{id}/activate  -> activate theme
  POST   /themes/{id}/duplicate -> duplicate theme
"""
import json

from get import handler as get_handler
from create import handler as create_handler
from update import handler as update_handler
from delete import handler as delete_handler
from activate import handler as activate_handler
from duplicate import handler as duplicate_handler


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate theme handler."""
    http_method = event.get('httpMethod', '').upper()
    path = event.get('path', '') or event.get('rawPath', '')
    resource = event.get('resource', '')

    # Determine the route
    if http_method == 'GET':
        # GET /themes/active (public, no auth)
        if path.endswith('/themes/active') or resource.endswith('/themes/active'):
            return get_handler(event, context)

        # GET /themes/{id}
        path_params = event.get('pathParameters') or {}
        if path_params.get('id'):
            return get_handler(event, context)

        # GET /themes (list all)
        return get_handler(event, context)

    elif http_method == 'POST':
        # Check for sub-resource actions: activate or duplicate
        if path.endswith('/activate') or resource.endswith('/activate'):
            return activate_handler(event, context)

        if path.endswith('/duplicate') or resource.endswith('/duplicate'):
            return duplicate_handler(event, context)

        # POST /themes (create)
        return create_handler(event, context)

    elif http_method == 'PUT':
        # PUT /themes/{id}
        return update_handler(event, context)

    elif http_method == 'DELETE':
        # DELETE /themes/{id}
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
