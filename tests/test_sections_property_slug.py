"""Property-based tests for section slug uniqueness (Property 2).

**Validates: Requirements 1.5, 1.6, 2.7**

Property 2: Section slug uniqueness
For any two sections in the system, no two sections may share the same slug;
attempting to create or update a section with a duplicate slug returns a
validation error.
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


# Strategy for generating valid section slugs: lowercase alphanumeric + hyphens,
# must start with a letter, 1-50 chars, no leading/trailing hyphens, no consecutive hyphens.
SLUG_ALPHABET = string.ascii_lowercase + string.digits + '-'

slug_strategy = st.from_regex(r'[a-z][a-z0-9\-]{0,48}[a-z0-9]', fullmatch=True).filter(
    lambda s: '--' not in s
)

# Simpler fallback: just lowercase letters and digits (always valid slugs)
simple_slug_strategy = st.text(
    alphabet=string.ascii_lowercase + string.digits,
    min_size=2,
    max_size=30,
).filter(lambda s: s[0].isalpha())


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


class TestSlugUniquenessProperty:
    """Property 2: Section slug uniqueness."""

    @settings(max_examples=100)
    @given(slug=simple_slug_strategy)
    def test_duplicate_slug_create_rejected(self, slug):
        """Creating two sections with the same slug raises validation error.

        **Validates: Requirements 1.5, 1.6**
        """
        with mock_aws():
            repo = _create_table_and_repo()

            # First create succeeds
            repo.create({
                'id': str(uuid.uuid4()),
                'slug': slug,
                'name': f'Section {slug}',
                'parent_id': 'ROOT',
                'sort_order': 0,
            })

            # Second create with same slug must fail
            with pytest.raises(Exception, match="already in use"):
                repo.create({
                    'id': str(uuid.uuid4()),
                    'slug': slug,
                    'name': f'Section {slug} duplicate',
                    'parent_id': 'ROOT',
                    'sort_order': 1,
                })

    @settings(max_examples=100)
    @given(slug_a=simple_slug_strategy, slug_b=simple_slug_strategy)
    def test_update_to_existing_slug_rejected(self, slug_a, slug_b):
        """Updating a section's slug to match another section's slug raises error.

        **Validates: Requirements 1.6, 2.7**
        """
        assume(slug_a != slug_b)

        with mock_aws():
            repo = _create_table_and_repo()

            # Create section A with slug_a
            id_a = str(uuid.uuid4())
            repo.create({
                'id': id_a,
                'slug': slug_a,
                'name': f'Section A',
                'parent_id': 'ROOT',
                'sort_order': 0,
            })

            # Create section B with slug_b
            id_b = str(uuid.uuid4())
            repo.create({
                'id': id_b,
                'slug': slug_b,
                'name': f'Section B',
                'parent_id': 'ROOT',
                'sort_order': 1,
            })

            # Updating B's slug to A's slug must fail
            with pytest.raises(Exception, match="already in use"):
                repo.update(id_b, {'slug': slug_a})

    @settings(max_examples=100)
    @given(slug_a=simple_slug_strategy, slug_b=simple_slug_strategy)
    def test_distinct_slugs_both_succeed(self, slug_a, slug_b):
        """Two sections with different slugs can coexist without conflict.

        **Validates: Requirements 1.5, 1.6**
        """
        assume(slug_a != slug_b)

        with mock_aws():
            repo = _create_table_and_repo()

            # Both creates should succeed
            id_a = str(uuid.uuid4())
            section_a = repo.create({
                'id': id_a,
                'slug': slug_a,
                'name': f'Section A',
                'parent_id': 'ROOT',
                'sort_order': 0,
            })

            id_b = str(uuid.uuid4())
            section_b = repo.create({
                'id': id_b,
                'slug': slug_b,
                'name': f'Section B',
                'parent_id': 'ROOT',
                'sort_order': 1,
            })

            # Both sections exist and are retrievable
            assert repo.get_by_id(id_a) is not None
            assert repo.get_by_id(id_b) is not None
            assert repo.get_by_slug(slug_a) is not None
            assert repo.get_by_slug(slug_b) is not None
