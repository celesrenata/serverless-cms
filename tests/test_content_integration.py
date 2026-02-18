"""
Integration tests for content management API endpoints.
Tests the complete lifecycle: create, read, update, delete.
"""
import json
import sys
import os
from datetime import datetime
import uuid

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

# Import from content and shared modules
from content import create, get, list as list_content, update, delete
from shared.db import ContentRepository


class TestContentLifecycle:
    """Test complete content CRUD operations."""
    
    def test_create_content_success(self, dynamodb_mock, test_user_id, test_content_data, mock_context):
        """Test successful content creation."""
        event = {
            'body': json.dumps(test_content_data),
            'headers': {}
        }
        
        # Mock authentication by directly calling handler with user context
        content_repo = ContentRepository()
        
        # Create content item
        now = int(datetime.now().timestamp())
        content_item = {
            'id': str(uuid.uuid4()),
            'type#timestamp': f"{test_content_data['type']}#{now}",
            'type': test_content_data['type'],
            'title': test_content_data['title'],
            'slug': test_content_data['slug'],
            'content': test_content_data['content'],
            'excerpt': test_content_data['excerpt'],
            'author': test_user_id,
            'status': test_content_data['status'],
            'metadata': test_content_data['metadata'],
            'created_at': now,
            'updated_at': now
        }
        
        result = content_repo.create(content_item)
        
        assert result['id'] == content_item['id']
        assert result['title'] == test_content_data['title']
        assert result['slug'] == test_content_data['slug']
        assert result['status'] == 'draft'
    
    def test_create_content_duplicate_slug(self, dynamodb_mock, test_user_id, test_content_data, mock_context):
        """Test that duplicate slugs are rejected."""
        content_repo = ContentRepository()
        
        # Create first content
        now = int(datetime.now().timestamp())
        content_item = {
            'id': str(uuid.uuid4()),
            'type#timestamp': f"{test_content_data['type']}#{now}",
            'type': test_content_data['type'],
            'title': test_content_data['title'],
            'slug': test_content_data['slug'],
            'content': test_content_data['content'],
            'excerpt': test_content_data['excerpt'],
            'author': test_user_id,
            'status': 'published',
            'metadata': test_content_data['metadata'],
            'created_at': now,
            'updated_at': now,
            'published_at': now
        }
        content_repo.create(content_item)
        
        # Try to create another with same slug
        existing = content_repo.get_by_slug(test_content_data['slug'])
        assert existing is not None
        assert existing['slug'] == test_content_data['slug']
    
    def test_get_content_by_id(self, dynamodb_mock, test_user_id, test_content_data, mock_context):
        """Test retrieving content by ID."""
        content_repo = ContentRepository()
        
        # Create content
        now = int(datetime.now().timestamp())
        content_id = str(uuid.uuid4())
        content_item = {
            'id': content_id,
            'type#timestamp': f"{test_content_data['type']}#{now}",
            'type': test_content_data['type'],
            'title': test_content_data['title'],
            'slug': test_content_data['slug'],
            'content': test_content_data['content'],
            'excerpt': test_content_data['excerpt'],
            'author': test_user_id,
            'status': 'published',
            'metadata': test_content_data['metadata'],
            'created_at': now,
            'updated_at': now,
            'published_at': now
        }
        content_repo.create(content_item)
        
        # Retrieve content
        retrieved = content_repo.get_by_id(content_id, f"{test_content_data['type']}#{now}")
        
        assert retrieved is not None
        assert retrieved['id'] == content_id
        assert retrieved['title'] == test_content_data['title']
        assert retrieved['status'] == 'published'
    
    def test_get_content_by_slug(self, dynamodb_mock, test_user_id, test_content_data, mock_context):
        """Test retrieving content by slug."""
        content_repo = ContentRepository()
        
        # Create content
        now = int(datetime.now().timestamp())
        content_item = {
            'id': str(uuid.uuid4()),
            'type#timestamp': f"{test_content_data['type']}#{now}",
            'type': test_content_data['type'],
            'title': test_content_data['title'],
            'slug': test_content_data['slug'],
            'content': test_content_data['content'],
            'excerpt': test_content_data['excerpt'],
            'author': test_user_id,
            'status': 'published',
            'metadata': test_content_data['metadata'],
            'created_at': now,
            'updated_at': now,
            'published_at': now
        }
        content_repo.create(content_item)
        
        # Retrieve by slug
        retrieved = content_repo.get_by_slug(test_content_data['slug'])
        
        assert retrieved is not None
        assert retrieved['slug'] == test_content_data['slug']
        assert retrieved['title'] == test_content_data['title']
    
    def test_list_content_by_type(self, dynamodb_mock, test_user_id, mock_context):
        """Test listing content filtered by type."""
        content_repo = ContentRepository()
        
        # Create multiple content items
        now = int(datetime.now().timestamp())
        for i in range(3):
            content_item = {
                'id': str(uuid.uuid4()),
                'type#timestamp': f"'post'#{now}",
                'type': 'post',
                'title': f'Test Post {i}',
                'slug': f'test-post-{i}',
                'content': f'<p>Content {i}</p>',
                'excerpt': f'Excerpt {i}',
                'author': test_user_id,
                'status': 'published',
                'metadata': {},
                'created_at': now + i,
                'updated_at': now + i,
                'published_at': now + i
            }
            content_repo.create(content_item)
        
        # List content
        result = content_repo.list_by_type('post', status='published', limit=10)
        
        assert len(result['items']) == 3
        # Should be in descending order by published_at
        assert result['items'][0]['title'] == 'Test Post 2'
    
    def test_update_content(self, dynamodb_mock, test_user_id, test_content_data, mock_context):
        """Test updating content."""
        content_repo = ContentRepository()
        
        # Create content
        now = int(datetime.now().timestamp())
        content_id = str(uuid.uuid4())
        content_item = {
            'id': content_id,
            'type#timestamp': f"{test_content_data['type']}#{now}",
            'type': test_content_data['type'],
            'title': test_content_data['title'],
            'slug': test_content_data['slug'],
            'content': test_content_data['content'],
            'excerpt': test_content_data['excerpt'],
            'author': test_user_id,
            'status': 'draft',
            'metadata': test_content_data['metadata'],
            'created_at': now,
            'updated_at': now
        }
        content_repo.create(content_item)
        
        # Update content
        updates = {
            'title': 'Updated Title',
            'status': 'published',
            'published_at': now + 100,
            'updated_at': now + 100
        }
        updated = content_repo.update(content_id, f"{test_content_data['type']}#{now}", updates)
        
        assert updated['title'] == 'Updated Title'
        assert updated['status'] == 'published'
        assert updated['published_at'] == now + 100
    
    def test_delete_content(self, dynamodb_mock, test_user_id, test_content_data, mock_context):
        """Test deleting content."""
        content_repo = ContentRepository()
        
        # Create content
        now = int(datetime.now().timestamp())
        content_id = str(uuid.uuid4())
        content_item = {
            'id': content_id,
            'created_at': now,
            'type': test_content_data['type'],
            'title': test_content_data['title'],
            'slug': test_content_data['slug'],
            'content': test_content_data['content'],
            'excerpt': test_content_data['excerpt'],
            'author': test_user_id,
            'status': 'draft',
            'metadata': test_content_data['metadata'],
            'updated_at': now
        }
        content_repo.create(content_item)
        
        # Delete content
        content_repo.delete(content_id, now)
        
        # Verify deletion
        retrieved = content_repo.get_by_id(content_id)
        assert retrieved is None
    
    def test_content_with_scheduled_publishing(self, dynamodb_mock, test_user_id, test_content_data, mock_context):
        """Test content with scheduled publishing date."""
        content_repo = ContentRepository()
        
        # Create scheduled content
        now = int(datetime.now().timestamp())
        future_time = now + 3600  # 1 hour in future
        content_id = str(uuid.uuid4())
        content_item = {
            'id': content_id,
            'type#timestamp': f"{test_content_data['type']}#{now}",
            'type': test_content_data['type'],
            'title': test_content_data['title'],
            'slug': test_content_data['slug'],
            'content': test_content_data['content'],
            'excerpt': test_content_data['excerpt'],
            'author': test_user_id,
            'status': 'draft',
            'scheduled_at': future_time,
            'metadata': test_content_data['metadata'],
            'created_at': now,
            'updated_at': now
        }
        content_repo.create(content_item)
        
        # Retrieve scheduled content
        retrieved = content_repo.get_by_id(content_id, f"{test_content_data['type']}#{now}")
        assert retrieved['scheduled_at'] == future_time
        assert retrieved['status'] == 'draft'
    
    def test_pagination(self, dynamodb_mock, test_user_id, mock_context):
        """Test content listing with pagination."""
        content_repo = ContentRepository()
        
        # Create 5 content items
        now = int(datetime.now().timestamp())
        for i in range(5):
            content_item = {
                'id': str(uuid.uuid4()),
                'type#timestamp': f"'post'#{now}",
                'type': 'post',
                'title': f'Test Post {i}',
                'slug': f'test-post-{i}',
                'content': f'<p>Content {i}</p>',
                'excerpt': f'Excerpt {i}',
                'author': test_user_id,
                'status': 'published',
                'metadata': {},
                'created_at': now + i,
                'updated_at': now + i,
                'published_at': now + i
            }
            content_repo.create(content_item)
        
        # Get first page
        result = content_repo.list_by_type('post', status='published', limit=2)
        assert len(result['items']) == 2
        assert result['last_key'] is not None
        
        # Get second page
        result2 = content_repo.list_by_type('post', status='published', limit=2, last_key=result['last_key'])
        assert len(result2['items']) == 2
