# Implementation Plan: Blog Sections & Markdown

## Overview

Implement hierarchical blog sections for organizing posts into a navigable tree structure, and a full extended markdown rendering pipeline using unified/remark/rehype. The implementation proceeds in layers: infrastructure first, then backend section logic, shared markdown renderer, admin panel UI, and finally public website integration. Property-based tests validate the 27 correctness properties defined in the design.

## Tasks

- [x] 1. CDK Infrastructure — Sections table and content table GSI
  - [x] 1.1 Add Sections DynamoDB table to CDK stack
    - Add `cms-sections-{env}` table to `lib/serverless-cms-stack.ts`
    - Primary key: `id` (String), PAY_PER_REQUEST billing, RETAIN removal policy, point-in-time recovery enabled
    - Add GSI `slug-index`: PK `slug` (String), projection ALL
    - Add GSI `parent_id-sort_order-index`: PK `parent_id` (String), SK `sort_order` (Number), projection ALL
    - Grant read/write to section Lambda functions
    - _Requirements: 1.1, 1.5_

  - [x] 1.2 Add section_id-published_at GSI to existing content table
    - Add GSI `section_id-published_at-index` on existing content table: PK `section_id` (String), SK `published_at` (Number)
    - Grant read access for section Lambda and content Lambda
    - _Requirements: 3.3_

  - [x] 1.3 Add Section Lambda function resources to CDK stack
    - Create Lambda function resource for section CRUD handlers at `lambda/sections/`
    - Wire API Gateway routes: POST/GET/PUT/DELETE `/api/v1/sections` and `/api/v1/sections/{id}`
    - Add public routes: GET `/api/v1/public/sections/tree`, GET `/api/v1/public/sections/path/{path+}`, GET `/api/v1/public/sections/{id}/posts`
    - Set environment variables: SECTIONS_TABLE, CONTENT_TABLE, ENVIRONMENT
    - _Requirements: 2.1, 2.6, 4.2_

