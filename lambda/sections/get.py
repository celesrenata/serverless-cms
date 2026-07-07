"""
Section retrieval Lambda handler.
Handles GET /api/v1/sections and GET /api/v1/sections/{id} requests.
"""
import os
import sys
import json
import traceback

import boto3
from boto3.dynamodb.conditions import Key, Attr

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.sections_db import SectionRepository
from service import build_tree


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


def _count_published_posts(section_id):
    """Count published posts assigned to a section."""
    total = 0
    query_kwargs = {
        'IndexName': CONTENT_SECTION_INDEX,
        'KeyConditionExpression': Key('section_id').eq(section_id),
        'FilterExpression': Attr('status').eq('published'),
        'Select': 'COUNT',
    }

    while True:
        result = content_table.query(**query_kwargs)
        total += result.get('Count', 0)

        last_key = result.get('LastEvaluatedKey')
        if not last_key:
            break
        query_kwargs['ExclusiveStartKey'] = last_key

    return total


@require_auth(roles=['admin', 'editor'])
def handler(event, context, user_id, role):
    """Get section by ID or list all sections as tree."""
    try:
        section_id = (event.get('pathParameters') or {}).get('id')

        if section_id:
            # Get single section with post count
            section = sections_repo.get_by_id(section_id)
            if not section:
                return _response(404, {'error': 'Section not found'})

            try:
                section['post_count'] = _count_published_posts(section_id)
            except Exception:
                print(traceback.format_exc())
                section['post_count'] = 0

            return _response(200, section)

        # Get all sections as tree
        sections = sections_repo.get_all_sections()
        tree = build_tree(sections)

        return _response(200, {'items': tree})

    except Exception:
        print(traceback.format_exc())
        return _response(500, {'error': 'Internal server error'})
