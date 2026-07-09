"""
Section validation and service module.

Provides validation, depth computation, path building, tree construction,
and path resolution for the hierarchical blog sections feature.
"""

from __future__ import annotations

import re
from typing import Protocol


ROOT_PARENT_ID = "ROOT"
MAX_DEPTH = 5
SLUG_PATTERN = re.compile(r"^[a-z0-9-]+$")


class SectionsRepositoryProtocol(Protocol):
    def get_by_id(self, section_id: str) -> dict | None: ...

    def get_children(self, parent_id: str) -> list[dict]: ...

    def get_all_sections(self) -> list[dict]: ...


def validate_section_input(data: dict, is_update: bool = False) -> list[str]:
    """Validate section input data.

    Args:
        data: Section data dict.
        is_update: If True, name and slug are not required.

    Returns:
        List of validation error strings. Empty list means valid.
    """
    errors: list[str] = []

    name = data.get("name")
    slug = data.get("slug")

    if not is_update:
        if name is None or not isinstance(name, str) or not name.strip():
            errors.append("name is required")

        if slug is None or not isinstance(slug, str) or not slug:
            errors.append("slug is required")

    if "name" in data and name is not None:
        if not isinstance(name, str):
            errors.append("name must be a string")
        elif len(name) > 100:
            errors.append("name must be 100 characters or less")

    if "slug" in data and slug is not None:
        if not isinstance(slug, str):
            errors.append("slug must be a string")
        else:
            if len(slug) > 120:
                errors.append("slug must be 120 characters or less")

            if not SLUG_PATTERN.fullmatch(slug):
                errors.append("slug must match pattern ^[a-z0-9-]+$")

    if "sort_order" in data:
        sort_order = data["sort_order"]

        if not isinstance(sort_order, int) or isinstance(sort_order, bool):
            errors.append("sort_order must be an integer between 0 and 1000")
        elif sort_order < 0 or sort_order > 1000:
            errors.append("sort_order must be an integer between 0 and 1000")

    return errors


def compute_depth(parent_id: str, sections_repo: SectionsRepositoryProtocol) -> int:
    """Compute the depth a new section would have given its parent_id.

    A root section (parent_id=='ROOT') has depth=1. Each child level adds 1.

    Args:
        parent_id: The parent_id of the section being created/moved.
        sections_repo: Repository instance for looking up parent sections.

    Returns:
        The depth this section would occupy.

    Raises:
        ValueError: If depth would exceed 5, parent not found, or cycle detected.
    """
    if parent_id == ROOT_PARENT_ID:
        return 1

    depth = 2
    current_parent_id = parent_id
    visited: set[str] = set()

    while current_parent_id != ROOT_PARENT_ID:
        if depth > MAX_DEPTH:
            raise ValueError("Maximum nesting depth of 5 levels exceeded")

        if current_parent_id in visited:
            raise ValueError("Cycle detected in section parent chain")

        visited.add(current_parent_id)

        parent = sections_repo.get_by_id(current_parent_id)
        if parent is None:
            raise ValueError(f"Parent section '{current_parent_id}' not found")

        current_parent_id = parent.get("parent_id", ROOT_PARENT_ID)

        if current_parent_id != ROOT_PARENT_ID:
            depth += 1

    return depth


def build_path(
    section_id: str,
    parent_id: str,
    slug: str,
    sections_repo: SectionsRepositoryProtocol,
) -> tuple[str, list[str]]:
    """Build the full slug path and path_ids from root to this section.

    Args:
        section_id: The section's own ID.
        parent_id: The section's parent_id.
        slug: The section's slug.
        sections_repo: Repository instance for looking up ancestors.

    Returns:
        Tuple of (slash-joined path, list of IDs from root to section).

    Raises:
        ValueError: If a parent is not found or a cycle is detected.
    """
    if parent_id == ROOT_PARENT_ID:
        return slug, [section_id]

    slug_parts = [slug]
    path_ids = [section_id]

    current_parent_id = parent_id
    visited: set[str] = set()

    while current_parent_id != ROOT_PARENT_ID:
        if current_parent_id in visited:
            raise ValueError("Cycle detected in section parent chain")

        visited.add(current_parent_id)

        parent = sections_repo.get_by_id(current_parent_id)
        if parent is None:
            raise ValueError(f"Parent section '{current_parent_id}' not found")

        slug_parts.append(parent["slug"])
        path_ids.append(parent["id"])

        current_parent_id = parent.get("parent_id", ROOT_PARENT_ID)

    slug_parts.reverse()
    path_ids.reverse()

    return "/".join(slug_parts), path_ids


def build_tree(sections: list[dict]) -> list[dict]:
    """Convert a flat list of sections into a nested tree structure.

    Filters out slug_lock items. Sorts children by sort_order ASC,
    name ASC, id ASC for stable deterministic ordering.

    Args:
        sections: Flat list of section dicts.

    Returns:
        List of root-level section nodes, each with a 'children' key.
    """
    grouped: dict[str, list[dict]] = {}

    for section in sections:
        if section.get("entity_type") == "slug_lock":
            continue

        parent_id = section.get("parent_id", ROOT_PARENT_ID)
        grouped.setdefault(parent_id, []).append(section)

    def sort_key(section: dict) -> tuple[int, str, str]:
        sort_order = section.get("sort_order", 0)
        if isinstance(sort_order, bool):
            sort_order = 0
        else:
            try:
                sort_order = int(sort_order)
            except (TypeError, ValueError):
                sort_order = 0

        return (
            sort_order,
            str(section.get("name", "")),
            str(section.get("id", "")),
        )

    def build_children(parent_id: str) -> list[dict]:
        children = []

        for section in sorted(grouped.get(parent_id, []), key=sort_key):
            node = dict(section)
            node["children"] = build_children(node["id"])
            children.append(node)

        return children

    return build_children(ROOT_PARENT_ID)


def resolve_path(
    path: str,
    sections_repo: SectionsRepositoryProtocol,
) -> dict | None:
    """Resolve a slash-separated slug path to a section.

    Walks from ROOT, matching each slug segment to a child of the
    previous section.

    Args:
        path: Slash-separated path like "technology/web-development".
        sections_repo: Repository instance for querying children.

    Returns:
        The matched section dict, or None if any segment fails.
    """
    normalized_path = path.strip("/")

    if not normalized_path:
        return None

    segments = normalized_path.split("/")

    if any(not segment for segment in segments):
        return None

    parent_id = ROOT_PARENT_ID
    matched_section: dict | None = None

    for segment in segments:
        children = sections_repo.get_children(parent_id)

        matched_section = next(
            (
                child
                for child in children
                if child.get("entity_type") != "slug_lock"
                and child.get("slug") == segment
            ),
            None,
        )

        if matched_section is None:
            return None

        parent_id = matched_section["id"]

    return matched_section


def validate_page_id(page_id, content_repo):
    """Validate that page_id references a published page.

    Args:
        page_id: The page ID to validate, or None to skip.
        content_repo: ContentRepository instance with get_by_id method.

    Returns:
        Error message string if invalid, None if valid.
    """
    if page_id is None:
        return None

    content = content_repo.get_by_id(page_id)
    if not content:
        return "Referenced page not found"
    if content.get("type") != "page":
        return "Referenced content is not a page"
    if content.get("status") != "published":
        return "Referenced page is not published"

    return None


__all__ = [
    "validate_section_input",
    "compute_depth",
    "build_path",
    "build_tree",
    "resolve_path",
    "validate_page_id",
    "ROOT_PARENT_ID",
    "MAX_DEPTH",
    "SLUG_PATTERN",
]
