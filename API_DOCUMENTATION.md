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
  "updated_at": 1735689600,
  "updated_by": "user-123"
}
```

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
  "theme": "dark"
}
```

**Response:** `200 OK`

Returns the updated settings (same format as "Get Settings").

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
| NOT_FOUND | Resource not found |
| CONTENT_NOT_FOUND | Content item not found |
| MEDIA_NOT_FOUND | Media file not found |
| DUPLICATE_SLUG | Slug already exists |
| RESOURCE_CONFLICT | Resource conflict |
| INTERNAL_ERROR | Internal server error |
| DATABASE_ERROR | Database operation failed |
| S3_ERROR | S3 operation failed |
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

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1735693200
```

When rate limit is exceeded, the API returns `429 Too Many Requests`.

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
