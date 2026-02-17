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



class TestUserManagementWorkflow:
    """Test complete user management workflow (Phase 2)."""
    
    def test_admin_creates_and_manages_users(self, dynamodb_mock, admin_user):
        """Test admin creating users, updating roles, and resetting passwords."""
        user_repo = UserRepository()
        
        # Step 1: Admin creates a new author user
        now = int(datetime.now().timestamp())
        author_id = str(uuid.uuid4())
        author_data = {
            'id': author_id,
            'email': 'author@example.com',
            'name': 'New Author',
            'role': 'author',
            'created_at': now,
            'last_login': 0
        }
        created_author = user_repo.create(author_data)
        assert created_author['role'] == 'author'
        assert created_author['email'] == 'author@example.com'
        
        # Step 2: Author creates some content
        content_repo = ContentRepository()
        post_id = str(uuid.uuid4())
        author_post = {
            'id': post_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Author First Post',
            'slug': 'author-first-post',
            'content': '<p>My first post as an author</p>',
            'excerpt': 'First post',
            'author': author_id,
            'status': 'draft',
            'metadata': {},
            'created_at': now,
            'updated_at': now
        }
        content_repo.create(author_post)
        
        # Step 3: Admin promotes author to editor
        promotion_updates = {
            'role': 'editor',
            'updated_at': now + 100
        }
        promoted_user = user_repo.update(author_id, promotion_updates)
        assert promoted_user['role'] == 'editor'
        
        # Step 4: Admin lists all users
        all_users = user_repo.list_users(limit=10)
        assert len(all_users['items']) >= 2  # At least admin and new user
        
        # Step 5: Admin triggers password reset for user
        # (In real scenario, this would send email via SES)
        reset_time = now + 200
        # Password reset would be handled by Cognito
        
        # Step 6: Admin deletes user (content becomes orphaned)
        user_repo.delete(author_id)
        
        # Verify user is deleted
        deleted_user = user_repo.get_by_id(author_id)
        assert deleted_user is None
        
        # Content still exists but author is orphaned
        orphaned_post = content_repo.get_by_id(post_id, f"post#{now}")
        assert orphaned_post is not None
        assert orphaned_post['author'] == author_id  # Still references deleted user


class TestCommentModerationWorkflow:
    """Test complete comment moderation workflow (Phase 2)."""
    
    def test_public_comment_submission_and_moderation(self, dynamodb_mock, test_user_id):
        """Test public user submitting comment and editor moderating it."""
        from shared.db import CommentRepository
        
        content_repo = ContentRepository()
        comment_repo = CommentRepository()
        
        # Step 1: Create published blog post
        now = int(datetime.now().timestamp())
        post_id = str(uuid.uuid4())
        post_data = {
            'id': post_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Post with Comments',
            'slug': 'post-with-comments',
            'content': '<p>This post allows comments</p>',
            'excerpt': 'Comment-enabled post',
            'author': test_user_id,
            'status': 'published',
            'metadata': {},
            'created_at': now,
            'updated_at': now,
            'published_at': now
        }
        content_repo.create(post_data)
        
        # Step 2: Public user submits comment
        comment_id = str(uuid.uuid4())
        comment_data = {
            'id': comment_id,
            'content_id': post_id,
            'author_name': 'Public Commenter',
            'author_email': 'commenter@example.com',
            'comment_text': 'Great post! Very informative.',
            'status': 'pending',
            'ip_address': '192.168.1.1',
            'created_at': now + 100,
            'updated_at': now + 100
        }
        created_comment = comment_repo.create(comment_data)
        assert created_comment['status'] == 'pending'
        
        # Step 3: Editor reviews pending comments
        pending_comments = comment_repo.list_by_status('pending', limit=10)
        assert len(pending_comments['items']) >= 1
        assert any(c['id'] == comment_id for c in pending_comments['items'])
        
        # Step 4: Editor approves comment
        approval_updates = {
            'status': 'approved',
            'moderated_by': test_user_id,
            'updated_at': now + 200
        }
        approved_comment = comment_repo.update(comment_id, approval_updates, created_at=now + 100)
        assert approved_comment['status'] == 'approved'
        assert approved_comment['moderated_by'] == test_user_id
        
        # Step 5: Public user sees approved comment on post
        approved_comments = comment_repo.list_by_content(post_id, status='approved')
        assert len(approved_comments['items']) == 1
        assert approved_comments['items'][0]['id'] == comment_id
        
        # Step 6: Another user submits spam comment
        spam_id = str(uuid.uuid4())
        spam_data = {
            'id': spam_id,
            'content_id': post_id,
            'author_name': 'Spammer',
            'author_email': 'spam@example.com',
            'comment_text': 'Buy cheap products at http://spam.com',
            'status': 'pending',
            'ip_address': '192.168.1.2',
            'created_at': now + 300,
            'updated_at': now + 300
        }
        comment_repo.create(spam_data)
        
        # Step 7: Editor marks as spam
        spam_updates = {
            'status': 'spam',
            'moderated_by': test_user_id,
            'updated_at': now + 400
        }
        spam_comment = comment_repo.update(spam_id, spam_updates, created_at=now + 300)
        assert spam_comment['status'] == 'spam'
        
        # Step 8: Spam comment not visible to public
        public_comments = comment_repo.list_by_content(post_id, status='approved')
        assert len(public_comments['items']) == 1  # Only approved comment


