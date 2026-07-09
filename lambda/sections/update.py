"""
Section update Lambda handler.
Handles PUT /api/v1/sections/{id} requests.
"""
import os
import sys
import json
import time
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import ContentRepository
from shared.sections_db import SectionRepository
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
    """Update an existing section."""
    try:
        section_id = (event.get('pathParameters') or {}).get('id')
        if not section_id:
            return _response(400, {'error': 'Section id is required'})

        existing = sections_repo.get_by_id(section_id)
        if not existing:
            return _response(404, {'error': 'Section not found'})

        raw_body = event.get('body') or '{}'
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body

        # Validate input (update mode)
        errors = validate_section_input(body, is_update=True)
        if errors:
            return _response(400, {'error': 'Validation error', 'messages': errors})

        updates = {}
        now = int(time.time())

        if 'name' in body:
            updates['name'] = body['name']

        if 'description' in body:
            updates['description'] = body['description']

        if 'sort_order' in body:
            updates['sort_order'] = body['sort_order']

        if 'page_id' in body:
            new_page_id = body['page_id']  # Can be string or None
            if new_page_id is not None:
                error = validate_page_id(new_page_id, content_repo)
                if error:
                    return _response(400, {'error': error})
            updates['page_id'] = new_page_id

        # Handle parent change
        current_parent_id = existing.get('parent_id', ROOT_PARENT_ID)
        new_parent_id = current_parent_id
        parent_changed = False

        if 'parent_id' in body:
            new_parent_id = body['parent_id'] or ROOT_PARENT_ID

            if new_parent_id == section_id:
                return _response(400, {'error': 'Section cannot be its own parent'})

            if new_parent_id != ROOT_PARENT_ID:
                parent = sections_repo.get_by_id(new_parent_id)
                if not parent:
                    return _response(400, {'error': 'Parent section not found'})

            parent_changed = new_parent_id != current_parent_id
            if parent_changed:
                updates['parent_id'] = new_parent_id
                try:
                    updates['depth'] = compute_depth(new_parent_id, sections_repo)
                except ValueError as exc:
                    return _response(400, {'error': str(exc)})

        # Handle slug change
        current_slug = existing.get('slug')
        new_slug = current_slug
        slug_changed = False

        if 'slug' in body:
            new_slug = body['slug']
            slug_changed = new_slug != current_slug
            if slug_changed:
                updates['slug'] = new_slug

        # Recompute path if parent or slug changed
        if parent_changed or slug_changed:
            try:
                path, path_ids = build_path(section_id, new_parent_id, new_slug, sections_repo)
                updates['path'] = path
                updates['path_ids'] = path_ids
            except ValueError as exc:
                return _response(400, {'error': str(exc)})

        updates['updated_at'] = now

        try:
            updated_item = sections_repo.update(section_id, updates)
        except Exception as exc:
            if 'already in use' in str(exc):
                return _response(409, {'error': str(exc)})
            print(traceback.format_exc())
            return _response(500, {'error': 'Failed to update section'})

        return _response(200, updated_item)

    except json.JSONDecodeError:
        return _response(400, {'error': 'Invalid JSON in request body'})
    except Exception:
        print(traceback.format_exc())
        return _response(500, {'error': 'Internal server error'})
