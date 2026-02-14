# Content Management Lambda Functions

This directory contains Lambda functions for content management operations in the Serverless CMS.

## Implemented Functions

### 1. create.py
**Endpoint:** POST /api/v1/content

Creates new content items (posts, pages, galleries, projects).

**Features:**
- Validates required fields (title, content)
- Auto-generates slugs from titles if not provided
- Checks slug uniqueness
- Supports scheduled publishing
- Executes plugin hooks for content_create
- Role-based access control (author, editor, admin)

**Requirements:** 1.1, 1.3, 1.4, 19.1

### 2. get.py
**Endpoints:** 
- GET /api/v1/content/{id}
- GET /api/v1/content/slug/{slug}

Retrieves individual content items by ID or slug.

**Features:**
- Supports lookup by ID or slug
- Authentication check for draft content
- Permission validation for draft access
- Applies plugin content filters before returning
- Returns content within 2 seconds

**Requirements:** 3.1, 4.2, 4.5, 17.1, 17.2

### 3. list.py
**Endpoint:** GET /api/v1/content

Lists content with filtering and pagination.

**Features:**
- Filter by type, status, category, tag, author
- Full-text search in title, content, and excerpt
- Pagination with last_key
- Efficient GSI queries
- Returns results within 3 seconds

**Query Parameters:**
- `type`: Content type (post, page, gallery, project)
- `status`: Content status (draft, published, archived)
- `limit`: Number of items per page (1-100, default 20)
- `last_key`: Pagination token
- `category`: Filter by category
- `tag`: Filter by tag
- `author`: Filter by author ID
- `search`: Search query

**Requirements:** 4.1, 6.3, 6.4, 13.1, 13.2

### 4. update.py
**Endpoint:** PUT /api/v1/content/{id}

Updates existing content items.

**Features:**
- Permission validation (author or editor/admin)
- Slug uniqueness validation on updates
- Preserves original published_at timestamp
- Handles status transitions (draft ↔ published)
- Supports scheduled publishing updates
- Executes plugin hooks for content_update
- Updates timestamp on every modification

**Requirements:** 3.2, 3.3, 3.4, 3.5, 19.2

### 5. delete.py
**Endpoint:** DELETE /api/v1/content/{id}

Deletes content items.

**Features:**
- Restricted to editor and admin roles
- Executes plugin hooks for content_delete
- Removes content from DynamoDB
- Returns success confirmation

**Requirements:** 19.3

## Shared Dependencies

All content Lambda functions depend on:

- `shared/auth.py`: Authentication and authorization
- `shared/db.py`: DynamoDB repository classes
- `shared/plugins.py`: Plugin manager for hooks and filters

## Environment Variables

Required environment variables:
- `CONTENT_TABLE`: DynamoDB content table name
- `COGNITO_REGION`: AWS region for Cognito
- `USER_POOL_ID`: Cognito User Pool ID
- `USER_POOL_CLIENT_ID`: Cognito User Pool Client ID
- `USERS_TABLE`: DynamoDB users table name
- `PLUGINS_TABLE`: DynamoDB plugins table name

## Response Format

All functions return JSON responses with CORS headers:

**Success Response:**
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{...}"
}
```

**Error Response:**
```json
{
  "statusCode": 4xx/5xx,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{\"error\": \"Error type\", \"message\": \"Error description\"}"
}
```

## Plugin Integration

Content functions support the following plugin hooks:

- `content_create`: Executed after content creation
- `content_update`: Executed during content updates
- `content_delete`: Executed before content deletion
- `content_render_{type}`: Applied when retrieving content for display

Plugins can modify content data through these hooks while maintaining system stability (errors are logged but don't block operations).
