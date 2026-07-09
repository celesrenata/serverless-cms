# Design Document: Section Landing Pages

## Overview

This feature extends the blog sections system with optional landing page support. Each section can reference a published content page via a `page_id` field. When present and valid, the public posts endpoint enriches its response with the page's HTML content, title, image, and metadata. The admin panel adds a page picker dropdown, and the public website renders the landing content above the posts grid.

## Architecture

The change touches four layers:

1. **Data Model** — Add `page_id` (string | null) to the section DynamoDB item.
2. **Backend Validation** — Validate `page_id` references a published page on create/update.
3. **Public API Enrichment** — Fetch and embed landing page data in the posts endpoint response.
4. **Frontend** — Admin page picker dropdown; public website landing content renderer.

No new DynamoDB tables or indexes are required. The existing `cms-content-{env}` table is queried by primary key to validate and fetch the linked page.

## Components

### 1. Section Data Model Extension

**File:** `lambda/shared/sections_db.py` (no changes needed — DynamoDB is schemaless)
**File:** `frontend/shared/sections/types.ts`

The `page_id` field is added to the Section item. DynamoDB is schemaless, so no table migration is needed — the field is simply included in the item dict on create/update.

```typescript
// frontend/shared/sections/types.ts
export interface Section {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string;
  sort_order: number;
  path: string;
  path_ids: string[];
  depth: number;
  page_id: string | null;  // NEW
  created_at: number;
  updated_at: number;
}

export interface CreateSectionRequest {
  name: string;
  slug: string;
  parent_id?: string | null;
  description?: string;
  sort_order?: number;
  page_id?: string | null;  // NEW
}

export interface UpdateSectionRequest {
  name?: string;
  slug?: string;
  parent_id?: string | null;
  description?: string;
  sort_order?: number;
  page_id?: string | null;  // NEW
}
```

### 2. Backend Validation (page_id)

**Files:** `lambda/sections/create.py`, `lambda/sections/update.py`, `lambda/sections/service.py`

A new validation function `validate_page_id` is added to `service.py`. It accepts the `page_id` value and a content repository instance, then checks:
1. Content item exists (query by ID)
2. Content item has `type == 'page'`
3. Content item has `status == 'published'`

If validation fails, it returns a tuple `(error_message, status_code)`. If it passes, it returns `None`.

```python
# lambda/sections/service.py (new function)
def validate_page_id(
    page_id: str | None,
    content_repo,
) -> str | None:
    """Validate that page_id references a published page.

    Args:
        page_id: The page ID to validate, or None to skip.
        content_repo: ContentRepository instance.

    Returns:
        Error message string if invalid, None if valid.
    """
    if page_id is None:
        return None

    content = content_repo.get_by_id(page_id)
    if not content:
        return "Referenced page not found"
    if content.get("type") != "page":
        return "Referenced content is not a page"
    if content.get("status") != "published":
        return "Referenced page is not published"

    return None
```

The create and update handlers call this function before persisting. On error, they return a 400 response with the message.

### 3. Create Handler Changes

**File:** `lambda/sections/create.py`

After existing validation, the handler extracts `page_id` from the request body:

```python
# In create handler, after validate_section_input
page_id = body.get('page_id')  # None if not provided

if page_id is not None:
    error = validate_page_id(page_id, content_repo)
    if error:
        return _response(400, {'error': error})

# Include in item dict
item = {
    ...
    'page_id': page_id,  # null if not provided
    ...
}
```

### 4. Update Handler Changes

**File:** `lambda/sections/update.py`

The update handler processes `page_id` similarly to other optional fields:

```python
# In update handler, within the updates building block
if 'page_id' in body:
    new_page_id = body['page_id']  # Can be string or None
    if new_page_id is not None:
        error = validate_page_id(new_page_id, content_repo)
        if error:
            return _response(400, {'error': error})
    updates['page_id'] = new_page_id
```

### 5. Public Posts Endpoint Enrichment

**File:** `lambda/sections/public.py`

The `_handle_posts` function is extended to:
1. Check if the section has a non-null `page_id`
2. Fetch the content item by ID from `content_table`
3. Verify it's still published (graceful degradation)
4. Build a `landing_page` object with selected fields
5. Include it in the response alongside `items` and `pagination`

```python
# In _handle_posts, after building the response
response_body = {
    'items': paged_items,
    'pagination': { ... },
}

page_id = section.get('page_id')
if page_id:
    landing_page = _fetch_landing_page(page_id)
    if landing_page:
        response_body['landing_page'] = landing_page

return _response(200, response_body)
```

The helper function:

```python
def _fetch_landing_page(page_id: str) -> dict | None:
    """Fetch a landing page by ID if it's still published."""
    try:
        result = content_table.query(
            KeyConditionExpression=Key('id').eq(page_id),
            Limit=1,
        )
        items = result.get('Items', [])
        if not items:
            return None

        page = items[0]
        if page.get('status') != 'published':
            return None

        return {
            'id': page['id'],
            'title': page.get('title', ''),
            'slug': page.get('slug', ''),
            'content': page.get('content', ''),
            'featured_image': page.get('featured_image', ''),
            'excerpt': page.get('excerpt', ''),
        }
    except Exception:
        return None
```

### 6. Admin Page Picker

**File:** `frontend/admin-panel/src/components/SectionForm.tsx`

