"""Property-based tests for section nesting depth constraint.

Property 3: Section nesting depth constraint
For any chain of parent-child sections, the system accepts sections at
depths 1 through 5 and rejects any creation that would produce a chain
deeper than 5 levels.

**Validates: Requirements 1.7, 1.8**

Feature: blog-sections-markdown
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

import pytest
from hypothesis import given, settings, strategies as st

from sections.service import ROOT_PARENT_ID, MAX_DEPTH, compute_depth


class FakeRepo:
    """Minimal repository stub for testing compute_depth."""

    def __init__(self, sections: list[dict]):
        self._sections = {s['id']: s for s in sections}

    def get_by_id(self, section_id):
        return self._sections.get(section_id)

    def get_children(self, parent_id):
        return [s for s in self._sections.values() if s.get('parent_id') == parent_id]


def build_chain(depth: int) -> tuple[list[dict], str]:
    """Build a linear chain of sections with the given depth.

    Returns:
        Tuple of (sections list, parent_id for new section at that depth).
        For depth=1 the parent_id is ROOT_PARENT_ID and sections list is empty.
    """
    if depth == 1:
        return [], ROOT_PARENT_ID

    sections = []
    # Build ancestors: depth-1 sections forming a chain from root
    for i in range(depth - 1):
        section_id = f"s{i}"
        parent_id = ROOT_PARENT_ID if i == 0 else f"s{i - 1}"
        sections.append({
            "id": section_id,
            "slug": f"slug-{i}",
            "parent_id": parent_id,
        })

    # The last section in the chain is the parent for the new section
    last_parent_id = f"s{depth - 2}"
    return sections, last_parent_id


# --- Property 3: Valid depths (1–5) are accepted ---


@settings(max_examples=100)
@given(depth=st.integers(min_value=1, max_value=5))
def test_valid_depths_accepted(depth: int):
    """For any depth in [1, 5], compute_depth returns that depth without error.

    Property 3: Section nesting depth constraint
    **Validates: Requirements 1.7, 1.8**
    """
    sections, parent_id = build_chain(depth)
    repo = FakeRepo(sections)
    result = compute_depth(parent_id, repo)
    assert result == depth


# --- Property 3: Depths > 5 are rejected ---


@settings(max_examples=100)
@given(depth=st.integers(min_value=6, max_value=15))
def test_excessive_depths_rejected(depth: int):
    """For any depth > 5, compute_depth raises ValueError.

    Property 3: Section nesting depth constraint
    **Validates: Requirements 1.7, 1.8**
    """
    sections, parent_id = build_chain(depth)
    repo = FakeRepo(sections)
    with pytest.raises(ValueError, match="depth"):
        compute_depth(parent_id, repo)
