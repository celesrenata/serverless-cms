"""Smoke test for SectionRepository."""
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
def sections_table():
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
        yield SectionRepository()


def test_create_and_get_by_id(sections_table):
    repo = sections_table
    section = repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    assert section['id'] == 'sec-1'

    result = repo.get_by_id('sec-1')
    assert result is not None
    assert result['name'] == 'Technology'


def test_get_by_slug(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    result = repo.get_by_slug('technology')
    assert result is not None
    assert result['id'] == 'sec-1'


def test_duplicate_slug_rejected(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    with pytest.raises(Exception, match="already in use"):
        repo.create({
            'id': 'sec-2',
            'slug': 'technology',
            'name': 'Tech Duplicate',
            'parent_id': 'ROOT',
            'sort_order': 1,
        })


def test_get_children(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    repo.create({
        'id': 'sec-child-1',
        'slug': 'web-dev',
        'name': 'Web Development',
        'parent_id': 'sec-1',
        'sort_order': 1,
    })
    children = repo.get_children('sec-1')
    assert len(children) == 1
    assert children[0]['id'] == 'sec-child-1'


def test_count_children(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    repo.create({
        'id': 'sec-child-1',
        'slug': 'web-dev',
        'name': 'Web Development',
        'parent_id': 'sec-1',
        'sort_order': 1,
    })
    assert repo.count_children('sec-1') == 1
    assert repo.count_children('sec-child-1') == 0


def test_get_all_sections_filters_slug_locks(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    repo.create({
        'id': 'sec-2',
        'slug': 'science',
        'name': 'Science',
        'parent_id': 'ROOT',
        'sort_order': 1,
    })
    all_sections = repo.get_all_sections()
    for s in all_sections:
        assert s.get('entity_type') != 'slug_lock'
    assert len(all_sections) == 2


def test_update_no_slug_change(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    updated = repo.update('sec-1', {'name': 'Tech Updated'})
    assert updated['name'] == 'Tech Updated'


def test_update_with_slug_change(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    updated = repo.update('sec-1', {'slug': 'tech', 'name': 'Tech'})
    assert updated['slug'] == 'tech'
    # Old slug should be gone
    assert repo.get_by_slug('technology') is None
    # New slug should work
    assert repo.get_by_slug('tech') is not None


def test_update_slug_conflict(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    repo.create({
        'id': 'sec-2',
        'slug': 'science',
        'name': 'Science',
        'parent_id': 'ROOT',
        'sort_order': 1,
    })
    with pytest.raises(Exception, match="already in use"):
        repo.update('sec-1', {'slug': 'science'})


def test_get_descendant_ids(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    repo.create({
        'id': 'sec-child-1',
        'slug': 'web-dev',
        'name': 'Web Development',
        'parent_id': 'sec-1',
        'sort_order': 1,
    })
    repo.create({
        'id': 'sec-grandchild-1',
        'slug': 'react',
        'name': 'React',
        'parent_id': 'sec-child-1',
        'sort_order': 0,
    })
    descendants = repo.get_descendant_ids('sec-1')
    assert 'sec-child-1' in descendants
    assert 'sec-grandchild-1' in descendants
    assert len(descendants) == 2


def test_delete(sections_table):
    repo = sections_table
    repo.create({
        'id': 'sec-1',
        'slug': 'technology',
        'name': 'Technology',
        'parent_id': 'ROOT',
        'sort_order': 0,
    })
    repo.delete('sec-1', 'technology')
    assert repo.get_by_id('sec-1') is None
    assert repo.get_by_slug('technology') is None


def test_update_nonexistent_section(sections_table):
    repo = sections_table
    with pytest.raises(Exception, match="not found"):
        repo.update('nonexistent', {'name': 'test'})
