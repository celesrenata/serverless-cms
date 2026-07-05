# Requirements Document

## Introduction

This feature replaces the trivial stub tests in both frontend applications (admin panel and public website) with meaningful component tests that validate actual UI behavior, user interactions, API integration (mocked), routing, and context usage. The tests will use Vitest with React Testing Library (already configured) to ensure regression coverage for all major features.

## Glossary

- **Admin_Panel**: The React frontend application at `frontend/admin-panel/` used by administrators to manage content, users, media, plugins, settings, and comments.
- **Public_Website**: The React frontend application at `frontend/public-website/` used by visitors to view blog posts, galleries, projects, and submit comments.
- **Test_Suite**: A collection of Vitest test files that validate component rendering, user interactions, and integration behavior.
- **Component_Test**: A test that renders a React component in jsdom, asserts on rendered output, simulates user interactions, and verifies expected behavior.
- **Mock_API**: A mocked version of the axios-based API service that returns controlled responses without making network requests.
- **Auth_Context**: The React context in the admin panel that provides authentication state (user, token, role) to components.
- **Settings_Context**: The React context in the public website that provides site settings to components.
- **Vitest**: The test runner already configured in both frontend projects with jsdom environment and React Testing Library.
- **Coverage_Report**: Output from Vitest's v8 coverage provider showing percentage of code exercised by tests.

## Requirements

### Requirement 1: Admin Panel Service Layer Tests

**User Story:** As a developer, I want tests for the admin panel API and auth services, so that I can catch regressions in API request construction, error handling, and authentication flows.

#### Acceptance Criteria

1. WHEN the API service is called with valid parameters, THE Test_Suite SHALL verify that the correct HTTP method, URL, headers, and body are sent to the Mock_API.
2. WHEN the Mock_API returns an error response, THE Test_Suite SHALL verify that the API service propagates the error with appropriate error information.
3. WHEN the auth service authenticates a user, THE Test_Suite SHALL verify that tokens are stored and the authenticated state is returned.
4. WHEN the auth service signs out a user, THE Test_Suite SHALL verify that tokens are cleared and the unauthenticated state is returned.
5. IF the API service receives a 401 response, THEN THE Test_Suite SHALL verify that the service triggers a token refresh or sign-out flow.

### Requirement 2: Admin Panel Auth Context Tests

**User Story:** As a developer, I want tests for the AuthContext and useAuth hook, so that I can ensure authentication state management works correctly across the admin application.

#### Acceptance Criteria

1. WHEN the Auth_Context renders with no stored credentials, THE Test_Suite SHALL verify that the context provides an unauthenticated state.
2. WHEN a user signs in through the Auth_Context, THE Test_Suite SHALL verify that the context updates to an authenticated state with user details and role.
3. WHEN a user signs out through the Auth_Context, THE Test_Suite SHALL verify that the context reverts to an unauthenticated state.
4. WHEN the Auth_Context provides a user role, THE Test_Suite SHALL verify that the role value matches one of the defined roles (admin, editor, author, viewer).

### Requirement 3: Admin Panel Page Component Tests

**User Story:** As a developer, I want tests for admin panel page components (Dashboard, ContentList, ContentEditor, MediaLibrary, Users, Comments, Settings, Plugins, Profile, Login), so that I can catch UI regressions in key admin workflows.

#### Acceptance Criteria

