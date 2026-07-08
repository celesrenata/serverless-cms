"""
Unified auth Lambda handler.
Routes all auth API requests to the appropriate sub-handler based on
HTTP method and path.

Routes (public, no auth):
  POST   /auth/register      -> register new user
  POST   /auth/verify-email  -> verify email address
"""
import json
import traceback


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate auth handler."""
    try:
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '') or event.get('rawPath', '')

        if http_method == 'POST':
            if path.endswith('/register'):
                from register import handler as register_handler
                return register_handler(event, context)
            if path.endswith('/verify-email'):
                from verify_email import handler as verify_email_handler
                return verify_email_handler(event, context)

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
        print(f"AUTH HANDLER ERROR: {error_detail}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'trace': error_detail,
            }),
        }
