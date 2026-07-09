# Implementation Plan: Section Landing Pages

## Overview

Add optional landing page support to blog sections. A section can link to a published page via `page_id`. The backend validates the reference on create/update, the public posts endpoint enriches responses with the page's HTML content, the admin panel provides a page picker dropdown, and the public website renders landing content above the posts grid.

## Tasks

- [ ] 1. Shared type definitions and backend validation
  - [ ] 1.1 Add `page_id` to shared Section TypeScript interfaces
    - In `frontend/shared/sections/types.ts`, add `page_id: string | null` to `Section` interface
    - Add `page_id?: string | null` to `CreateSectionRequest` and `UpdateSectionRequest` interfaces
    - Add `LandingPage` interface with fields: `id`, `title`, `slug`, `content`, `featured_image`, `excerpt`
    - Add `landing_page?: LandingPage` to `SectionPostsResponse` interface
    - _Requirements: 6.1, 6.2, 6.3, 3.2, 3.5_

  - [ ] 1.2 Add `validate_page_id` function to section service
    - In `lambda/sections/service.py`, add `validate_page_id(page_id, content_repo)` function
    - If `page_id` is None, return None (skip validation)
    - Query content table by ID using `content_repo.get_by_id(page_id)`
    - Return `"Referenced page not found"` if item doesn't exist
    - Return `"Referenced content is not a page"` if `type != 'page'`
    - Return `"Referenced page is not published"` if `status != 'published'`
    - Return None on success
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 1.3 Update create handler to accept and validate `page_id`
    - In `lambda/sections/create.py`, extract `page_id` from request body (default None)
    - Call `validate_page_id` if `page_id` is not None; return 400 on error
    - Include `page_id` in the section item dict stored to DynamoDB
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [ ] 1.4 Update update handler to accept and validate `page_id`
    - In `lambda/sections/update.py`, check if `'page_id'` is in the request body
    - If present and non-null, call `validate_page_id`; return 400 on error
    - If present and null, set `page_id` to null (clear link)
    - Include `page_id` in the updates dict
    - _Requirements: 1.2, 1.3, 1.5_

  - [ ]* 1.5 Write property tests for page_id validation
    - **Property 2: Non-null page_id validation rejects invalid references**
    - **Property 3: Null or omitted page_id bypasses validation**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.7**

- [ ] 2. Checkpoint - Backend validation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Public API enrichment
  - [ ] 3.1 Add landing page fetch helper to public handler
    - In `lambda/sections/public.py`, add `_fetch_landing_page(page_id)` function
    - Query content table by ID, check item exists and status is `published`
    - Return dict with `id`, `title`, `slug`, `content`, `featured_image`, `excerpt`
    - Return None if page doesn't exist, isn't published, or on any exception
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.2 Integrate landing page into posts endpoint response
    - In `lambda/sections/public.py` `_handle_posts` function, after building the response body
    - Check `section.get('page_id')`, if non-null call `_fetch_landing_page`
    - If result is not None, add `landing_page` key to response body
    - _Requirements: 3.4, 3.5_

  - [ ]* 3.3 Write property tests for landing page enrichment
    - **Property 4: Landing page presence in posts response iff published page exists**
    - **Property 5: Landing page response contains all required fields**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 4. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Admin panel page picker
  - [ ] 5.1 Add page fetching to admin section form
    - In `frontend/admin-panel/src/components/SectionForm.tsx`
    - Add state for published pages list and loading state
    - Fetch published pages on mount using content service (filter: type=page, status=published)
    - _Requirements: 4.2_

  - [ ] 5.2 Add page picker dropdown to section form
    - Add a `<select>` field labeled "Landing Page" after the description field
    - Include "None" option (value empty/null) as default
    - Map published pages as `<option>` elements with page ID as value and title as label
    - Pre-select current `page_id` when editing an existing section
    - Default to "None" when creating a new section
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [ ] 5.3 Wire page_id into section create/update requests
    - Update form submission to include `page_id` (selected value or null) in the API request body
    - Update `frontend/admin-panel/src/services/sectionService.ts` if needed to pass `page_id`
    - _Requirements: 4.6_

  - [ ]* 5.4 Write unit tests for page picker component
    - Test that dropdown renders with "None" default
    - Test that published pages appear as options
    - Test pre-selection in edit mode
    - **Property 6: Page picker shows only published pages**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 6. Public website landing page rendering
  - [ ] 6.1 Update public section service types
    - In `frontend/public-website/src/services/sectionService.ts`
    - Add `LandingPage` interface and `landing_page?: LandingPage` to the posts response type
    - _Requirements: 3.2, 3.5_

  - [ ] 6.2 Render landing page content above posts grid
    - In `frontend/public-website/src/pages/BlogSectionPage.tsx`
    - Check if `postsResponse.landing_page` exists
    - If present, render a container above the posts grid with:
      - Featured image (if present) as full-width responsive image
      - Title as an h2 heading
      - HTML content inside a `prose` styled div using `dangerouslySetInnerHTML`
    - If absent, render only the existing section header and posts grid
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.3 Write unit tests for landing page rendering
    - Test rendering with landing_page present (shows image, title, content)
    - Test rendering without landing_page (shows only posts grid)
    - **Property 7: Landing page renders above posts grid when present**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**

- [ ] 7. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- DynamoDB is schemaless so no migration is needed — `page_id` is just included in the item dict
- The public endpoint gracefully degrades: if a linked page is deleted or unpublished, it simply omits the `landing_page` field
- The content repository's `get_by_id` method is used for validation; verify it exists or implement it
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific rendering and UI behavior

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["3.3", "5.1", "6.1"] },
    { "id": 5, "tasks": ["5.2", "6.2"] },
    { "id": 6, "tasks": ["5.3"] },
    { "id": 7, "tasks": ["5.4", "6.3"] }
  ]
}
```
