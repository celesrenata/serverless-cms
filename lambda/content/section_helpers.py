"""
Section assignment helpers for content Lambda functions.

Provides validation and path computation for assigning content to sections.
"""

from __future__ import annotations

import os
import sys

# Add parent directory to path for imports
current_directory = os.path.dirname(os.path.abspath(__file__))
lambda_directory = os.path.dirname(current_directory)

if lambda_directory not in sys.path:
    sys.path.insert(0, lambda_directory)

from shared.sections_db import SectionRepository
from sections.service import ROOT_PARENT_ID, build_path


MAX_CONTENT_MARKDOWN_LENGTH = 500_000

_sections_repository: SectionRepository | None = None


def _get_sections_repository() -> SectionRepository:
    """Get a cached SectionRepository instance."""
    global _sections_repository

    if _sections_repository is None:
        table_name = os.environ.get("SECTIONS_TABLE", "cms-sections-dev")
        _sections_repository = SectionRepository(table_name)

    return _sections_repository


def validate_section_assignment(
    section_id: str | None,
) -> tuple[bool, str | None, dict | None]:
    """
    Validate that a section_id references an existing section.

    Args:
        section_id: The section_id to validate. If None or empty string,
            returns success as a valid unassignment.

    Returns:
        Tuple of (is_valid, error_message, section_record)
        - If section_id is None/empty: (True, None, None)
        - If section exists: (True, None, section_dict)
        - If section does not exist: (False, error_message, None)
    """
    if section_id is None or section_id == "":
        return True, None, None

    sections_repository = _get_sections_repository()
    section_record = sections_repository.get_by_id(section_id)

    if section_record is None:
        return False, f"Section '{section_id}' does not exist", None

    return True, None, section_record


def compute_section_path_ids(section: dict) -> list[str]:
    """
    Get the full path_ids from the section record.

    The section record already has path_ids stored on it, set during section
    creation. If path_ids is not present, fall back to computing it from the
    parent chain.

    Args:
        section: Section dict from DynamoDB.

    Returns:
        List of section IDs from root to this section.
    """
    if "path_ids" in section and section["path_ids"] is not None:
        return list(section["path_ids"])

    sections_repository = _get_sections_repository()

    section_id = section["id"]
    parent_id = section.get("parent_id") or ROOT_PARENT_ID
    slug = section["slug"]

    _, path_ids = build_path(
        section_id=section_id,
        parent_id=parent_id,
        slug=slug,
        sections_repo=sections_repository,
    )

    return path_ids


def validate_content_markdown(
    content_markdown: str | None,
) -> tuple[bool, str | None]:
    """
    Validate content_markdown field (max 500,000 characters).

    Args:
        content_markdown: Markdown content to validate.

    Returns:
        Tuple of (is_valid, error_message).
    """
    if content_markdown is None:
        return True, None

    if len(content_markdown) > MAX_CONTENT_MARKDOWN_LENGTH:
        return (
            False,
            f"content_markdown exceeds maximum length of {MAX_CONTENT_MARKDOWN_LENGTH:,} characters",
        )

    return True, None
