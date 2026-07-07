"""
Unified settings Lambda handler.
Routes all settings API requests to the appropriate sub-handler based on
HTTP method and path.

Routes:
  GET    /settings         -> get settings (authenticated)
  PUT    /settings         -> update settings (authenticated)
  GET    /settings/public  -> get public settings (no auth)
"""
import json

from get import handler as get_handler
from update import handler as update_handler
from get_public import handler as get_public_handler


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate settings handler."""
    http_method = event.get('httpMethod', '').upper()
    path = event.get('path', '') or event.get('rawPath', '')

    # Public settings endpoint (no auth required)
    if path.endswith('/settings/public') or '/public/settings' in path:
        return get_public_handler(event, context)

    if http_method == 'GET':
        return get_handler(event, context)

    elif http_method == 'PUT':
        return update_handler(event, context)

    # Method not allowed
    return {
        'statusCode': 405,
        'headers': HEADERS,
        'body': json.dumps({
            'error': 'Method not allowed',
            'message': f'HTTP method {http_method} is not supported for this endpoint',
        }),
    }
