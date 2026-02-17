---
inclusion: always
---

# Database Schema Reference

This document defines the DynamoDB table schemas for the serverless CMS. Always refer to this when working with database operations, creating new features, or modifying existing data structures.

## Content Table (`cms-content-{env}`)

**Primary Key:**
- Partition Key: `id` (String) - UUID
- Sort Key: `type#timestamp` (String) - Format: `{type}#{unix_timestamp}`

**Attributes:**
```typescript
{
  id: string;                    // UUID
  type: string;                  // 'post' | 'page' | 'gallery' | 'project'
  'type#timestamp': string;      // Composite key for sorting
  title: string;
  slug: string;                  // Unique, used for URL-friendly access
  content: string;               // HTML content
  excerpt: string;
  author: string;                // User ID (UUID)
  author_name?: string;          // Enriched field (not stored, added at runtime)
  status: string;                // 'draft' | 'published' | 'archived'
  featured_image: string;        // S3 URL
  metadata: {
    seo_title?: string;
    seo_description?: string;
    tags?: string[];
    categories?: string[];
    media?: Media[];
    custom_fields?: Record<string, any>;
  };
  created_at: number;            // Unix timestamp
  updated_at: number;            // Unix timestamp
  published_at: number;          // Unix timestamp (0 if not published)
  scheduled_at: number;          // Unix timestamp (0 if not scheduled)
}
```

**Global Secondary Indexes:**
1. `slug-index`: Partition Key: `slug`
2. `type-published_at-index`: Partition Key: `type`, Sort Key: `published_at`
3. `status-scheduled_at-index`: Partition Key: `status`, Sort Key: `scheduled_at`

## Users Table (`cms-users-{env}`)

**Primary Key:**
- Partition Key: `id` (String) - Cognito User ID (UUID)

**Attributes:**
```typescript
{
  id: string;                    // Cognito User ID (UUID)
  email: string;
  name: string;                  // Display name (preferred field)
  display_name?: string;         // Legacy field, kept for backwards compatibility
  username?: string;             // Cognito username
  role: string;                  // 'admin' | 'editor' | 'author' | 'viewer'
  avatar_url?: string;           // S3 URL or external URL
  bio?: string;
  created_at: number;            // Unix timestamp - when user account was created
  last_login: number;            // Unix timestamp - last successful login time
}
```

**Role Hierarchy:**
- `admin`: Full system access, can manage users, settings, and all content
- `editor`: Can manage all content and comments, cannot manage users or settings
- `author`: Can create and manage own content
- `viewer`: Read-only access (default for new registrations)

**Phase 2 Fields:**
- `created_at`: Added in Phase 2 for user management tracking
- `last_login`: Added in Phase 2 for activity monitoring

**Note:** When creating/updating users, always set both `name` and `display_name` for compatibility.

## Media Table (`cms-media-{env}`)

**Primary Key:**
- Partition Key: `id` (String) - UUID

**Attributes:**
```typescript
{
  id: string;                    // UUID
  filename: string;
  s3_key: string;                // S3 object key
  s3_url: string;                // Full S3 URL
  mime_type: string;             // e.g., 'image/jpeg'
  size: number;                  // Bytes
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnails?: {
    small: string;               // S3 URL
    medium: string;              // S3 URL
    large: string;               // S3 URL
  };
  metadata?: {
    alt_text?: string;
    caption?: string;
    exif?: Record<string, any>;
  };
  uploaded_by: string;           // User ID (UUID)
  uploaded_at: number;           // Unix timestamp
}
```

## Settings Table (`cms-settings-{env}`)

**Primary Key:**
- Partition Key: `key` (String)

**Attributes:**
```typescript
{
  key: string;                   // Setting identifier
  value: any;                    // Setting value (can be any type)
  updated_by: string;            // User ID (UUID)
  updated_at: number;            // Unix timestamp
}
```

**Common Keys:**
- `site_title`: string - Website title displayed in header and meta tags
- `site_description`: string - Website description for SEO
- `theme`: string - Active theme identifier
- `registration_enabled`: boolean - Allow new user self-registration (default: false)
- `comments_enabled`: boolean - Allow public comments on content (default: false)
- `captcha_enabled`: boolean - Require CAPTCHA for comment submission (default: false)
- Custom settings as needed

