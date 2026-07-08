"""Tests for content_markdown storage validation and section_id validation."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['SECTIONS_TABLE'] = 'cms-sections-test'

import boto3
import pytest
from moto import mock_aws


@pytest.fixture
def sections_env():
    """Fixture providing a moto-backed sections table for section_helpers."""
    with mock_aws():
        client = boto3.client('dynamodb', region_name='us-east-1')
        client.create_table(
            TableName='cms-sections-test',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'},
                {'AttributeName': 'slug', 'AttributeType': 'S'},
                {'AttributeName': 'parent_id', 'AttributeType': 'S'},
                {'AttributeName': 'sort_order', 'AttributeType': 'N'},
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'slug-index',
                    'KeySchema': [{'AttributeName': 'slug', 'KeyType': 'HASH'}],
                    'Projection': {'ProjectionType': 'ALL'},
                },
                {
                    'IndexName': 'parent_id-sort_order-index',
                    'KeySchema': [
                        {'AttributeName': 'parent_id', 'KeyType': 'HASH'},
                        {'AttributeName': 'sort_order', 'KeyType': 'RANGE'},
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                },
            ],
            BillingMode='PAY_PER_REQUEST',
        )

        from shared.sections_db import SectionRepository

        # Reset the cached repository in section_helpers
        import content.section_helpers as sh
        sh._sections_repository = None

        repo = SectionRepository()
        yield repo


# ─── validate_content_markdown ───────────────────────────────────────────────


def test_validate_content_markdown_none():
    from content.section_helpers import validate_content_markdown

    is_valid, error = validate_content_markdown(None)
    assert is_valid is True
    assert error is None


def test_validate_content_markdown_empty_string():
    from content.section_helpers import validate_content_markdown

    is_valid, error = validate_content_markdown('')
    assert is_valid is True
    assert error is None


def test_validate_content_markdown_valid():
    from content.section_helpers import validate_content_markdown

    markdown = '# Hello World\n\nThis is a test post with **bold** text.'
    is_valid, error = validate_content_markdown(markdown)
    assert is_valid is True
    assert error is None


def test_validate_content_markdown_at_limit():
    from content.section_helpers import validate_content_markdown

    markdown = 'x' * 500_000
    is_valid, error = validate_content_markdown(markdown)
    assert is_valid is True
    assert error is None


def test_validate_content_markdown_exceeds_limit():
    from content.section_helpers import validate_content_markdown

    markdown = 'x' * 500_001
    is_valid, error = validate_content_markdown(markdown)
    assert is_valid is False
    assert 'maximum length' in error.lower() or '500,000' in error


# ─── validate_section_assignment ─────────────────────────────────────────────


def test_validate_section_assignment_none(sections_env):
    from content.section_helpers import validate_section_assignment

    is_valid, error, record = validate_section_assignment(None)
    assert is_valid is True
    assert error is None
    assert record is None


def test_validate_section_assignment_empty_string(sections_env):
    from content.section_helpers import validate_section_assignment

    is_valid, error, record = validate_section_assignment('')
    assert is_valid is True
    assert error is None
    assert record is None


def test_validate_section_assignment_valid(sections_env):
    from content.section_helpers import validate_section_assignment

    repo = sections_env
    repo.create({
        'id': 'sec-1',
        'slug': 'tech',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
        'path_ids': ['sec-1'],
    })

    is_valid, error, record = validate_section_assignment('sec-1')
    assert is_valid is True
    assert error is None
    assert record is not None
    assert record['id'] == 'sec-1'


def test_validate_section_assignment_nonexistent(sections_env):
    from content.section_helpers import validate_section_assignment

    is_valid, error, record = validate_section_assignment('nonexistent-id')
    assert is_valid is False
    assert 'does not exist' in error.lower()
    assert record is None


# ─── compute_section_path_ids ────────────────────────────────────────────────


def test_compute_section_path_ids_from_record(sections_env):
    from content.section_helpers import compute_section_path_ids

    section = {
        'id': 'sec-1',
        'slug': 'tech',
        'parent_id': 'ROOT',
        'path_ids': ['sec-1'],
    }
    path_ids = compute_section_path_ids(section)
    assert path_ids == ['sec-1']


def test_compute_section_path_ids_nested(sections_env):
    from content.section_helpers import compute_section_path_ids

    section = {
        'id': 'sec-3',
        'slug': 'react',
        'parent_id': 'sec-2',
        'path_ids': ['sec-1', 'sec-2', 'sec-3'],
    }
    path_ids = compute_section_path_ids(section)
    assert path_ids == ['sec-1', 'sec-2', 'sec-3']


def test_compute_section_path_ids_fallback_no_path_ids(sections_env):
    """When path_ids is missing, compute from parent chain."""
    from content.section_helpers import compute_section_path_ids

    repo = sections_env
    repo.create({
        'id': 'root-sec',
        'slug': 'root',
        'name': 'Root',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    repo.create({
        'id': 'child-sec',
        'slug': 'child',
        'name': 'Child',
        'parent_id': 'root-sec',
        'sort_order': 0,
    })

    # Section without path_ids stored - should compute from parent chain
    section = {
        'id': 'child-sec',
        'slug': 'child',
        'parent_id': 'root-sec',
    }
    path_ids = compute_section_path_ids(section)
    assert path_ids == ['root-sec', 'child-sec']
