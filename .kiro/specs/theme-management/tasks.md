# Tasks: Theme Management System

## Task 1: DynamoDB Table + CDK Infrastructure
- [x] Add `cms-themes-{env}` DynamoDB table to CDK stack (partition key: `id`, on-demand billing)
- [ ] Add Lambda functions for theme CRUD (create, get, update, delete, activate, duplicate)
- [ ] Add API Gateway routes: GET/POST /themes, GET/PUT/DELETE /themes/{id}, POST /themes/{id}/activate, POST /themes/{id}/duplicate
- [ ] Grant theme Lambdas read/write on themes table, read on settings table
- [ ] Add `THEMES_TABLE` environment variable to theme Lambda functions

## Task 2: Theme Validation & Sanitization (Backend)
- [ ] Create `lambda/themes/validator.py` with token schema validation (reuse ThemeTokens structure)
- [ ] Implement CSS sanitization: reject @import, external url(), expression(), javascript:, -moz-binding
- [ ] Validate name (max 100 chars), description (max 500 chars), custom_css (max 100KB)
- [ ] Validate all 17 color tokens are space-separated RGB format
- [ ] Validate typography, radius, shadow, motion fields match expected types

## Task 3: Theme Repository (Backend)
- [ ] Create `lambda/shared/themes_db.py` with ThemeRepository class
- [ ] Implement `create(theme_data)` — generates UUID, sets timestamps
- [ ] Implement `get_by_id(id)` — returns theme or None
- [ ] Implement `get_all()` — scans table, returns all custom themes
- [ ] Implement `update(id, data)` — partial update with timestamp
- [ ] Implement `delete(id)` — removes theme
- [ ] Implement `count()` — for enforcing 50-theme limit

## Task 4: Theme Lambda Handlers (Backend)
- [ ] `lambda/themes/get.py` — GET /themes (list all: builtin metadata + custom), GET /themes/{id} (single), GET /themes/active (public, no auth)
- [ ] `lambda/themes/create.py` — POST /themes, validate tokens + CSS, enforce 50-theme limit
- [ ] `lambda/themes/update.py` — PUT /themes/{id}, reject builtin modifications
- [ ] `lambda/themes/delete.py` — DELETE /themes/{id}, reject builtin/active deletion
- [ ] `lambda/themes/activate.py` — POST /themes/{id}/activate, update settings table
- [ ] `lambda/themes/duplicate.py` — POST /themes/{id}/duplicate, copy tokens with new name/ID
- [ ] Return builtin theme data from code constants (no DB lookup needed for builtins)

## Task 5: Admin Panel — Theme Service & Hooks
- [ ] Create `frontend/admin-panel/src/services/themeService.ts` with API client methods
- [ ] Create `frontend/admin-panel/src/hooks/useThemes.ts` with React Query hooks (useThemes, useTheme, useCreateTheme, useUpdateTheme, useDeleteTheme, useActivateTheme, useDuplicateTheme)
- [ ] Add TypeScript interfaces for theme API responses

## Task 6: Admin Panel — Appearance Gallery Page
- [ ] Create `frontend/admin-panel/src/pages/Appearance.tsx` with theme gallery grid
- [ ] Create `frontend/admin-panel/src/components/ThemeCard.tsx` showing color swatches, name, description, active badge, builtin label
- [ ] Add "Appearance" to sidebar navigation (🎨 icon, between Settings and Plugins)
- [ ] Add route `/appearance` in App.tsx
- [ ] Implement "Activate" button on each card
- [ ] Implement "Duplicate" button on each card
- [ ] Implement "Delete" button (custom themes only, not active)
- [ ] Implement "Export JSON" download button
- [ ] Implement "Import Theme" button with file upload + validation
- [ ] Implement "+ Create Theme" button navigating to editor

## Task 7: Admin Panel — Visual Theme Editor
- [ ] Create `frontend/admin-panel/src/pages/ThemeEditor.tsx` with two-column layout
- [ ] Implement color picker section — 17 color tokens with swatch + RGB input
- [ ] Implement typography section — font family, size base, scale, line height, weights
- [ ] Implement spacing section — border radius (sm, md, lg, full)
- [ ] Implement effects section — shadows (sm, md, lg, glow) + motion (durations, easing)
- [ ] Implement patterns section — type dropdown, opacity slider, color picker
- [ ] Implement custom CSS tab — monospace textarea with basic validation feedback
- [ ] Implement live preview panel — renders sample content (heading, paragraph, code block, card, button) with current tokens applied
- [ ] Add "Save" button (persist without activating)
- [ ] Add "Save & Activate" button (persist + set as default)
- [ ] Add route `/appearance/edit/:id` and `/appearance/new` in App.tsx
- [ ] Real-time input validation with inline error messages

## Task 8: Public Website — Server Theme Loading
- [ ] Add `GET /api/v1/themes/active` fetch to ThemeProvider on mount
- [ ] Apply server-returned tokens as default when no localStorage preference exists
- [ ] Apply custom_css from active theme into `@layer user` stylesheet
- [ ] Cache the active theme response (5-minute stale time)
- [ ] Graceful fallback to bundled default on API failure
- [ ] Respect localStorage user preference over server default

## Task 9: Testing
- [ ] Backend unit tests for validator (valid tokens, invalid tokens, malicious CSS)
- [ ] Backend unit tests for theme CRUD operations (create, get, update, delete, activate, duplicate)
- [ ] Admin panel component tests for ThemeCard, Appearance gallery
- [ ] Admin panel component tests for ThemeEditor color/typography sections
- [ ] Public website test for active theme loading + fallback behavior
- [ ] Integration test: create theme → activate → verify public endpoint returns it

## Task 10: Documentation & Cleanup
- [ ] Update API_DOCUMENTATION.md with theme endpoints
- [ ] Update database-schema steering rule with cms-themes table
- [ ] Remove legacy theme dropdown from Settings page (replaced by Appearance page)
- [ ] Add theme management section to admin panel README
