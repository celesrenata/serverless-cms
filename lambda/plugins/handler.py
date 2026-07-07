"""
Unified plugins Lambda handler.
Routes all plugin API requests to the appropriate sub-handler based on
HTTP method and path.

Routes:
  GET    /plugins                    -> list plugins
  POST   /plugins/install            -> install plugin
  POST   /plugins/{id}/activate      -> activate plugin
  POST   /plugins/{id}/deactivate    -> deactivate plugin
  GET    /plugins/{id}/settings      -> get plugin settings
  PUT    /plugins/{id}/settings      -> update plugin settings
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from plugins.install import handler as install_handler
from plugins.activate import handler as activate_handler
from plugins.deactivate import handler as deactivate_handler
from plugins.list import handler as list_handler
from plugins.get_settings import handler as get_settings_handler
from plugins.update_settings import handler as update_settings_handler


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate plugin handler."""
    http_method = event.get('httpMethod', '').upper()
    path = event.get('path', '') or event.get('rawPath', '')
    resource = event.get('resource', '')

    if http_method == 'GET':
        # GET /plugins/{id}/settings -> get_settings
        if path.endswith('/settings') or resource.endswith('/settings'):
            return get_settings_handler(event, context)
        # GET /plugins -> list
        return list_handler(event, context)

    elif http_method == 'POST':
        # POST /plugins/install -> install
        if path.endswith('/install') or resource.endswith('/install'):
            return install_handler(event, context)
        # POST /plugins/{id}/activate -> activate
        if path.endswith('/activate') or resource.endswith('/activate'):
            return activate_handler(event, context)
        # POST /plugins/{id}/deactivate -> deactivate
        if path.endswith('/deactivate') or resource.endswith('/deactivate'):
            return deactivate_handler(event, context)

    elif http_method == 'PUT':
        # PUT /plugins/{id}/settings -> update_settings
        if path.endswith('/settings') or resource.endswith('/settings'):
            return update_settings_handler(event, context)

    # Method not allowed
    return {
        'statusCode': 405,
        'headers': HEADERS,
        'body': json.dumps({
            'error': 'Method not allowed',
            'message': f'HTTP method {http_method} is not supported for this endpoint',
        }),
    }
