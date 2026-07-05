# Implementation Plan: Frontend Component Tests

## Overview

Replace stub tests in both frontend applications with meaningful component tests that validate UI behavior, user interactions, mocked API integration, routing, and context usage. Implementation follows a layered approach: test infrastructure first, then services, hooks/contexts, components, and pages. Admin panel and public website tasks are parallelizable.

## Project Review Findings (July 2026)

**Current State:**
- Backend: 130 tests passing (pytest), all Lambda handlers working correctly
- Admin Panel: TypeScript compiles clean, ESLint passes with 0 warnings, Vite build succeeds. Only 1 stub test file exists (2 trivial assertions)
- Public Website: TypeScript compiles clean, ESLint passes with 0 warnings, Vite build succeeds. Only 1 stub test file exists (2 trivial assertions)
- CDK: Refactored into 8 modular constructs, synth/build passes, 3 stacks deployed (dev/staging/prod)
- Live API: All endpoints respond correctly (public GET 200, auth-protected 401, feature-gated 403)

**Bug Found During Review:**
- `lambda/auth/register.py` and `lambda/auth/verify_email.py` used `lambda_handler` as function name, but CDK configures handlers as `module.handler`. Fixed by renaming to `handler` in both files and updating test references.

**Test Coverage Gap:**
- Admin panel has 10 pages, 8 component groups, 10 hooks, 2 services — all untested
- Public website has 9 pages, 7 components, 3 hooks, 1 service — all untested
- Existing test infrastructure (mock data, mock handlers, mock auth context, mock settings context) is in place but not yet used by any real tests
- Missing: `renderWithProviders` utilities for both apps (the foundation needed before any component/page tests can be written)

**Priority Order:**
1. Complete test infrastructure (renderWithProviders) — unblocks everything else
2. Service layer tests — validates the API client code
3. Hook tests — validates data fetching logic
4. Component tests — validates UI building blocks
5. Page tests — validates full page integration

## Tasks

- [x] 1. Admin Panel Test Infrastructure
  - [x] 1.1 Create mock data factories for admin panel
    - Create `frontend/admin-panel/src/test/mocks/data.ts` with factory functions: `createMockContent`, `createMockMedia`, `createMockUser`, `createMockPlugin`, `createMockSettings`, `createMockComment`, `createMockContentList`, `createMockMediaList`
    - Each factory returns a valid object matching the TypeScript types with realistic defaults and accepts partial overrides
    - _Requirements: 10.3_

  - [x] 1.2 Create mock API handlers for admin panel
    - Create `frontend/admin-panel/src/test/mocks/handlers.ts` with pre-configured `vi.fn()` mock implementations for all API service methods (listContent, getContent, createContent, updateContent, deleteContent, listMedia, uploadMedia, deleteMedia, listUsers, updateUserRole, listComments, moderateComment, getSettings, updateSettings, listPlugins, activatePlugin, deactivatePlugin, configurePlugin)
    - Use data factories for return values
    - _Requirements: 10.3, 10.5_

  - [x] 1.3 Create renderWithProviders utility for admin panel
    - Create `frontend/admin-panel/src/test/utils/renderWithProviders.tsx` wrapping components in QueryClientProvider (retry: false, gcTime: 0), AuthContext.Provider, and MemoryRouter
    - Accept options for `authState`, `route`, `routePath`, `queryClient`
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 1.4 Create mock auth context utility for admin panel
    - Create `frontend/admin-panel/src/test/utils/createMockAuthContext.ts` returning a full AuthContextType with vi.fn() for login, logout, refreshUser
    - Accept options for isAuthenticated, isLoading, user, role
    - Default to authenticated admin user
    - _Requirements: 10.1, 10.2_

- [x] 2. Public Website Test Infrastructure
  - [x] 2.1 Create mock data factories for public website
    - Create `frontend/public-website/src/test/mocks/data.ts` with factory functions: `createMockContent`, `createMockComment`, `createMockSettings`, `createMockContentList`
    - Each factory returns a valid object matching types with realistic defaults
    - _Requirements: 10.3_

  - [x] 2.2 Create mock API handlers for public website
    - Create `frontend/public-website/src/test/mocks/handlers.ts` with pre-configured `vi.fn()` mocks for all public API methods (listContent, getContentBySlug, getComments, createComment, getPublicSettings)
    - _Requirements: 10.3, 10.5_

  - [x] 2.3 Create renderWithProviders utility for public website
    - Create `frontend/public-website/src/test/utils/renderWithProviders.tsx` wrapping components in QueryClientProvider (retry: false), SettingsContext.Provider, and MemoryRouter
    - Accept options for `settings`, `route`, `routePath`, `queryClient`
    - _Requirements: 10.4, 10.5_

  - [x] 2.4 Create mock settings context utility for public website
    - Create `frontend/public-website/src/test/utils/createMockSettingsContext.ts` returning a full SettingsContextType with configurable settings, loading, and error state
    - _Requirements: 10.4_

