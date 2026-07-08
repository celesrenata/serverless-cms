"""
Unified media Lambda handler.
Routes all media API requests to the appropriate sub-handler based on
HTTP method and path.

Routes:
  GET    /media          -> list media
  GET    /media/{id}     -> get media by ID
  POST   /media/upload   -> upload media
  DELETE /media/{id}     -> delete media
"""
import json
import traceback


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate media handler."""
    try:
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '') or event.get('rawPath', '')
        path_params = event.get('pathParameters') or {}

        if http_method == 'GET':
            if path_params.get('id'):
                from get import handler as get_handler
                return get_handler(event, context)
            from list import handler as list_handler
            return list_handler(event, context)

        elif http_method == 'POST':
            from upload import handler as upload_handler
            return upload_handler(event, context)

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
        print(f"MEDIA HANDLER ERROR: {error_detail}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'trace': error_detail,
            }),
        }
