# Requirements: Theme Management System

## Introduction

A full theme management system for the serverless CMS that allows administrators to upload, create, edit, preview, and manage custom themes through the admin panel. Themes are stored server-side in DynamoDB, served via the API to the public website, and managed through a dedicated "Appearance" page in the admin panel. This extends the existing client-side theme engine (which already supports token-based themes, JSON import/export, and custom CSS preview) into a first-class server-managed feature.

## Glossary

- **Theme_Token_Set**: A complete JSON object conforming to the `ThemeTokens` interface (colors, typography, radius, shadow, motion, patterns) that fully describes a theme.
- **Builtin_Theme**: One of the themes shipped with the application code (Celestium Neon, Celestium Bromide, AWS Console After Dark, Glass Circuit, Paper Systems, Terminal Witchcraft). These cannot be deleted.
- **Custom_Theme**: A user-uploaded or user-created theme stored in DynamoDB. Can be edited, duplicated, exported, and deleted.
- **Active_Theme**: The site-wide default theme applied to all public website visitors who haven't chosen a different one via the theme panel.
- **Theme_Preview**: A live preview of how a theme looks before committing it as the active theme.
- **Custom_CSS**: Optional supplementary CSS that layers on top of the token-based theme via the `@layer user` mechanism.
- **Theme_Gallery**: The admin UI showing all available themes (builtin + custom) with visual preview cards.

## Requirements

### Requirement 1: Theme Storage Backend

**User Story:** As an admin, I want custom themes stored server-side, so they persist across devices and are available to all visitors.

#### Acceptance Criteria

1. THE system SHALL store custom themes in a DynamoDB table `cms-themes-{env}` with partition key `id` (String).
2. EACH stored theme SHALL include: `id`, `name`, `description`, `tokens` (the full ThemeTokens JSON), `custom_css` (optional string), `created_by` (user ID), `created_at`, `updated_at`, and `is_active` (boolean).
3. THE system SHALL validate theme token JSON against the ThemeTokens schema before accepting writes.
4. THE system SHALL enforce a maximum of 50 custom themes per installation.
5. THE system SHALL enforce a maximum custom CSS size of 100KB per theme.

### Requirement 2: Theme CRUD API

