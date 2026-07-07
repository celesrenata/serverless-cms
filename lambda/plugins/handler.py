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
import traceback


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate plugin handler."""
    try:
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '') or event.get('rawPath', '')
        resource = event.get('resource', '')

        if http_method == 'GET':
            if path.endswith('/settings') or resource.endswith('/settings'):
                from get_settings import handler as get_settings_handler
                return get_settings_handler(event, context)
            from list import handler as list_handler
            return list_handler(event, context)

        elif http_method == 'POST':
            if path.endswith('/install') or resource.endswith('/install'):
                from install import handler as install_handler
                return install_handler(event, context)
            if path.endswith('/activate') or resource.endswith('/activate'):
                from activate import handler as activate_handler
                return activate_handler(event, context)
            if path.endswith('/deactivate') or resource.endswith('/deactivate'):
                from deactivate import handler as deactivate_handler
                return deactivate_handler(event, context)

        elif http_method == 'PUT':
            if path.endswith('/settings') or resource.endswith('/settings'):
                from update_settings import handler as update_settings_handler
                return update_settings_handler(event, context)

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
        print(f"PLUGINS HANDLER ERROR: {error_detail}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'trace': error_detail,
            }),
        }
