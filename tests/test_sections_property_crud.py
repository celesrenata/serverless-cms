"""Property-based tests for section CRUD round-trip (Property 7).

**Validates: Requirements 2.1, 2.2**

Property 7: Section CRUD round-trip
For any valid section data, create then get_by_id returns record with all
original fields preserved plus auto-generated id and timestamps.
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


# Strategy for valid section slugs: lowercase alphanumeric + digits, starts with a letter
simple_slug_strategy = st.text(
    alphabet=string.ascii_lowercase + string.digits,
    min_size=2,
    max_size=30,
).filter(lambda s: s[0].isalpha())

# Strategy for valid section names: printable text, 1-100 chars, non-empty after strip
name_strategy = st.text(
    min_size=1,
    max_size=100,
    alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')),
).filter(lambda s: len(s.strip()) > 0)

# Strategy for sort_order: integer 0-1000
sort_order_strategy = st.integers(min_value=0, max_value=1000)

# Strategy for optional description
description_strategy = st.one_of(
    st.none(),
    st.text(min_size=1, max_size=200, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z'))),
)


def _create_table_and_repo():
    """Create the moto DynamoDB table and return a SectionRepository instance."""
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
    from shared.sections_db import SectionRepository
    return SectionRepository(table_name=table_name)


class TestCrudRoundTripProperty:
    """Property 7: Section CRUD round-trip."""

    @settings(max_examples=100)
    @given(
        name=name_strategy,
        slug=simple_slug_strategy,
        sort_order=sort_order_strategy,
    )
    def test_create_then_get_preserves_fields(self, name, slug, sort_order):
        """Creating a section and retrieving by ID preserves all original fields.

        **Validates: Requirements 2.1, 2.2**
        """
        with mock_aws():
            repo = _create_table_and_repo()

            section_id = str(uuid.uuid4())
            input_data = {
                'id': section_id,
                'name': name,
                'slug': slug,
                'parent_id': 'ROOT',
                'sort_order': sort_order,
            }

            created = repo.create(input_data)
            assert created is not None

            retrieved = repo.get_by_id(section_id)
            assert retrieved is not None

            # All original fields must be preserved
            assert retrieved['id'] == section_id
            assert retrieved['name'] == name
            assert retrieved['slug'] == slug
            assert retrieved['parent_id'] == 'ROOT'
            assert retrieved['sort_order'] == sort_order

    @settings(max_examples=100)
    @given(
        name=name_strategy,
        slug=simple_slug_strategy,
        sort_order=sort_order_strategy,
        description=description_strategy,
    )
    def test_create_with_description_preserves_all_fields(self, name, slug, sort_order, description):
        """Creating a section with description preserves the description field.

        **Validates: Requirements 2.1, 2.2**
        """
        with mock_aws():
            repo = _create_table_and_repo()

            section_id = str(uuid.uuid4())
            input_data = {
                'id': section_id,
                'name': name,
                'slug': slug,
                'parent_id': 'ROOT',
                'sort_order': sort_order,
            }

            if description is not None:
                input_data['description'] = description

            created = repo.create(input_data)
            assert created is not None

            retrieved = repo.get_by_id(section_id)
            assert retrieved is not None

            # Core fields preserved
            assert retrieved['id'] == section_id
            assert retrieved['name'] == name
            assert retrieved['slug'] == slug
            assert retrieved['parent_id'] == 'ROOT'
            assert retrieved['sort_order'] == sort_order

            # Description preserved when provided
            if description is not None:
                assert retrieved['description'] == description