- [x] 3. Admin Panel Service Tests
  - [x] 3.1 Write API service tests for admin panel
    - Create `frontend/admin-panel/src/services/__tests__/api.test.ts`
    - Test correct HTTP method, URL, headers, body for each API method
    - Test error propagation (400, 401, 500 responses)
    - Test 401 triggering token refresh or sign-out
    - Mock axios instance methods
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 3.2 Write auth service tests for admin panel
    - Create `frontend/admin-panel/src/services/__tests__/auth.test.ts`
    - Test authenticate stores tokens and returns authenticated state
    - Test sign-out clears tokens and returns unauthenticated state
    - Test token refresh flow
    - _Requirements: 1.3, 1.4_

- [x] 4. Public Website Service Tests
  - [x] 4.1 Write API service tests for public website
    - Replace stub in `frontend/public-website/src/services/__tests__/` with meaningful tests
    - Test correct HTTP method, URL, headers for each public API method
    - Test error propagation for failed requests
    - _Requirements: 9.5_

- [x] 5. Checkpoint - Infrastructure and services verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Admin Panel Hook Tests
  - [x] 6.1 Write useAuth hook tests
    - Create `frontend/admin-panel/src/hooks/__tests__/useAuth.test.tsx`
    - Test unauthenticated initial state with no stored credentials
    - Test transition to authenticated state on sign-in with user details and role
    - Test revert to unauthenticated on sign-out
    - Test role values match defined roles (admin, editor, author, viewer)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 6.2 Write useContent hook tests
    - Create `frontend/admin-panel/src/hooks/__tests__/useContent.test.ts`
    - Test fetches content from mock API and returns expected shape
    - Test create, update, delete mutations
    - _Requirements: 5.1_

  - [x] 6.3 Write useMedia hook tests
    - Create `frontend/admin-panel/src/hooks/__tests__/useMedia.test.ts`
    - Test fetches media items
    - Test upload and delete mutation functions
    - _Requirements: 5.2_

  - [x] 6.4 Write useUsers hook tests
    - Create `frontend/admin-panel/src/hooks/__tests__/useUsers.test.ts`
    - Test fetches user data
    - Test role-update mutation functions
    - _Requirements: 5.3_

  - [x] 6.5 Write useComments hook tests
    - Create `frontend/admin-panel/src/hooks/__tests__/useComments.test.ts`
    - Test fetches comments
    - Test moderation action functions (approve, reject, spam)
    - _Requirements: 5.4_

  - [x] 6.6 Write useSettings hook tests
    - Create `frontend/admin-panel/src/hooks/__tests__/useSettings.test.ts`
    - Test fetches settings
    - Test update mutation function
    - _Requirements: 5.5_

  - [x] 6.7 Write usePlugins hook tests
    - Create `frontend/admin-panel/src/hooks/__tests__/usePlugins.test.ts`
    - Test fetches plugins
    - Test activate, deactivate, configure mutation functions
    - _Requirements: 5.6_

- [x] 7. Public Website Context and Hook Tests
  - [x] 7.1 Write SettingsContext tests
    - Create `frontend/public-website/src/contexts/__tests__/SettingsContext.test.tsx`
    - Test settings are fetched from mock API and provided to children
    - Test loading and error states
    - _Requirements: 8.1_

  - [x] 7.2 Write useContent hook tests for public website
    - Create `frontend/public-website/src/hooks/__tests__/useContent.test.ts`
    - Test returns only published content sorted by date
    - _Requirements: 8.2_

  - [x] 7.3 Write useComments hook tests for public website
    - Create `frontend/public-website/src/hooks/__tests__/useComments.test.ts`
    - Test returns approved comments for a specific content ID
    - Test submit new comment calls mock API and refreshes list
    - _Requirements: 8.3, 8.4_

  - [x] 7.4 Write useSiteSettings hook tests
    - Create `frontend/public-website/src/hooks/__tests__/useSiteSettings.test.ts`
    - Test returns site configuration values (title, description, theme, features)
    - _Requirements: 8.5_

