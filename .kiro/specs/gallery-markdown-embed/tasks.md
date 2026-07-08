# Implementation Plan: Gallery Markdown Embed

## Overview

This plan implements a gallery album embed system for the markdown pipeline. It builds from the shared remark plugin (parsing layer) outward to the admin editor UI and public website rendering. Each task builds incrementally so that the pipeline is testable at each stage.

## Tasks

- [x] 1. Implement remark plugin and shared pipeline
  - [x] 1.1 Create `remarkGalleryEmbed` plugin at `frontend/shared/markdown/plugins/remarkGalleryEmbed.ts`
    - Implement directive regex matching for `::gallery[ALBUM_ID]{attributes}` syntax
    - Parse attribute key=value pairs with validation and defaults
    - Produce `galleryEmbed` AST node with `hName`/`hProperties` for rehype transformation
    - Handle edge cases: empty IDs, invalid characters, nested in blockquotes/lists
    - Export plugin function compatible with unified processor `.use()` API
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 8.4_

  - [x] 1.2 Update `frontend/shared/markdown/sanitizeSchema.ts` to allow gallery-embed data attributes
    - Add `data-album-id`, `data-layout`, `data-limit`, `data-show-description`, `data-show-title` to div allowed attributes
    - Allow `gallery-embed` class name on div elements
    - _Requirements: 2.3_

  - [x] 1.3 Register `remarkGalleryEmbed` in `frontend/shared/markdown/createProcessor.ts`
    - Import and add plugin after `remarkSuperSub` (before `remarkRehype`)
    - Register in both `createProcessor()` and `createProcessorWithToc()` functions
    - _Requirements: 2.1_

  - [x] 1.4 Write property tests for directive parsing (Properties 1–3)
    - **Property 1: Directive Parsing Round Trip** — valid album IDs produce correct AST nodes
    - **Property 2: Invalid IDs Produce No Embed Node** — invalid IDs remain as literal text
    - **Property 3: Attribute Normalization** — valid/invalid/unknown attributes handled correctly
    - Use `fast-check` with minimum 100 iterations per property
    - Create test file at `frontend/shared/markdown/__tests__/remarkGalleryEmbed.test.ts`
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**

  - [x] 1.5 Write property tests for pipeline integrity (Properties 4–5)
    - **Property 4: Pipeline Output Integrity** — full pipeline produces correct HTML div
    - **Property 5: Non-Interference** — other markdown elements unaffected by plugin
    - Use `fast-check` with minimum 100 iterations per property
    - Add to `frontend/shared/markdown/__tests__/remarkGalleryEmbed.test.ts`
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 8.4**

- [x] 2. Checkpoint - Ensure pipeline tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Album Picker Dialog and editor toolbar
  - [x] 3.1 Create `AlbumPickerDialog` component at `frontend/admin-panel/src/components/Editor/AlbumPickerDialog.tsx`
    - Implement modal with album grid fetching published gallery content
    - Add search input for filtering albums by title
    - Show album cards with title, cover image, image count
    - Add configuration panel (layout dropdown, limit input, description/title toggles)
    - Generate directive string on confirm: `::gallery[slug]{layout=X limit=Y showDescription=Z showTitle=W}`
    - Handle loading, empty state, and close behavior
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 3.9, 3.10_

  - [x] 3.2 Add gallery insert button to `frontend/admin-panel/src/components/Editor/EditorToolbar.tsx`
    - Add `onGalleryInsert` prop to `EditorToolbarProps` interface
    - Add ToolbarButton after existing image insert button with "Insert Gallery" tooltip
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.3 Integrate AlbumPickerDialog into CodeMirror `MarkdownEditor.tsx`
    - Add gallery button above the editor
    - Open AlbumPickerDialog on click
    - Insert directive text at current cursor position on confirm
    - _Requirements: 3.6, 4.1_

  - [x] 3.4 Integrate AlbumPickerDialog into TipTap editor
    - Wire `onGalleryInsert` handler from toolbar to open the dialog
    - Insert Gallery_Embed_Directive as custom node block on confirm
    - _Requirements: 3.7, 4.1_

  - [x] 3.5 Write property test for directive generation (Property 6)
    - **Property 6: Directive Generation Correctness** — generated directives are parseable back through plugin
    - Test round-trip: AlbumPickerDialog output → remarkGalleryEmbed → correct AST node
    - Create test file at `frontend/admin-panel/src/components/Editor/__tests__/AlbumPickerDialog.test.tsx`
    - **Validates: Requirements 3.6**

  - [x] 3.6 Write unit tests for AlbumPickerDialog and toolbar
    - Test dialog open/close behavior
    - Test loading and empty states
    - Test album search filtering
    - Test configuration panel state management
    - Add to `frontend/admin-panel/src/components/Editor/__tests__/AlbumPickerDialog.test.tsx`
    - _Requirements: 3.1, 3.8, 3.9, 3.10, 4.1, 4.2, 4.4_

