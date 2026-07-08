"""Property-based tests for ancestor section post inclusion (Property 9).

**Validates: Requirements 3.5**

Property 9: Ancestor section post inclusion
For any post assigned to a section at depth N, querying any ancestor section
(depth < N) includes that post in the results alongside directly-assigned posts.
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
import math

import boto3
import pytest
from boto3.dynamodb.conditions import Key, Attr
from moto import mock_aws
from hypothesis import given, settings, assume
from hypothesis import strategies as st


# Strategy for valid section slugs
simple_slug_strategy = st.text(
    alphabet=string.ascii_lowercase + string.digits,
    min_size=2,
    max_size=20,
).filter(lambda s: s[0].isalpha())

# Strategy for hierarchy depth (2-5 levels, need at least 2 for ancestor test)
depth_strategy = st.integers(min_value=2, max_value=5)

# Strategy for number of posts to assign at the leaf section
posts_count_strategy = st.integers(min_value=1, max_value=5)

# Strategy for number of direct posts on the ancestor
ancestor_posts_strategy = st.integers(min_value=0, max_value=3)


CONTENT_SECTION_INDEX = 'section_id-published_at-index'


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


def _query_published_posts_for_section(repo, content_table, section_id):
    """Query posts for a section INCLUDING its descendants (mirrors public.py logic)."""
    descendant_ids = repo.get_descendant_ids(section_id)
    all_section_ids = [section_id] + descendant_ids

    posts = []
    for sid in all_section_ids:
        query_kwargs = {
            'IndexName': CONTENT_SECTION_INDEX,
            'KeyConditionExpression': Key('section_id').eq(sid),
            'FilterExpression': Attr('status').eq('published'),
            'ScanIndexForward': False,
        }
        while True:
            result = content_table.query(**query_kwargs)
            posts.extend(result.get('Items', []))
            last_key = result.get('LastEvaluatedKey')
            if not last_key:
                break
            query_kwargs['ExclusiveStartKey'] = last_key

    # Sort by published_at descending
    posts.sort(key=lambda item: item.get('published_at', 0), reverse=True)
    return posts


def _build_section_chain(repo, depth, base_slug):
    """Build a chain of sections from root to leaf at given depth. Returns list of section IDs."""
    section_ids = []
    parent_id = 'ROOT'

    for i in range(depth):
        section_id = str(uuid.uuid4())
        slug = f'{base_slug}{i}{uuid.uuid4().hex[:4]}'
        repo.create({
            'id': section_id,
            'slug': slug,
            'name': f'Section depth {i + 1}',
            'parent_id': parent_id,
            'sort_order': 0,
        })
        section_ids.append(section_id)
        parent_id = section_id

    return section_ids


class TestAncestorPostInclusionProperty:
    """Property 9: Ancestor section post inclusion."""

    @settings(max_examples=100)
    @given(
        base_slug=simple_slug_strategy,
        depth=depth_strategy,
        num_leaf_posts=posts_count_strategy,
    )
    def test_ancestor_includes_descendant_posts(self, base_slug, depth, num_leaf_posts):
        """Posts at depth N are included when querying any ancestor section.

        **Validates: Requirements 3.5**
        """
        with mock_aws():
            repo, content_table = _create_tables()

            # Build a section chain of the given depth
            section_ids = _build_section_chain(repo, depth, base_slug)
            leaf_section_id = section_ids[-1]

            # Assign posts to the leaf section
            now = int(time.time())
            leaf_post_ids = []
            for i in range(num_leaf_posts):
                post_id = str(uuid.uuid4())
                content_table.put_item(Item={
                    'id': post_id,
                    'type#timestamp': f'post#{now + i}',
                    'section_id': leaf_section_id,
                    'published_at': now + i,
                    'status': 'published',
                    'title': f'Leaf Post {i}',
                })
                leaf_post_ids.append(post_id)

            # Query every ancestor section — each should include the leaf posts
            for ancestor_idx in range(len(section_ids) - 1):
                ancestor_id = section_ids[ancestor_idx]
                posts = _query_published_posts_for_section(repo, content_table, ancestor_id)
                returned_ids = {p['id'] for p in posts}

                for leaf_post_id in leaf_post_ids:
                    assert leaf_post_id in returned_ids, (
                        f"Post {leaf_post_id} at leaf (depth {depth}) not found "
                        f"when querying ancestor at depth {ancestor_idx + 1}"
                    )

    @settings(max_examples=100)
    @given(
        base_slug=simple_slug_strategy,
        depth=depth_strategy,
        num_leaf_posts=posts_count_strategy,
        num_ancestor_posts=ancestor_posts_strategy,
    )
    def test_ancestor_posts_coexist_with_descendant_posts(
        self, base_slug, depth, num_leaf_posts, num_ancestor_posts
    ):
        """Querying an ancestor returns BOTH its own posts and descendant posts.

        **Validates: Requirements 3.5**
        """
        with mock_aws():
            repo, content_table = _create_tables()

            # Build section chain
            section_ids = _build_section_chain(repo, depth, base_slug)
            root_section_id = section_ids[0]
            leaf_section_id = section_ids[-1]

            now = int(time.time())

            # Assign posts directly to the root ancestor
            ancestor_post_ids = []
            for i in range(num_ancestor_posts):
                post_id = str(uuid.uuid4())
                content_table.put_item(Item={
                    'id': post_id,
                    'type#timestamp': f'post#{now + i}',
                    'section_id': root_section_id,
                    'published_at': now + i,
                    'status': 'published',
                    'title': f'Root Post {i}',
                })
                ancestor_post_ids.append(post_id)

            # Assign posts to the leaf section
            leaf_post_ids = []
            for i in range(num_leaf_posts):
                post_id = str(uuid.uuid4())
                content_table.put_item(Item={
                    'id': post_id,
                    'type#timestamp': f'post#{now + 100 + i}',
                    'section_id': leaf_section_id,
                    'published_at': now + 100 + i,
                    'status': 'published',
                    'title': f'Leaf Post {i}',
                })
                leaf_post_ids.append(post_id)

            # Query root ancestor — should have both ancestor and leaf posts
            posts = _query_published_posts_for_section(repo, content_table, root_section_id)
            returned_ids = {p['id'] for p in posts}

            # All ancestor posts present
            for pid in ancestor_post_ids:
                assert pid in returned_ids, f"Ancestor post {pid} not in root query results"

            # All leaf posts present
            for pid in leaf_post_ids:
                assert pid in returned_ids, f"Leaf post {pid} not in root query results"

            # Total count matches
            assert len(posts) == num_ancestor_posts + num_leaf_posts

    @settings(max_examples=100)
    @given(
        base_slug=simple_slug_strategy,
        depth=depth_strategy,
        num_leaf_posts=posts_count_strategy,
    )
    def test_leaf_query_only_returns_own_posts(self, base_slug, depth, num_leaf_posts):
        """Querying the leaf section itself only returns its directly-assigned posts.

        **Validates: Requirements 3.5**
        """
        with mock_aws():
            repo, content_table = _create_tables()

            # Build section chain
            section_ids = _build_section_chain(repo, depth, base_slug)
            root_section_id = section_ids[0]
            leaf_section_id = section_ids[-1]

            now = int(time.time())

            # Assign posts to the root
            for i in range(2):
                post_id = str(uuid.uuid4())
                content_table.put_item(Item={
                    'id': post_id,
                    'type#timestamp': f'post#{now + i}',
                    'section_id': root_section_id,
                    'published_at': now + i,
                    'status': 'published',
                    'title': f'Root Post {i}',
                })

            # Assign posts to the leaf
            leaf_post_ids = []
            for i in range(num_leaf_posts):
                post_id = str(uuid.uuid4())
                content_table.put_item(Item={
                    'id': post_id,
                    'type#timestamp': f'post#{now + 100 + i}',
                    'section_id': leaf_section_id,
                    'published_at': now + 100 + i,
                    'status': 'published',
                    'title': f'Leaf Post {i}',
                })
                leaf_post_ids.append(post_id)

            # Query the leaf section — should only have leaf posts (no children)
            posts = _query_published_posts_for_section(repo, content_table, leaf_section_id)
            returned_ids = {p['id'] for p in posts}

            assert len(posts) == num_leaf_posts
            for pid in leaf_post_ids:
                assert pid in returned_ids

    @settings(max_examples=100)
    @given(
        base_slug=simple_slug_strategy,
        num_leaf_posts=posts_count_strategy,
    )
    def test_draft_posts_excluded_from_ancestor_query(self, base_slug, num_leaf_posts):
        """Only published posts are included; draft posts at a descendant are excluded.

        **Validates: Requirements 3.5**
        """
        with mock_aws():
            repo, content_table = _create_tables()

            # Build 2-level chain (root -> child)
            section_ids = _build_section_chain(repo, 2, base_slug)
            root_section_id = section_ids[0]
            child_section_id = section_ids[1]

            now = int(time.time())

            # Assign published posts to child
            published_ids = []
            for i in range(num_leaf_posts):
                post_id = str(uuid.uuid4())
                content_table.put_item(Item={
                    'id': post_id,
                    'type#timestamp': f'post#{now + i}',
                    'section_id': child_section_id,
                    'published_at': now + i,
                    'status': 'published',
                    'title': f'Published Post {i}',
                })
                published_ids.append(post_id)

            # Assign draft posts to child
            for i in range(num_leaf_posts):
                post_id = str(uuid.uuid4())
                content_table.put_item(Item={
                    'id': post_id,
                    'type#timestamp': f'post#{now + 50 + i}',
                    'section_id': child_section_id,
                    'published_at': 0,
                    'status': 'draft',
                    'title': f'Draft Post {i}',
                })

            # Query root — should only include published posts
            posts = _query_published_posts_for_section(repo, content_table, root_section_id)
            returned_ids = {p['id'] for p in posts}

            assert len(posts) == num_leaf_posts
            for pid in published_ids:
                assert pid in returned_ids
