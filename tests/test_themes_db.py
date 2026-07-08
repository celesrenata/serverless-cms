"""
Unit tests for ThemeRepository.

Uses moto to mock DynamoDB and verifies all CRUD operations.
"""

import time
import uuid
from unittest.mock import patch

import boto3
import pytest
from moto import mock_aws

# Setup path for lambda imports
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))


@pytest.fixture
def dynamodb_table():
    """Create a mock DynamoDB themes table."""
    with mock_aws():
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.create_table(
            TableName='cms-themes-test',
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'},
            ],
            BillingMode='PAY_PER_REQUEST',
        )
        table.meta.client.get_waiter('table_exists').wait(TableName='cms-themes-test')
        yield table


@pytest.fixture
def theme_repo(dynamodb_table):
    """Create a ThemeRepository using the mock table."""
    with patch.dict(os.environ, {'THEMES_TABLE': 'cms-themes-test'}):
        from shared.themes_db import ThemeRepository
        repo = ThemeRepository(table_name='cms-themes-test')
        yield repo


@pytest.fixture
def sample_theme_data():
    """Sample theme data for testing."""
    return {
        'name': 'Test Theme',
        'description': 'A test theme for unit tests',
        'tokens': {
            'colors': {
                'primary': '139 92 246',
                'background': '3 7 18',
            },
            'typography': {
                'font_family': 'Inter, sans-serif',
            },
        },
        'custom_css': '.test { color: red; }',
        'created_by': 'user-123',
    }


class TestThemeRepositoryCreate:
    """Tests for ThemeRepository.create()"""

    def test_create_generates_uuid(self, theme_repo, sample_theme_data):
        """Created theme should have a valid UUID id."""
        result = theme_repo.create(sample_theme_data)
        assert 'id' in result
        # Verify it's a valid UUID
        uuid.UUID(result['id'])

    def test_create_sets_timestamps(self, theme_repo, sample_theme_data):
        """Created theme should have created_at and updated_at timestamps."""
        before = int(time.time())
        result = theme_repo.create(sample_theme_data)
        after = int(time.time())

        assert before <= result['created_at'] <= after
        assert before <= result['updated_at'] <= after
        assert result['created_at'] == result['updated_at']

    def test_create_preserves_data(self, theme_repo, sample_theme_data):
        """Created theme should preserve all input data."""
        result = theme_repo.create(sample_theme_data)

        assert result['name'] == 'Test Theme'
        assert result['description'] == 'A test theme for unit tests'
        assert result['tokens'] == sample_theme_data['tokens']
        assert result['custom_css'] == '.test { color: red; }'
        assert result['created_by'] == 'user-123'

    def test_create_without_custom_css(self, theme_repo):
        """Created theme without custom_css should not include the field."""
        data = {
            'name': 'No CSS Theme',
            'description': 'Theme without custom CSS',
            'tokens': {'colors': {}},
            'created_by': 'user-456',
        }
        result = theme_repo.create(data)
        assert 'custom_css' not in result

    def test_create_with_empty_custom_css(self, theme_repo):
        """Empty string custom_css should not be stored."""
        data = {
            'name': 'Empty CSS Theme',
            'description': '',
            'tokens': {'colors': {}},
            'custom_css': '',
            'created_by': 'user-456',
        }
        result = theme_repo.create(data)
        assert 'custom_css' not in result


class TestThemeRepositoryGetById:
    """Tests for ThemeRepository.get_by_id()"""

    def test_get_existing_theme(self, theme_repo, sample_theme_data):
        """Should return a theme that exists."""
        created = theme_repo.create(sample_theme_data)
        result = theme_repo.get_by_id(created['id'])

        assert result is not None
        assert result['id'] == created['id']
        assert result['name'] == 'Test Theme'

    def test_get_nonexistent_theme(self, theme_repo):
        """Should return None for a non-existent ID."""
        result = theme_repo.get_by_id('nonexistent-id')
        assert result is None


class TestThemeRepositoryGetAll:
    """Tests for ThemeRepository.get_all()"""

    def test_get_all_empty_table(self, theme_repo):
        """Should return empty list when table is empty."""
        result = theme_repo.get_all()
        assert result == []

    def test_get_all_returns_all_themes(self, theme_repo):
        """Should return all themes in the table."""
        for i in range(3):
            theme_repo.create({
                'name': f'Theme {i}',
                'description': f'Description {i}',
                'tokens': {},
                'created_by': 'user-123',
            })

        result = theme_repo.get_all()
        assert len(result) == 3
        names = {t['name'] for t in result}
        assert names == {'Theme 0', 'Theme 1', 'Theme 2'}


class TestThemeRepositoryUpdate:
    """Tests for ThemeRepository.update()"""

    def test_update_name(self, theme_repo, sample_theme_data):
        """Should update the name field."""
        created = theme_repo.create(sample_theme_data)
        result = theme_repo.update(created['id'], {'name': 'Updated Name'})

        assert result is not None
        assert result['name'] == 'Updated Name'
        # Other fields should remain unchanged
        assert result['description'] == 'A test theme for unit tests'

    def test_update_sets_updated_at(self, theme_repo, sample_theme_data):
        """Should update the updated_at timestamp."""
        created = theme_repo.create(sample_theme_data)
        original_updated_at = created['updated_at']

        # Small delay to ensure timestamp differs
        time.sleep(0.01)
        result = theme_repo.update(created['id'], {'name': 'New Name'})

        assert result['updated_at'] >= original_updated_at

    def test_update_partial_fields(self, theme_repo, sample_theme_data):
        """Should only update specified fields."""
        created = theme_repo.create(sample_theme_data)
        result = theme_repo.update(created['id'], {
            'description': 'New description',
            'custom_css': '.new { display: flex; }',
        })

        assert result['description'] == 'New description'
        assert result['custom_css'] == '.new { display: flex; }'
        assert result['name'] == 'Test Theme'  # Unchanged

    def test_update_nonexistent_returns_none(self, theme_repo):
        """Should return None when updating non-existent theme."""
        result = theme_repo.update('nonexistent-id', {'name': 'Nope'})
        assert result is None


class TestThemeRepositoryDelete:
    """Tests for ThemeRepository.delete()"""

    def test_delete_removes_theme(self, theme_repo, sample_theme_data):
        """Should remove the theme from the table."""
        created = theme_repo.create(sample_theme_data)
        theme_repo.delete(created['id'])

        result = theme_repo.get_by_id(created['id'])
        assert result is None

    def test_delete_nonexistent_does_not_raise(self, theme_repo):
        """Deleting a non-existent theme should not raise."""
        # Should not raise
        theme_repo.delete('nonexistent-id')


class TestThemeRepositoryCount:
    """Tests for ThemeRepository.count()"""

    def test_count_empty_table(self, theme_repo):
        """Should return 0 for empty table."""
        assert theme_repo.count() == 0

    def test_count_with_themes(self, theme_repo):
        """Should return correct count."""
        for i in range(5):
            theme_repo.create({
                'name': f'Theme {i}',
                'description': '',
                'tokens': {},
                'created_by': 'user-123',
            })

        assert theme_repo.count() == 5

    def test_count_after_delete(self, theme_repo):
        """Count should decrease after deletion."""
        themes = []
        for i in range(3):
            themes.append(theme_repo.create({
                'name': f'Theme {i}',
                'description': '',
                'tokens': {},
                'created_by': 'user-123',
            }))

        assert theme_repo.count() == 3

        theme_repo.delete(themes[0]['id'])
        assert theme_repo.count() == 2
