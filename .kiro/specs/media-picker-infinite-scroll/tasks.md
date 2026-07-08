# Implementation Plan: Media Picker Infinite Scroll

## Overview

Replace the existing single-page `MediaPicker` component with a tabbed, infinitely-scrolling media browser that combines media library browsing and gallery embedding into a unified dialog. Implementation uses `@tanstack/react-query`'s `useInfiniteQuery` for cursor-based pagination and `IntersectionObserver` for scroll-triggered pre-fetching.

## Tasks

- [x] 1. Update API client and set up shared types
  - [x] 1.1 Add `search` parameter to `listMedia` in the API client
    - Modify `frontend/admin-panel/src/services/api.ts` to accept an optional `search` query param in the `listMedia` method
    - Ensure the param is passed as a URL query string to the backend
    - _Requirements: 3.2, 2.2_

- [x] 2. Implement custom data-fetching hooks
  - [x] 2.1 Create `useInfiniteMediaQuery` hook
    - Create `frontend/admin-panel/src/hooks/useInfiniteMediaQuery.ts`
    - Use `useInfiniteQuery` with query key `['media', 'infinite', { search }]`
    - Implement `getNextPageParam` using `last_key` from API response
    - Implement 300ms debounce on search string via `useState` + `useEffect`
    - Return flattened items array, loading states, `fetchNextPage`, `hasNextPage`, search state
    - _Requirements: 2.1, 2.2, 2.5, 3.2, 3.4_

  - [x] 2.2 Create `useGalleriesQuery` hook
    - Create `frontend/admin-panel/src/hooks/useGalleriesQuery.ts`
    - Wrap `useQuery` with query key `['content', 'galleries-published']`
    - Call `api.listContent({ type: 'gallery', status: 'published' })`
    - Return galleries array, loading state, error
    - _Requirements: 4.1_

  - [ ]* 2.3 Write property test for cursor continuity
    - **Property 2: Cursor Continuity**
    - Verify that for any pagination cursor returned, the next fetch includes exactly that cursor as `last_key`
    - **Validates: Requirements 2.2**

  - [ ]* 2.4 Write property test for append-only page accumulation
    - **Property 4: Append-Only Page Accumulation**
    - Verify the flattened items array equals concatenation of all pages in fetch order — no removals, reorders, or duplicates
    - **Validates: Requirements 2.6**

  - [ ]* 2.5 Write property test for search reset behavior
    - **Property 5: Search Reset and Fetch**
    - Verify that setting a new search term resets accumulated pages and fetches first page with that term
    - **Validates: Requirements 3.2**

  - [ ]* 2.6 Write property test for debounce coalescing
    - **Property 6: Debounce Coalescing**
    - Verify that rapid search changes within 300ms only trigger one API call with the final value
    - **Validates: Requirements 3.4**

- [x] 3. Implement ScrollSentinel component
  - [x] 3.1 Create `ScrollSentinel` component
    - Create `frontend/admin-panel/src/components/Editor/ScrollSentinel.tsx`
    - Accept `onIntersect`, `disabled`, and optional `rootMargin` props (default `'0px 0px 600px 0px'`)
    - Use `useRef` + `useEffect` with `IntersectionObserver`
    - Disconnect observer when `disabled` is true
    - Render an invisible `div` as the sentinel element
    - _Requirements: 2.2, 2.3, 2.5_

  - [ ]* 3.2 Write property test for sentinel positioning
    - **Property 3: Sentinel Positioning**
    - Verify that for any total loaded item count and grid column count, the sentinel is positioned at `totalItems - (3 * columns)` (clamped to min 0)
    - **Validates: Requirements 2.3**

