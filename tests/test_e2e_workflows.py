"""
End-to-end integration tests for complete user workflows.
Tests realistic scenarios combining multiple system components.
"""
import sys
import os
from datetime import datetime
import uuid

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

from shared.db import ContentRepository, MediaRepository, PluginRepository, UserRepository



class TestAuthenticationWorkflow:
    """Test complete authentication and user management workflow."""
    
    def test_user_login_and_profile_update(self, dynamodb_mock, test_user_id):
        """Test user authentication and profile update workflow."""
        user_repo = UserRepository()
        
        # Create user (simulating registration)
        user_data = {
            'id': test_user_id,
            'email': 'test@example.com',
            'name': 'Test User',
            'role': 'editor',
            'created_at': int(datetime.now().timestamp())
        }
        user_repo.create(user_data)
        
        # Retrieve user profile (simulating login)
        user = user_repo.get_by_id(test_user_id)
        assert user is not None
        assert user['email'] == 'test@example.com'
        assert user['role'] == 'editor'
        
        # Update user profile
        updates = {
            'name': 'Updated Name',
            'updated_at': int(datetime.now().timestamp())
        }
        updated_user = user_repo.update(test_user_id, updates)
        assert updated_user['name'] == 'Updated Name'



class TestContentPublishingWorkflow:
    """Test complete content creation and publishing workflow."""
    
    def test_create_draft_and_publish_blog_post(self, dynamodb_mock, test_user_id):
        """Test creating a draft blog post and publishing it."""
        content_repo = ContentRepository()
        
        # Step 1: Create draft blog post
        now = int(datetime.now().timestamp())
        post_id = str(uuid.uuid4())
        draft_post = {
            'id': post_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'My First Blog Post',
            'slug': 'my-first-blog-post',
            'content': '<p>This is my first blog post content.</p>',
            'excerpt': 'Introduction to my blog',
            'author': test_user_id,
            'status': 'draft',
            'metadata': {
                'seo_title': 'My First Blog Post - SEO',
                'seo_description': 'Learn about my first blog post',
                'tags': ['blogging', 'first-post'],
                'categories': ['general']
            },
            'created_at': now,
            'updated_at': now
        }
        created_post = content_repo.create(draft_post)
        assert created_post['status'] == 'draft'
        assert created_post['title'] == 'My First Blog Post'
        
        # Step 2: Edit the draft
        edit_time = now + 300
        updates = {
            'content': '<p>This is my updated blog post content with more details.</p>',
            'excerpt': 'Updated introduction to my blog',
            'updated_at': edit_time
        }
        edited_post = content_repo.update(post_id, f"post#{now}", updates)
        assert edited_post['content'] == updates['content']
        assert edited_post['updated_at'] == edit_time
        
        # Step 3: Publish the post
        publish_time = now + 600
        publish_updates = {
            'status': 'published',
            'published_at': publish_time,
            'updated_at': publish_time
        }
        published_post = content_repo.update(post_id, f"post#{now}", publish_updates)
        assert published_post['status'] == 'published'
        assert published_post['published_at'] == publish_time
        
        # Step 4: Verify post appears in public listing
        public_posts = content_repo.list_by_type('post', status='published', limit=10)
        assert len(public_posts['items']) == 1
        assert public_posts['items'][0]['id'] == post_id
        
        # Step 5: Retrieve by slug (public access)
        retrieved = content_repo.get_by_slug('my-first-blog-post')
        assert retrieved is not None
        assert retrieved['status'] == 'published'