1. WHEN the Dashboard page renders with mocked data, THE Test_Suite SHALL verify that summary statistics and recent content are displayed.
2. WHEN the ContentList page renders, THE Test_Suite SHALL verify that content items are listed and filtering by type and status is operational.
3. WHEN the ContentEditor page renders for a new post, THE Test_Suite SHALL verify that the editor form displays with empty fields and a save action.
4. WHEN the ContentEditor page renders for an existing post, THE Test_Suite SHALL verify that the form populates with the post data from the Mock_API.
5. WHEN the MediaLibrary page renders, THE Test_Suite SHALL verify that media items are displayed in a grid and upload functionality is accessible.
6. WHEN the Users page renders, THE Test_Suite SHALL verify that the user list displays with role information and management actions.
7. WHEN the Comments page renders, THE Test_Suite SHALL verify that comments are listed with moderation actions (approve, reject, spam).
8. WHEN the Settings page renders, THE Test_Suite SHALL verify that settings fields are displayed with current values and a save action.
9. WHEN the Plugins page renders, THE Test_Suite SHALL verify that installed plugins are listed with activation toggle and settings access.
10. WHEN the Login page renders, THE Test_Suite SHALL verify that email and password fields and a submit button are displayed.
11. WHEN the Login page form is submitted with credentials, THE Test_Suite SHALL verify that the auth service is called and navigation occurs on success.

### Requirement 4: Admin Panel Shared Component Tests

**User Story:** As a developer, I want tests for shared admin components (Layout, ProtectedRoute), so that I can ensure navigation, layout structure, and route protection work correctly.

#### Acceptance Criteria

1. WHEN the Layout component renders for an authenticated user, THE Test_Suite SHALL verify that navigation links and user information are displayed.
2. WHEN ProtectedRoute renders with an unauthenticated user, THE Test_Suite SHALL verify that the user is redirected to the login page.
3. WHEN ProtectedRoute renders with an authenticated user of sufficient role, THE Test_Suite SHALL verify that the child component is rendered.
4. IF ProtectedRoute renders with an authenticated user of insufficient role, THEN THE Test_Suite SHALL verify that access is denied or the user is redirected.

### Requirement 5: Admin Panel Custom Hook Tests

**User Story:** As a developer, I want tests for admin panel custom hooks (useContent, useMedia, useUsers, useComments, useSettings, usePlugins), so that I can validate data fetching, state management, and mutation logic.

#### Acceptance Criteria

1. WHEN the useContent hook is invoked, THE Test_Suite SHALL verify that it fetches content from the Mock_API and returns content data in the expected shape.
2. WHEN the useMedia hook is invoked, THE Test_Suite SHALL verify that it fetches media items and provides upload and delete mutation functions.
3. WHEN the useUsers hook is invoked, THE Test_Suite SHALL verify that it fetches user data and provides role-update mutation functions.
4. WHEN the useComments hook is invoked, THE Test_Suite SHALL verify that it fetches comments and provides moderation action functions (approve, reject, spam).
5. WHEN the useSettings hook is invoked, THE Test_Suite SHALL verify that it fetches settings and provides an update mutation function.
6. WHEN the usePlugins hook is invoked, THE Test_Suite SHALL verify that it fetches plugins and provides activate, deactivate, and configure mutation functions.

### Requirement 6: Public Website Page Component Tests

**User Story:** As a developer, I want tests for public website page components (Home, Blog, Post, Gallery, Projects, Login, Register, VerifyEmail), so that I can catch UI regressions in the visitor-facing experience.

#### Acceptance Criteria

1. WHEN the Home page renders with mocked content, THE Test_Suite SHALL verify that featured posts and site introduction are displayed.
2. WHEN the Blog page renders, THE Test_Suite SHALL verify that a list of published posts with titles, excerpts, and dates is displayed.
3. WHEN the Post page renders for a valid slug, THE Test_Suite SHALL verify that the full post content, author, date, and comment section are displayed.
4. WHEN the Post page renders for a non-existent slug, THE Test_Suite SHALL verify that a not-found message is displayed.
5. WHEN the Gallery page renders, THE Test_Suite SHALL verify that gallery items are displayed in a grid layout.
6. WHEN the Projects page renders, THE Test_Suite SHALL verify that project items are displayed with descriptions and links.
7. WHEN the Login page renders, THE Test_Suite SHALL verify that a login form with email and password fields is displayed.
8. WHEN the Register page renders, THE Test_Suite SHALL verify that a registration form with name, email, and password fields is displayed.
9. WHEN the VerifyEmail page renders with a verification code, THE Test_Suite SHALL verify that the verification status is communicated to the user.

