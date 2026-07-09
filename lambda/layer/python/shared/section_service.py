"""
Section service utilities available via the Lambda Layer.

Contains ROOT_PARENT_ID and build_path, extracted from lambda/sections/service.py
so that lambda/content/ can import them without cross-package dependencies.
"""

from __future__ import annotations

from typing import Protocol


ROOT_PARENT_ID = "ROOT"


class SectionsRepositoryProtocol(Protocol):
    def get_by_id(self, section_id: str) -> dict | None: ...


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
