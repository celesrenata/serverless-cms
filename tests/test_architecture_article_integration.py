"""
Integration tests for the architecture article creation script.
Uses moto to mock DynamoDB and verifies the upsert_article function
creates/updates items correctly with idempotent behavior.

Validates: Requirements 1.3
"""
import boto3
import os
import sys
import time
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "lambda"))

TABLE_NAME = "cms-content-test"
EXPECTED_SLUG = "how-we-built-this-serverless-cms"


@pytest.fixture
def dynamodb_table():
    """Use the conftest aws_mock (autouse) which already provides mock_aws context.
    We create our specific table and point ContentRepository at it.
    Save and restore CONTENT_TABLE to avoid leaking into conftest's table creation."""
    original_content_table = os.environ.get("CONTENT_TABLE")
    os.environ["CONTENT_TABLE"] = TABLE_NAME

    client = boto3.client("dynamodb", region_name="us-east-1")

    # Table may already exist if CONTENT_TABLE leaked from a prior test
    try:
        client.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {"AttributeName": "id", "KeyType": "HASH"},
                {"AttributeName": "created_at", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "N"},
                {"AttributeName": "slug", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "slug-index",
                    "KeySchema": [
                        {"AttributeName": "slug", "KeyType": "HASH"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
            BillingMode="PAY_PER_REQUEST",
        )
    except client.exceptions.ResourceInUseException:
        # Table already created by conftest (because env var leaked), just use it
        pass

    from shared.db import ContentRepository

    repo = ContentRepository()
    yield repo, client

    # Restore original env var
    if original_content_table is not None:
        os.environ["CONTENT_TABLE"] = original_content_table
    else:
        os.environ.pop("CONTENT_TABLE", None)


def _scan_items(client):
    return client.scan(TableName=TABLE_NAME)["Items"]


def _single_item(client):
    items = _scan_items(client)
    assert len(items) == 1
    return items[0]


def _string_attr(item, name):
    return item[name]["S"]


def _number_attr(item, name):
    return int(item[name]["N"])


def _assert_valid_uuid(value):
    try:
        uuid.UUID(value)
    except (TypeError, ValueError) as exc:
        pytest.fail(f"Expected valid UUID, got {value!r}: {exc}")


def test_upsert_creates_item_with_correct_fields(dynamodb_table):
    """Run upsert once and verify item has all expected fields."""
    repo, client = dynamodb_table

    from create_architecture_article import upsert_article, SLUG

    assert SLUG == EXPECTED_SLUG

    upsert_article(repo, "test", TABLE_NAME)

    item = _single_item(client)

    # Verify core fields
    assert _string_attr(item, "slug") == EXPECTED_SLUG
    assert _string_attr(item, "type") == "post"
    assert _string_attr(item, "status") == "published"
    assert _string_attr(item, "title")
    assert _string_attr(item, "content")

    # Verify metadata has expected keys
    metadata = item["metadata"]["M"]
    assert {"seo_title", "seo_description", "tags"}.issubset(metadata.keys())

    # Verify id is a valid UUID
    _assert_valid_uuid(_string_attr(item, "id"))

    # Verify timestamps are positive
    created_at = _number_attr(item, "created_at")
    published_at = _number_attr(item, "published_at")

    assert created_at > 0
    assert published_at > 0
    assert created_at <= int(time.time()) + 60
    assert published_at <= int(time.time()) + 60


def test_upsert_idempotent_preserves_id(dynamodb_table):
    """Run upsert twice and verify idempotent behavior — same item, same id."""
    repo, client = dynamodb_table

    from create_architecture_article import upsert_article

    upsert_article(repo, "test", TABLE_NAME)

    first_item = _single_item(client)
    first_id = _string_attr(first_item, "id")
    first_created_at = _number_attr(first_item, "created_at")
    first_updated_at = _number_attr(first_item, "updated_at")

    time.sleep(1)

    upsert_article(repo, "test", TABLE_NAME)

    items = _scan_items(client)
    assert len(items) == 1

    second_item = items[0]
    assert _string_attr(second_item, "id") == first_id
    assert _number_attr(second_item, "created_at") == first_created_at
    assert _number_attr(second_item, "updated_at") >= first_updated_at


def test_type_timestamp_composite_key(dynamodb_table):
    """Verify type#timestamp composite key is correctly formed."""
    repo, client = dynamodb_table

    from create_architecture_article import upsert_article

    upsert_article(repo, "test", TABLE_NAME)

    item = _single_item(client)

    # Verify composite key exists
    assert "type#timestamp" in item

    composite_value = _string_attr(item, "type#timestamp")
    assert composite_value.startswith("post#")

    # Verify the number after # is a valid Unix timestamp
    _, timestamp_value = composite_value.split("#", 1)
    timestamp = int(timestamp_value)

    assert timestamp > 0
    assert timestamp <= int(time.time()) + 60