A new dropdown is added to the form, positioned after the Description field. It fetches published pages from the content API and renders them as options.

**Data fetching approach:** The admin panel already has a content service. A new query fetches pages with `type=page&status=published`. This can use the existing `listContent` function with appropriate filters, or a dedicated hook.

```typescript
// New interface for the landing page response shape
export interface LandingPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  featured_image: string;
  excerpt: string;
}

// Extended SectionPostsResponse in public section service
export interface SectionPostsResponse {
  items: Content[];
  pagination: SectionPostsPagination;
  landing_page?: LandingPage;
}
```

The form adds:
- A `page_id` field to `FormData` (string | null, default null)
- A `useEffect` to fetch published pages on mount
- A `<select>` dropdown with "None" as default and published pages as options
- Pre-selection in edit mode based on `section.page_id`

### 7. Public Website Rendering

**File:** `frontend/public-website/src/pages/BlogSectionPage.tsx`

The component checks for `landing_page` in the posts response and renders it above the posts grid:

```tsx
{postsResponse?.landing_page && (
  <div className="mb-12">
    {postsResponse.landing_page.featured_image && (
      <img
        src={postsResponse.landing_page.featured_image}
        alt={postsResponse.landing_page.title}
        className="w-full h-64 object-cover rounded-lg mb-6"
      />
    )}
    <h2 className="text-3xl font-bold text-gray-900 mb-4">
      {postsResponse.landing_page.title}
    </h2>
    <div
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: postsResponse.landing_page.content }}
    />
  </div>
)}
```

The `SectionPostsResponse` type in the public service is updated to include the optional `landing_page` field.

## Data Flow

```
Admin creates/edits section → sends page_id in body
    → Backend validates page_id against content table
    → Stores page_id in section item
    → Returns section with page_id

Public website loads section page:
    → Fetches section by path (includes page_id)
    → Fetches posts for section ID
        → Backend checks section.page_id
        → If non-null, fetches page from content table
        → If published, includes landing_page in response
    → Frontend renders landing_page above posts grid
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `page_id` references non-existent content | 400: "Referenced page not found" |
| `page_id` references a post/gallery/project | 400: "Referenced content is not a page" |
| `page_id` references a draft/archived page | 400: "Referenced page is not published" |
| Linked page deleted after linking | Public API omits `landing_page`, returns posts normally |
| Linked page unpublished after linking | Public API omits `landing_page`, returns posts normally |
| Content table query fails | Public API omits `landing_page`, logs error, returns posts normally |

## Interfaces

### API Request/Response Shapes

**POST /api/v1/sections** (create):
```json
{
  "name": "Web Development",
  "slug": "web-development",
  "parent_id": null,
  "description": "Posts about web development",
  "sort_order": 0,
  "page_id": "uuid-of-published-page"
}
```

**PUT /api/v1/sections/{id}** (update):
```json
{
  "page_id": "uuid-of-published-page"
}
```

**GET /api/v1/public/sections/{id}/posts** (response with landing page):
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  },
  "landing_page": {
    "id": "uuid",
    "title": "Welcome to Web Development",
    "slug": "welcome-to-web-development",
    "content": "<h1>...</h1><p>...</p>",
    "featured_image": "https://s3.../image.jpg",
    "excerpt": "An introduction to our web development section."
  }
}
```

**GET /api/v1/public/sections/{id}/posts** (response without landing page):
```json
{
  "items": [...],
  "pagination": { ... }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Page ID persistence round-trip

*For any* section create or update request containing a `page_id` value (string UUID or null), after the operation succeeds, fetching that section from any endpoint (get, list, tree) SHALL return the same `page_id` value that was written.

**Validates: Requirements 1.1, 1.2, 1.3, 1.5**

### Property 2: Non-null page_id validation rejects invalid references

*For any* non-null `page_id` value where the referenced content item either does not exist, has a type other than `page`, or has a status other than `published`, the Section_API SHALL reject the create or update request with a 400 status code.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Null or omitted page_id bypasses validation

*For any* section create or update request where `page_id` is null or omitted, the Section_API SHALL accept the request without querying the content table for validation, and SHALL store/clear the page_id to null.

**Validates: Requirements 2.7**

### Property 4: Landing page presence in posts response iff published page exists

*For any* section, the posts endpoint response SHALL include a `landing_page` object if and only if the section has a non-null `page_id` AND the referenced content item exists in the content table AND its status is `published`. Otherwise, the `landing_page` field SHALL be omitted.

**Validates: Requirements 3.1, 3.3, 3.4**

### Property 5: Landing page response contains all required fields

*For any* posts endpoint response that includes a `landing_page` object, that object SHALL contain exactly the fields: `id`, `title`, `slug`, `content`, `featured_image`, and `excerpt`, with values matching the referenced content item.

**Validates: Requirements 3.2, 3.5**

### Property 6: Page picker shows only published pages

*For any* set of content items in the Content_Table, the Page_Picker dropdown SHALL list only those items where `type == 'page'` AND `status == 'published'`, plus a "None" option.

**Validates: Requirements 4.2, 4.3**

### Property 7: Landing page renders above posts grid when present

*For any* posts response containing a `landing_page` object, the Section_Page component SHALL render the landing page content in a position above the posts grid in the DOM. When the response does not contain a `landing_page` field, no landing content area SHALL be rendered.

**Validates: Requirements 5.1, 5.3**