- [x] 4. Implement editor preview component
  - [x] 4.1 Create `GalleryEmbedPreview` at `frontend/admin-panel/src/components/Editor/GalleryEmbedPreview.tsx`
    - Fetch album metadata by album ID from admin API
    - Show album title, cover image thumbnail, image count, layout badge
    - Render dashed border with gallery icon
    - Handle skeleton loading state and "Album not found" error state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.2 Modify `frontend/admin-panel/src/components/MarkdownPreview.tsx` to detect gallery-embed divs
    - Detect `<div class="gallery-embed" ...>` elements in rendered HTML
    - Replace with `GalleryEmbedPreview` component passing data attributes as props
    - _Requirements: 5.1, 5.2_

  - [x] 4.3 Write unit tests for GalleryEmbedPreview
    - Test skeleton loading state
    - Test error state for invalid album IDs
    - Test successful render with album metadata
    - Create test at `frontend/admin-panel/src/components/Editor/__tests__/GalleryEmbedPreview.test.tsx`
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 5. Checkpoint - Ensure admin panel tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement public website GalleryEmbed component
  - [x] 6.1 Create `GalleryEmbed` component at `frontend/public-website/src/components/GalleryEmbed.tsx`
    - Accept props: albumId, layout, limit, showDescription, showTitle
    - Fetch album data from public API using album slug/ID
    - Implement grid layout: responsive CSS Grid (2/3/4 columns)
    - Implement carousel layout: horizontal scroll, navigation arrows, swipe support
    - Implement masonry layout: CSS columns with aspect ratio preservation
    - Apply limit (show at most N images, "View all" link when N < total)
    - Toggle title/description visibility
    - Open Lightbox on image click
    - Use `loading="lazy"` on all images
    - Use `thumbnails.medium` for grid/masonry, `thumbnails.large` for carousel
    - Handle error states: API error fallback, deleted album, zero images
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13_

  - [x] 6.2 Create `GalleryEmbed.css` at `frontend/public-website/src/components/GalleryEmbed.css`
    - Grid layout styles with responsive breakpoints
    - Carousel styles with scroll container and navigation
    - Masonry styles with column-count responsive
    - Skeleton loading placeholder styles
    - Error/fallback state styles
    - _Requirements: 6.3, 6.4, 6.5, 6.11_

  - [x] 6.3 Add accessibility attributes to GalleryEmbed
    - Add `aria-label="Gallery: {album_title}"` on container
    - Add `role="region"` on gallery container
    - Set `alt` from `metadata.alt_text` or filename fallback on each image
    - Add `aria-label="Previous image"` and `aria-label="Next image"` on carousel buttons
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 6.4 Write property tests for GalleryEmbed (Properties 7–9)
    - **Property 7: Image Limit Invariant** — at most min(L, N) images rendered, "View all" shown iff N > L
    - **Property 8: Render Completeness** — title/description presence matches showTitle/showDescription, aria-label correct
    - **Property 9: Image Optimization Correctness** — lazy loading on all images, correct thumbnail URLs by layout
    - Use `fast-check` with minimum 100 iterations per property
    - Create test at `frontend/public-website/src/components/__tests__/GalleryEmbed.property.test.tsx`
    - **Validates: Requirements 6.6, 6.7, 6.8, 6.12, 6.13, 7.1, 7.2**

  - [x] 6.5 Write unit tests for GalleryEmbed component
    - Test grid/carousel/masonry rendering
    - Test Lightbox opening on image click
    - Test error fallback rendering
    - Test skeleton loading state
    - Test responsive column counts
    - Test carousel navigation accessibility
    - Create test at `frontend/public-website/src/components/__tests__/GalleryEmbed.test.tsx`
    - _Requirements: 6.3, 6.4, 6.5, 6.9, 6.10, 6.11, 7.3, 7.4, 8.1, 8.2, 8.3_

- [x] 7. Integrate GalleryEmbed into MarkdownContent
  - [x] 7.1 Modify `frontend/public-website/src/components/MarkdownContent.tsx` to extract gallery segments
    - Add `'gallery'` segment type alongside existing `'html'` and `'mermaid'`
    - Extract `<div class="gallery-embed" ...></div>` elements using regex
    - Parse data attributes from matched elements
    - Render `<GalleryEmbed {...props} />` for each gallery segment
    - _Requirements: 6.1, 6.2_

  - [x] 7.2 Write integration test for full pipeline rendering
    - Test markdown string → HTML → React hydration with GalleryEmbed
    - Test multiple gallery embeds in one document
    - Create test at `frontend/public-website/src/components/__tests__/GalleryEmbed.test.tsx`
    - _Requirements: 2.4, 6.1_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–9)
- Unit tests validate specific examples and edge cases
- The remark plugin (task 1.1) is the foundation — all other tasks depend on it
- fast-check is used for property-based testing (compatible with Vitest)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "4.1", "6.1"] },
    { "id": 4, "tasks": ["3.5", "3.6", "4.2", "6.2", "6.3"] },
    { "id": 5, "tasks": ["4.3", "6.4", "6.5", "7.1"] },
    { "id": 6, "tasks": ["7.2"] }
  ]
}
```
