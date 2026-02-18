# Task 7: Comments Backend - CDK Infrastructure

## Summary

Successfully implemented the CDK infrastructure for the comment system API endpoints. All Lambda functions have been created with proper permissions, CloudWatch alarms, and API Gateway routes.

## Changes Made

### 1. Updated Common Environment Variables
- Added `COMMENTS_TABLE` to the common environment variables for all Lambda functions
- This ensures all functions can access the comments table name

### 2. Created Comment Lambda Functions
Added four Lambda functions for comment management:

- **CommentListFunction** (`cms-comment-list-{env}`)
  - Handler: `lambda/comments/list.py`
  - Lists comments by content_id (public) or status (moderation)
  - Supports pagination and threaded comment structure

- **CommentCreateFunction** (`cms-comment-create-{env}`)
  - Handler: `lambda/comments/create.py`
  - Creates new comments with validation and sanitization
  - Implements IP-based rate limiting (5 per hour)

- **CommentUpdateFunction** (`cms-comment-update-{env}`)
  - Handler: `lambda/comments/update.py`
  - Updates comment status (approve, reject, spam)
  - Requires editor+ role

- **CommentDeleteFunction** (`cms-comment-delete-{env}`)
  - Handler: `lambda/comments/delete.py`
  - Deletes comments
  - Requires editor+ role

### 3. Granted DynamoDB Permissions
- Read permissions for list function
- Read/write permissions for create, update, and delete functions
- GSI query permissions for list function (content_id-created_at-index, status-created_at-index)
- Content table read access for create function (to verify content exists)
- Users table read access for update and delete functions (for authorization)

### 4. Added CloudWatch Alarms
Created three alarms for each comment function:
- Error alarm (threshold: 5 errors in 5 minutes)
- Duration alarm (threshold: 80% of timeout)
- Throttle alarm (threshold: 1 throttle)

All alarms send notifications to the SNS alarm topic.

### 5. Created API Gateway Routes

#### Public Endpoints (no authentication required)
- `GET /api/v1/content/{id}/comments` - List approved comments for a content item
- `POST /api/v1/content/{id}/comments` - Create a new comment (subject to rate limiting)

#### Moderation Endpoints (requires editor+ authentication)
- `GET /api/v1/comments` - List all comments with filtering by status
- `PUT /api/v1/comments/{id}` - Update comment status
- `DELETE /api/v1/comments/{id}` - Delete a comment

## API Endpoint Details

### GET /api/v1/content/{id}/comments
- **Access:** Public
- **Purpose:** List approved comments for a specific content item
- **Query Parameters:**
  - `limit`: Number of results (default 50, max 100)
  - `last_key`: Pagination token
- **Response:** Threaded comment structure with replies nested

### POST /api/v1/content/{id}/comments
- **Access:** Public (subject to rate limiting and settings)
- **Purpose:** Submit a new comment
- **Body:**
  - `author_name`: Commenter's name (required)
  - `author_email`: Commenter's email (required)
  - `comment_text`: Comment content (required, 1-5000 chars)
  - `parent_id`: Parent comment ID for replies (optional)
- **Rate Limiting:** 5 comments per hour per IP address
- **Status:** Comments start as "pending" and require moderation

### GET /api/v1/comments
- **Access:** Editor+ (Cognito authentication required)
- **Purpose:** List all comments for moderation
- **Query Parameters:**
  - `status`: Filter by status (pending, approved, rejected, spam)
  - `limit`: Number of results (default 50, max 100)
  - `last_key`: Pagination token

### PUT /api/v1/comments/{id}
- **Access:** Editor+ (Cognito authentication required)
- **Purpose:** Update comment status
- **Body:**
  - `status`: New status (pending, approved, rejected, spam)
- **Tracking:** Records moderator user ID and timestamp

### DELETE /api/v1/comments/{id}
- **Access:** Editor+ (Cognito authentication required)
- **Purpose:** Permanently delete a comment

## Security Features

1. **Input Sanitization:** All user input is HTML-escaped to prevent XSS attacks
2. **Rate Limiting:** IP-based rate limiting prevents spam (5 comments/hour)
3. **Content Verification:** Comments can only be created for existing content
4. **Role-Based Access:** Moderation endpoints require editor or admin role
5. **Data Privacy:** Email addresses and IP addresses are not exposed in public API responses

## Testing

- All existing backend tests pass (64 tests)
- CDK synthesis successful
- Infrastructure validated for dev environment

## Next Steps

Task 7 is complete. The next tasks are:
- Task 8: Comments Frontend - Public Website
- Task 9: Comment Moderation Interface - Admin Panel
- Task 10: AWS WAF and CAPTCHA Integration

## Files Modified

- `lib/serverless-cms-stack.ts` - Added comment Lambda functions, permissions, alarms, and API routes
- `.kiro/specs/serverless-cms/tasks.md` - Marked Task 7 as complete

## Deployment Notes

When deployed, the comment system will:
1. Create 4 new Lambda functions
2. Add 12 new CloudWatch alarms (3 per function)
3. Add 5 new API Gateway routes
4. Grant necessary DynamoDB and IAM permissions

The comments table was already created in Task 6, so no additional DynamoDB resources are needed.
