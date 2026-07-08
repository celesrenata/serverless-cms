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
import traceback


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate section handler."""
    try:
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '') or event.get('rawPath', '')
        resource = event.get('resource', '')

        # Public endpoints: /api/v1/public/sections/...
        if '/public/sections' in path or '/public/sections' in resource:
            from public import handler as public_handler
            return public_handler(event, context)

        # Authenticated endpoints
        if http_method == 'GET':
            from get import handler as get_handler
            return get_handler(event, context)

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
        print(f"SECTIONS HANDLER ERROR: {error_detail}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'trace': error_detail,
            }),
        }