- [x] 4. Checkpoint - Ensure hooks and sentinel tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement MediaPickerDialog component
  - [x] 5.1 Create `MediaPickerDialog` with tabbed interface
    - Create `frontend/admin-panel/src/components/Editor/MediaPickerDialog.tsx`
    - Implement two tabs: "Media Library" and "Galleries" with Media Library active by default
    - Use `display:none` toggling (not unmounting) to preserve tab state and scroll position
    - Apply ARIA roles: `tablist`, `tab`, `tabpanel` on appropriate elements
    - Implement keyboard navigation between tabs (arrow keys)
    - Implement focus trap within dialog
    - Close dialog on Escape key press
    - Accept props: `isOpen`, `onClose`, `onSelectMedia`, `onInsertGallery`, `defaultTab`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.4, 7.5_

  - [x] 5.2 Implement Media Library tab content
    - Add debounced search input above media grid
    - Render media items as responsive grid with thumbnails from `thumbnails.small`
    - Set explicit `width`/`height` on images, use `loading="lazy"`
    - Show hover state on items indicating selectability
    - Integrate `useInfiniteMediaQuery` hook for data
    - Place `ScrollSentinel` component in the grid
    - Show skeleton loading grid on initial load
    - Show "No media found" empty state
    - Show error state with retry button on network failure
    - Show bottom loading indicator while fetching next page
    - Add ARIA live region announcing new items loaded
    - On item click: invoke `onSelectMedia` callback and close dialog
    - _Requirements: 2.1, 2.4, 2.6, 3.1, 3.3, 3.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.4, 7.3, 8.1, 8.2, 8.3_

  - [x] 5.3 Implement Gallery tab content
    - Integrate `useGalleriesQuery` hook for data
    - Display gallery cards with featured image, title, and image count
    - Add client-side search input filtering galleries by title
    - Reuse `EmbedConfig` pattern from existing `AlbumPickerDialog`
    - On gallery select: generate `::gallery[slug]{...}` directive, invoke `onInsertGallery`, close dialog
    - Show empty state when no published galleries available
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.3_

  - [ ]* 5.4 Write property test for tab state preservation
    - **Property 1: Tab State Preservation (Round-Trip)**
    - Verify switching tabs and switching back preserves loaded items in original order without refetch
    - **Validates: Requirements 1.4**

  - [ ]* 5.5 Write property test for gallery directive format
    - **Property 8: Gallery Directive Format**
    - Verify that for any gallery slug and config combination, the directive matches `::gallery[{slug}]{layout={layout} limit={limit} showDescription={showDescription} showTitle={showTitle}}`
    - **Validates: Requirements 4.4**

  - [ ]* 5.6 Write property test for media selection callback identity
    - **Property 9: Media Selection Callback Identity**
    - Verify clicking a media item invokes `onSelectMedia` with the same media object from the query cache
    - **Validates: Requirements 5.1**

  - [ ]* 5.7 Write property test for image rendering correctness
    - **Property 10: Image Rendering Correctness**
    - Verify rendered `<img>` uses `thumbnails.small` as `src` and includes explicit `width`/`height` from dimensions
    - **Validates: Requirements 8.1, 8.2**

- [x] 6. Checkpoint - Ensure MediaPickerDialog tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate new picker into editors
  - [x] 7.1 Update RichTextEditor to use `MediaPickerDialog`
    - Modify `frontend/admin-panel/src/components/Editor/RichTextEditor.tsx`
    - Replace `MediaPicker` import with `MediaPickerDialog`
    - Pass `onSelectMedia` callback for media insertion
    - Pass `onInsertGallery` callback for gallery directive insertion
    - Remove old `MediaPicker` usage
    - _Requirements: 5.1, 5.2, 4.4, 4.5_

  - [x] 7.2 Update MarkdownEditor to use `MediaPickerDialog`
    - Modify `frontend/admin-panel/src/components/MarkdownEditor.tsx`
    - Replace any existing media picker usage with `MediaPickerDialog`
    - Pass `onSelectMedia` callback for inserting media markdown
    - Pass `onInsertGallery` callback for inserting gallery directive
    - _Requirements: 5.1, 5.2, 4.4, 4.5_

  - [ ]* 7.3 Write property test for gallery card completeness
    - **Property 7: Gallery Card Completeness**
    - Verify that for any gallery with title, featured_image, and metadata.media array, the rendered card displays title, image, and correct count
    - **Validates: Requirements 4.2**

- [ ] 8. Unit and integration tests
  - [ ]* 8.1 Write unit tests for MediaPickerDialog
    - Test initial render shows two tabs with Media Library active
    - Test tab switching shows/hides correct panels
    - Test loading skeleton on initial fetch
    - Test empty state messages for both tabs
    - Test Escape key closes dialog
    - Test ARIA roles applied correctly
    - Test keyboard navigation between tabs
    - Test focus trap within dialog
    - Test Cancel button closes dialog
    - Test `loading="lazy"` on grid images
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.4, 7.5_

  - [ ]* 8.2 Write integration tests for full selection flows
    - Test: open picker -> search -> select media -> callback fires -> dialog closes
    - Test: open picker -> switch to galleries -> select gallery -> directive inserted -> closes
    - Test: scroll simulation triggers sentinel and loads additional pages
    - Test: network error -> retry button -> data loads
    - _Requirements: 2.2, 3.2, 4.4, 5.1, 5.2, 6.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `MediaPicker.tsx` will be superseded by `MediaPickerDialog.tsx`
- The existing `AlbumPickerDialog.tsx` pattern is reused for gallery embed config
- All hooks use `@tanstack/react-query` which is already installed in the project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "2.6", "3.2"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "5.5", "5.6", "5.7"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3", "8.1", "8.2"] }
  ]
}
```
