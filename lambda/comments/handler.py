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
import traceback


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate comment handler."""
    try:
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '') or event.get('rawPath', '')

        if http_method == 'GET':
            from list import handler as list_handler
            return list_handler(event, context)

        elif http_method == 'POST':
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
        print(f"COMMENTS HANDLER ERROR: {error_detail}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'trace': error_detail,
            }),
        }