- [x] 2. Backend — Section repository and service
  - [x] 2.1 Create SectionRepository class
    - Create `lambda/shared/sections_db.py`
    - Implement `create()` with transactional slug-lock pattern (put section + put SLUG#{slug} item with condition attribute_not_exists)
    - Implement `get_by_id()`, `get_by_slug()` (via slug-index GSI), `get_children()` (via parent_id-sort_order-index)
    - Implement `get_all_sections()` filtering out slug_lock entity_type items
    - Implement `update()` with conditional slug-lock transaction when slug changes
    - Implement `delete()` removing both section and slug-lock items transactionally
    - Implement `get_descendant_ids()` and `count_children()`
    - _Requirements: 1.1, 1.5, 1.6, 2.1, 2.2, 2.3, 2.6_

  - [x] 2.2 Create section validation and service module
    - Create `lambda/sections/service.py`
    - Implement `validate_section_input()`: name max 100 chars, slug max 120 chars, slug pattern `^[a-z0-9-]+$`, sort_order 0–1000
    - Implement `compute_depth()`: walk parent chain, return depth (root=1), raise if >5
    - Implement `build_path()`: construct full slug path and path_ids from root to section
    - Implement `build_tree()`: flat sections list to nested tree structure, sorted by sort_order ASC, name ASC, id ASC
    - Implement `resolve_path()`: walk slug segments matching parent_id chain
    - _Requirements: 1.2, 1.3, 1.7, 1.8, 2.6, 2.9, 4.3_

  - [x] 2.3 Create section Lambda handlers
    - Create `lambda/sections/create.py`: validate input, check parent exists, compute depth, build path, call repository create
    - Create `lambda/sections/update.py`: validate input, handle slug change, recompute path if parent changes
    - Create `lambda/sections/delete.py`: check no children (count_children), check no assigned posts (query content table), call repository delete
    - Create `lambda/sections/get.py`: get by ID with post count, get all as tree
    - Create `lambda/sections/public.py`: get tree (unauthenticated), resolve path, get section posts with pagination (20 per page) including descendants
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.4, 4.2_

  - [x] 2.4 Update content Lambda for section assignment
    - Modify `lambda/content/create.py` and `lambda/content/update.py`
    - Add `validate_section_assignment()`: verify section_id exists in sections table if provided
    - Add `compute_section_path_ids()`: get full path_ids from the assigned section
    - Store `section_id` and `section_path_ids` as top-level attributes on content items
    - Store `content_markdown`, `content_format` fields when provided
    - Validate `content_markdown` max 500,000 characters
    - _Requirements: 3.1, 3.2, 3.5, 5.2, 5.3_

  - [x] 2.5 Write backend unit tests for section repository and service
    - Create `tests/test_sections_crud.py`: test create, read, update, delete operations with moto
    - Create `tests/test_sections_validation.py`: test field validation, slug format, depth limits
    - Create `tests/test_sections_tree.py`: test tree construction, path resolution
    - Create `tests/test_sections_posts.py`: test post queries by section, ancestor inclusion
    - Create `tests/test_content_markdown.py`: test content_markdown storage, section_id validation
    - _Requirements: 1.1–1.8, 2.1–2.9, 3.1–3.7_

- [x] 3. Checkpoint — Backend sections and content integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Shared markdown renderer module
  - [x] 4.1 Set up shared markdown module structure and install dependencies
    - Create directory `frontend/shared/markdown/` with files: `index.ts`, `types.ts`, `renderMarkdown.ts`, `createProcessor.ts`, `sanitizeSchema.ts`, `toc.ts`, `slugify.ts`
    - Create `frontend/shared/markdown/plugins/` directory
    - Install packages in both admin-panel and public-website: `unified`, `remark-parse`, `remark-gfm`, `remark-math`, `remark-rehype`, `rehype-katex`, `rehype-prism-plus`, `rehype-stringify`, `rehype-sanitize`, `katex`
    - Define TypeScript types: `TocItem`, `MarkdownRenderOptions`, `MarkdownRenderResult`, `MarkdownRenderWarning`, `SupportedLanguage`
    - _Requirements: 6.1–6.9, 7.1–7.6, 8.1–8.6, 10.1–10.7_

  - [x] 4.2 Implement core markdown processor and sanitization
    - Create `createProcessor.ts`: build unified pipeline with remark-parse → remark-gfm → remark-math → custom plugins → remark-rehype → rehype-katex → rehype-prism-plus (skip mermaid) → rehype-sanitize → rehype-stringify
    - Create `sanitizeSchema.ts`: extend rehype-sanitize defaults to allow KaTeX classes, Prism classes, math-inline/math-block, but strip script, on* attrs, javascript: URLs, data: URIs, iframes
    - Implement `renderMarkdown.ts` with `renderMarkdownToHtml()`: empty/whitespace check returns empty string, length check (500k max), run processor, return `MarkdownRenderResult`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 4.3 Implement TOC generator and heading ID slugification
    - Create `slugify.ts` with `slugifyHeading()`: lowercase, replace spaces/special with hyphens, remove non-alphanumeric (except hyphens), collapse consecutive hyphens, deduplicate with `-1`, `-2` suffixes
    - Create `toc.ts` with TOC extraction: extract h1–h6 from AST, build nested `TocItem[]` tree, determine `shouldShowToc` (3+ headings threshold)
    - Create `plugins/rehypeHeadingIds.ts`: assign slugified IDs to heading elements
    - Create `plugins/rehypeExtractToc.ts`: extract TOC during rehype processing
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 4.4 Implement extended syntax plugins
    - Create `plugins/remarkDefinitionList.ts`: parse definition list syntax into dl/dt/dd
    - Create `plugins/remarkAbbreviations.ts`: parse abbreviation definitions, wrap matching text in `<abbr>` with title
    - Create `plugins/remarkSuperSub.ts`: parse `^text^` as `<sup>` and `~text~` as `<sub>`
    - Create `plugins/rehypeMermaidPassthrough.ts`: skip mermaid code blocks from Prism highlighting
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 7.4_

  - [x] 4.5 Create shared section types module
    - Create `frontend/shared/sections/types.ts`
    - Define interfaces: `Section`, `SectionTreeNode`, `CreateSectionRequest`, `UpdateSectionRequest`
    - Export from `frontend/shared/sections/index.ts`
    - _Requirements: 1.1, 2.1_

- [x] 5. Shared markdown renderer — property-based tests
  - [x] 5.1 Write property test for deterministic rendering (Property 24)
    - **Property 24: Deterministic rendering**
    - For any markdown input, renderMarkdownToHtml produces byte-identical HTML on repeated invocations
    - Use fast-check with numRuns: 100
    - **Validates: Requirements 10.2**

  - [x] 5.2 Write property test for XSS sanitization (Property 25)
    - **Property 25: XSS sanitization**
    - For any markdown input containing script tags, on* attributes, javascript: URLs, data: URIs, or iframes, the rendered output contains none of these
    - **Validates: Requirements 10.3**

  - [x] 5.3 Write property test for whitespace/empty handling (Property 26)
    - **Property 26: Whitespace/empty input handling**
    - For any input that is empty or whitespace-only, renderMarkdownToHtml returns empty string
    - **Validates: Requirements 10.4, 10.5**

  - [x] 5.4 Write property test for TOC anchor ID generation (Property 22)
    - **Property 22: TOC anchor ID generation**
    - For any heading text, slugifyHeading produces lowercase output matching `^[a-z0-9-]*$` with no consecutive hyphens; duplicates get numeric suffixes
    - **Validates: Requirements 9.3, 9.4**

  - [x] 5.5 Write property test for TOC display threshold (Property 23)
    - **Property 23: TOC display threshold**
    - For any document, shouldShowToc is true iff the document contains 3 or more headings
    - **Validates: Requirements 9.5, 9.6**

  - [x] 5.6 Write property test for GFM table rendering (Property 12)
    - **Property 12: GFM table rendering**
    - For any valid GFM table with varying columns and alignments, output contains thead/tbody/th/td with correct alignment
    - **Validates: Requirements 6.1**

  - [x] 5.7 Write property test for footnote integrity (Property 13)
    - **Property 13: Footnote rendering integrity**
    - For any markdown with N footnote references and N definitions, output contains N superscript links and N footer items with back-references
    - **Validates: Requirements 6.2**

  - [x] 5.8 Write property test for task list checkbox state (Property 14)
    - **Property 14: Task list checkbox state**
    - For any task list with checked/unchecked items, rendered HTML contains disabled checkboxes matching source state
    - **Validates: Requirements 6.3**

  - [x] 5.9 Write property test for math delimiter handling (Property 16)
    - **Property 16: Math delimiter handling**
    - For any inline/display math, output has math-inline/math-block classes preserving LaTeX; escaped dollars are literal
    - **Validates: Requirements 6.8, 8.5**

  - [x] 5.10 Write property test for malformed syntax degradation (Property 17)
    - **Property 17: Malformed syntax graceful degradation**
    - For any malformed extended syntax, renderer outputs source as literal text without transformation
    - **Validates: Requirements 6.9, 10.7**

  - [x] 5.11 Write property test for code block HTML escaping (Property 19)
    - **Property 19: HTML entity escaping in code blocks**
    - For any code block with `<`, `>`, `&`, `"`, output contains entity-escaped equivalents
    - **Validates: Requirements 7.5**

  - [x] 5.12 Write property test for syntax highlighting (Property 18)
    - **Property 18: Syntax highlighting with language**
    - For any fenced code block with supported language, output has span elements with Prism classes; unsupported renders plain pre>code
    - **Validates: Requirements 7.1, 7.3**

- [x] 6. Checkpoint — Shared markdown renderer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Admin panel — Section management UI
  - [x] 7.1 Create section API service and hooks
    - Create `frontend/admin-panel/src/services/sectionService.ts` with API calls for CRUD operations
    - Create `frontend/admin-panel/src/hooks/useSections.ts` with React Query hooks for fetching/mutating sections
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 7.2 Create SectionManager page with tree view
    - Create `frontend/admin-panel/src/pages/SectionManager.tsx`
    - Render collapsible tree view showing each section's name, post count, sort order
    - Add as top-level item in admin navigation sidebar
    - Support inline editing of name, description, parent, sort_order (save on blur/Enter)
    - Display error notifications on operation failure, preserving unsaved input
    - _Requirements: 11.1, 11.2, 11.5, 11.6_

  - [x] 7.3 Create SectionForm component for create/edit
    - Create `frontend/admin-panel/src/components/SectionForm.tsx`
    - Fields: name (1–100 chars), slug (1–120 chars, pattern validated), parent selector (hierarchical dropdown), description (max 500 chars), sort_order (0–1000)
    - Inline slug validation showing error if already in use
    - Delete confirmation dialog listing child count/names and assigned post count
    - _Requirements: 11.3, 11.4, 11.7_

  - [x] 7.4 Add section selector to post editor
    - Modify post editor to include section selector dropdown
    - Display section hierarchy with indentation (one level per depth, max 5 levels)
    - Include empty/none option to unassign from any section
    - Store selected section_id in content metadata on save
    - _Requirements: 3.1, 3.6_

- [x] 8. Admin panel — Markdown editor integration
  - [x] 8.1 Install CodeMirror 6 and set up markdown editor component
    - Install `@codemirror/lang-markdown`, `@codemirror/view`, `@codemirror/state` in admin-panel
    - Create `frontend/admin-panel/src/components/MarkdownEditor.tsx`
    - Monospace font, plain-text editing area, configurable maxLength (500k default)
    - _Requirements: 5.1_

  - [x] 8.2 Implement editor mode toggle in post editor
    - Add mode toggle (WYSIWYG / Markdown) to post editor
    - Persist `content_format` field (`markdown` | `html`) in content record
    - When switching to markdown mode from WYSIWYG without existing content_markdown: show confirmation warning about potential formatting loss
    - When switching from markdown to WYSIWYG: load pre-rendered HTML from content field into TipTap
    - _Requirements: 5.4, 5.5, 5.6, 5.7_

  - [x] 8.3 Add live markdown preview panel
    - Create split-pane or toggleable preview using shared `renderMarkdownToHtml`
    - Preview updates on editor content change (debounced)
    - Render preview HTML including KaTeX CSS for math rendering
    - _Requirements: 5.1, 5.2_

  - [x] 8.4 Write admin panel component tests
    - Test SectionManager tree rendering and CRUD interactions
    - Test SectionForm validation (slug format, name length, duplicate detection)
    - Test editor mode toggle behavior and confirmation dialogs
    - Test section selector dropdown hierarchy display
    - _Requirements: 11.1–11.7, 5.4–5.7_

- [x] 9. Checkpoint — Admin panel sections and markdown editor
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Public website — Section navigation and pages
  - [x] 10.1 Create section API service for public site
    - Create `frontend/public-website/src/services/sectionService.ts`
    - Implement: `fetchSectionTree()`, `fetchSectionByPath(path)`, `fetchSectionPosts(sectionId, page)`
    - _Requirements: 4.1, 4.2_

  - [x] 10.2 Create SectionNavigation component
    - Create `frontend/public-website/src/components/SectionNavigation.tsx`
    - Render navigable tree in blog sidebar/header, displaying sections up to 4 levels deep
    - Ordered alphabetically within each level
    - Highlight active section based on current URL
    - _Requirements: 4.1_

  - [x] 10.3 Create BlogSectionPage component
    - Create `frontend/public-website/src/pages/BlogSectionPage.tsx`
    - Resolve section from URL path (e.g., `/blog/sections/technology/web-development`)
    - Display published posts for section + descendants, sorted by published_at DESC
    - Paginate with max 20 posts per page
    - Show child section links ordered alphabetically
    - Show "no posts available" message when section has no content
    - Return 404 for non-existent section paths
    - Add route in React Router for `/blog/sections/*`
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 10.4 Write property test for section URL path construction (Property 10)
    - **Property 10: Section URL path construction**
    - For any section in the hierarchy, the URL path equals concatenation of slugs from root to section separated by `/`
    - **Validates: Requirements 4.3**

- [x] 11. Public website — Markdown rendering and TOC
  - [x] 11.1 Create MarkdownContent component
    - Create `frontend/public-website/src/components/MarkdownContent.tsx`
    - Use shared `renderMarkdownToHtml()` to render markdown content
    - Include KaTeX CSS import for math rendering
    - Display TOC above content when `shouldShowToc` is true (3+ headings)
    - TOC entries link to anchor IDs, smooth scroll on click
    - _Requirements: 9.5, 9.6, 9.7_

  - [x] 11.2 Update BlogContent for rendering path selection
    - Modify existing BlogContent component to check `content_markdown` field
    - If `content_markdown` is non-empty: render via MarkdownContent component
    - If `content_markdown` is empty/absent: render `content` HTML field using existing HTML path
    - Preserve Mermaid diagram rendering for both paths
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

  - [x] 11.3 Add code block styling and horizontal scroll
    - Add CSS for `pre > code` blocks: horizontal scroll on overflow, no line wrapping
    - Include Prism.js theme CSS for syntax highlighting colors
    - Ensure mermaid blocks are passed to existing MermaidRenderer
    - _Requirements: 7.4, 7.6_

  - [x] 11.4 Write property test for rendering path selection (Property 27)
    - **Property 27: Rendering path selection**
    - For any content item, if content_markdown is non-empty render via Markdown_Renderer; otherwise render content HTML via existing path
    - **Validates: Requirements 12.1, 12.2, 12.5**

- [x] 12. Backend property-based tests
  - [x] 12.1 Write property test for section slug uniqueness (Property 2)
    - **Property 2: Section slug uniqueness**
    - For any two sections, no two may share the same slug; duplicate slug creation returns validation error
    - Use pytest + moto with randomized slug inputs
    - **Validates: Requirements 1.5, 1.6, 2.7**

  - [x] 12.2 Write property test for section nesting depth (Property 3)
    - **Property 3: Section nesting depth constraint**
    - For any chain of parent-child sections, depths 1–5 are accepted, depth >5 is rejected
    - **Validates: Requirements 1.7, 1.8**

  - [x] 12.3 Write property test for section field validation (Property 4)
    - **Property 4: Section field validation**
    - For any input, reject names >100 chars, slugs >120 chars, slugs with invalid characters
    - **Validates: Requirements 2.9**

  - [x] 12.4 Write property test for section deletion constraint (Property 5)
    - **Property 5: Section deletion constraint**
    - For any section with children or assigned posts, deletion is rejected with no data modification
    - **Validates: Requirements 2.4, 2.5, 3.7**

  - [x] 12.5 Write property test for section tree construction (Property 6)
    - **Property 6: Section hierarchy tree construction**
    - For any set of sections, build_tree returns correctly nested structure with each section's children
    - **Validates: Requirements 2.6**

  - [x] 12.6 Write property test for section CRUD round-trip (Property 7)
    - **Property 7: Section CRUD round-trip**
    - For any valid section data, create then get_by_id returns record with all original fields preserved
    - **Validates: Requirements 2.1, 2.2**

  - [x] 12.7 Write property test for content-section assignment (Property 8)
    - **Property 8: Content-section assignment validation**
    - For any content with section_id, operation succeeds only if section exists; otherwise validation error
    - **Validates: Requirements 3.1, 3.2**

  - [x] 12.8 Write property test for ancestor post inclusion (Property 9)
    - **Property 9: Ancestor section post inclusion**
    - For any post at depth N, querying ancestor sections includes that post in results
    - **Validates: Requirements 3.5**

- [x] 13. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (27 total)
- The shared markdown module at `frontend/shared/markdown/` is consumed by both admin-panel and public-website via relative imports or workspace symlink
- Backend tests use moto for DynamoDB mocking, pytest-hypothesis or manual randomization for property tests
- Frontend property tests use fast-check (already installed in public-website)
- Infrastructure must be deployed before backend integration tests can run against real AWS

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "4.1", "4.5"] },
    { "id": 1, "tasks": ["2.1", "4.2"] },
    { "id": 2, "tasks": ["2.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["2.3", "2.4", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12"] },
    { "id": 4, "tasks": ["2.5", "7.1", "10.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4", "8.1", "10.2", "10.3"] },
    { "id": 6, "tasks": ["8.2", "8.3", "11.1", "11.2", "11.3"] },
    { "id": 7, "tasks": ["8.4", "10.4", "11.4", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8"] }
  ]
}
```
