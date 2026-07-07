"""Tests for tree construction and path resolution backed by moto DynamoDB."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['SECTIONS_TABLE'] = 'cms-sections-test'

import boto3
import pytest


@pytest.fixture
def repo():
    """Create sections table in the mock AWS context provided by conftest's aws_mock fixture."""
    table_name = 'cms-sections-test'
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
    yield SectionRepository(table_name=table_name)


def _create_section(repo, id, slug, name, parent_id='ROOT', sort_order=0):
    return repo.create({
        'id': id,
        'slug': slug,
        'name': name,
        'parent_id': parent_id,
        'sort_order': sort_order,
    })


# ─── build_tree with moto-backed data ────────────────────────────────────────


def test_build_tree_from_db_empty(repo):
    from sections.service import build_tree

    sections = repo.get_all_sections()
    tree = build_tree(sections)
    assert tree == []


def test_build_tree_from_db_single_root(repo):
    from sections.service import build_tree

    _create_section(repo, 'root1', 'tech', 'Technology')
    sections = repo.get_all_sections()
    tree = build_tree(sections)

    assert len(tree) == 1
    assert tree[0]['id'] == 'root1'
    assert tree[0]['children'] == []


def test_build_tree_from_db_nested(repo):
    from sections.service import build_tree

    _create_section(repo, 'root', 'tech', 'Technology', sort_order=0)
    _create_section(repo, 'child1', 'web', 'Web Dev', parent_id='root', sort_order=1)
    _create_section(repo, 'child2', 'mobile', 'Mobile', parent_id='root', sort_order=2)
    _create_section(repo, 'grandchild', 'react', 'React', parent_id='child1', sort_order=0)

    sections = repo.get_all_sections()
    tree = build_tree(sections)

    assert len(tree) == 1
    root = tree[0]
    assert root['id'] == 'root'
    assert len(root['children']) == 2
    assert root['children'][0]['id'] == 'child1'
    assert root['children'][1]['id'] == 'child2'
    assert len(root['children'][0]['children']) == 1
    assert root['children'][0]['children'][0]['id'] == 'grandchild'


def test_build_tree_from_db_sort_order(repo):
    from sections.service import build_tree

    _create_section(repo, 'r1', 'alpha', 'Alpha', sort_order=2)
    _create_section(repo, 'r2', 'beta', 'Beta', sort_order=1)
    _create_section(repo, 'r3', 'gamma', 'Gamma', sort_order=0)

    sections = repo.get_all_sections()
    tree = build_tree(sections)

    ids = [n['id'] for n in tree]
    assert ids == ['r3', 'r2', 'r1']


def test_build_tree_filters_slug_locks_from_db(repo):
    from sections.service import build_tree

    _create_section(repo, 'root', 'tech', 'Technology')
    # Slug lock items are created automatically by repo.create
    sections = repo.get_all_sections()

    # get_all_sections already filters slug locks
    tree = build_tree(sections)
    assert len(tree) == 1
    assert tree[0]['id'] == 'root'


# ─── resolve_path with moto-backed data ─────────────────────────────────────


def test_resolve_path_single_segment(repo):
    from sections.service import resolve_path

    _create_section(repo, 'root', 'technology', 'Technology')
    result = resolve_path('technology', repo)
    assert result is not None
    assert result['id'] == 'root'


def test_resolve_path_multi_segment(repo):
    from sections.service import resolve_path

    _create_section(repo, 'root', 'tech', 'Technology')
    _create_section(repo, 'child', 'web', 'Web Dev', parent_id='root', sort_order=0)
    _create_section(repo, 'gc', 'react', 'React', parent_id='child', sort_order=0)

    result = resolve_path('tech/web/react', repo)
    assert result is not None
    assert result['id'] == 'gc'


def test_resolve_path_deep_5_levels(repo):
    from sections.service import resolve_path

    _create_section(repo, 's1', 'l1', 'Level 1', sort_order=0)
    _create_section(repo, 's2', 'l2', 'Level 2', parent_id='s1', sort_order=0)
    _create_section(repo, 's3', 'l3', 'Level 3', parent_id='s2', sort_order=0)
    _create_section(repo, 's4', 'l4', 'Level 4', parent_id='s3', sort_order=0)
    _create_section(repo, 's5', 'l5', 'Level 5', parent_id='s4', sort_order=0)

    result = resolve_path('l1/l2/l3/l4/l5', repo)
    assert result is not None
    assert result['id'] == 's5'


def test_resolve_path_nonexistent_returns_none(repo):
    from sections.service import resolve_path

    _create_section(repo, 'root', 'tech', 'Technology')
    assert resolve_path('nonexistent', repo) is None
    assert resolve_path('tech/missing', repo) is None


def test_resolve_path_empty_returns_none(repo):
    from sections.service import resolve_path

    assert resolve_path('', repo) is None
    assert resolve_path('  ', repo) is None


def test_resolve_path_wrong_parent_chain(repo):
    """Two sections with same slug but different parents - only correct path resolves."""
    from sections.service import resolve_path

    _create_section(repo, 'root1', 'a', 'A', sort_order=0)
    _create_section(repo, 'root2', 'b', 'B', sort_order=1)
    _create_section(repo, 'child-of-a', 'child', 'Child of A', parent_id='root1', sort_order=0)

    result = resolve_path('a/child', repo)
    assert result is not None
    assert result['id'] == 'child-of-a'

    # 'b/child' should not resolve because 'child' is parented under 'a'
    result = resolve_path('b/child', repo)
    assert result is None
