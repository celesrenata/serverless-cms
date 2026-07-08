"""Tests for post queries by section including ancestor/descendant inclusion.

These tests rely on conftest.py's autouse aws_mock (moto) for the mock context.
We create additional tables (sections + content with section GSI) inside that
existing mock context.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

# Override the CONTENT_TABLE used by conftest — we manage our own content table here
os.environ['SECTIONS_TABLE'] = 'test-sections'

import boto3
import pytest
from boto3.dynamodb.conditions import Key, Attr


@pytest.fixture
def sections_and_content(aws_mock):
    """Create a sections table and a content table with section_id GSI."""
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    client = boto3.client('dynamodb', region_name='us-east-1')

    # Create sections table (fresh, uses unique name for these tests)
    dynamodb.create_table(
        TableName='test-sections',
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
    dynamodb.create_table(
        TableName='test-content-with-sections',
        KeySchema=[
            {'AttributeName': 'id', 'KeyType': 'HASH'},
            {'AttributeName': 'created_at', 'KeyType': 'RANGE'},
        ],
        AttributeDefinitions=[
            {'AttributeName': 'id', 'AttributeType': 'S'},
            {'AttributeName': 'created_at', 'AttributeType': 'N'},
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
    import content.section_helpers as sh
    sh._sections_repository = None  # Reset cached repo

    sections_repo = SectionRepository(table_name='test-sections')
    content_table = dynamodb.Table('test-content-with-sections')

    yield sections_repo, content_table


def _create_section(repo, id, slug, name, parent_id='ROOT', sort_order=0):
    return repo.create({
        'id': id,
        'slug': slug,
        'name': name,
        'parent_id': parent_id,
        'sort_order': sort_order,
    })


def _create_post(content_table, post_id, section_id, status='published', published_at=1000):
    content_table.put_item(Item={
        'id': post_id,
        'created_at': published_at,
        'type': 'post',
        'title': f'Post {post_id}',
        'slug': f'post-{post_id}',
        'content': '<p>Test</p>',
        'section_id': section_id,
        'status': status,
        'published_at': published_at,
        'updated_at': published_at,
    })


def _query_published_posts(content_table, section_id):
    """Replicate the query logic from public.py."""
    items = []
    query_kwargs = {
        'IndexName': 'section_id-published_at-index',
        'KeyConditionExpression': Key('section_id').eq(section_id),
        'FilterExpression': Attr('status').eq('published'),
        'ScanIndexForward': False,
    }
    while True:
        result = content_table.query(**query_kwargs)
        items.extend(result.get('Items', []))
        last_key = result.get('LastEvaluatedKey')
        if not last_key:
            break
        query_kwargs['ExclusiveStartKey'] = last_key
    return items


# ─── Post queries by section ────────────────────────────────────────────────


def test_query_posts_for_section(sections_and_content):
    """Posts assigned to a section are returned when querying that section."""
    sections_repo, content_table = sections_and_content

    _create_section(sections_repo, 'sec1', 'tech', 'Technology')
    _create_post(content_table, 'p1', 'sec1', published_at=2000)
    _create_post(content_table, 'p2', 'sec1', published_at=1000)

    posts = _query_published_posts(content_table, 'sec1')
    assert len(posts) == 2
    # Should be ordered by published_at DESC (ScanIndexForward=False)
    assert posts[0]['id'] == 'p1'
    assert posts[1]['id'] == 'p2'


def test_query_posts_only_published(sections_and_content):
    """Only published posts are returned."""
    sections_repo, content_table = sections_and_content

    _create_section(sections_repo, 'sec1', 'tech', 'Technology')
    _create_post(content_table, 'p1', 'sec1', status='published', published_at=2000)
    _create_post(content_table, 'p2', 'sec1', status='draft', published_at=1000)
    _create_post(content_table, 'p3', 'sec1', status='archived', published_at=500)

    posts = _query_published_posts(content_table, 'sec1')
    assert len(posts) == 1
    assert posts[0]['id'] == 'p1'


def test_query_posts_empty_section(sections_and_content):
    """Section with no posts returns empty list."""
    sections_repo, content_table = sections_and_content

    _create_section(sections_repo, 'sec1', 'tech', 'Technology')
    posts = _query_published_posts(content_table, 'sec1')
    assert posts == []


# ─── Ancestor/descendant inclusion ──────────────────────────────────────────


def test_descendant_posts_included(sections_and_content):
    """Posts in child sections are included when querying parent via get_descendant_ids."""
    sections_repo, content_table = sections_and_content

    _create_section(sections_repo, 'parent', 'tech', 'Technology')
    _create_section(sections_repo, 'child', 'web', 'Web Dev', parent_id='parent', sort_order=0)
    _create_section(sections_repo, 'grandchild', 'react', 'React', parent_id='child', sort_order=0)

    _create_post(content_table, 'p1', 'parent', published_at=3000)
    _create_post(content_table, 'p2', 'child', published_at=2000)
    _create_post(content_table, 'p3', 'grandchild', published_at=1000)

    # Get descendant IDs — this is how public.py builds the query set
    descendant_ids = sections_repo.get_descendant_ids('parent')
    all_section_ids = ['parent'] + descendant_ids

    # Query posts for all sections
    all_posts = []
    for sid in all_section_ids:
        all_posts.extend(_query_published_posts(content_table, sid))

    # Sort by published_at DESC
    all_posts.sort(key=lambda x: x.get('published_at', 0), reverse=True)

    assert len(all_posts) == 3
    assert [p['id'] for p in all_posts] == ['p1', 'p2', 'p3']


def test_ancestor_query_does_not_include_sibling(sections_and_content):
    """Querying a section does not include posts from sibling sections."""
    sections_repo, content_table = sections_and_content

    _create_section(sections_repo, 'parent', 'tech', 'Technology')
    _create_section(sections_repo, 'child-a', 'web', 'Web', parent_id='parent', sort_order=0)
    _create_section(sections_repo, 'child-b', 'mobile', 'Mobile', parent_id='parent', sort_order=1)

    _create_post(content_table, 'p1', 'child-a', published_at=2000)
    _create_post(content_table, 'p2', 'child-b', published_at=1000)

    # Query only child-a and its descendants (not child-b)
    descendant_ids = sections_repo.get_descendant_ids('child-a')
    all_section_ids = ['child-a'] + descendant_ids

    all_posts = []
    for sid in all_section_ids:
        all_posts.extend(_query_published_posts(content_table, sid))

    assert len(all_posts) == 1
    assert all_posts[0]['id'] == 'p1'


def test_pagination_logic(sections_and_content):
    """Pagination slicing works correctly for post results."""
    sections_repo, content_table = sections_and_content

    _create_section(sections_repo, 'sec1', 'tech', 'Technology')

    # Create 25 posts
    for i in range(25):
        _create_post(content_table, f'p{i:02d}', 'sec1', published_at=3000 - i)

    posts = _query_published_posts(content_table, 'sec1')
    posts.sort(key=lambda x: x.get('published_at', 0), reverse=True)

    page_size = 20
    page1 = posts[0:page_size]
    page2 = posts[page_size:page_size * 2]

    assert len(page1) == 20
    assert len(page2) == 5
    assert len(posts) == 25
