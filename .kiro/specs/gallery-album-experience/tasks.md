# Implementation Plan: Gallery Album Experience

## Overview

Transform the public website gallery from a flat image listing into an album-based browsing experience. The gallery index page shows album cards; clicking a card navigates to a dedicated album page with an image grid; clicking an image opens an enhanced lightbox with swipe support and improved caption overlay. Pure utility functions are extracted first for property-based testing, then components are built on top.

## Tasks

- [x] 1. Install dependencies and extract pure utility functions
  - [x] 1.1 Install fast-check as a dev dependency
    - Run `npm install -D fast-check` in `frontend/public-website`
    - _Requirements: Testing infrastructure_

  - [x] 1.2 Create gallery utility functions module
    - Create `frontend/public-website/src/utils/galleryUtils.ts`
    - Implement pure functions: `getNextIndex`, `getPreviousIndex`, `isAtStart`, `isAtEnd`, `toAlbumCard`, `detectSwipe`, `formatGalleryTitle`, `formatAlbumTitle`, `formatPositionIndicator`
    - Define types: `GalleryAlbumCardModel`, `SwipeInput`, `SwipeDirection`
    - All functions must be pure with no side effects for easy testing
    - `toAlbumCard` maps Content to GalleryAlbumCardModel using: imageCount from media.length, coverUrl from media[0].thumbnails.large → media[0].s3_url → placeholder, coverAlt from media[0].metadata.alt_text → content.title
    - `detectSwipe` returns 'left'|'right'|'none' based on threshold and horizontal dominance
    - _Requirements: 1.2, 2.1, 5.1-5.8, 6.4, 7.1-7.3, 8.1_

- [x] 2. Property-based tests for utility functions
  - [x] 2.1 Write property test for navigation index bounds (Property 6)
    - **Property 6: Navigation index stays within bounds**
    - For any array length N > 0 and index I in [0, N-1], getNextIndex and getPreviousIndex always return values in [0, N-1]
    - isAtStart returns true iff index === 0; isAtEnd returns true iff index === total - 1
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.7, 5.8**

  - [x] 2.2 Write property test for toAlbumCard transformation (Property 2)
    - **Property 2: Album card displays all required information**
    - For any Content item with non-empty media, toAlbumCard produces correct title, excerpt, imageCount === media.length, coverUrl from first media
    - **Validates: Requirements 1.2, 8.1**

  - [x] 2.3 Write property test for swipe detection (Property 7)
    - **Property 7: Swipe gesture direction maps to correct navigation**
    - For any SwipeInput with horizontal movement > threshold and dominant over vertical, detectSwipe returns 'left' or 'right' correctly; below threshold or vertical-dominant returns 'none'
    - **Validates: Requirements 5.5, 5.6**

  - [x] 2.4 Write property test for caption presence (Property 8)
    - **Property 8: Caption displayed if and only if present**
    - For any Media item, caption overlay logic renders iff metadata.caption is a non-empty string
    - **Validates: Requirements 6.1, 6.3**

  - [x] 2.5 Write property test for position indicator (Property 9)
    - **Property 9: Position indicator accuracy**
    - For any index I and total N, formatPositionIndicator returns `{I+1} / {N}`
    - **Validates: Requirements 6.4**

  - [x] 2.6 Write property test for SEO metadata (Property 10)
    - **Property 10: SEO metadata format correctness**
    - formatGalleryTitle returns "Gallery - {siteTitle}", formatAlbumTitle returns "{albumTitle} - Gallery - {siteTitle}"
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 2.7 Write property test for album card link (Property 3)
    - **Property 3: Album card link matches slug**
    - For any Content item with a slug, toAlbumCard produces a slug field that when used forms `/gallery/{slug}`
    - **Validates: Requirements 2.1**

- [x] 3. Checkpoint - Utility functions and property tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor Gallery page to album cards
  - [x] 4.1 Refactor Gallery.tsx to render album cards (GalleryIndex)
    - Replace flat image listing with album card grid using `toAlbumCard` utility
    - Render responsive grid: 1 col mobile, 2 cols tablet (`sm:grid-cols-2`), 3 cols desktop (`lg:grid-cols-3`)
    - Each card is a `<Link>` to `/gallery/${slug}` with cover image (aspect-[4/3]), title, excerpt, image count badge
    - Show placeholder image for albums with no media
    - Show loading spinner while fetching
    - Show "No galleries are available yet." when empty
    - Keep export name as `Gallery` for route compatibility
    - Set page title to "Gallery - {site_title}" via react-helmet-async
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 7.1, 8.1_

- [x] 5. Create AlbumPage component and route
  - [x] 5.1 Create AlbumPage component
    - Create `frontend/public-website/src/pages/AlbumPage.tsx`
    - Use `useParams` to get slug, `useContentBySlug` to fetch album data
    - Validate content is type 'gallery' and status 'published'
    - Render album title, excerpt, and image grid (`grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`)
    - Use `thumbnails.medium` for grid images with `loading="lazy"`
    - Click image opens Lightbox at that index
    - Include back-navigation link to `/gallery`
    - Handle loading, not-found, and empty states
    - Set page title to "{album_title} - Gallery - {site_title}" and meta description to excerpt
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 7.2, 7.3_

  - [x] 5.2 Add album route to App.tsx
    - Import `AlbumPage` and add `<Route path="/gallery/:slug" element={<AlbumPage />} />`
    - Place after the `/gallery` route
    - _Requirements: 2.1, 3.1_

