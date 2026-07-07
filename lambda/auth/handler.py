"""
Unified auth Lambda handler.
Routes all auth API requests to the appropriate sub-handler based on
HTTP method and path.

Routes (public, no auth):
  POST   /auth/register      -> register new user
  POST   /auth/verify-email  -> verify email address
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from auth.register import handler as register_handler
from auth.verify_email import handler as verify_email_handler


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate auth handler."""
    http_method = event.get('httpMethod', '').upper()
    path = event.get('path', '') or event.get('rawPath', '')

    if http_method == 'POST':
        # POST /auth/register -> register
        if path.endswith('/register'):
            return register_handler(event, context)
        # POST /auth/verify-email -> verify_email
        if path.endswith('/verify-email'):
            return verify_email_handler(event, context)

    # Method not allowed
    return {
        'statusCode': 405,
        'headers': HEADERS,
        'body': json.dumps({
            'error': 'Method not allowed',
            'message': f'HTTP method {http_method} is not supported for this endpoint',
        }),
    }
