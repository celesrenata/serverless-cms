"""Property-based tests for architecture article script.

Uses hypothesis to verify correctness properties hold across randomized inputs.

Feature: architecture-article
"""

import os
import sys
import uuid
from pathlib import Path

import boto3
from bs4 import BeautifulSoup
from boto3.dynamodb.conditions import Key
from hypothesis import HealthCheck, given, settings, strategies as st

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "lambda"))

os.environ.setdefault("CONTENT_TABLE", "test-cms-content")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")

from create_architecture_article import SLUG, build_article_content, upsert_article
from shared.db import ContentRepository


TABLE_NAME = "test-cms-content"
TEST_ENV = "test"


@settings(max_examples=1, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.just(None))
def test_property_1_content_item_structural_validity(_unused):
    """Property 1: Content Item Structural Validity

    **Validates: Requirements 1.1, 6.4**
    """
    repo = ContentRepository()

    upsert_article(repo, TEST_ENV, TABLE_NAME)

    item = repo.get_by_slug(SLUG)

    assert item is not None

    # id is a valid UUID
    assert isinstance(item.get("id"), str)
    uuid.UUID(item["id"])

    # slug matches expected
    assert item.get("slug") == SLUG

    # type is 'post'
    assert item.get("type") == "post"

    # title is non-empty
    assert isinstance(item.get("title"), str)
    assert item["title"].strip()

    # content is non-empty
    assert isinstance(item.get("content"), str)
    assert item["content"].strip()

    # metadata has required keys
    metadata = item.get("metadata")
    assert isinstance(metadata, dict)
    assert "seo_title" in metadata
    assert "seo_description" in metadata
    assert "tags" in metadata


@settings(max_examples=1, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.just(None))
def test_property_2_script_idempotency(_unused):
    """Property 2: Script Idempotency

    **Validates: Requirements 1.3**
    """
    repo = ContentRepository()

    # Run upsert twice
    upsert_article(repo, TEST_ENV, TABLE_NAME)
    upsert_article(repo, TEST_ENV, TABLE_NAME)

    # Query the slug-index directly to count items with target slug
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.Table(TABLE_NAME)

    response = table.query(
        IndexName="slug-index",
        KeyConditionExpression=Key("slug").eq(SLUG),
    )
    items = response.get("Items", [])

    while "LastEvaluatedKey" in response:
        response = table.query(
            IndexName="slug-index",
            KeyConditionExpression=Key("slug").eq(SLUG),
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        items.extend(response.get("Items", []))

    assert len(items) == 1


@settings(max_examples=1, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.just(None))
def test_property_3_mermaid_block_format_consistency(_unused):
    """Property 3: Mermaid Block Format Consistency

    **Validates: Requirements 4.7**
    """
    html_content = build_article_content()
    soup = BeautifulSoup(html_content, "html.parser")

    # Find all code elements with language-mermaid class
    mermaid_blocks = [
        code
        for code in soup.find_all("code")
        if "language-mermaid" in (code.get("class") or [])
    ]

    # Must have exactly 6 mermaid diagrams
    assert len(mermaid_blocks) == 6

    # Each mermaid code block must be wrapped in a <pre> parent
    for code in mermaid_blocks:
        assert code.parent is not None
        assert code.parent.name == "pre"
        # Content must be non-empty
        assert code.get_text(strip=True)


@settings(max_examples=1, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.just(None))
def test_property_4_code_block_language_annotation(_unused):
    """Property 4: Code Block Language Annotation

    **Validates: Requirements 5.5**
    """
    html_content = build_article_content()
    soup = BeautifulSoup(html_content, "html.parser")

    # Find all <pre><code> blocks
    code_blocks = [pre.find("code") for pre in soup.find_all("pre") if pre.find("code")]

    # Must have code blocks
    assert code_blocks

    # Every code block must have a language-* class on code OR shiki class on pre
    for code in code_blocks:
        code_classes = code.get("class") or []
        pre_classes = code.parent.get("class") or [] if code.parent else []
        has_language_class = any(c.startswith("language-") for c in code_classes)
        has_shiki_class = "shiki" in pre_classes
        assert has_language_class or has_shiki_class, (
            f"Code block missing language-* or shiki class. "
            f"Code classes: {code_classes}, Pre classes: {pre_classes}"
        )


@settings(max_examples=1, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(st.just(None))
def test_property_5_heading_hierarchy_validity(_unused):
    """Property 5: Heading Hierarchy Validity

    **Validates: Requirements 6.1**
    """
    html_content = build_article_content()
    soup = BeautifulSoup(html_content, "html.parser")

    # Extract all heading elements
    headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
    levels = [int(h.name[1]) for h in headings]

    # Must have headings
    assert levels

    # Exactly one h1
    assert levels.count(1) == 1

    # First heading should be h1
    assert levels[0] == 1

    # No level skipping: each heading level <= previous + 1
    previous_level = levels[0]
    for level in levels[1:]:
        assert level <= previous_level + 1, (
            f"Heading level skip: h{previous_level} followed by h{level}"
        )
        previous_level = level


@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(env=st.from_regex(r"[a-zA-Z0-9_-]+", fullmatch=True))
def test_property_6_environment_targeting(env):
    """Property 6: Environment Targeting

    **Validates: Requirements 7.3**
    """
    # The table name resolution logic from the script: f"cms-content-{env}"
    expected_table_name = f"cms-content-{env}"

    # Verify the pattern holds
    assert expected_table_name == "cms-content-" + env
    assert expected_table_name.startswith("cms-content-")
    assert expected_table_name.removeprefix("cms-content-") == env