class TestMediaManagementWorkflow:
    """Test complete media upload and management workflow."""
    
    def test_upload_and_use_media_in_content(self, dynamodb_mock, s3_mock, test_user_id):
        """Test uploading media and using it in blog post."""
        media_repo = MediaRepository()
        content_repo = ContentRepository()
        
        # Step 1: Upload an image
        now = int(datetime.now().timestamp())
        media_id = str(uuid.uuid4())
        
        # Simulate image upload to S3
        image_key = f'media/{media_id}/original.jpg'
        s3_mock.put_object(
            Bucket=os.environ['MEDIA_BUCKET'],
            Key=image_key,
            Body=b'fake image data'
        )
        
        # Store media metadata
        media_data = {
            'id': media_id,
            'filename': 'hero-image.jpg',
            'mime_type': 'image/jpeg',
            'size': 2048000,
            'key': image_key,
            'url': f'https://example.com/{image_key}',
            'dimensions': {
                'width': 1920,
                'height': 1080
            },
            'thumbnails': {
                'small': f'media/{media_id}/thumb-small.jpg',
                'medium': f'media/{media_id}/thumb-medium.jpg',
                'large': f'media/{media_id}/thumb-large.jpg'
            },
            'metadata': {
                'alt_text': 'Hero image for blog post',
                'caption': 'Beautiful landscape'
            },
            'uploaded_by': test_user_id,
            'created_at': now
        }
        created_media = media_repo.create(media_data)
        assert created_media['id'] == media_id
        
        # Step 2: Create blog post with the uploaded image
        post_id = str(uuid.uuid4())
        post_with_media = {
            'id': post_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Post with Hero Image',
            'slug': 'post-with-hero-image',
            'content': f'<p>Check out this image:</p><img src="{created_media["url"]}" alt="Hero image" />',
            'excerpt': 'A post with a beautiful image',
            'author': test_user_id,
            'status': 'published',
            'featured_image': media_id,
            'metadata': {
                'tags': ['photography', 'landscape']
            },
            'created_at': now,
            'updated_at': now,
            'published_at': now
        }
        created_post = content_repo.create(post_with_media)
        assert created_post['featured_image'] == media_id
        
        # Step 3: List all media
        all_media = media_repo.list_media(limit=10)
        assert len(all_media['items']) == 1
        assert all_media['items'][0]['id'] == media_id



class TestPluginWorkflow:
    """Test complete plugin installation and configuration workflow."""
    
    def test_install_activate_and_configure_plugin(self, dynamodb_mock, test_user_id):
        """Test installing, activating, and configuring a plugin."""
        plugin_repo = PluginRepository()
        
        # Step 1: Install plugin
        plugin_id = 'seo-optimizer'
        plugin_data = {
            'id': plugin_id,
            'name': 'SEO Optimizer',
            'version': '1.0.0',
            'description': 'Optimizes content for search engines',
            'author': 'CMS Team',
            'active': False,
            'hooks': [
                {
                    'hook_name': 'content_render_post',
                    'function_arn': 'arn:aws:lambda:us-east-1:123456789:function:seo-optimizer',
                    'priority': 10
                }
            ],
            'config_schema': {
                'type': 'object',
                'properties': {
                    'enabled': {'type': 'boolean'},
                    'keywords_limit': {'type': 'number'}
                }
            },
            'installed_at': int(datetime.now().timestamp()),
            'installed_by': test_user_id
        }
        installed_plugin = plugin_repo.create(plugin_data)
        assert installed_plugin['id'] == plugin_id
        assert installed_plugin['active'] is False
        
        # Step 2: Activate plugin
        activation_updates = {
            'active': True,
            'activated_at': int(datetime.now().timestamp())
        }
        activated_plugin = plugin_repo.update(plugin_id, activation_updates)
        assert activated_plugin['active'] is True
        
        # Step 3: Configure plugin settings
        settings_key = f'plugin_settings_{plugin_id}'
        plugin_settings = {
            'enabled': True,
            'keywords_limit': 10
        }
        plugin_repo.update(plugin_id, {'settings': plugin_settings})
        
        # Step 4: Retrieve active plugins
        active_plugins = plugin_repo.list_plugins(active_only=True)
        assert len(active_plugins['items']) == 1
        assert active_plugins['items'][0]['id'] == plugin_id
        
        # Step 5: Deactivate plugin
        deactivation_updates = {
            'active': False,
            'deactivated_at': int(datetime.now().timestamp())
        }
        deactivated_plugin = plugin_repo.update(plugin_id, deactivation_updates)
        assert deactivated_plugin['active'] is False