class TestThreadedCommentsWorkflow:
    """Test threaded comment replies workflow (Phase 2)."""
    
    def test_nested_comment_replies(self, dynamodb_mock, test_user_id):
        """Test creating and displaying threaded comment replies."""
        from shared.db import CommentRepository
        
        content_repo = ContentRepository()
        comment_repo = CommentRepository()
        
        # Step 1: Create published post
        now = int(datetime.now().timestamp())
        post_id = str(uuid.uuid4())
        post_data = {
            'id': post_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Discussion Post',
            'slug': 'discussion-post',
            'content': '<p>Let\'s discuss this topic</p>',
            'excerpt': 'Discussion',
            'author': test_user_id,
            'status': 'published',
            'metadata': {},
            'created_at': now,
            'updated_at': now,
            'published_at': now
        }
        content_repo.create(post_data)
        
        # Step 2: User submits parent comment
        parent_id = str(uuid.uuid4())
        parent_data = {
            'id': parent_id,
            'content_id': post_id,
            'author_name': 'Parent Commenter',
            'author_email': 'parent@example.com',
            'comment_text': 'I have a question about this.',
            'status': 'approved',
            'ip_address': '192.168.1.1',
            'created_at': now + 100,
            'updated_at': now + 100
        }
        comment_repo.create(parent_data)
        
        # Step 3: Another user replies to parent comment
        reply1_id = str(uuid.uuid4())
        reply1_data = {
            'id': reply1_id,
            'content_id': post_id,
            'parent_id': parent_id,
            'author_name': 'Reply Author 1',
            'author_email': 'reply1@example.com',
            'comment_text': 'Here is my answer to your question.',
            'status': 'approved',
            'ip_address': '192.168.1.2',
            'created_at': now + 200,
            'updated_at': now + 200
        }
        comment_repo.create(reply1_data)
        
        # Step 4: Third user also replies to parent
        reply2_id = str(uuid.uuid4())
        reply2_data = {
            'id': reply2_id,
            'content_id': post_id,
            'parent_id': parent_id,
            'author_name': 'Reply Author 2',
            'author_email': 'reply2@example.com',
            'comment_text': 'I have a different perspective.',
            'status': 'approved',
            'ip_address': '192.168.1.3',
            'created_at': now + 300,
            'updated_at': now + 300
        }
        comment_repo.create(reply2_data)
        
        # Step 5: Retrieve all comments for post
        all_comments = comment_repo.list_by_content(post_id, status='approved')
        assert len(all_comments['items']) == 3
        
        # Step 6: Verify threading structure
        parent_comment = next(c for c in all_comments['items'] if c['id'] == parent_id)
        assert 'parent_id' not in parent_comment or parent_comment.get('parent_id') is None
        
        replies = [c for c in all_comments['items'] if c.get('parent_id') == parent_id]
        assert len(replies) == 2


class TestUserRegistrationWorkflow:
    """Test complete user registration workflow (Phase 2)."""
    
    def test_self_registration_and_email_verification(self, dynamodb_mock):
        """Test user self-registration with email verification."""
        user_repo = UserRepository()
        
        # Step 1: User submits registration form
        now = int(datetime.now().timestamp())
        new_user_id = str(uuid.uuid4())
        registration_data = {
            'id': new_user_id,
            'email': 'newuser@example.com',
            'name': 'New User',
            'role': 'viewer',  # Default role for self-registration
            'created_at': now,
            'last_login': 0
        }
        
        # Step 2: System creates user in Cognito (simulated)
        # In real scenario, Cognito would send verification email
        
        # Step 3: User record created in DynamoDB
        registered_user = user_repo.create(registration_data)
        assert registered_user['role'] == 'viewer'
        assert registered_user['email'] == 'newuser@example.com'
        
        # Step 4: User clicks verification link in email
        # (Cognito handles verification)
        
        # Step 5: User logs in for first time
        login_updates = {
            'last_login': now + 3600
        }
        user_repo.update(new_user_id, login_updates)
        
        # Step 6: Verify user can access viewer-level features
        logged_in_user = user_repo.get_by_id(new_user_id)
        assert logged_in_user['last_login'] == now + 3600
        assert logged_in_user['role'] == 'viewer'


