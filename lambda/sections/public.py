"""
Public section Lambda handler (unauthenticated).
Handles:
  GET /api/v1/public/sections/tree
  GET /api/v1/public/sections/path/{path+}
  GET /api/v1/public/sections/{id}/posts
"""
import os
import sys
import re
import json
import math
import traceback
from urllib.parse import unquote

import boto3
from boto3.dynamodb.conditions import Key, Attr

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.sections_db import SectionRepository
from service import build_tree, resolve_path


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

CONTENT_TABLE = os.environ.get('CONTENT_TABLE', 'cms-content-dev')
CONTENT_SECTION_INDEX = 'section_id-published_at-index'
POSTS_PER_PAGE = 20

sections_repo = SectionRepository()
dynamodb = boto3.resource('dynamodb')
content_table = dynamodb.Table(CONTENT_TABLE)


def _response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': HEADERS,
        'body': json.dumps(body, default=str),
    }


def _query_published_posts(section_id):
    """Query all published posts for a section."""
    items = []
    query_kwargs = {
        'IndexName': CONTENT_SECTION_INDEX,
        'KeyConditionExpression': Key('section_id').eq(section_id),
        'FilterExpression': Attr('status').eq('published'),
        'ScanIndexForward': False,
    }

    while True:
        result = content_table.query(**query_kwargs)
        items.extend(result.get('Items', []))

        last_key = result.get('LastEvaluatedKey')
        if not last_key:
            break
        query_kwargs['ExclusiveStartKey'] = last_key

    return items


def _get_page(event):
    """Extract page number from query parameters."""
    query_params = event.get('queryStringParameters') or {}
    raw_page = query_params.get('page', '1')
    try:
        page = int(raw_page)
    except (TypeError, ValueError):
        page = 1
    return max(page, 1)


def _extract_path_value(event):
    """Extract the path value from event for path resolution."""
    path_params = event.get('pathParameters') or {}

    # Try standard path parameter names
    for key in ('path', 'path+', 'proxy'):
        value = path_params.get(key)
        if value:
            return unquote(value).strip('/')

    # Fallback: extract from raw path
    path = event.get('path') or ''
    prefix = '/api/v1/public/sections/path/'
    if path.startswith(prefix):
        return unquote(path[len(prefix):]).strip('/')

    return ''


def _extract_section_id_for_posts(event):
    """Extract section ID for the posts endpoint."""
    path_params = event.get('pathParameters') or {}
    if path_params.get('id'):
        return path_params['id']

    # Fallback: extract from raw path
    path = event.get('path') or ''
    match = re.match(r'^/api/v1/public/sections/([^/]+)/posts/?$', path)
    if match:
        return unquote(match.group(1))

    return None


def _is_tree_route(event):
    resource = event.get('resource') or ''
    path = event.get('path') or ''
    return (
        resource == '/api/v1/public/sections/tree'
        or path.rstrip('/') == '/api/v1/public/sections/tree'
    )


def _is_path_route(event):
    resource = event.get('resource') or ''
    path = event.get('path') or ''
    return (
        resource == '/api/v1/public/sections/path/{path+}'
        or '/api/v1/public/sections/path/' in path
    )


def _is_posts_route(event):
    resource = event.get('resource') or ''
    path = event.get('path') or ''
    return (
        resource == '/api/v1/public/sections/{id}/posts'
        or bool(re.match(r'^/api/v1/public/sections/[^/]+/posts/?$', path))
    )


def _handle_tree():
    """Return all sections as a tree."""
    sections = sections_repo.get_all_sections()
    tree = build_tree(sections)
    return _response(200, {'items': tree})


def _handle_path(event):
    """Resolve a section by its slug path."""
    path_value = _extract_path_value(event)
    if not path_value:
        return _response(400, {'error': 'Path is required'})

    section = resolve_path(path_value, sections_repo)
    if not section:
        return _response(404, {'error': 'Section not found'})

    return _response(200, section)


def _handle_posts(event):
    """Get paginated posts for a section including descendants."""
    section_id = _extract_section_id_for_posts(event)
    if not section_id:
        return _response(400, {'error': 'Section id is required'})

    section = sections_repo.get_by_id(section_id)
    if not section:
        return _response(404, {'error': 'Section not found'})

    page = _get_page(event)

    # Get all section IDs (this section + descendants)
    descendant_ids = sections_repo.get_descendant_ids(section_id)
    all_section_ids = [section_id] + descendant_ids

    # Query published posts for all sections
    posts = []
    for sid in all_section_ids:
        posts.extend(_query_published_posts(sid))

    # Sort by published_at descending
    posts.sort(key=lambda item: item.get('published_at', 0), reverse=True)

    # Paginate
    total = len(posts)
    total_pages = math.ceil(total / POSTS_PER_PAGE) if total else 0
    start = (page - 1) * POSTS_PER_PAGE
    end = start + POSTS_PER_PAGE
    paged_items = posts[start:end]

    return _response(200, {
        'items': paged_items,
        'pagination': {
            'page': page,
            'per_page': POSTS_PER_PAGE,
            'total': total,
            'total_pages': total_pages,
        },
    })


def handler(event, context):
    """Handle public section endpoints."""
    try:
        if _is_tree_route(event):
            return _handle_tree()

        if _is_path_route(event):
            return _handle_path(event)

        if _is_posts_route(event):
            return _handle_posts(event)

        return _response(404, {'error': 'Route not found'})

    except Exception:
        print(traceback.format_exc())
        return _response(500, {'error': 'Internal server error'})
