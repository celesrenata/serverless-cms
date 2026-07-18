# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Landing Page Missing Fields and Wrong Layout
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope to sections with a `page_id` mapped and a non-null `landing_page` in the response
  - Backend test: call `_fetch_landing_page(page_id)` and assert response includes `author_name` (string) and `published_at` (number) fields
  - Backend test: assert `author_name` defaults to `'Unknown Author'` when author user lookup fails
  - Frontend test: render `BlogSectionPage` with `postsResponse.landing_page` present and assert:
    - The page's own title renders as h1 (not section name)
    - Section description is NOT displayed
    - A byline with author name and formatted date is visible
    - A "← Back to Blog" link is present
    - Featured image renders if present in landing_page
    - Content renders via BlogContent component
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bug exists)
  - Document counterexamples: backend returns landing page without `author_name`/`published_at`; frontend renders section name as h1 even when landing page exists; no byline element in DOM
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Standard Section Behavior Without Landing Page
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: render `BlogSectionPage` with `postsResponse.landing_page = null` (no `page_id` set)
  - Observe: section name renders as h1 heading
  - Observe: section description displays below heading
  - Observe: post cards render in a grid layout with PostCard components
  - Observe: pagination controls appear for multi-page sections
  - Observe: subsection links render when child sections exist
  - Observe: 404 page renders for invalid section paths
  - Write property-based tests capturing observed behavior:
    - For all sections without landing pages, section name renders as h1
    - For all sections without landing pages, post grid renders with PostCard components
    - For all sections without landing pages with children, subsection links render
    - For sections with `page_id` pointing to unpublished page (`landing_page` is null), standard section layout renders
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for section landing page rendering

  - [ ] 3.1 Update backend `_fetch_landing_page()` to return enriched fields
    - In `lambda/sections/public.py`, import `UserRepository` from `shared.db` at module level
    - In `_fetch_landing_page()`, add `published_at` field: `page.get('published_at', 0)`
    - Look up author name: get `author_id = page.get('author', '')`, instantiate `UserRepository`, call `get_by_id(author_id)`
    - Return `author_name` field from user lookup, defaulting to `'Unknown Author'` if lookup fails or user is None
    - _Bug_Condition: isBugCondition(input) where section.page_id IS NOT NULL AND landing_page response lacks author_name/published_at_
    - _Expected_Behavior: landing_page response includes author_name (string) and published_at (unix timestamp)_
    - _Preservation: sections without page_id are unaffected — _fetch_landing_page is only called when page_id exists_
    - _Requirements: 1.5, 2.5_

  - [ ] 3.2 Update `LandingPage` TypeScript interface
    - In `frontend/shared/sections/types.ts`, add `author_name?: string` to the `LandingPage` interface
    - In `frontend/shared/sections/types.ts`, add `published_at?: number` to the `LandingPage` interface
    - _Requirements: 2.5_

  - [ ] 3.3 Update `BlogSectionPage` frontend rendering
    - In `frontend/public-website/src/pages/BlogSectionPage.tsx`:
    - When `postsResponse?.landing_page` exists, render Post-style layout:
      - "← Back to Blog" Link component pointing to `/blog`
      - `landing_page.title` as h1 heading
      - "By {author_name} • {formatted_date}" byline (format date from `published_at` unix timestamp)
      - Featured image if `landing_page.featured_image` is present
      - `BlogContent` component with `landing_page.content`
      - Subsection links below content (keep existing subsection rendering logic)
    - When NO landing page (`landing_page` is null/undefined): keep ALL existing rendering unchanged
    - Do NOT render section name h1 or section description when landing page is present
    - Reference `Post.tsx` for rendering pattern, styling, and date formatting approach
    - _Bug_Condition: isBugCondition(input) where postsResponse.landing_page IS NOT NULL AND component renders section header instead of page content_
    - _Expected_Behavior: Post-style layout with page title, byline, featured image, content, and back link_
    - _Preservation: when landing_page is null, render exactly as before (section name h1, description, post grid, pagination)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Landing Page Renders in Post-Style Layout
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Standard Section Behavior Without Landing Page
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `pytest tests/ -v` for backend, `cd frontend/public-website && npm test -- --run` for frontend
  - Verify no regressions in existing section navigation tests
  - Verify no regressions in existing BlogSectionPage tests
  - Ensure all tests pass, ask the user if questions arise.