class TestPublicWebsiteWorkflow:
    """Test public website content display workflow."""
    
    def test_public_blog_listing_and_post_view(self, dynamodb_mock, test_user_id):
        """Test viewing blog listing and individual post on public website."""
        content_repo = ContentRepository()
        
        # Step 1: Create multiple published blog posts
        now = int(datetime.now().timestamp())
        post_ids = []
        
        for i in range(3):
            post_id = str(uuid.uuid4())
            post_ids.append(post_id)
            post_data = {
                'id': post_id,
                'type#timestamp': f"post#{now + i}",
                'type': 'post',
                'title': f'Blog Post {i + 1}',
                'slug': f'blog-post-{i + 1}',
                'content': f'<p>Content for blog post {i + 1}</p>',
                'excerpt': f'Excerpt for post {i + 1}',
                'author': test_user_id,
                'status': 'published',
                'metadata': {
                    'tags': ['blog', f'post-{i + 1}'],
                    'categories': ['technology']
                },
                'created_at': now + i,
                'updated_at': now + i,
                'published_at': now + i
            }
            content_repo.create(post_data)
        
        # Step 2: Retrieve public blog listing (most recent first)
        public_posts = content_repo.list_by_type('post', status='published', limit=10)
        assert len(public_posts['items']) == 3
        assert public_posts['items'][0]['title'] == 'Blog Post 3'  # Most recent
        assert public_posts['items'][2]['title'] == 'Blog Post 1'  # Oldest
        
        # Step 3: View individual blog post by slug
        post = content_repo.get_by_slug('blog-post-2')
        assert post is not None
        assert post['title'] == 'Blog Post 2'
        assert post['status'] == 'published'
        assert 'content' in post
        
        # Step 4: Verify draft posts are not visible
        draft_id = str(uuid.uuid4())
        draft_post = {
            'id': draft_id,
            'type#timestamp': f"post#{now + 10}",
            'type': 'post',
            'title': 'Draft Post',
            'slug': 'draft-post',
            'content': '<p>This is a draft</p>',
            'excerpt': 'Draft excerpt',
            'author': test_user_id,
            'status': 'draft',
            'metadata': {},
            'created_at': now + 10,
            'updated_at': now + 10
        }
        content_repo.create(draft_post)
        
        # Draft should not appear in public listing
        public_posts_after = content_repo.list_by_type('post', status='published', limit=10)
        assert len(public_posts_after['items']) == 3  # Still only 3 published posts



class TestCompleteContentLifecycle:
    """Test complete content lifecycle from creation to archival."""
    
    def test_full_content_lifecycle_with_media_and_scheduling(self, dynamodb_mock, s3_mock, test_user_id):
        """Test complete workflow: create draft, add media, schedule, publish, archive."""
        content_repo = ContentRepository()
        media_repo = MediaRepository()
        
        now = int(datetime.now().timestamp())
        
        # Step 1: Upload featured image
        media_id = str(uuid.uuid4())
        image_key = f'media/{media_id}/featured.jpg'
        s3_mock.put_object(
            Bucket=os.environ['MEDIA_BUCKET'],
            Key=image_key,
            Body=b'featured image data'
        )
        
        media_data = {
            'id': media_id,
            'filename': 'featured.jpg',
            'mime_type': 'image/jpeg',
            'size': 1024000,
            'key': image_key,
            'url': f'https://example.com/{image_key}',
            'dimensions': {'width': 1200, 'height': 630},
            'thumbnails': {},
            'metadata': {'alt_text': 'Featured image'},
            'uploaded_by': test_user_id,
            'created_at': now
        }
        media_repo.create(media_data)
        
        # Step 2: Create draft post with featured image
        post_id = str(uuid.uuid4())
        draft_data = {
            'id': post_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Upcoming Product Launch',
            'slug': 'upcoming-product-launch',
            'content': '<p>We are excited to announce our new product!</p>',
            'excerpt': 'Product launch announcement',
            'author': test_user_id,
            'status': 'draft',
            'featured_image': media_id,
            'metadata': {
                'seo_title': 'New Product Launch',
                'tags': ['product', 'launch', 'announcement']
            },
            'created_at': now,
            'updated_at': now
        }
        content_repo.create(draft_data)
        
        # Step 3: Schedule for future publishing
        scheduled_time = now + 7200  # 2 hours in future
        schedule_updates = {
            'scheduled_at': scheduled_time,
            'updated_at': now + 100
        }
        scheduled_post = content_repo.update(post_id, f"post#{now}", schedule_updates)
        assert scheduled_post['scheduled_at'] == scheduled_time
        assert scheduled_post['status'] == 'draft'
        
        # Step 4: Publish the post (simulating scheduler)
        publish_updates = {
            'status': 'published',
            'published_at': scheduled_time,
            'updated_at': scheduled_time
        }
        published_post = content_repo.update(post_id, f"post#{now}", publish_updates)
        assert published_post['status'] == 'published'
        
        # Step 5: Verify post is visible publicly
        public_post = content_repo.get_by_slug('upcoming-product-launch')
        assert public_post is not None
        assert public_post['status'] == 'published'
        assert public_post['featured_image'] == media_id
        
        # Step 6: Archive the post after campaign ends
        archive_time = now + 14400
        archive_updates = {
            'status': 'archived',
            'updated_at': archive_time
        }
        archived_post = content_repo.update(post_id, f"post#{now}", archive_updates)
        assert archived_post['status'] == 'archived'
        
        # Step 7: Verify archived post not in public listing
        public_posts = content_repo.list_by_type('post', status='published', limit=10)
        assert len(public_posts['items']) == 0
