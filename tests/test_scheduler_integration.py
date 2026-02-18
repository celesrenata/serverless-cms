"""
Integration tests for scheduled publishing functionality.
Tests the scheduler Lambda that publishes content at scheduled times.
"""
import json
import sys
import os
from datetime import datetime
import uuid

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

from shared.db import ContentRepository


class TestScheduledPublishing:
    """Test scheduled content publishing."""
    
    def test_get_scheduled_content(self, dynamodb_mock, test_user_id):
        """Test retrieving content scheduled for publishing."""
        content_repo = ContentRepository()
        
        now = int(datetime.now().timestamp())
        past_time = now - 3600  # 1 hour ago
        future_time = now + 3600  # 1 hour in future
        
        # Create content scheduled in the past (ready to publish)
        past_content_id = str(uuid.uuid4())
        past_content = {
            'id': past_content_id,
            'type#timestamp': f"post#{now - 7200}",
            'type': 'post',
            'title': 'Past Scheduled Post',
            'slug': 'past-scheduled-post',
            'content': '<p>Content scheduled in the past</p>',
            'excerpt': 'Past excerpt',
            'author': test_user_id,
            'status': 'draft',
            'scheduled_at': past_time,
            'metadata': {},
            'created_at': now - 7200,
            'updated_at': now - 7200
        }
        content_repo.create(past_content)
        
        # Create content scheduled in the future (not ready)
        future_content_id = str(uuid.uuid4())
        future_content = {
            'id': future_content_id,
            'type#timestamp': f"post#{now - 3600}",
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Future Scheduled Post',
            'slug': 'future-scheduled-post',
            'content': '<p>Content scheduled in the future</p>',
            'excerpt': 'Future excerpt',
            'author': test_user_id,
            'status': 'draft',
            'scheduled_at': future_time,
            'metadata': {},
            'created_at': now,
            'updated_at': now
        }
        content_repo.create(future_content)
        
        # Get scheduled content ready to publish
        scheduled_items = content_repo.get_scheduled_content(now)
        
        assert len(scheduled_items) == 1
        assert scheduled_items[0]['id'] == past_content_id
        assert scheduled_items[0]['status'] == 'draft'
    
    def test_publish_scheduled_content(self, dynamodb_mock, test_user_id):
        """Test publishing scheduled content."""
        content_repo = ContentRepository()
        
        now = int(datetime.now().timestamp())
        past_time = now - 3600
        
        # Create scheduled content
        content_id = str(uuid.uuid4())
        content_item = {
            'id': content_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Scheduled Post',
            'slug': 'scheduled-post',
            'content': '<p>Scheduled content</p>',
            'excerpt': 'Scheduled excerpt',
            'author': test_user_id,
            'status': 'draft',
            'scheduled_at': past_time,
            'metadata': {},
            'created_at': now - 7200,
            'updated_at': now - 7200
        }
        content_repo.create(content_item)
        
        # Publish the content
        updates = {
            'status': 'published',
            'published_at': now,
            'updated_at': now
        }
        updated = content_repo.update(content_id, {now}, updates)
        
        assert updated['status'] == 'published'
        assert updated['published_at'] == now
        assert 'scheduled_at' in updated
    
    def test_multiple_scheduled_items(self, dynamodb_mock, test_user_id):
        """Test handling multiple scheduled items."""
        content_repo = ContentRepository()
        
        now = int(datetime.now().timestamp())
        
        # Create multiple scheduled items
        scheduled_ids = []
        for i in range(3):
            content_id = str(uuid.uuid4())
            scheduled_ids.append(content_id)
            content_item = {
                'id': content_id,
                'type#timestamp': f"post#{now}",
                'type': 'post',
                'title': f'Scheduled Post {i}',
                'slug': f'scheduled-post-{i}',
                'content': f'<p>Scheduled content {i}</p>',
                'excerpt': f'Excerpt {i}',
                'author': test_user_id,
                'status': 'draft',
                'scheduled_at': now - (i + 1) * 100,  # All in the past
                'metadata': {},
                'created_at': now - 7200,
                'updated_at': now - 7200
            }
            content_repo.create(content_item)
        
        # Get all scheduled content
        scheduled_items = content_repo.get_scheduled_content(now)
        
        assert len(scheduled_items) == 3
        
        # Publish all scheduled items
        published_count = 0
        for item in scheduled_items:
            updates = {
                'status': 'published',
                'published_at': now,
                'updated_at': now
            }
            content_repo.update(item['id'], item['created_at'], updates)
            published_count += 1
        
        assert published_count == 3
        
        # Verify no more scheduled items
        remaining = content_repo.get_scheduled_content(now)
        assert len(remaining) == 0
    
    def test_scheduled_content_not_visible_before_time(self, dynamodb_mock, test_user_id):
        """Test that scheduled content is not visible before scheduled time."""
        content_repo = ContentRepository()
        
        now = int(datetime.now().timestamp())
        future_time = now + 3600
        
        # Create scheduled content
        content_id = str(uuid.uuid4())
        content_item = {
            'id': content_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Future Post',
            'slug': 'future-post',
            'content': '<p>Future content</p>',
            'excerpt': 'Future excerpt',
            'author': test_user_id,
            'status': 'draft',
            'scheduled_at': future_time,
            'metadata': {},
            'created_at': now,
            'updated_at': now
        }
        content_repo.create(content_item)
        
        # Try to get published content
        result = content_repo.list_by_type('post', status='published', limit=10)
        
        # Should not include the scheduled draft
        assert len(result['items']) == 0
    
    def test_scheduled_content_becomes_visible_after_publishing(self, dynamodb_mock, test_user_id):
        """Test that scheduled content becomes visible after publishing."""
        content_repo = ContentRepository()
        
        now = int(datetime.now().timestamp())
        past_time = now - 3600
        
        # Create and publish scheduled content
        content_id = str(uuid.uuid4())
        content_item = {
            'id': content_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Published Scheduled Post',
            'slug': 'published-scheduled-post',
            'content': '<p>Published content</p>',
            'excerpt': 'Published excerpt',
            'author': test_user_id,
            'status': 'draft',
            'scheduled_at': past_time,
            'metadata': {},
            'created_at': now - 7200,
            'updated_at': now - 7200
        }
        content_repo.create(content_item)
        
        # Publish it
        updates = {
            'status': 'published',
            'published_at': now,
            'updated_at': now
        }
        content_repo.update(content_id, {now}, updates)
        
        # Now it should be visible in published content
        result = content_repo.list_by_type('post', status='published', limit=10)
        
        assert len(result['items']) == 1
        assert result['items'][0]['id'] == content_id
        assert result['items'][0]['status'] == 'published'
    
    def test_scheduler_preserves_original_created_at(self, dynamodb_mock, test_user_id):
        """Test that scheduler preserves original created_at timestamp."""
        content_repo = ContentRepository()
        
        now = int(datetime.now().timestamp())
        created_time = now - 86400  # Created 1 day ago
        scheduled_time = now - 3600  # Scheduled 1 hour ago
        
        # Create scheduled content
        content_id = str(uuid.uuid4())
        content_item = {
            'id': content_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Scheduled Post',
            'slug': 'scheduled-post-preserve',
            'content': '<p>Content</p>',
            'excerpt': 'Excerpt',
            'author': test_user_id,
            'status': 'draft',
            'scheduled_at': scheduled_time,
            'metadata': {},
            'created_at': created_time,
            'updated_at': created_time
        }
        content_repo.create(content_item)
        
        # Publish it
        updates = {
            'status': 'published',
            'published_at': now,
            'updated_at': now
        }
        updated = content_repo.update(content_id, {now}, updates)
        
        # Verify created_at is preserved
        assert updated['created_at'] == created_time
        assert updated['published_at'] == now
        assert updated['updated_at'] == now
