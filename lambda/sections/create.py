"""
Section creation Lambda handler.
Handles POST /api/v1/sections requests.
"""
import os
import sys
import json
import time
import uuid
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.sections_db import SectionRepository
from shared.db import ContentRepository
from service import (
    validate_section_input,
    validate_page_id,
    compute_depth,
    build_path,
    ROOT_PARENT_ID,
)


HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

sections_repo = SectionRepository()
content_repo = ContentRepository()


def _response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': HEADERS,
        'body': json.dumps(body, default=str),
    }


@require_auth(roles=['admin', 'editor'])
def handler(event, context, user_id, role):
    """Create a new section."""
    try:
        raw_body = event.get('body') or '{}'
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body

        # Validate input
        errors = validate_section_input(body)
        if errors:
            return _response(400, {'error': 'Validation error', 'messages': errors})

        # Validate page_id if provided
        page_id = body.get('page_id')  # None if not provided
        if page_id is not None:
            error = validate_page_id(page_id, content_repo)
            if error:
                return _response(400, {'error': error})

        section_id = str(uuid.uuid4())
        now = int(time.time())

        parent_id = body.get('parent_id') or ROOT_PARENT_ID

        # Check parent exists if not root
        if parent_id != ROOT_PARENT_ID:
            parent = sections_repo.get_by_id(parent_id)
            if not parent:
                return _response(400, {'error': 'Parent section not found'})

        # Compute depth
        try:
            depth = compute_depth(parent_id, sections_repo)
        except ValueError as exc:
            return _response(400, {'error': str(exc)})

        # Build path
        try:
            path, path_ids = build_path(section_id, parent_id, body['slug'], sections_repo)
        except ValueError as exc:
            return _response(400, {'error': str(exc)})

        item = {
            'id': section_id,
            'name': body['name'],
            'slug': body['slug'],
            'parent_id': parent_id,
            'description': body.get('description', ''),
            'sort_order': body.get('sort_order', 0),
            'depth': depth,
            'path': path,
            'path_ids': path_ids,
            'created_at': now,
            'updated_at': now,
            'page_id': page_id,
            'show_posts': body.get('show_posts', False),
        }

        try:
            sections_repo.create(item)
        except Exception as exc:
            if 'already in use' in str(exc):
                return _response(409, {'error': str(exc)})
            print(traceback.format_exc())
            return _response(500, {'error': 'Failed to create section'})

        return _response(201, item)

    except json.JSONDecodeError:
        return _response(400, {'error': 'Invalid JSON in request body'})
    except Exception:
        print(traceback.format_exc())
        return _response(500, {'error': 'Internal server error'})