- [x] 8. Admin Panel Component Tests
  - [x] 8.1 Write ProtectedRoute component tests
    - Create `frontend/admin-panel/src/components/__tests__/ProtectedRoute.test.tsx`
    - Test redirects unauthenticated users to login
    - Test renders children for authenticated user with sufficient role
    - Test denies access for insufficient role
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 8.2 Write Layout component tests
    - Create `frontend/admin-panel/src/components/__tests__/Layout.test.tsx`
    - Test renders navigation links and user info for authenticated user
    - _Requirements: 4.1_

- [x] 9. Public Website Component Tests
  - [x] 9.1 Write PostCard component tests
    - Create `frontend/public-website/src/components/__tests__/PostCard.test.tsx`
    - Test renders title, excerpt, date, and link to full post
    - _Requirements: 7.1_

  - [x] 9.2 Write CommentList component tests
    - Create `frontend/public-website/src/components/__tests__/CommentList.test.tsx`
    - Test renders author name, date, comment text for each comment
    - Test nested replies are visually indented
    - _Requirements: 7.2, 7.3_

  - [x] 9.3 Write CommentForm component tests
    - Create `frontend/public-website/src/components/__tests__/CommentForm.test.tsx`
    - Test renders name, email, comment text fields with submit button
    - Test valid submission calls mock API and shows success
    - Test empty required fields show validation errors
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 9.4 Write CodeBlock component tests
    - Create `frontend/public-website/src/components/__tests__/CodeBlock.test.tsx`
    - Test renders source code with syntax formatting
    - _Requirements: 7.7_

  - [x] 9.5 Write Lightbox component tests
    - Create `frontend/public-website/src/components/__tests__/Lightbox.test.tsx`
    - Test renders image in overlay with close functionality
    - _Requirements: 7.8_

- [x] 10. Checkpoint - Hooks and components verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Admin Panel Page Tests
  - [x] 11.1 Write Dashboard page tests
    - Create `frontend/admin-panel/src/pages/__tests__/Dashboard.test.tsx`
    - Test renders summary statistics and recent content with mocked data
    - _Requirements: 3.1_

  - [x] 11.2 Write ContentList page tests
    - Create `frontend/admin-panel/src/pages/__tests__/ContentList.test.tsx`
    - Test renders content items
    - Test filtering by type and status is operational
    - _Requirements: 3.2_

  - [x] 11.3 Write ContentEditor page tests
    - Create `frontend/admin-panel/src/pages/__tests__/ContentEditor.test.tsx`
    - Test renders empty form for new post with save action
    - Test populates form with post data from mock API for existing post
    - _Requirements: 3.3, 3.4_

  - [x] 11.4 Write MediaLibrary page tests
    - Create `frontend/admin-panel/src/pages/__tests__/MediaLibrary.test.tsx`
    - Test renders media items in grid
    - Test upload functionality is accessible
    - _Requirements: 3.5_

  - [x] 11.5 Write Users page tests
    - Create `frontend/admin-panel/src/pages/__tests__/Users.test.tsx`
    - Test renders user list with role information and management actions
    - _Requirements: 3.6_

  - [x] 11.6 Write Comments page tests
    - Create `frontend/admin-panel/src/pages/__tests__/Comments.test.tsx`
    - Test renders comments with moderation actions (approve, reject, spam)
    - _Requirements: 3.7_

  - [x] 11.7 Write Settings page tests
    - Create `frontend/admin-panel/src/pages/__tests__/Settings.test.tsx`
    - Test renders settings fields with current values and save action
    - _Requirements: 3.8_

  - [x] 11.8 Write Plugins page tests
    - Create `frontend/admin-panel/src/pages/__tests__/Plugins.test.tsx`
    - Test renders installed plugins with activation toggle and settings access
    - _Requirements: 3.9_

  - [x] 11.9 Write Login page tests
    - Create `frontend/admin-panel/src/pages/__tests__/Login.test.tsx`
    - Test renders email and password fields with submit button
    - Test form submission calls auth service and navigates on success
    - _Requirements: 3.10, 3.11_

  - [x] 11.10 Write Profile page tests
    - Create `frontend/admin-panel/src/pages/__tests__/Profile.test.tsx`
    - Test renders current user profile information (name, email, role, avatar)
    - Test allows editing name and bio fields
    - Test save action calls API and shows success feedback