### Requirement 7: Public Website Component Tests

**User Story:** As a developer, I want tests for public website UI components (PostCard, CommentList, CommentForm, CodeBlock, Lightbox), so that I can ensure individual visual elements render correctly and handle interactions.

#### Acceptance Criteria

1. WHEN the PostCard component renders with post data, THE Test_Suite SHALL verify that the title, excerpt, date, and link to the full post are displayed.
2. WHEN the CommentList component renders with comments, THE Test_Suite SHALL verify that each comment displays author name, date, and comment text.
3. WHEN the CommentList component renders with nested comments, THE Test_Suite SHALL verify that replies are visually indented under their parent.
4. WHEN the CommentForm component renders, THE Test_Suite SHALL verify that name, email, and comment text fields with a submit button are displayed.
5. WHEN the CommentForm is submitted with valid data, THE Test_Suite SHALL verify that the Mock_API is called with the comment payload and a success message is shown.
6. IF the CommentForm is submitted with empty required fields, THEN THE Test_Suite SHALL verify that validation errors are displayed.
7. WHEN the CodeBlock component renders with source code, THE Test_Suite SHALL verify that the code is displayed with syntax formatting.
8. WHEN the Lightbox component renders with an image, THE Test_Suite SHALL verify that the image is displayed in an overlay with close functionality.

### Requirement 8: Public Website Context and Hook Tests

**User Story:** As a developer, I want tests for the public website SettingsContext and custom hooks (useContent, useComments, useSiteSettings), so that I can validate data fetching and state management on the public site.

#### Acceptance Criteria

1. WHEN the Settings_Context renders, THE Test_Suite SHALL verify that site settings are fetched from the Mock_API and provided to child components.
2. WHEN the useContent hook is invoked for published posts, THE Test_Suite SHALL verify that it returns only published content sorted by date.
3. WHEN the useComments hook is invoked for a specific content ID, THE Test_Suite SHALL verify that it returns approved comments for that content.
4. WHEN the useComments hook submits a new comment, THE Test_Suite SHALL verify that the Mock_API is called and the comment list is refreshed.
5. WHEN the useSiteSettings hook is invoked, THE Test_Suite SHALL verify that it returns site configuration values (title, description, theme, features).

### Requirement 9: Test Infrastructure and Coverage

**User Story:** As a developer, I want the test infrastructure to produce reliable coverage reports and integrate with CI/CD, so that test health is visible and regressions are caught before deployment.

#### Acceptance Criteria

1. THE Test_Suite SHALL execute successfully via `npm test -- --run` in both frontend directories without hanging or timing out.
2. THE Test_Suite SHALL produce coverage reports via Vitest's v8 provider in text, JSON, HTML, and lcov formats.
3. WHEN the CI/CD pipeline runs `npm test -- --run --coverage`, THE Test_Suite SHALL pass with zero failures for all component tests.
4. THE Test_Suite SHALL complete execution within 120 seconds for each frontend project.
5. THE Test_Suite SHALL use consistent mock patterns (Mock_API responses, Auth_Context wrappers, Router providers) across all test files to enable maintainability.

### Requirement 10: Test Mock Utilities

**User Story:** As a developer, I want reusable mock utilities and test wrappers, so that writing new tests is efficient and mock patterns are consistent across the test suite.

#### Acceptance Criteria

1. THE Test_Suite SHALL provide a reusable Auth_Context mock wrapper that accepts configurable user, role, and authentication state.
2. THE Test_Suite SHALL provide a reusable Router mock wrapper that accepts configurable route parameters and navigation history.
3. THE Test_Suite SHALL provide reusable Mock_API response factories for content, media, users, comments, settings, and plugins data shapes.
4. THE Test_Suite SHALL provide a reusable Settings_Context mock wrapper for public website tests that accepts configurable site settings.
5. WHEN a new component test is created, THE Test_Suite mock utilities SHALL enable test setup in fewer than 10 lines of boilerplate per test file.
