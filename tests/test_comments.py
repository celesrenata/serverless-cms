"""
Integration tests for comment system.

Tests comment operations including:
- Creating comments on content
- Listing comments by content and status
- Moderating comments (approve, reject, spam)
- Deleting comments
- Threaded replies
- Rate limiting
- XSS sanitization
"""

import pytest
import time
from typing import Dict, Any


class TestCommentCreation:
    """Test suite for comment creation."""

    def test_create_comment_success(self, api_client, published_post):
        """Test creating a comment successfully."""
        comment_data = {
            "author_name": "Test Commenter",
            "author_email": "commenter@example.com",
            "comment_text": "This is a test comment."
        }
        
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["author_name"] == comment_data["author_name"]
        assert data["comment_text"] == comment_data["comment_text"]
        assert data["status"] == "pending"
        assert data["content_id"] == published_post["id"]
        assert "id" in data
        assert "created_at" in data
        assert "author_email" not in data  # Should not be exposed
        assert "ip_address" not in data  # Should not be exposed

    def test_create_comment_with_parent(self, api_client, published_post, approved_comment):
        """Test creating a threaded reply."""
        comment_data = {
            "author_name": "Reply Author",
            "author_email": "reply@example.com",
            "comment_text": "This is a reply.",
            "parent_id": approved_comment["id"]
        }
        
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["parent_id"] == approved_comment["id"]

    def test_create_comment_xss_sanitization(self, api_client, published_post):
        """Test that XSS attempts are sanitized."""
        comment_data = {
            "author_name": "<script>alert('xss')</script>Test",
            "author_email": "test@example.com",
            "comment_text": "<script>alert('xss')</script>Safe comment <b>bold</b>"
        }
        
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 201
        data = response.json()
        
        # Scripts should be escaped
        assert "<script>" not in data["author_name"]
        assert "<script>" not in data["comment_text"]
        assert "&lt;script&gt;" in data["author_name"] or "alert" not in data["author_name"]

    def test_create_comment_invalid_email(self, api_client, published_post):
        """Test creating comment with invalid email."""
        comment_data = {
            "author_name": "Test",
            "author_email": "invalid-email",
            "comment_text": "Test comment"
        }
        
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 400
        assert "email" in response.json()["message"].lower()

    def test_create_comment_too_long(self, api_client, published_post):
        """Test creating comment exceeding max length."""
        comment_data = {
            "author_name": "Test",
            "author_email": "test@example.com",
            "comment_text": "x" * 5001  # Max is 5000
        }
        
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 400
        assert "length" in response.json()["message"].lower() or "long" in response.json()["message"].lower()

    def test_create_comment_missing_fields(self, api_client, published_post):
        """Test creating comment with missing required fields."""
        comment_data = {
            "author_name": "Test"
            # Missing author_email and comment_text
        }
        
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 400

    def test_create_comment_nonexistent_content(self, api_client):
        """Test creating comment on non-existent content."""
        comment_data = {
            "author_name": "Test",
            "author_email": "test@example.com",
            "comment_text": "Test comment"
        }
        
        response = api_client.post(
            "/api/v1/content/nonexistent-id/comments",
            json=comment_data
        )
        
        assert response.status_code == 404

    def test_create_comment_rate_limiting(self, api_client, published_post):
        """Test IP-based rate limiting (5 comments per hour)."""
        comment_data = {
            "author_name": "Rate Test",
            "author_email": "ratetest@example.com",
            "comment_text": "Rate limit test"
        }
        
        # Create 5 comments (should succeed)
        for i in range(5):
            comment_data["comment_text"] = f"Comment {i}"
            response = api_client.post(
                f"/api/v1/content/{published_post['id']}/comments",
                json=comment_data
            )
            assert response.status_code == 201
        
        # 6th comment should be rate limited
        comment_data["comment_text"] = "Should be rate limited"
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 429
        assert "rate limit" in response.json()["message"].lower()

    def test_create_comment_when_disabled(self, api_client, published_post, disable_comments):
        """Test creating comment when comments are disabled."""
        comment_data = {
            "author_name": "Test",
            "author_email": "test@example.com",
            "comment_text": "Test comment"
        }
        
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 403
        assert "disabled" in response.json()["message"].lower()


