"""Property-based tests for section hierarchy tree construction (Property 6).

**Validates: Requirements 2.6**

Property 6: Section hierarchy tree construction
For any set of sections with parent-child relationships, build_tree returns
a properly nested tree structure where each section's children array contains
exactly its direct children, and root sections have no parent.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

import uuid
import string

from hypothesis import given, settings, assume
from hypothesis import strategies as st

from sections.service import build_tree, ROOT_PARENT_ID


# --- Strategies ---

def section_sets_strategy():
    """Generate a valid set of sections forming a tree (no cycles).

    Each section may reference only previously-created sections as parent,
    guaranteeing a valid DAG structure. Some slug_lock items are mixed in.
    """
    @st.composite
    def _strategy(draw):
        n = draw(st.integers(min_value=0, max_value=20))
        sections = []
        ids = []

        for i in range(n):
            section_id = f"sec-{i}-{draw(st.text(string.ascii_lowercase, min_size=4, max_size=6))}"
            # parent is ROOT or one of the previously created sections
            if ids:
                parent_id = draw(st.sampled_from([ROOT_PARENT_ID] + ids))
            else:
                parent_id = ROOT_PARENT_ID

            name = draw(st.text(string.ascii_lowercase + string.digits, min_size=1, max_size=20))
            slug = draw(st.text(string.ascii_lowercase + string.digits, min_size=2, max_size=20))
            sort_order = draw(st.integers(min_value=0, max_value=1000))

            sections.append({
                "id": section_id,
                "name": name,
                "slug": slug,
                "parent_id": parent_id,
                "sort_order": sort_order,
                "entity_type": "section",
            })
            ids.append(section_id)

        # Optionally add slug_lock items (should be filtered out)
        n_locks = draw(st.integers(min_value=0, max_value=5))
        for i in range(n_locks):
            sections.append({
                "id": f"SLUG#lock-{i}",
                "entity_type": "slug_lock",
                "slug": f"lock-{i}",
                "section_id": ids[i % max(len(ids), 1)] if ids else "none",
            })

        return sections

    return _strategy()


def _flatten_tree(tree: list[dict]) -> list[dict]:
    """Recursively flatten a tree back into a list of nodes."""
    result = []
    for node in tree:
        result.append(node)
        result.extend(_flatten_tree(node.get("children", [])))
    return result


def _get_sort_key(section: dict) -> tuple[int, str, str]:
    """Replicate the sort key used by build_tree."""
    sort_order = section.get("sort_order", 0)
    if isinstance(sort_order, bool):
        sort_order = 0
    else:
        try:
            sort_order = int(sort_order)
        except (TypeError, ValueError):
            sort_order = 0
    return (sort_order, str(section.get("name", "")), str(section.get("id", "")))


class TestTreeConstructionProperty:
    """Property 6: Section hierarchy tree construction."""

    @settings(max_examples=100)
    @given(sections=section_sets_strategy())
    def test_all_sections_appear_exactly_once(self, sections):
        """Every non-slug_lock section appears exactly once in the tree.

        **Validates: Requirements 2.6**
        """
        tree = build_tree(sections)
        flat = _flatten_tree(tree)

        # Only non-slug_lock sections should appear
        expected_ids = {
            s["id"] for s in sections if s.get("entity_type") != "slug_lock"
        }
        actual_ids = {node["id"] for node in flat}

        assert actual_ids == expected_ids, (
            f"Missing: {expected_ids - actual_ids}, Extra: {actual_ids - expected_ids}"
        )
        # No duplicates
        assert len(flat) == len(actual_ids)

    @settings(max_examples=100)
    @given(sections=section_sets_strategy())
    def test_each_section_under_correct_parent(self, sections):
        """Each section appears as a child of its parent in the tree.

        **Validates: Requirements 2.6**
        """
        tree = build_tree(sections)

        # Build a map of id -> parent_id from the tree structure
        def check_parent(nodes, expected_parent_id):
            for node in nodes:
                actual_parent = node.get("parent_id", ROOT_PARENT_ID)
                assert actual_parent == expected_parent_id, (
                    f"Section {node['id']} expected parent {expected_parent_id}, "
                    f"got {actual_parent}"
                )
                check_parent(node["children"], node["id"])

        check_parent(tree, ROOT_PARENT_ID)

    @settings(max_examples=100)
    @given(sections=section_sets_strategy())
    def test_root_nodes_have_root_parent(self, sections):
        """Root-level tree nodes have parent_id == ROOT.

        **Validates: Requirements 2.6**
        """
        tree = build_tree(sections)

        for node in tree:
            assert node.get("parent_id", ROOT_PARENT_ID) == ROOT_PARENT_ID

    @settings(max_examples=100)
    @given(sections=section_sets_strategy())
    def test_children_sorted_correctly(self, sections):
        """Children at each level are sorted by sort_order ASC, name ASC, id ASC.

        **Validates: Requirements 2.6**
        """
        tree = build_tree(sections)

        def check_sorted(nodes):
            if len(nodes) <= 1:
                return
            keys = [_get_sort_key(node) for node in nodes]
            assert keys == sorted(keys), f"Children not sorted: {keys}"
            for node in nodes:
                check_sorted(node["children"])

        check_sorted(tree)

    @settings(max_examples=100)
    @given(sections=section_sets_strategy())
    def test_slug_lock_items_excluded(self, sections):
        """slug_lock items do not appear in the tree output.

        **Validates: Requirements 2.6**
        """
        tree = build_tree(sections)
        flat = _flatten_tree(tree)

        for node in flat:
            assert node.get("entity_type") != "slug_lock"
            assert not node.get("id", "").startswith("SLUG#")

    @settings(max_examples=100)
    @given(sections=section_sets_strategy())
    def test_children_key_present_on_all_nodes(self, sections):
        """Every node in the tree has a 'children' key (list).

        **Validates: Requirements 2.6**
        """
        tree = build_tree(sections)
        flat = _flatten_tree(tree)

        for node in flat:
            assert "children" in node
            assert isinstance(node["children"], list)