**User Story:** As an admin, I want API endpoints for managing themes, so the admin panel and public site can interact with stored themes.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/themes` returning all themes (builtin metadata + custom themes). Builtin themes include `builtin: true` flag and cannot be modified/deleted.
2. THE API SHALL expose `POST /api/v1/themes` accepting a theme token JSON (+ optional custom_css), validating it, and storing it. Requires admin or editor role.
3. THE API SHALL expose `GET /api/v1/themes/{id}` returning a single theme by ID.
4. THE API SHALL expose `PUT /api/v1/themes/{id}` for updating a custom theme's tokens, name, description, or custom_css. Cannot modify builtin themes.
5. THE API SHALL expose `DELETE /api/v1/themes/{id}` for deleting a custom theme. Cannot delete builtin themes or the currently active theme.
6. THE API SHALL expose `POST /api/v1/themes/{id}/activate` to set a theme as the site-wide default. Updates the `theme` setting in cms-settings table.
7. THE API SHALL expose `POST /api/v1/themes/{id}/duplicate` to clone a theme (builtin or custom) into a new custom theme.
8. THE public (unauthenticated) endpoint `GET /api/v1/themes/active` SHALL return the currently active theme's tokens + custom_css for the public website to apply on load.

### Requirement 3: Admin Theme Gallery Page

**User Story:** As an admin, I want a dedicated Appearance/Themes page in the admin panel, so I can visually browse, manage, and customize themes.

#### Acceptance Criteria

1. THE admin panel SHALL include a new "Appearance" menu item in the sidebar (between Settings and Plugins).
2. THE gallery SHALL display theme cards showing: a color swatch preview (primary, background, surface, accent colors), theme name, description, and an "Active" badge on the current default.
3. EACH theme card SHALL offer actions: "Activate", "Edit" (custom only), "Duplicate", "Export JSON", "Delete" (custom only, not active).
4. THE gallery SHALL visually distinguish builtin themes (with a lock/builtin badge) from custom themes.
5. THE gallery SHALL include a "+ Create Theme" button that opens the theme editor with empty/default values.
6. THE gallery SHALL include an "Import Theme" button that accepts a `.json` file upload, validates it, and creates a new custom theme.

### Requirement 4: Visual Theme Editor

**User Story:** As an admin, I want to visually edit theme tokens, so I can customize colors, fonts, and other design properties without hand-editing JSON.

#### Acceptance Criteria

1. THE editor SHALL provide color pickers for all 17 color tokens, displaying the space-separated RGB value and a visual swatch.
2. THE editor SHALL provide font family inputs (with common web-safe font suggestions) for body and mono fonts.
3. THE editor SHALL provide numeric inputs for font size base, font size scale, line height, and font weights.
4. THE editor SHALL provide inputs for border radius values (sm, md, lg, full).
5. THE editor SHALL provide a shadow editor with text inputs for each shadow level.
6. THE editor SHALL provide motion duration inputs and an easing curve selector.
7. THE editor SHALL provide a pattern selector (none, grid, dots, circuit, scanlines, noise) with opacity and color controls.
8. THE editor SHALL include a "Custom CSS" tab with a code editor (monospace textarea with line numbers) for additional CSS rules.
9. THE editor SHALL validate all inputs in real-time and show inline errors for invalid values.
10. THE editor SHALL include a live preview panel showing how the theme looks applied to sample content (headings, paragraphs, code blocks, cards, buttons).

### Requirement 5: Theme Preview & Activation

**User Story:** As an admin, I want to preview a theme before making it live, so I don't accidentally break the public site's appearance.

#### Acceptance Criteria

1. THE editor SHALL include a "Preview" button that opens a split-pane or modal showing the public website with the edited theme applied (via iframe or inline rendering).
2. THE editor SHALL include a "Save" button that persists changes without activating the theme.
3. THE editor SHALL include a "Save & Activate" button that persists and immediately sets the theme as the site-wide default.
4. WHEN a theme is activated, THE system SHALL update the `theme` setting in the settings table and the public website SHALL reflect the change within one page load (no deploy needed).
5. THE system SHALL prevent activating a theme that fails validation.

### Requirement 6: Public Website Theme Loading

**User Story:** As a visitor, I want the site to load with the admin-selected default theme, so the site looks as the admin intended.

#### Acceptance Criteria

1. ON initial page load, THE public website SHALL fetch `GET /api/v1/themes/active` to get the server-side default theme.
2. IF the visitor has a locally-stored theme preference (from the theme panel), THAT preference SHALL take priority over the server default.
3. IF the API request fails or returns no active theme, THE system SHALL fall back to the code-bundled default theme (Celestium Neon for dark preference, Paper Systems for light).
4. THE public website SHALL apply any custom_css from the active theme into the `@layer user` stylesheet.
5. THE response SHALL be cached (5-minute stale time via React Query) to avoid repeated API calls during navigation.

### Requirement 7: Infrastructure

**User Story:** As a developer, I want the theme management infrastructure defined in CDK, so it deploys automatically with the rest of the stack.

#### Acceptance Criteria

1. THE CDK stack SHALL create a `cms-themes-{env}` DynamoDB table with `id` as partition key, on-demand billing.
2. THE CDK stack SHALL create Lambda functions for theme CRUD operations with appropriate IAM permissions (read/write to themes table, read settings table).
3. THE CDK stack SHALL add API Gateway routes for all theme endpoints under `/api/v1/themes`.
4. THE CDK stack SHALL grant the theme Lambdas read access to the settings table for resolving the active theme.
5. THE Lambdas SHALL share the existing `shared/auth.py` decorator for role-based access control.

### Requirement 8: Security & Validation

**User Story:** As an admin, I want theme uploads validated and sanitized, so malicious CSS or invalid tokens can't break the site.

#### Acceptance Criteria

1. THE system SHALL validate all theme token JSON against the ThemeTokens schema (correct types, required fields, valid ranges) before storing.
2. THE system SHALL sanitize custom CSS by rejecting: `@import` rules, `url()` with external domains (only relative or same-origin allowed), `expression()`, `javascript:` protocols, and `-moz-binding`.
3. THE system SHALL reject theme names longer than 100 characters and descriptions longer than 500 characters.
4. THE system SHALL require admin or editor role for all write operations.
5. THE public active-theme endpoint SHALL be rate-limited to prevent abuse (inherits existing API Gateway throttling).
