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
import traceback


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate settings handler."""
    try:
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '') or event.get('rawPath', '')

        # Public settings endpoint (no auth required)
        if path.endswith('/settings/public') or '/public/settings' in path:
            from get_public import handler as get_public_handler
            return get_public_handler(event, context)

        if http_method == 'GET':
            from get import handler as get_handler
            return get_handler(event, context)

        elif http_method == 'PUT':
            from update import handler as update_handler
            return update_handler(event, context)

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
        print(f"SETTINGS HANDLER ERROR: {error_detail}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'trace': error_detail,
            }),
        }
