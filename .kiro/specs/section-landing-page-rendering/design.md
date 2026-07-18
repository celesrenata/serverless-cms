# Section Landing Page Rendering Bugfix Design

## Overview

When a blog section has a `page_id` mapped (via the admin Landing Page dropdown), navigating to that section renders the page content in a degraded way: it shows the section name as h1, the section description, and raw content without the page's title, author byline, or publication date. The fix ensures landing pages render in the same Post-style layout used for individual blog posts — with their own title, author byline, featured image, and rich content — while preserving all existing behavior for sections without landing pages.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a section has a `page_id` mapped and returns a `landing_page` object in the posts response
- **Property (P)**: The desired behavior — landing pages render in Post-style layout with title, byline, featured image, and full content
- **Preservation**: Existing behavior for sections without landing pages (post index, pagination, subsection links) must remain unchanged
- **`_fetch_landing_page()`**: The function in `lambda/sections/public.py` that retrieves the landing page content item from DynamoDB
- **`BlogSectionPage`**: The React component in `frontend/public-website/src/pages/BlogSectionPage.tsx` that renders section pages
- **`LandingPage`**: The TypeScript interface in `frontend/shared/sections/types.ts` defining the shape of landing page data

## Bug Details

### Bug Condition

The bug manifests when a section has a `page_id` mapped and the user navigates to `/blog/sections/{path}`. The `BlogSectionPage` component renders the section name and description as headers above the landing page content, and the backend does not include `author_name` or `published_at` in the landing page response, making it impossible to render a proper byline.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { sectionPath: string, section: Section, postsResponse: SectionPostsResponse }
  OUTPUT: boolean
  
  RETURN input.section.page_id IS NOT NULL
         AND input.postsResponse.landing_page IS NOT NULL
         AND (
           rendersAsSectionHeader(input.sectionPath)
           OR NOT hasAuthorByline(input.postsResponse.landing_page)
           OR NOT hasPublishedDate(input.postsResponse.landing_page)
         )