**Phase 2 Settings:**
- `registration_enabled`: Controls whether the `/api/v1/auth/register` endpoint accepts new registrations
- `comments_enabled`: Controls whether the `/api/v1/content/{id}/comments` POST endpoint accepts new comments
- `captcha_enabled`: Controls whether AWS WAF CAPTCHA challenge is required for comment submission

## Plugins Table (`cms-plugins-{env}`)

**Primary Key:**
- Partition Key: `id` (String) - Plugin identifier

**Attributes:**
```typescript
{
  id: string;                    // Plugin identifier (kebab-case)
  name: string;                  // Display name
  version: string;               // Semantic version
  description: string;
  author: string;
  active: boolean;
  installed_at: number;          // Unix timestamp
  updated_at: number;            // Unix timestamp
  settings?: Record<string, any>;
  hooks?: string[];              // List of hook names this plugin implements
  config_schema?: Record<string, any>; // JSON schema for settings
}
```

## Comments Table (`cms-comments-{env}`)

**Primary Key:**
- Partition Key: `id` (String) - UUID
- Sort Key: `created_at` (Number) - Unix timestamp

**Attributes:**
```typescript
{
  id: string;                    // UUID
  content_id: string;            // ID of the content being commented on
  author_name: string;           // Commenter's name (sanitized)
  author_email: string;          // Commenter's email (sanitized, not exposed in API)
  comment_text: string;          // Comment content (sanitized, max 5000 chars)
  parent_id?: string;            // ID of parent comment for threaded replies
  status: string;                // 'pending' | 'approved' | 'rejected' | 'spam'
  ip_address: string;            // For rate limiting (not exposed in API)
  moderated_by?: string;         // User ID who moderated the comment
  created_at: number;            // Unix timestamp
  updated_at: number;            // Unix timestamp
}
```

**Global Secondary Indexes:**
1. `content_id-created_at-index`: Partition Key: `content_id`, Sort Key: `created_at`
2. `status-created_at-index`: Partition Key: `status`, Sort Key: `created_at`

**Status Values:**
- `pending`: Awaiting moderation (default for new comments)
- `approved`: Visible on public website
- `rejected`: Hidden, not spam
- `spam`: Marked as spam

## Important Notes

### Field Naming Conventions
- Use snake_case for DynamoDB attributes
- Use camelCase for TypeScript/JavaScript interfaces
- Always convert between conventions at API boundaries

### Timestamps
- All timestamps are Unix timestamps (seconds since epoch)
- Use `int(time.time())` in Python
- Use `Math.floor(Date.now() / 1000)` in JavaScript
- Store as numbers, not strings

### User References
- Always store user IDs (UUIDs) in `author`, `uploaded_by`, `updated_by` fields
- Enrich with user names at runtime using UserRepository
- Never store user names directly in content/media records

### Content Enrichment
- `author_name` is added at runtime by content get/list endpoints
- It's not stored in DynamoDB
- Fetched from users table using the `author` ID

### Status Values
- Content: `'draft'`, `'published'`, `'archived'`
- Comments: `'pending'`, `'approved'`, `'rejected'`, `'spam'`
- Use exact string matches in queries

### Metadata Fields
- Store as nested objects/maps
- Keep flexible for custom fields
- Validate structure in application code, not database

### Composite Keys
- Content table uses `type#timestamp` for efficient sorting
- Format: `{type}#{unix_timestamp}`
- Example: `post#1708041600`

## Query Patterns

### Get content by slug
```python
content_repo.get_by_slug(slug)
# Uses: slug-index
```

### List content by type
```python
content_repo.list_by_type(content_type='post', status='published')
# Uses: type-published_at-index
```

### Get scheduled content
```python
content_repo.get_scheduled_content(current_time)
# Uses: status-scheduled_at-index
```

### Get user by ID
```python
user_repo.get_by_id(user_id)
# Uses: Primary key
```

### List comments by content
```python
# Public endpoint - approved comments only
# Uses: content_id-created_at-index
```

### List comments by status
```python
# Moderation endpoint
# Uses: status-created_at-index
```

## Migration Notes

When adding new fields:
1. Make them optional with `?` in TypeScript
2. Provide defaults in Python code
3. Update this schema document
4. Update TypeScript interfaces in frontend
5. Test with existing data