class TestSiteSettingsWorkflow:
    """Test site settings and feature gating workflow (Phase 2)."""
    
    def test_admin_configures_site_settings(self, dynamodb_mock):
        """Test admin updating site settings and feature gating."""
        from shared.db import SettingsRepository
        
        settings_repo = SettingsRepository()
        
        # Step 1: Admin enables user registration
        now = int(datetime.now().timestamp())
        settings_repo.update_setting(
            'registration_enabled',
            True,
            updated_by='admin-user-id',
            updated_at=now
        )
        
        # Step 2: Admin enables comments
        settings_repo.update_setting(
            'comments_enabled',
            True,
            updated_by='admin-user-id',
            updated_at=now + 100
        )
        
        # Step 3: Admin enables CAPTCHA for comments
        settings_repo.update_setting(
            'captcha_enabled',
            True,
            updated_by='admin-user-id',
            updated_at=now + 200
        )
        
        # Step 4: Verify settings are retrievable
        registration_setting = settings_repo.get_setting('registration_enabled')
        assert registration_setting['value'] is True
        
        comments_setting = settings_repo.get_setting('comments_enabled')
        assert comments_setting['value'] is True
        
        captcha_setting = settings_repo.get_setting('captcha_enabled')
        assert captcha_setting['value'] is True
        
        # Step 5: Admin disables registration
        settings_repo.update_setting(
            'registration_enabled',
            False,
            updated_by='admin-user-id',
            updated_at=now + 300
        )
        
        # Step 6: Verify registration is now disabled
        updated_setting = settings_repo.get_setting('registration_enabled')
        assert updated_setting['value'] is False


class TestCompleteUserJourney:
    """Test complete user journey from registration to content interaction (Phase 2)."""
    
    def test_full_user_journey_with_comments(self, dynamodb_mock, test_user_id):
        """Test: Register → Verify → Login → Read Post → Comment → Get Moderated."""
        from shared.db import CommentRepository
        
        user_repo = UserRepository()
        content_repo = ContentRepository()
        comment_repo = CommentRepository()
        
        now = int(datetime.now().timestamp())
        
        # Step 1: User registers
        new_user_id = str(uuid.uuid4())
        user_data = {
            'id': new_user_id,
            'email': 'journey@example.com',
            'name': 'Journey User',
            'role': 'viewer',
            'created_at': now,
            'last_login': 0
        }
        user_repo.create(user_data)
        
        # Step 2: User verifies email and logs in
        user_repo.update(new_user_id, {'last_login': now + 100})
        
        # Step 3: User browses published posts
        post_id = str(uuid.uuid4())
        post_data = {
            'id': post_id,
            'type#timestamp': f"post#{now}",
            'type': 'post',
            'title': 'Interesting Article',
            'slug': 'interesting-article',
            'content': '<p>This is an interesting article</p>',
            'excerpt': 'Interesting',
            'author': test_user_id,
            'status': 'published',
            'metadata': {},
            'created_at': now,
            'updated_at': now,
            'published_at': now
        }
        content_repo.create(post_data)
        
        # User retrieves post
        post = content_repo.get_by_slug('interesting-article')
        assert post is not None
        
        # Step 4: User submits comment
        comment_id = str(uuid.uuid4())
        comment_data = {
            'id': comment_id,
            'content_id': post_id,
            'author_name': 'Journey User',
            'author_email': 'journey@example.com',
            'comment_text': 'This article is very helpful!',
            'status': 'pending',
            'ip_address': '192.168.1.1',
            'created_at': now + 200,
            'updated_at': now + 200
        }
        comment_repo.create(comment_data)
        
        # Step 5: Editor reviews and approves comment
        comment_repo.update(comment_id, {
            'status': 'approved',
            'moderated_by': test_user_id,
            'updated_at': now + 300
        }, created_at=now + 200)
        
        # Step 6: User sees their approved comment
        approved_comments = comment_repo.list_by_content(post_id, status='approved')
        assert len(approved_comments['items']) == 1
        assert approved_comments['items'][0]['author_name'] == 'Journey User'
        
        # Step 7: User submits reply to their own comment
        reply_id = str(uuid.uuid4())
        reply_data = {
            'id': reply_id,
            'content_id': post_id,
            'parent_id': comment_id,
            'author_name': 'Journey User',
            'author_email': 'journey@example.com',
            'comment_text': 'Thanks for approving my comment!',
            'status': 'pending',
            'ip_address': '192.168.1.1',
            'created_at': now + 400,
            'updated_at': now + 400
        }
        comment_repo.create(reply_data)
        
        # Step 8: Editor approves reply
        comment_repo.update(reply_id, {
            'status': 'approved',
            'moderated_by': test_user_id,
            'updated_at': now + 500
        }, created_at=now + 400)
        
        # Step 9: Verify threaded comments are visible
        all_comments = comment_repo.list_by_content(post_id, status='approved')
        assert len(all_comments['items']) == 2
        
        reply = next(c for c in all_comments['items'] if c['id'] == reply_id)
        assert reply['parent_id'] == comment_id