END FUNCTION
```

### Examples

- Section "Photography Guide" with `page_id` set → navigating to `/blog/sections/photography-guide` shows "Photography Guide" as h1 (section name) instead of the page's own title "Complete Guide to Street Photography"
- Same section → no "By Jane Smith • March 15, 2024" byline shown because `author_name` and `published_at` are missing from the response
- Same section → section description "Posts about photography" displayed above content, cluttering the page view
- Section with `page_id` pointing to a draft page → `landing_page` is null in response, falls back to normal post index (correct behavior, unchanged)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Sections WITHOUT a `page_id` must continue to display section name as h1, section description, and paginated post grid
- Sections WITHOUT a `page_id` must continue to show subsection links when child sections exist
- Pagination controls must continue to work for sections without landing pages
- The 404 "Section Not Found" page for invalid paths must remain unchanged
- Landing pages that are not published must still result in null `landing_page` (fallback to post index)

**Scope:**
All inputs where `postsResponse.landing_page` is null (either no `page_id` set, or referenced page is unpublished) should be completely unaffected by this fix. This includes:
- Standard section browsing with post grids
- Section pagination
- Subsection navigation
- 404 handling for non-existent paths

## Hypothesized Root Cause

Based on the bug description, the issues are:

1. **Missing Backend Fields**: The `_fetch_landing_page()` function in `lambda/sections/public.py` only returns `id`, `title`, `slug`, `content`, `featured_image`, and `excerpt`. It does not include `author_name` (requiring a user lookup) or `published_at` from the content item.

2. **Incorrect Frontend Layout**: The `BlogSectionPage` component always renders the section name as h1 and section description regardless of whether a landing page exists. When `landing_page` is present, it should switch to a Post-style layout with the page's own title, byline, and content.

3. **Missing Type Definitions**: The `LandingPage` TypeScript interface lacks `author_name` and `published_at` fields, so even if the backend returned them, the frontend wouldn't type-check correctly.

4. **No "Back to Blog" Navigation**: When rendering a landing page, there's no back-navigation link, unlike the Post component which includes "← Back to Blog".

## Correctness Properties

Property 1: Bug Condition - Landing Page Renders in Post-Style Layout

_For any_ section navigation where the section has a `page_id` and the backend returns a non-null `landing_page` object, the `BlogSectionPage` component SHALL render the page's own title as h1, display the author name and formatted publication date as a byline, show the featured image if present, render the full content via BlogContent, include a "← Back to Blog" link, and show subsection links below the content if child sections exist. The section name and description SHALL NOT be displayed.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - Standard Section Behavior Without Landing Page

_For any_ section navigation where `postsResponse.landing_page` is null (no `page_id` set or referenced page unpublished), the `BlogSectionPage` component SHALL produce exactly the same rendering as the original code — showing section name as h1, section description, subsection links, paginated post grid with PostCard components, and pagination controls.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `lambda/sections/public.py`

**Function**: `_fetch_landing_page(page_id)`

**Specific Changes**:
1. **Add `published_at` to response**: Include `page.get('published_at', 0)` in the returned dictionary
2. **Add author enrichment**: Look up the author's name from the users table using the `author` field on the content item. Instantiate `UserRepository` (from `shared.db`) and call `get_by_id(author_id)` to get the user's name. Return it as `author_name` in the response.
3. **Handle missing author gracefully**: If author lookup fails or user doesn't exist, default to `'Unknown Author'`

---

**File**: `frontend/shared/sections/types.ts`

**Interface**: `LandingPage`

**Specific Changes**:
1. **Add `author_name` field**: `author_name?: string`
2. **Add `published_at` field**: `published_at?: number`

---

**File**: `frontend/public-website/src/pages/BlogSectionPage.tsx`

**Component**: `BlogSectionPage`

**Specific Changes**:
1. **Add conditional rendering**: When `postsResponse?.landing_page` exists, render the Post-style layout instead of the standard section layout
2. **Suppress section header**: Do NOT render section name h1 or section description when landing page is present
3. **Add "← Back to Blog" link**: Match the Post component's back navigation style
4. **Render page title as h1**: Use `landing_page.title` instead of `section.name`
5. **Render byline**: Show "By {author_name} • {formatted date}" using the same date formatting as Post component
6. **Render featured image**: Show `landing_page.featured_image` if present with proper styling
7. **Render content**: Use `BlogContent` component with `landing_page.content`
8. **Keep subsection links**: Continue showing child section links below the content when they exist

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that verify the backend response shape and frontend rendering when a section has a landing page. Run on UNFIXED code to confirm failures.

**Test Cases**:
1. **Backend Missing Fields Test**: Call `_fetch_landing_page()` and assert `author_name` and `published_at` are in the response (will fail on unfixed code)
2. **Frontend Section Header Test**: Render `BlogSectionPage` with a landing page response and assert section name h1 is NOT present (will fail on unfixed code — it currently shows section name)
3. **Frontend Byline Test**: Render `BlogSectionPage` with a landing page and assert author/date byline is visible (will fail on unfixed code)
4. **Frontend Back Link Test**: Render with landing page and assert "← Back to Blog" link exists (will fail on unfixed code)

**Expected Counterexamples**:
- Backend returns landing page without `author_name` or `published_at` fields
- Frontend renders section name as h1 even when landing page exists
- No byline element rendered in the DOM when landing page is present

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderBlogSectionPage_fixed(input)
  ASSERT result.hasPageTitleAsH1(input.landing_page.title)
  ASSERT result.hasByline(input.landing_page.author_name, input.landing_page.published_at)
  ASSERT result.hasBackToBlogLink()
  ASSERT NOT result.hasSectionNameHeader()
  ASSERT NOT result.hasSectionDescription()
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderBlogSectionPage_original(input) = renderBlogSectionPage_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various section configurations, post counts, pagination states)
- It catches edge cases that manual unit tests might miss (empty sections, sections with many children, etc.)
- It provides strong guarantees that behavior is unchanged for all non-landing-page sections

**Test Plan**: Observe behavior on UNFIXED code first for sections without landing pages, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Post Index Preservation**: Verify that sections without `page_id` continue rendering the post grid with PostCard components
2. **Pagination Preservation**: Verify pagination controls appear and work correctly for multi-page sections
3. **Subsection Links Preservation**: Verify subsection links render for sections with children and no landing page
4. **404 Preservation**: Verify invalid section paths still show the 404 page
5. **Unpublished Landing Page Fallback**: Verify that when `page_id` points to an unpublished page, the section renders normally as a post index

### Unit Tests

- Test `_fetch_landing_page()` returns `author_name` and `published_at` for published pages
- Test `_fetch_landing_page()` returns `'Unknown Author'` when author user doesn't exist
- Test `_fetch_landing_page()` returns `None` for unpublished pages
- Test `LandingPage` interface accepts the new optional fields
- Test BlogSectionPage renders Post-style layout when `landing_page` exists
- Test BlogSectionPage renders standard layout when `landing_page` is null

### Property-Based Tests

- Generate random section configurations (with/without page_id) and verify correct layout branching
- Generate random landing page data (various author names, dates, content lengths) and verify consistent Post-style rendering
- Generate sections without landing pages with varying post counts and verify standard behavior is unchanged

### Integration Tests

- Test full navigation flow: click section link → see Post-style landing page with title, byline, image, content
- Test section with landing page AND child subsections: verify both content and subsection links render
- Test switching between a section with landing page and one without: verify correct layout for each
- Test backend enrichment end-to-end: section with page_id → API returns author_name and published_at → frontend renders byline
