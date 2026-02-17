# Serverless CMS API Documentation

## Overview

The Serverless CMS API is a RESTful API built on AWS API Gateway and Lambda. All endpoints return JSON responses and use standard HTTP status codes.

**Base URL:** `https://api.your-domain.com/api/v1`

**Authentication:** Most endpoints require a JWT token obtained from AWS Cognito. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Table of Contents

- [Authentication](#authentication)
- [Content Endpoints](#content-endpoints)
- [Media Endpoints](#media-endpoints)
- [User Endpoints](#user-endpoints)
- [User Management Endpoints](#user-management-endpoints)
- [Comment Endpoints](#comment-endpoints)
- [Registration Endpoints](#registration-endpoints)
- [Settings Endpoints](#settings-endpoints)
- [Plugin Endpoints](#plugin-endpoints)
- [Error Responses](#error-responses)

---

## Authentication

### Login

Authentication is handled by AWS Cognito. Use the Cognito SDK or API to obtain JWT tokens.

**Token Expiration:** 24 hours

**Roles:**
- `admin` - Full system access
- `editor` - Content and media management
- `author` - Create and edit own content
- `viewer` - Read-only access

---

## Content Endpoints

### Create Content

Create a new content item (post, page, gallery, or project).

**Endpoint:** `POST /content`

**Authentication:** Required (author, editor, or admin)

**Request Body:**

```json
{
  "title": "My First Blog Post",
  "slug": "my-first-blog-post",
  "content": "<p>This is the content of my post.</p>",
  "excerpt": "A brief summary of the post",
  "type": "post",
  "status": "draft",
  "featured_image": "https://s3.amazonaws.com/bucket/image.jpg",
  "metadata": {
    "seo_title": "My First Blog Post - SEO Title",
    "seo_description": "SEO description for search engines",
    "tags": ["technology", "tutorial"],
    "categories": ["blog"],
    "custom_fields": {
      "reading_time": "5 min"
    }
  },
  "scheduled_at": 1735689600
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Content title |
| slug | string | No | URL-friendly identifier (auto-generated from title if omitted) |
| content | string | Yes | HTML or Markdown content |
| excerpt | string | No | Brief summary |
| type | string | No | Content type: "post", "page", "gallery", "project" (default: "post") |
| status | string | No | "draft", "published", "archived" (default: "draft") |
| featured_image | string | No | S3 URL of featured image |
| metadata | object | No | Additional metadata |
| scheduled_at | number | No | Unix timestamp for scheduled publishing |

**Response:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "post",
  "title": "My First Blog Post",
  "slug": "my-first-blog-post",
  "content": "<p>This is the content of my post.</p>",
  "excerpt": "A brief summary of the post",
  "author": "user-123",
  "status": "draft",
  "featured_image": "https://s3.amazonaws.com/bucket/image.jpg",
  "metadata": {
    "seo_title": "My First Blog Post - SEO Title",
    "seo_description": "SEO description for search engines",
    "tags": ["technology", "tutorial"],
    "categories": ["blog"],
    "custom_fields": {
      "reading_time": "5 min"
    }
  },
  "created_at": 1735689600,
  "updated_at": 1735689600
}
```

**Error Responses:**

- `400 Bad Request` - Missing required fields or invalid data
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `409 Conflict` - Slug already exists

---

### Get Content by ID

Retrieve a specific content item by its ID.

**Endpoint:** `GET /content/{id}`

**Authentication:** Optional (required for draft content)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Content UUID |

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "post",
  "title": "My First Blog Post",
  "slug": "my-first-blog-post",
  "content": "<p>This is the content of my post.</p>",
  "excerpt": "A brief summary of the post",
  "author": "user-123",
  "status": "published",
  "featured_image": "https://s3.amazonaws.com/bucket/image.jpg",
  "metadata": {
    "seo_title": "My First Blog Post - SEO Title",
    "seo_description": "SEO description for search engines",
    "tags": ["technology", "tutorial"],
    "categories": ["blog"]
  },
  "created_at": 1735689600,
  "updated_at": 1735689600,
  "published_at": 1735689600
}
```

**Error Responses:**

- `403 Forbidden` - Attempting to access draft content without authentication
- `404 Not Found` - Content not found

---

### Get Content by Slug

Retrieve a specific content item by its URL slug.

**Endpoint:** `GET /content/slug/{slug}`

**Authentication:** Optional (required for draft content)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| slug | string | URL-friendly content identifier |

**Response:** `200 OK`

Same response format as "Get Content by ID"

**Error Responses:**

- `403 Forbidden` - Attempting to access draft content without authentication
- `404 Not Found` - Content not found

---

### List Content

Retrieve a paginated list of content items with optional filters.

**Endpoint:** `GET /content`

**Authentication:** Optional (authenticated users can see draft content)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | "post" | Filter by content type |
| status | string | "published" | Filter by status |
| limit | number | 20 | Number of items per page (max: 100) |
| last_key | string | - | Pagination token from previous response |

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "post",
      "title": "My First Blog Post",
      "slug": "my-first-blog-post",
      "excerpt": "A brief summary of the post",
      "author": "user-123",
      "status": "published",
      "featured_image": "https://s3.amazonaws.com/bucket/image.jpg",
      "created_at": 1735689600,
      "updated_at": 1735689600,
      "published_at": 1735689600
    }
  ],
  "last_key": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type#timestamp": "post#1735689600"
  }
}
```

**Pagination:**

To retrieve the next page, include the `last_key` from the response as a query parameter:

```
GET /content?type=post&limit=20&last_key={"id":"550e8400...","type#timestamp":"post#1735689600"}
```

---

### Update Content

Update an existing content item.

**Endpoint:** `PUT /content/{id}`

**Authentication:** Required (author of content, editor, or admin)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Content UUID |

**Request Body:**

```json
{
  "title": "Updated Title",
  "content": "<p>Updated content</p>",
  "status": "published",
  "metadata": {
    "tags": ["updated", "technology"]
  }
}
```

All fields are optional. Only provided fields will be updated.

**Response:** `200 OK`

Returns the updated content item (same format as "Get Content by ID").

**Error Responses:**

- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Content not found
- `409 Conflict` - Slug conflict if updating slug

---

### Delete Content

Delete a content item.

**Endpoint:** `DELETE /content/{id}`

**Authentication:** Required (editor or admin)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Content UUID |

**Response:** `200 OK`

```json
{
  "message": "Content deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Content not found

---

## Media Endpoints

### Upload Media

Upload a media file (image, video, or document).

**Endpoint:** `POST /media/upload`

**Authentication:** Required (editor or admin)

**Request:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Media file to upload |
| alt_text | string | No | Alternative text for images |
| caption | string | No | Media caption |

**Example Request:**

```bash
curl -X POST https://api.your-domain.com/api/v1/media/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg" \
  -F "alt_text=A beautiful sunset" \
  -F "caption=Sunset at the beach"
```

**Response:** `201 Created`

```json
{
  "id": "media-123",
  "filename": "image.jpg",
  "s3_key": "uploads/2024/01/image-abc123.jpg",
  "s3_url": "https://s3.amazonaws.com/bucket/uploads/2024/01/image-abc123.jpg",
  "mime_type": "image/jpeg",
  "size": 1048576,
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "thumbnails": {
    "small": "https://s3.amazonaws.com/bucket/thumbnails/small/image-abc123.jpg",
    "medium": "https://s3.amazonaws.com/bucket/thumbnails/medium/image-abc123.jpg",
    "large": "https://s3.amazonaws.com/bucket/thumbnails/large/image-abc123.jpg"
  },
  "metadata": {
    "alt_text": "A beautiful sunset",
    "caption": "Sunset at the beach"
  },
  "uploaded_by": "user-123",
  "uploaded_at": 1735689600
}
```

**Thumbnail Sizes:**
- Small: 300x300px (max)
- Medium: 600x600px (max)
- Large: 1200x1200px (max)

**Error Responses:**

- `400 Bad Request` - Invalid file or missing file
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `413 Payload Too Large` - File exceeds size limit

---

### Get Media

Retrieve media metadata by ID.

**Endpoint:** `GET /media/{id}`

**Authentication:** Optional

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Media UUID |

**Response:** `200 OK`

Same response format as "Upload Media"

**Error Responses:**

- `404 Not Found` - Media not found

---

### List Media

Retrieve a paginated list of media items.

**Endpoint:** `GET /media`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Number of items per page (max: 100) |
| last_key | string | - | Pagination token from previous response |

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "media-123",
      "filename": "image.jpg",
      "s3_url": "https://s3.amazonaws.com/bucket/uploads/2024/01/image-abc123.jpg",
      "mime_type": "image/jpeg",
      "size": 1048576,
      "thumbnails": {
        "small": "https://s3.amazonaws.com/bucket/thumbnails/small/image-abc123.jpg",
        "medium": "https://s3.amazonaws.com/bucket/thumbnails/medium/image-abc123.jpg",
        "large": "https://s3.amazonaws.com/bucket/thumbnails/large/image-abc123.jpg"
      },
      "uploaded_at": 1735689600
    }
  ],
  "last_key": "media-123"
}
```

---

### Delete Media

Delete a media file and its thumbnails.

**Endpoint:** `DELETE /media/{id}`

**Authentication:** Required (editor or admin)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Media UUID |

**Response:** `200 OK`

```json
{
  "message": "Media deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Media not found

---

## User Endpoints

### Get Current User

Retrieve the authenticated user's profile.

**Endpoint:** `GET /users/me`

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "username": "johndoe",
  "display_name": "John Doe",
  "role": "author",
  "avatar_url": "https://s3.amazonaws.com/bucket/avatars/user-123.jpg",
  "bio": "Content creator and developer",
  "created_at": 1735689600,
  "last_login": 1735689600
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token

---

### Update Current User

Update the authenticated user's profile.

**Endpoint:** `PUT /users/me`

**Authentication:** Required

**Request Body:**

```json
{
  "display_name": "John Smith",
  "bio": "Updated bio",
  "avatar_url": "https://s3.amazonaws.com/bucket/avatars/new-avatar.jpg"
}
```

All fields are optional.

**Response:** `200 OK`

Returns the updated user profile (same format as "Get Current User").

**Error Responses:**

- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Missing or invalid authentication token

---

### List Users

Retrieve a list of all users (admin only).

**Endpoint:** `GET /users`

**Authentication:** Required (admin only)

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "user-123",
      "email": "user@example.com",
      "username": "johndoe",
      "display_name": "John Doe",
      "role": "author",
      "created_at": 1735689600,
      "last_login": 1735689600
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)

---

## User Management Endpoints

### Create User

Create a new user account (admin only).

**Endpoint:** `POST /users`

**Authentication:** Required (admin only)

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "role": "author",
  "temporary_password": "TempPass123!"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address (must be valid format) |
| name | string | Yes | User's display name |
| role | string | No | User role: "admin", "editor", "author", "viewer" (default: "viewer") |
| temporary_password | string | No | Temporary password (auto-generated if omitted) |

**Response:** `201 Created`

```json
{
  "id": "user-456",
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "role": "author",
  "created_at": 1735689600,
  "message": "User created successfully. Welcome email sent."
}
```

**Email Notification:**

A welcome email is automatically sent to the new user with:
- Temporary password (if auto-generated)
- Login instructions
- Link to admin panel

**Error Responses:**

- `400 Bad Request` - Invalid email format or missing required fields
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `409 Conflict` - User with email already exists

---

### Update User

Update an existing user's details (admin only).

**Endpoint:** `PUT /users/{id}`

**Authentication:** Required (admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User UUID |

**Request Body:**

```json
{
  "name": "Jane Doe",
  "role": "editor",
  "email": "updated@example.com"
}
```

All fields are optional. Only provided fields will be updated.

**Request Fields:**

| Field | Type | Description |
|-------|------|-------------|
| name | string | User's display name |
| role | string | User role: "admin", "editor", "author", "viewer" |
| email | string | User's email address |

**Response:** `200 OK`

```json
{
  "id": "user-456",
  "email": "updated@example.com",
  "name": "Jane Doe",
  "role": "editor",
  "created_at": 1735689600,
  "updated_at": 1735693200,
  "last_login": 1735689600
}
```

**Error Responses:**

- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `404 Not Found` - User not found
- `409 Conflict` - Email already in use

---

### Delete User

Delete a user account (admin only).

**Endpoint:** `DELETE /users/{id}`

**Authentication:** Required (admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User UUID |

**Response:** `200 OK`

```json
{
  "message": "User deleted successfully"
}
```

**Important Notes:**

- Users cannot delete themselves
- User's content is marked as orphaned (author field remains but user is deleted)
- This action is irreversible

**Error Responses:**

- `400 Bad Request` - Attempting to delete self
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `404 Not Found` - User not found

---

### Reset User Password

Trigger a password reset for a user (admin only).

**Endpoint:** `POST /users/{id}/reset-password`

**Authentication:** Required (admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User UUID |

**Response:** `200 OK`

```json
{
  "message": "Password reset email sent successfully"
}
```

**Email Notification:**

A password reset email is sent to the user with:
- Temporary verification code
- Instructions to reset password
- Link to password reset page

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `404 Not Found` - User not found
- `500 Internal Server Error` - Failed to send email

---

## Comment Endpoints

### List Comments by Content

Retrieve comments for a specific content item (public endpoint).

**Endpoint:** `GET /content/{id}/comments`

**Authentication:** Not required

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Content UUID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Number of comments to return (max: 100) |
| last_key | string | - | Pagination token from previous response |

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "comment-123",
      "content_id": "550e8400-e29b-41d4-a716-446655440000",
      "author_name": "John Commenter",
      "comment_text": "Great article! Very informative.",
      "parent_id": null,
      "status": "approved",
      "created_at": 1735689600,
      "replies": [
        {
          "id": "comment-124",
          "content_id": "550e8400-e29b-41d4-a716-446655440000",
          "author_name": "Jane Reply",
          "comment_text": "I agree!",
          "parent_id": "comment-123",
          "status": "approved",
          "created_at": 1735689700
        }
      ]
    }
  ],
  "last_key": "comment-123"
}
```

**Notes:**

- Only approved comments are returned
- Comments are sorted by creation date (newest first)
- Threaded replies are nested under parent comments
- Author email and IP address are never exposed

---

### Create Comment

Submit a new comment on a content item (public endpoint if comments enabled).

**Endpoint:** `POST /content/{id}/comments`

**Authentication:** Not required

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Content UUID |

**Request Body:**

```json
{
  "author_name": "John Commenter",
  "author_email": "john@example.com",
  "comment_text": "Great article! Very informative.",
  "parent_id": null
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| author_name | string | Yes | Commenter's name (max 100 chars) |
| author_email | string | Yes | Commenter's email (valid format required) |
| comment_text | string | Yes | Comment content (max 5000 chars) |
| parent_id | string | No | Parent comment ID for threaded replies |

**Response:** `201 Created`

```json
{
  "id": "comment-125",
  "content_id": "550e8400-e29b-41d4-a716-446655440000",
  "author_name": "John Commenter",
  "comment_text": "Great article! Very informative.",
  "parent_id": null,
  "status": "pending",
  "created_at": 1735689800,
  "message": "Comment submitted successfully. It will appear after moderation."
}
```

**Rate Limiting:**

- 5 comments per hour per IP address
- Returns `429 Too Many Requests` if limit exceeded

**CAPTCHA Protection:**

If CAPTCHA is enabled in site settings, this endpoint requires AWS WAF CAPTCHA token validation.

**Content Sanitization:**

All comment text is automatically sanitized to prevent XSS attacks:
- HTML tags are escaped
- Scripts are removed
- URLs are preserved but sanitized

**Error Responses:**

- `400 Bad Request` - Invalid data or missing required fields
- `403 Forbidden` - Comments disabled in site settings
- `404 Not Found` - Content not found
- `429 Too Many Requests` - Rate limit exceeded

---

### List All Comments (Moderation)

Retrieve all comments for moderation (admin/editor only).

**Endpoint:** `GET /comments`

**Authentication:** Required (editor or admin)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | "pending" | Filter by status: "pending", "approved", "rejected", "spam" |
| limit | number | 50 | Number of comments to return (max: 100) |
| last_key | string | - | Pagination token from previous response |

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "comment-126",
      "content_id": "550e8400-e29b-41d4-a716-446655440000",
      "author_name": "Suspicious User",
      "author_email": "spam@example.com",
      "comment_text": "Check out my website!",
      "status": "pending",
      "created_at": 1735689900
    }
  ],
  "last_key": "comment-126"
}
```

**Notes:**

- Returns comments of all statuses based on filter
- Includes author email for moderation purposes
- Sorted by creation date (newest first)

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not editor or admin)

---

### Update Comment Status

Update a comment's moderation status (admin/editor only).

**Endpoint:** `PUT /comments/{id}`

**Authentication:** Required (editor or admin)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Comment UUID |

**Request Body:**

```json
{
  "status": "approved"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | New status: "approved", "rejected", "spam" |

**Response:** `200 OK`

```json
{
  "id": "comment-126",
  "content_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "approved",
  "moderated_by": "user-123",
  "updated_at": 1735690000,
  "message": "Comment status updated successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid status value
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not editor or admin)
- `404 Not Found` - Comment not found

---

### Delete Comment

Delete a comment permanently (admin/editor only).

**Endpoint:** `DELETE /comments/{id}`

**Authentication:** Required (editor or admin)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Comment UUID |

**Response:** `200 OK`

```json
{
  "message": "Comment deleted successfully"
}
```

**Notes:**

- This action is irreversible
- Deleting a parent comment does not delete replies

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not editor or admin)
- `404 Not Found` - Comment not found

---

## Registration Endpoints

### Register New User

Create a new user account via self-registration (public endpoint if enabled).

**Endpoint:** `POST /auth/register`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "name": "New User"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Password (min 8 chars, must include uppercase, lowercase, number, special char) |
| name | string | Yes | User's display name |

**Password Requirements:**

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response:** `201 Created`

```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "email": "newuser@example.com"
}
```

**Email Verification:**

A verification email is sent with:
- Verification code
- Link to verify email
- Instructions

**Default Role:**

All self-registered users are assigned the "viewer" role by default. Admins can upgrade roles later.

**Error Responses:**

- `400 Bad Request` - Invalid email, weak password, or missing fields
- `403 Forbidden` - Registration disabled in site settings
- `409 Conflict` - Email already registered
- `500 Internal Server Error` - Failed to create account or send email

---

### Verify Email

Verify a user's email address after registration.

**Endpoint:** `POST /auth/verify-email`

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "code": "123456"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| code | string | Yes | 6-digit verification code from email |

**Response:** `200 OK`

```json
{
  "message": "Email verified successfully. You can now log in."
}
```

**Notes:**

- Verification codes expire after 24 hours
- Users cannot log in until email is verified
- After verification, users can log in with their credentials

**Error Responses:**

- `400 Bad Request` - Invalid or expired verification code
- `404 Not Found` - User not found
- `500 Internal Server Error` - Verification failed

---

## Settings Endpoints

### Get Settings

Retrieve all site settings.

**Endpoint:** `GET /settings`

**Authentication:** Optional (some settings may be public)

**Response:** `200 OK`

```json
{
  "site_title": "My Awesome Blog",
  "site_description": "A blog about technology and life",
  "theme": "default",
  "registration_enabled": false,
  "comments_enabled": true,
  "captcha_enabled": false,
  "updated_at": 1735689600,
  "updated_by": "user-123"
}
```

**Settings Fields:**

| Field | Type | Description |
|-------|------|-------------|
| site_title | string | Website title displayed in header and meta tags |
| site_description | string | Website description for SEO |
| theme | string | Active theme identifier |
| registration_enabled | boolean | Allow new user self-registration (default: false) |
| comments_enabled | boolean | Allow public comments on content (default: false) |
| captcha_enabled | boolean | Require CAPTCHA for comment submission (default: false) |

---

### Update Settings

Update site settings (admin only).

**Endpoint:** `PUT /settings`

**Authentication:** Required (admin only)

**Request Body:**

```json
{
  "site_title": "Updated Blog Title",
  "site_description": "Updated description",
  "theme": "dark",
  "registration_enabled": true,
  "comments_enabled": true,
  "captcha_enabled": true
}
```

All fields are optional. Only provided fields will be updated.

**Response:** `200 OK`

Returns the updated settings (same format as "Get Settings").

**Important Notes:**

- `registration_enabled`: Controls whether `/auth/register` endpoint accepts new registrations
- `comments_enabled`: Controls whether `/content/{id}/comments` POST endpoint accepts new comments
- `captcha_enabled`: Controls whether AWS WAF CAPTCHA challenge is required for comment submission

**Error Responses:**

- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)

---

## Plugin Endpoints

### Install Plugin

Install a new plugin.

**Endpoint:** `POST /plugins/install`

**Authentication:** Required (admin only)

**Request Body:**

```json
{
  "id": "syntax-highlighter",
  "name": "Syntax Highlighter",
  "version": "1.0.0",
  "description": "Adds syntax highlighting to code blocks",
  "author": "John Doe",
  "hooks": [
    {
      "hook_name": "content_render_post",
      "function_arn": "arn:aws:lambda:us-east-1:123456789:function:syntax-highlighter",
      "priority": 10
    }
  ],
  "config_schema": {
    "type": "object",
    "properties": {
      "theme": {
        "type": "string",
        "enum": ["monokai", "github", "dracula"],
        "default": "monokai"
      }
    }
  }
}
```

**Response:** `201 Created`

```json
{
  "id": "syntax-highlighter",
  "name": "Syntax Highlighter",
  "version": "1.0.0",
  "description": "Adds syntax highlighting to code blocks",
  "author": "John Doe",
  "active": false,
  "hooks": [
    {
      "hook_name": "content_render_post",
      "function_arn": "arn:aws:lambda:us-east-1:123456789:function:syntax-highlighter",
      "priority": 10
    }
  ],
  "config_schema": {
    "type": "object",
    "properties": {
      "theme": {
        "type": "string",
        "enum": ["monokai", "github", "dracula"],
        "default": "monokai"
      }
    }
  },
  "installed_at": 1735689600,
  "updated_at": 1735689600
}
```

**Error Responses:**

- `400 Bad Request` - Invalid plugin structure
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `409 Conflict` - Plugin already installed

---

### Activate Plugin

Activate an installed plugin.

**Endpoint:** `POST /plugins/{id}/activate`

**Authentication:** Required (admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Plugin identifier |

**Response:** `200 OK`

```json
{
  "message": "Plugin activated successfully",
  "plugin": {
    "id": "syntax-highlighter",
    "active": true
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `404 Not Found` - Plugin not found

---

### Deactivate Plugin

Deactivate an active plugin.

**Endpoint:** `POST /plugins/{id}/deactivate`

**Authentication:** Required (admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Plugin identifier |

**Response:** `200 OK`

```json
{
  "message": "Plugin deactivated successfully",
  "plugin": {
    "id": "syntax-highlighter",
    "active": false
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `404 Not Found` - Plugin not found

---

### List Plugins

Retrieve a list of all installed plugins.

**Endpoint:** `GET /plugins`

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "syntax-highlighter",
      "name": "Syntax Highlighter",
      "version": "1.0.0",
      "description": "Adds syntax highlighting to code blocks",
      "author": "John Doe",
      "active": true,
      "installed_at": 1735689600
    }
  ]
}
```

---

### Get Plugin Settings

Retrieve settings for a specific plugin.

**Endpoint:** `GET /plugins/{id}/settings`

**Authentication:** Required (admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Plugin identifier |

**Response:** `200 OK`

```json
{
  "theme": "monokai",
  "line_numbers": true
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `404 Not Found` - Plugin not found

---

### Update Plugin Settings

Update settings for a specific plugin.

**Endpoint:** `PUT /plugins/{id}/settings`

**Authentication:** Required (admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Plugin identifier |

**Request Body:**

```json
{
  "theme": "dracula",
  "line_numbers": false
}
```

**Response:** `200 OK`

Returns the updated settings (same format as "Get Plugin Settings").

**Error Responses:**

- `400 Bad Request` - Invalid settings (doesn't match schema)
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions (not admin)
- `404 Not Found` - Plugin not found

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or missing required fields |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict (e.g., duplicate slug) |
| 413 | Payload Too Large - Request body or file too large |
| 500 | Internal Server Error - Server error |

### Error Codes

| Code | Description |
|------|-------------|
| UNAUTHORIZED | Missing or invalid authentication |
| INVALID_TOKEN | JWT token is invalid or expired |
| FORBIDDEN | User lacks required permissions |
| INVALID_INPUT | Request data is invalid |
| MISSING_REQUIRED_FIELD | Required field is missing |
| INVALID_SLUG | Slug format is invalid |
| INVALID_EMAIL | Email format is invalid |
| WEAK_PASSWORD | Password does not meet requirements |
| NOT_FOUND | Resource not found |
| CONTENT_NOT_FOUND | Content item not found |
| MEDIA_NOT_FOUND | Media file not found |
| USER_NOT_FOUND | User not found |
| COMMENT_NOT_FOUND | Comment not found |
| DUPLICATE_SLUG | Slug already exists |
| DUPLICATE_EMAIL | Email already registered |
| RESOURCE_CONFLICT | Resource conflict |
| RATE_LIMIT_EXCEEDED | Too many requests from IP address |
| REGISTRATION_DISABLED | User registration is disabled |
| COMMENTS_DISABLED | Comments are disabled |
| CAPTCHA_REQUIRED | CAPTCHA validation required |
| INVALID_VERIFICATION_CODE | Email verification code is invalid or expired |
| CANNOT_DELETE_SELF | Users cannot delete their own account |
| INTERNAL_ERROR | Internal server error |
| DATABASE_ERROR | Database operation failed |
| S3_ERROR | S3 operation failed |
| EMAIL_ERROR | Failed to send email |
| PLUGIN_ERROR | Plugin execution failed |

### Example Error Response

```json
{
  "error": "Slug already exists",
  "code": "DUPLICATE_SLUG",
  "details": {
    "slug": "my-first-blog-post",
    "existing_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authenticated requests:** 1000 requests per hour per user
- **Unauthenticated requests:** 100 requests per hour per IP address
- **Comment submissions:** 5 comments per hour per IP address

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1735693200
```

When rate limit is exceeded, the API returns `429 Too Many Requests`.

**Comment Rate Limiting:**

Comment submissions have a stricter rate limit to prevent spam:
- 5 comments per hour per IP address
- Tracked independently from general API rate limits
- Can be supplemented with CAPTCHA protection when enabled

---

## CORS

The API supports Cross-Origin Resource Sharing (CORS) for browser-based applications.

**Allowed Origins:** Configured per environment

**Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers:** Authorization, Content-Type

---

## Versioning

The API uses URL-based versioning. The current version is `v1`.

Future versions will be available at `/api/v2`, `/api/v3`, etc.

---

## Support

For API support and questions:
- Documentation: https://docs.your-domain.com
- GitHub Issues: https://github.com/your-org/serverless-cms/issues
- Email: support@your-domain.com