- [x] 12. Public Website Page Tests
  - [x] 12.1 Write Home page tests
    - Create `frontend/public-website/src/pages/__tests__/Home.test.tsx`
    - Test renders featured posts and site introduction with mocked content
    - _Requirements: 6.1_

  - [x] 12.2 Write Blog page tests
    - Create `frontend/public-website/src/pages/__tests__/Blog.test.tsx`
    - Test renders list of published posts with titles, excerpts, dates
    - _Requirements: 6.2_

  - [x] 12.3 Write Post page tests
    - Create `frontend/public-website/src/pages/__tests__/Post.test.tsx`
    - Test renders full post content, author, date, comment section for valid slug
    - Test renders not-found message for non-existent slug
    - _Requirements: 6.3, 6.4_

  - [x] 12.4 Write Gallery page tests
    - Create `frontend/public-website/src/pages/__tests__/Gallery.test.tsx`
    - Test renders gallery items in grid layout
    - _Requirements: 6.5_

  - [x] 12.5 Write Projects page tests
    - Create `frontend/public-website/src/pages/__tests__/Projects.test.tsx`
    - Test renders project items with descriptions and links
    - _Requirements: 6.6_

  - [x] 12.6 Write Login page tests for public website
    - Create `frontend/public-website/src/pages/__tests__/Login.test.tsx`
    - Test renders login form with email and password fields
    - _Requirements: 6.7_

  - [x] 12.7 Write Register page tests
    - Create `frontend/public-website/src/pages/__tests__/Register.test.tsx`
    - Test renders registration form with name, email, password fields
    - _Requirements: 6.8_

  - [x] 12.8 Write VerifyEmail page tests
    - Create `frontend/public-website/src/pages/__tests__/VerifyEmail.test.tsx`
    - Test renders verification status with verification code
    - _Requirements: 6.9_

- [x] 13. Final Checkpoint - Full test suite verification
  - Run `cd frontend/admin-panel && npm test -- --run` and verify all tests pass
  - Run `cd frontend/public-website && npm test -- --run` and verify all tests pass
  - Run with coverage: `npm test -- --run --coverage` in both projects
  - Verify test execution completes within 120 seconds per project
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

## Notes

- Property-based testing does NOT apply to this feature — all tests are example-based component tests
- Admin panel and public website tasks in the same wave are independent and can be implemented in parallel
- Each test file is self-contained: imports wrappers, sets up mocks, tests one component/hook/service
- Mock at the service layer (`vi.mock`) for speed and determinism
- Use `vi.clearAllMocks()` in `beforeEach` for test isolation
- QueryClient created fresh per test via `renderWithProviders`
- All async assertions use `waitFor` with appropriate timeouts
- Checkpoints ensure incremental validation before proceeding to the next layer
- Admin panel bundle is 786KB (above the 500KB recommendation) — consider code-splitting after tests are in place
- The Profile page exists in admin panel but was not in the original Phase 2 spec tests list

## Current Implementation Status (as of July 2026 review)

| Task | Status | Notes |
|------|--------|-------|
| 1.1 Mock data factories (admin) | ✅ Done | All factories working |
| 1.2 Mock API handlers (admin) | ✅ Done | All handlers configured |
| 1.3 renderWithProviders (admin) | ❌ Not done | Blocker for all admin component tests |
| 1.4 Mock auth context (admin) | ✅ Done | Working correctly |
| 2.1 Mock data factories (public) | ✅ Done | All factories working |
| 2.2 Mock API handlers (public) | ✅ Done | All handlers configured |
| 2.3 renderWithProviders (public) | ❌ Not done | Blocker for all public component tests |
| 2.4 Mock settings context (public) | ✅ Done | Working correctly |
| 3-13 All test files | ❌ Not done | Blocked on 1.3 and 2.3 |

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "2.2", "2.4"] },
    { "id": 2, "tasks": ["1.3", "2.3"] },
    { "id": 3, "tasks": ["3.1", "3.2", "4.1"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 5, "tasks": ["8.1", "8.2", "9.1", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 6, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8", "11.9", "11.10", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8"] }
  ]
}
```
