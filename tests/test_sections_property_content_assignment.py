"""Property-based tests for content-section assignment validation (Property 8).

**Validates: Requirements 3.1, 3.2**

Property 8: Content-section assignment validation
For any content with section_id, operation succeeds only if section exists;
otherwise validation error.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['SECTIONS_TABLE'] = 'cms-sections-test'

import uuid
import string

import boto3
import pytest
from moto import mock_aws
from hypothesis import given, settings, assume
from hypothesis import strategies as st


# Strategy for generating valid section slugs
simple_slug_strategy = st.text(
    alphabet=string.ascii_lowercase + string.digits,
    min_size=2,
    max_size=30,
).filter(lambda s: s[0].isalpha())

# Strategy for generating section names
name_strategy = st.text(
    alphabet=string.ascii_letters + string.digits + ' ',
    min_size=1,
    max_size=50,
).filter(lambda s: s.strip() != '')


def _create_table_and_repo():
    """Create the moto DynamoDB sections table and return a SectionRepository instance."""
    table_name = f'cms-sections-test-{uuid.uuid4().hex[:8]}'
    os.environ['SECTIONS_TABLE'] = table_name

    client = boto3.client('dynamodb', region_name='us-east-1')
    client.create_table(
        TableName=table_name,
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

    # Reset the cached repository so it picks up the new table name
    import content.section_helpers as sh
    sh._sections_repository = None

    from shared.sections_db import SectionRepository
    return SectionRepository(table_name=table_name)


class TestContentSectionAssignmentProperty:
    """Property 8: Content-section assignment validation."""

    @settings(max_examples=100)
    @given(slug=simple_slug_strategy, name=name_strategy)
    def test_assignment_succeeds_when_section_exists(self, slug, name):
        """Assigning content to an existing section succeeds.

        **Validates: Requirements 3.1, 3.2**
        """
        with mock_aws():
            repo = _create_table_and_repo()

            section_id = str(uuid.uuid4())
            repo.create({
                'id': section_id,
                'slug': slug,
                'name': name,
                'parent_id': 'ROOT',
                'sort_order': 0,
            })

            from content.section_helpers import validate_section_assignment
            is_valid, error_msg, section_record = validate_section_assignment(section_id)

            assert is_valid is True
            assert error_msg is None
            assert section_record is not None
            assert section_record['id'] == section_id

    @settings(max_examples=100)
    @given(section_id=st.uuids().map(str))
    def test_assignment_fails_when_section_not_exists(self, section_id):
        """Assigning content to a non-existent section returns validation error.

        **Validates: Requirements 3.1, 3.2**
        """
        with mock_aws():
            _create_table_and_repo()

            from content.section_helpers import validate_section_assignment
            is_valid, error_msg, section_record = validate_section_assignment(section_id)

            assert is_valid is False
            assert error_msg is not None
            assert section_id in error_msg
            assert section_record is None

    @settings(max_examples=10)
    @given(st.just(None) | st.just(''))
    def test_assignment_succeeds_when_section_id_none_or_empty(self, section_id):
        """Passing None or empty string for section_id succeeds (unassignment).

        **Validates: Requirements 3.1, 3.2**
        """
        with mock_aws():
            _create_table_and_repo()

            from content.section_helpers import validate_section_assignment
            is_valid, error_msg, section_record = validate_section_assignment(section_id)

            assert is_valid is True
            assert error_msg is None
            assert section_record is None
