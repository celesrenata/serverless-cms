"""Property-based tests for section field validation (Property 4).

Property 4: Section field validation
For any input, reject names >100 chars, slugs >120 chars, slugs with invalid characters.

**Validates: Requirements 2.9**

Feature: blog-sections-markdown
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

import re

from hypothesis import given, settings, assume, strategies as st

from sections.service import validate_section_input


class TestSectionFieldValidation:
    """Property 4: Section field validation."""

    @settings(max_examples=100)
    @given(name=st.text(min_size=101, max_size=300))
    def test_name_over_100_chars_rejected(self, name):
        """Names exceeding 100 characters are rejected.

        **Validates: Requirements 2.9**
        """
        data = {"name": name, "slug": "valid-slug", "sort_order": 0}
        errors = validate_section_input(data)
        assert any("100" in e for e in errors)

    @settings(max_examples=100)
    @given(slug=st.from_regex(r'[a-z0-9\-]{121,200}', fullmatch=True))
    def test_slug_over_120_chars_rejected(self, slug):
        """Slugs exceeding 120 characters are rejected.

        **Validates: Requirements 2.9**
        """
        data = {"name": "Valid Name", "slug": slug, "sort_order": 0}
        errors = validate_section_input(data)
        assert any("120" in e for e in errors)

    @settings(max_examples=100)
    @given(
        slug=st.text(min_size=1, max_size=120).filter(
            lambda s: not re.fullmatch(r'[a-z0-9-]+', s)
        )
    )
    def test_slug_invalid_chars_rejected(self, slug):
        """Slugs with characters other than lowercase alphanumeric and hyphens are rejected.

        **Validates: Requirements 2.9**
        """
        data = {"name": "Valid Name", "slug": slug, "sort_order": 0}
        errors = validate_section_input(data)
        assert any("pattern" in e for e in errors)

    @settings(max_examples=100)
    @given(
        name=st.text(
            alphabet=st.characters(whitelist_categories=('L', 'N', 'Zs')),
            min_size=1,
            max_size=100,
        ),
        slug=st.from_regex(r'[a-z0-9][a-z0-9\-]{0,118}[a-z0-9]', fullmatch=True),
        sort_order=st.integers(min_value=0, max_value=1000),
    )
    def test_valid_inputs_accepted(self, name, slug, sort_order):
        """Valid inputs (name<=100, slug<=120 matching pattern, sort_order 0-1000) produce no errors.

        **Validates: Requirements 2.9**
        """
        assume(len(name.strip()) > 0)
        data = {"name": name, "slug": slug, "sort_order": sort_order}
        errors = validate_section_input(data)
        assert errors == []