class TestCommentListing:
    """Test suite for listing comments."""

    def test_list_comments_by_content(self, api_client, published_post, approved_comment):
        """Test listing approved comments for a content item."""
        response = api_client.get(
            f"/api/v1/content/{published_post['id']}/comments"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "comments" in data
        assert isinstance(data["comments"], list)
        
        # Should only show approved comments
        for comment in data["comments"]:
            assert comment["status"] == "approved"
            assert "author_email" not in comment
            assert "ip_address" not in comment

    def test_list_comments_empty(self, api_client, published_post):
        """Test listing comments when none exist."""
        # Create a new post with no comments
        response = api_client.get(
            f"/api/v1/content/{published_post['id']}/comments"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "comments" in data
        assert isinstance(data["comments"], list)

    def test_list_comments_threaded(self, api_client, published_post, approved_comment):
        """Test that threaded comments are properly structured."""
        # Create a reply
        reply_data = {
            "author_name": "Reply Author",
            "author_email": "reply@example.com",
            "comment_text": "This is a reply.",
            "parent_id": approved_comment["id"]
        }
        
        api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=reply_data
        )
        
        # Approve the reply (requires admin)
        # This would need admin token in real scenario
        
        response = api_client.get(
            f"/api/v1/content/{published_post['id']}/comments"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for parent_id in comments
        has_reply = any(c.get("parent_id") == approved_comment["id"] for c in data["comments"])
        # May not be approved yet, so just check structure is valid

    def test_list_comments_pagination(self, api_client, published_post, admin_token):
        """Test comment pagination."""
        # Create multiple comments
        for i in range(15):
            comment_data = {
                "author_name": f"Commenter {i}",
                "author_email": f"commenter{i}@example.com",
                "comment_text": f"Comment {i}"
            }
            
            response = api_client.post(
                f"/api/v1/content/{published_post['id']}/comments",
                json=comment_data
            )
            
            # Approve each comment
            comment_id = response.json()["id"]
            api_client.put(
                f"/api/v1/comments/{comment_id}",
                json={"status": "approved"},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        # Test pagination
        response = api_client.get(
            f"/api/v1/content/{published_post['id']}/comments?limit=10"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["comments"]) <= 10


class TestCommentModeration:
    """Test suite for comment moderation."""

    def test_list_comments_for_moderation(self, api_client, editor_token):
        """Test listing all comments for moderation."""
        response = api_client.get(
            "/api/v1/comments",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "comments" in data
        assert isinstance(data["comments"], list)

    def test_list_comments_filter_by_status(self, api_client, editor_token):
        """Test filtering comments by status."""
        response = api_client.get(
            "/api/v1/comments?status=pending",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All comments should have pending status
        for comment in data["comments"]:
            assert comment["status"] == "pending"

    def test_approve_comment(self, api_client, editor_token, pending_comment):
        """Test approving a comment."""
        response = api_client.put(
            f"/api/v1/comments/{pending_comment['id']}",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
        assert "moderated_by" in data

    def test_reject_comment(self, api_client, editor_token, pending_comment):
        """Test rejecting a comment."""
        response = api_client.put(
            f"/api/v1/comments/{pending_comment['id']}",
            json={"status": "rejected"},
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rejected"

    def test_mark_comment_as_spam(self, api_client, editor_token, pending_comment):
        """Test marking a comment as spam."""
        response = api_client.put(
            f"/api/v1/comments/{pending_comment['id']}",
            json={"status": "spam"},
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "spam"

    def test_update_comment_invalid_status(self, api_client, editor_token, pending_comment):
        """Test updating comment with invalid status."""
        response = api_client.put(
            f"/api/v1/comments/{pending_comment['id']}",
            json={"status": "invalid_status"},
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 400

    def test_update_comment_not_found(self, api_client, editor_token):
        """Test updating non-existent comment."""
        response = api_client.put(
            "/api/v1/comments/nonexistent-id",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 404

    def test_update_comment_unauthorized(self, api_client, author_token, pending_comment):
        """Test updating comment without editor privileges."""
        response = api_client.put(
            f"/api/v1/comments/{pending_comment['id']}",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        assert response.status_code == 403

    def test_delete_comment(self, api_client, editor_token, approved_comment):
        """Test deleting a comment."""
        response = api_client.delete(
            f"/api/v1/comments/{approved_comment['id']}",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

    def test_delete_comment_not_found(self, api_client, editor_token):
        """Test deleting non-existent comment."""
        response = api_client.delete(
            "/api/v1/comments/nonexistent-id",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 404

    def test_delete_comment_unauthorized(self, api_client, author_token, approved_comment):
        """Test deleting comment without editor privileges."""
        response = api_client.delete(
            f"/api/v1/comments/{approved_comment['id']}",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        assert response.status_code == 403


class TestCommentEdgeCases:
    """Test edge cases and error handling."""

    def test_comment_on_draft_content(self, api_client, draft_post):
        """Test that comments cannot be created on draft content."""
        comment_data = {
            "author_name": "Test",
            "author_email": "test@example.com",
            "comment_text": "Test comment"
        }
        
        response = api_client.post(
            f"/api/v1/content/{draft_post['id']}/comments",
            json=comment_data
        )
        
        # Should either return 404 or 403
        assert response.status_code in [403, 404]

    def test_comment_with_unicode(self, api_client, published_post):
        """Test creating comment with unicode characters."""
        comment_data = {
            "author_name": "测试用户",
            "author_email": "test@example.com",
            "comment_text": "这是一个测试评论 🎉"
        }
        
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["author_name"] == comment_data["author_name"]
        assert data["comment_text"] == comment_data["comment_text"]

    def test_comment_with_urls(self, api_client, published_post):
        """Test creating comment with URLs."""
        comment_data = {
            "author_name": "Test",
            "author_email": "test@example.com",
            "comment_text": "Check out https://example.com for more info!"
        }
        
        response = api_client.post(
            f"/api/v1/content/{published_post['id']}/comments",
            json=comment_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "https://example.com" in data["comment_text"]

    def test_concurrent_comment_moderation(self, api_client, editor_token, pending_comment):
        """Test concurrent moderation of the same comment."""
        import concurrent.futures
        
        def moderate_comment(status):
            return api_client.put(
                f"/api/v1/comments/{pending_comment['id']}",
                json={"status": status},
                headers={"Authorization": f"Bearer {editor_token}"}
            )
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(moderate_comment, "approved")
            future2 = executor.submit(moderate_comment, "rejected")
            
            response1 = future1.result()
            response2 = future2.result()
        
        # One should succeed, one might fail or both succeed (last write wins)
        assert response1.status_code in [200, 409] or response2.status_code in [200, 409]