- [x] 6. Create useSwipe hook and enhance Lightbox
  - [x] 6.1 Create useSwipe hook
    - Create `frontend/public-website/src/hooks/useSwipe.ts`
    - Implement pointer event handlers (onPointerDown, onPointerMove, onPointerUp, onPointerCancel)
    - Use `detectSwipe` utility for direction logic
    - Track single active pointer, reset on pointerup/pointercancel
    - Accept options: `onSwipeLeft`, `onSwipeRight`, `threshold` (default 50px)
    - _Requirements: 5.5, 5.6_

  - [x] 6.2 Enhance Lightbox with swipe support and improved captions
    - Integrate `useSwipe` hook for touch/pointer gesture navigation
    - Reposition caption overlay: absolute bottom of image container with `bg-black/70 text-white` semi-transparent bar
    - Only render caption overlay when `metadata.caption` is non-empty
    - Move position indicator to top-right of overlay
    - Add `role="dialog"` and `aria-modal="true"` for accessibility
    - Ensure previous button hidden at index 0, next button hidden at last index (already exists, verify)
    - _Requirements: 5.5, 5.6, 5.9, 6.1, 6.2, 6.3, 6.4_

- [x] 7. Checkpoint - Full feature integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Component unit tests
  - [x] 8.1 Write unit tests for Gallery (GalleryIndex) page
    - Test loading state renders spinner
    - Test empty state renders "no galleries" message
    - Test correct number of album cards rendered
    - Test album cards are `<a>` elements (semantic links)
    - Test responsive grid classes applied
    - Test album card hover feedback
    - **Validates: Requirements 1.1-1.6, 2.1-2.3, 7.1, 8.1 (Property 1)**

  - [x] 8.2 Write unit tests for AlbumPage
    - Test loading state renders spinner
    - Test not-found state when slug doesn't match
    - Test empty album state when media is empty
    - Test all images rendered in grid with correct sources
    - Test images use `loading="lazy"` attribute
    - Test back link to `/gallery` is present
    - Test SEO helmet sets correct title and description
    - Test clicking image opens lightbox at correct index
    - **Validates: Requirements 3.1-3.7, 4.1, 7.2, 7.3 (Properties 4, 5)**

  - [x] 8.3 Write unit tests for enhanced Lightbox
    - Test renders nothing when images array is empty
    - Test Escape key closes viewer
    - Test ArrowRight/ArrowLeft navigation
    - Test close button calls onClose
    - Test previous button hidden at first image
    - Test next button hidden at last image
    - Test caption overlay renders with correct styling when caption exists
    - Test caption overlay not rendered when no caption
    - Test `role="dialog"` and `aria-modal="true"` present
    - Test swipe left triggers next, swipe right triggers previous
    - **Validates: Requirements 4.4, 5.1-5.9, 6.1-6.4**

  - [x] 8.4 Write unit tests for useSwipe hook
    - Test calls onSwipeLeft for leftward movement exceeding threshold
    - Test calls onSwipeRight for rightward movement exceeding threshold
    - Test no callback when movement below threshold
    - Test no callback for vertical-dominant gestures
    - Test state resets after pointerup and pointercancel
    - **Validates: Requirements 5.5, 5.6**

- [x] 9. Final checkpoint - Build and lint
  - Ensure all tests pass (`npm test -- --run` in frontend/public-website)
  - Ensure lint passes (`npm run lint` in frontend/public-website)
  - Ensure build passes (`npm run build` in frontend/public-website)
  - Ask the user if questions arise.

- [x] 10. Deploy and verify on staging
  - [x] 10.1 Commit, push, and deploy to staging
    - Stage all changed files, commit with descriptive message
    - Push to `develop` branch to trigger GitHub Actions deployment
    - Wait for deployment to complete
    - _Requirements: All_

  - [x] 10.2 Verify on staging site
    - Navigate to https://staging.serverless.celestium.life/gallery
    - Verify album cards display correctly with cover images, titles, excerpts, image counts
    - Click an album card and verify navigation to `/gallery/:slug`
    - Verify image grid loads with lazy-loaded thumbnails
    - Click an image and verify lightbox opens at correct index
    - Test keyboard navigation (arrows, escape)
    - Test swipe gestures on touch-capable device/emulation
    - Verify captions display correctly in semi-transparent overlay
    - Verify back navigation link works
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `Gallery` export name is preserved for route compatibility
- The staging environment has 23 galleries with 863 images for realistic testing
- ESLint max-warnings 0 — all code must pass lint before commit

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "6.2"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["10.1"] },
    { "id": 7, "tasks": ["10.2"] }
  ]
}
```
