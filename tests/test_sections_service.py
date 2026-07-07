"""Unit tests for lambda/sections/service.py."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

import pytest

from sections.service import (
    ROOT_PARENT_ID,
    MAX_DEPTH,
    validate_section_input,
    compute_depth,
    build_path,
    build_tree,
    resolve_path,
)


class FakeRepo:
    def __init__(self, sections: list[dict]):
        self._sections = {s['id']: s for s in sections}

    def get_by_id(self, section_id):
        return self._sections.get(section_id)

    def get_children(self, parent_id):
        return [s for s in self._sections.values() if s.get('parent_id') == parent_id]


def assert_error_contains(errors, *needles):
    assert errors
    error_text = "\n".join(errors).lower()
    for needle in needles:
        assert needle.lower() in error_text


# ─── validate_section_input ──────────────────────────────────────────────────


def test_validate_valid_create():
    errors = validate_section_input({
        "name": "Electronics",
        "slug": "electronics",
        "sort_order": 10,
    })
    assert errors == []


def test_validate_missing_name_on_create():
    errors = validate_section_input({"slug": "electronics"})
    assert_error_contains(errors, "name")


def test_validate_missing_slug_on_create():
    errors = validate_section_input({"name": "Electronics"})
    assert_error_contains(errors, "slug")


def test_validate_name_too_long():
    errors = validate_section_input({"name": "x" * 101, "slug": "valid-slug"})
    assert_error_contains(errors, "name")


def test_validate_slug_too_long():
    errors = validate_section_input({"name": "Valid", "slug": "a" * 121})
    assert_error_contains(errors, "slug")


@pytest.mark.parametrize("slug", ["InvalidSlug", "invalid_slug", "invalid slug", "invalid!"])
def test_validate_invalid_slug_chars(slug):
    errors = validate_section_input({"name": "Valid", "slug": slug})
    assert_error_contains(errors, "slug")


@pytest.mark.parametrize("sort_order", [-1, 1001])
def test_validate_sort_order_out_of_range(sort_order):
    errors = validate_section_input({"name": "Valid", "slug": "valid", "sort_order": sort_order})
    assert_error_contains(errors, "sort")


def test_validate_update_without_name_or_slug():
    errors = validate_section_input({"sort_order": 100}, is_update=True)
    assert errors == []


def test_validate_sort_order_not_int():
    errors = validate_section_input({"name": "Valid", "slug": "valid", "sort_order": "10"})
    assert_error_contains(errors, "sort")


def test_validate_sort_order_bool_rejected():
    errors = validate_section_input({"name": "Valid", "slug": "valid", "sort_order": True})
    assert_error_contains(errors, "sort")


# ─── compute_depth ───────────────────────────────────────────────────────────


def test_compute_depth_root_is_1():
    repo = FakeRepo([])
    assert compute_depth(ROOT_PARENT_ID, repo) == 1


def test_compute_depth_one_level_is_2():
    repo = FakeRepo([
        {"id": "root-section", "slug": "root", "parent_id": ROOT_PARENT_ID}
    ])
    assert compute_depth("root-section", repo) == 2


def test_compute_depth_max_5_allowed():
    sections = [
        {"id": "s1", "slug": "s1", "parent_id": ROOT_PARENT_ID},
        {"id": "s2", "slug": "s2", "parent_id": "s1"},
        {"id": "s3", "slug": "s3", "parent_id": "s2"},
        {"id": "s4", "slug": "s4", "parent_id": "s3"},
    ]
    repo = FakeRepo(sections)
    assert compute_depth("s4", repo) == 5


def test_compute_depth_exceeds_max_raises():
    sections = [
        {"id": "s1", "slug": "s1", "parent_id": ROOT_PARENT_ID},
        {"id": "s2", "slug": "s2", "parent_id": "s1"},
        {"id": "s3", "slug": "s3", "parent_id": "s2"},
        {"id": "s4", "slug": "s4", "parent_id": "s3"},
        {"id": "s5", "slug": "s5", "parent_id": "s4"},
    ]
    repo = FakeRepo(sections)
    with pytest.raises(ValueError, match="depth"):
        compute_depth("s5", repo)


def test_compute_depth_missing_parent_raises():
    repo = FakeRepo([])
    with pytest.raises(ValueError, match="not found"):
        compute_depth("missing-parent", repo)


# ─── build_path ──────────────────────────────────────────────────────────────


def test_build_path_root_section():
    repo = FakeRepo([])
    path, path_ids = build_path("root-id", ROOT_PARENT_ID, "technology", repo)
    assert path == "technology"
    assert path_ids == ["root-id"]


def test_build_path_two_levels():
    repo = FakeRepo([
        {"id": "parent", "slug": "parent", "parent_id": ROOT_PARENT_ID}
    ])
    path, path_ids = build_path("child", "parent", "child-slug", repo)
    assert path == "parent/child-slug"
    assert path_ids == ["parent", "child"]


def test_build_path_three_levels():
    repo = FakeRepo([
        {"id": "root", "slug": "tech", "parent_id": ROOT_PARENT_ID},
        {"id": "mid", "slug": "web-dev", "parent_id": "root"},
    ])
    path, path_ids = build_path("leaf", "mid", "react", repo)
    assert path == "tech/web-dev/react"
    assert path_ids == ["root", "mid", "leaf"]


# ─── build_tree ──────────────────────────────────────────────────────────────


def test_build_tree_empty():
    assert build_tree([]) == []


def test_build_tree_single_root():
    sections = [{"id": "r1", "name": "Root", "slug": "root", "parent_id": ROOT_PARENT_ID, "sort_order": 0}]
    tree = build_tree(sections)
    assert len(tree) == 1
    assert tree[0]["id"] == "r1"
    assert tree[0]["children"] == []


def test_build_tree_multiple_roots_sorted():
    sections = [
        {"id": "r3", "name": "Alpha", "slug": "r3", "parent_id": ROOT_PARENT_ID, "sort_order": 2},
        {"id": "r2", "name": "Beta", "slug": "r2", "parent_id": ROOT_PARENT_ID, "sort_order": 1},
        {"id": "r1", "name": "Alpha", "slug": "r1", "parent_id": ROOT_PARENT_ID, "sort_order": 1},
        {"id": "r0", "name": "Alpha", "slug": "r0", "parent_id": ROOT_PARENT_ID, "sort_order": 1},
    ]
    tree = build_tree(sections)
    assert [n["id"] for n in tree] == ["r0", "r1", "r2", "r3"]


def test_build_tree_nested_children_sorted():
    sections = [
        {"id": "root", "name": "Root", "slug": "root", "parent_id": ROOT_PARENT_ID, "sort_order": 0},
        {"id": "c3", "name": "Alpha", "slug": "c3", "parent_id": "root", "sort_order": 2},
        {"id": "c2", "name": "Beta", "slug": "c2", "parent_id": "root", "sort_order": 1},
        {"id": "c1", "name": "Alpha", "slug": "c1", "parent_id": "root", "sort_order": 1},
        {"id": "gc", "name": "Grandchild", "slug": "gc", "parent_id": "c1", "sort_order": 0},
    ]
    tree = build_tree(sections)
    assert len(tree) == 1
    assert [n["id"] for n in tree[0]["children"]] == ["c1", "c2", "c3"]
    assert tree[0]["children"][0]["children"][0]["id"] == "gc"


def test_build_tree_filters_slug_lock():
    sections = [
        {"id": "root", "name": "Root", "slug": "root", "parent_id": ROOT_PARENT_ID, "sort_order": 0},
        {"id": "SLUG#root", "entity_type": "slug_lock", "slug": "root", "parent_id": ROOT_PARENT_ID},
    ]
    tree = build_tree(sections)
    assert len(tree) == 1
    assert tree[0]["id"] == "root"


# ─── resolve_path ────────────────────────────────────────────────────────────


def test_resolve_path_single_segment():
    repo = FakeRepo([
        {"id": "root", "name": "Root", "slug": "root", "parent_id": ROOT_PARENT_ID}
    ])
    result = resolve_path("root", repo)
    assert result is not None
    assert result["id"] == "root"


def test_resolve_path_multi_segment():
    repo = FakeRepo([
        {"id": "root", "name": "Root", "slug": "root", "parent_id": ROOT_PARENT_ID},
        {"id": "child", "name": "Child", "slug": "child", "parent_id": "root"},
        {"id": "gc", "name": "Grandchild", "slug": "grandchild", "parent_id": "child"},
    ])
    result = resolve_path("root/child/grandchild", repo)
    assert result is not None
    assert result["id"] == "gc"


def test_resolve_path_nonexistent_returns_none():
    repo = FakeRepo([
        {"id": "root", "name": "Root", "slug": "root", "parent_id": ROOT_PARENT_ID},
    ])
    assert resolve_path("root/missing", repo) is None
    assert resolve_path("missing", repo) is None


def test_resolve_path_empty_returns_none():
    repo = FakeRepo([])
    assert resolve_path("", repo) is None
    assert resolve_path("  ", repo) is None
