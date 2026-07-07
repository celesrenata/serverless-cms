"""Property-based tests for section deletion constraint (Property 5).

**Validates: Requirements 2.4, 2.5, 3.7**

Property 5: Section deletion constraint
For any section with children or assigned posts, deletion is rejected with
no data modification.
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
import time

import boto3
import pytest
from boto3.dynamodb.conditions import Key
from moto import mock_aws
from hypothesis import given, settings, assume
from hypothesis import strategies as st


# Strategy for valid section slugs
simple_slug_strategy = st.text(
    alphabet=string.ascii_lowercase + string.digits,
    min_size=2,
    max_size=30,
).filter(lambda s: s[0].isalpha())

# Strategy for number of children or posts (1-5)
count_strategy = st.integers(min_value=1, max_value=5)


def _create_tables():
    """Create moto DynamoDB sections table and content table, return (repo, content_table)."""
    sections_table_name = f'cms-sections-test-{uuid.uuid4().hex[:8]}'
    content_table_name = f'cms-content-test-{uuid.uuid4().hex[:8]}'
    os.environ['SECTIONS_TABLE'] = sections_table_name

    client = boto3.client('dynamodb', region_name='us-east-1')

    # Create sections table
    client.create_table(
        TableName=sections_table_name,
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

    # Create content table with section_id-published_at GSI
    client.create_table(
        TableName=content_table_name,
        KeySchema=[
            {'AttributeName': 'id', 'KeyType': 'HASH'},
            {'AttributeName': 'type#timestamp', 'KeyType': 'RANGE'},
        ],
        AttributeDefinitions=[
            {'AttributeName': 'id', 'AttributeType': 'S'},
            {'AttributeName': 'type#timestamp', 'AttributeType': 'S'},
            {'AttributeName': 'section_id', 'AttributeType': 'S'},
            {'AttributeName': 'published_at', 'AttributeType': 'N'},
        ],
        GlobalSecondaryIndexes=[
            {
                'IndexName': 'section_id-published_at-index',
                'KeySchema': [
                    {'AttributeName': 'section_id', 'KeyType': 'HASH'},
                    {'AttributeName': 'published_at', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
            },
        ],
        BillingMode='PAY_PER_REQUEST',
    )

    from shared.sections_db import SectionRepository
    repo = SectionRepository(table_name=sections_table_name)

    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    content_table = dynamodb.Table(content_table_name)

    return repo, content_table


def _has_assigned_content(content_table, section_id):
    """Check if any content is assigned to a section (mirrors delete handler logic)."""
    result = content_table.query(
        IndexName='section_id-published_at-index',
        KeyConditionExpression=Key('section_id').eq(section_id),
        Limit=1,
        Select='COUNT',
    )
    return result.get('Count', 0) > 0


def _attempt_delete(repo, content_table, section_id):
    """Simulate the delete handler's constraint checks.

    Returns (success: bool, error: str | None).
    """
    section = repo.get_by_id(section_id)
    if not section:
        return False, 'Section not found'

    # Check no children
    children_count = repo.count_children(section_id)
    if children_count > 0:
        return False, 'Section has child sections and cannot be deleted'

    # Check no assigned posts
    if _has_assigned_content(content_table, section_id):
        return False, 'Section has assigned content and cannot be deleted'

    # Delete
    repo.delete(section_id, section['slug'])
    return True, None


class TestDeletionConstraintProperty:
    """Property 5: Section deletion constraint."""

    @settings(max_examples=100)
    @given(
        parent_slug=simple_slug_strategy,
        num_children=count_strategy,
    )
    def test_section_with_children_cannot_be_deleted(self, parent_slug, num_children):
        """A section with child sections cannot be deleted; data is preserved.

        **Validates: Requirements 2.4**
        """
        with mock_aws():
            repo, content_table = _create_tables()

            parent_id = str(uuid.uuid4())
            repo.create({
                'id': parent_id,
                'slug': parent_slug,
                'name': f'Parent {parent_slug}',
                'parent_id': 'ROOT',
                'sort_order': 0,
            })

            # Create N children
            for i in range(num_children):
                child_id = str(uuid.uuid4())
                child_slug = f'{parent_slug}child{i}{uuid.uuid4().hex[:4]}'
                repo.create({
                    'id': child_id,
                    'slug': child_slug,
                    'name': f'Child {i}',
                    'parent_id': parent_id,
                    'sort_order': i,
                })

            # Verify children exist
            assert repo.count_children(parent_id) == num_children

            # Attempt deletion — should be rejected
            success, error = _attempt_delete(repo, content_table, parent_id)
            assert success is False
            assert 'child' in error.lower()

            # Verify section still exists (no data modification)
            section = repo.get_by_id(parent_id)
            assert section is not None
            assert section['slug'] == parent_slug

    @settings(max_examples=100)
    @given(
        slug=simple_slug_strategy,
        num_posts=count_strategy,
    )
    def test_section_with_assigned_posts_cannot_be_deleted(self, slug, num_posts):
        """A section with assigned posts cannot be deleted; data is preserved.

        **Validates: Requirements 2.5, 3.7**
        """
        with mock_aws():
            repo, content_table = _create_tables()

            section_id = str(uuid.uuid4())
            repo.create({
                'id': section_id,
                'slug': slug,
                'name': f'Section {slug}',
                'parent_id': 'ROOT',
                'sort_order': 0,
            })

            # Create N posts assigned to this section
            now = int(time.time())
            for i in range(num_posts):
                post_id = str(uuid.uuid4())
                content_table.put_item(Item={
                    'id': post_id,
                    'type#timestamp': f'post#{now + i}',
                    'section_id': section_id,
                    'published_at': now + i,
                    'status': 'published',
                    'title': f'Post {i}',
                })

            # Verify posts exist
            assert _has_assigned_content(content_table, section_id) is True

            # Attempt deletion — should be rejected
            success, error = _attempt_delete(repo, content_table, section_id)
            assert success is False
            assert 'content' in error.lower()

            # Verify section still exists (no data modification)
            section = repo.get_by_id(section_id)
            assert section is not None
            assert section['slug'] == slug

    @settings(max_examples=100)
    @given(
        slug=simple_slug_strategy,
        num_children=count_strategy,
        num_posts=count_strategy,
    )
    def test_section_with_both_children_and_posts_cannot_be_deleted(self, slug, num_children, num_posts):
        """A section with both children and posts cannot be deleted.

        **Validates: Requirements 2.4, 2.5, 3.7**
        """
        with mock_aws():
            repo, content_table = _create_tables()

            section_id = str(uuid.uuid4())
            repo.create({
                'id': section_id,
                'slug': slug,
                'name': f'Section {slug}',
                'parent_id': 'ROOT',
                'sort_order': 0,
            })

            # Create children
            for i in range(num_children):
                child_id = str(uuid.uuid4())
                child_slug = f'{slug}ch{i}{uuid.uuid4().hex[:4]}'
                repo.create({
                    'id': child_id,
                    'slug': child_slug,
                    'name': f'Child {i}',
                    'parent_id': section_id,
                    'sort_order': i,
                })

            # Create posts
            now = int(time.time())
            for i in range(num_posts):
                post_id = str(uuid.uuid4())
                content_table.put_item(Item={
                    'id': post_id,
                    'type#timestamp': f'post#{now + i}',
                    'section_id': section_id,
                    'published_at': now + i,
                    'status': 'published',
                    'title': f'Post {i}',
                })

            # Attempt deletion — should be rejected (children check comes first)
            success, error = _attempt_delete(repo, content_table, section_id)
            assert success is False

            # Verify section still exists
            section = repo.get_by_id(section_id)
            assert section is not None

    @settings(max_examples=100)
    @given(slug=simple_slug_strategy)
    def test_section_without_children_or_posts_deletes_successfully(self, slug):
        """A section with no children and no posts can be deleted successfully.

        **Validates: Requirements 2.4, 2.5**
        """
        with mock_aws():
            repo, content_table = _create_tables()

            section_id = str(uuid.uuid4())
            repo.create({
                'id': section_id,
                'slug': slug,
                'name': f'Section {slug}',
                'parent_id': 'ROOT',
                'sort_order': 0,
            })

            # Verify no children and no posts
            assert repo.count_children(section_id) == 0
            assert _has_assigned_content(content_table, section_id) is False

            # Deletion should succeed
            success, error = _attempt_delete(repo, content_table, section_id)
            assert success is True
            assert error is None

            # Verify section is gone
            section = repo.get_by_id(section_id)
            assert section is None
