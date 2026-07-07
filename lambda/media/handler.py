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
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from media.upload import handler as upload_handler
from media.get import handler as get_handler
from media.list import handler as list_handler
from media.delete import handler as delete_handler


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}


def handler(event, context):
    """Route incoming requests to the appropriate media handler."""
    http_method = event.get('httpMethod', '').upper()
    path = event.get('path', '') or event.get('rawPath', '')
    path_params = event.get('pathParameters') or {}

    if http_method == 'GET':
        # GET /media/{id} -> get
        if path_params.get('id'):
            return get_handler(event, context)
        # GET /media -> list
        return list_handler(event, context)

    elif http_method == 'POST':
        # POST /media/upload -> upload
        return upload_handler(event, context)

    elif http_method == 'DELETE':
        # DELETE /media/{id} -> delete
        return delete_handler(event, context)

    # Method not allowed
    return {
        'statusCode': 405,
        'headers': HEADERS,
        'body': json.dumps({
            'error': 'Method not allowed',
            'message': f'HTTP method {http_method} is not supported for this endpoint',
        }),
    }
