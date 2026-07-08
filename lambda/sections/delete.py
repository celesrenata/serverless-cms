"""
Section deletion Lambda handler.
Handles DELETE /api/v1/sections/{id} requests.
"""
import os
import sys
import json
import traceback

import boto3
from boto3.dynamodb.conditions import Key

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.sections_db import SectionRepository


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

CONTENT_TABLE = os.environ.get('CONTENT_TABLE', 'cms-content-dev')
CONTENT_SECTION_INDEX = 'section_id-published_at-index'

sections_repo = SectionRepository()
dynamodb = boto3.resource('dynamodb')
content_table = dynamodb.Table(CONTENT_TABLE)


def _response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': HEADERS,
        'body': json.dumps(body, default=str),
    }


def _has_assigned_content(section_id):
    """Check if any content is assigned to this section."""
    result = content_table.query(
        IndexName=CONTENT_SECTION_INDEX,
        KeyConditionExpression=Key('section_id').eq(section_id),
        Limit=1,
        Select='COUNT',
    )
    return result.get('Count', 0) > 0


@require_auth(roles=['admin', 'editor'])
def handler(event, context, user_id, role):
    """Delete a section."""
    try:
        section_id = (event.get('pathParameters') or {}).get('id')
        if not section_id:
            return _response(400, {'error': 'Section id is required'})

        section = sections_repo.get_by_id(section_id)
        if not section:
            return _response(404, {'error': 'Section not found'})

        # Check no children
        children_count = sections_repo.count_children(section_id)
        if children_count > 0:
            return _response(400, {
                'error': 'Section has child sections and cannot be deleted',
                'children_count': children_count,
            })

        # Check no assigned posts
        try:
            if _has_assigned_content(section_id):
                return _response(400, {
                    'error': 'Section has assigned content and cannot be deleted',
                })
        except Exception:
            print(traceback.format_exc())
            return _response(500, {'error': 'Failed to check assigned content'})

        # Delete section
        try:
            sections_repo.delete(section_id, section['slug'])
        except Exception:
            print(traceback.format_exc())
            return _response(500, {'error': 'Failed to delete section'})

        return _response(200, {'message': 'Section deleted successfully'})

    except Exception:
        print(traceback.format_exc())
        return _response(500, {'error': 'Internal server error'})
