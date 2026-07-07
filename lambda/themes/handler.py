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
import traceback


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate theme handler."""
    try:
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '') or event.get('rawPath', '')
        resource = event.get('resource', '')

        if http_method == 'GET':
            from get import handler as get_handler
            return get_handler(event, context)

        elif http_method == 'POST':
            if path.endswith('/activate') or resource.endswith('/activate'):
                from activate import handler as activate_handler
                return activate_handler(event, context)
            if path.endswith('/duplicate') or resource.endswith('/duplicate'):
                from duplicate import handler as duplicate_handler
                return duplicate_handler(event, context)
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
        print(f"THEMES HANDLER ERROR: {error_detail}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'trace': error_detail,
            }),
        }
