# Design: Theme Management System

## Architecture Overview

```
Admin Panel                    API Gateway                  DynamoDB
┌────────────────┐            ┌──────────────┐            ┌─────────────────┐
│ Appearance Page│───────────▶│ /api/v1/     │───────────▶│ cms-themes-{env}│
│  - Gallery     │            │   themes     │            └─────────────────┘
│  - Editor      │            │   themes/:id │                    │
│  - Preview     │            │   themes/:id │            ┌─────────────────┐
└────────────────┘            │     /activate│───────────▶│cms-settings-{env}│
                              └──────────────┘            └─────────────────┘
Public Website                       │
┌────────────────┐                   │
│ ThemeProvider  │◀──────────────────┘
│ (fetch active) │   GET /themes/active (public)
└────────────────┘
```

## Data Model

### DynamoDB Table: `cms-themes-{env}`

| Attribute    | Type   | Description                              |
|-------------|--------|------------------------------------------|
| id          | S (PK) | UUID                                     |
| name        | S      | Theme display name (max 100 chars)       |
| description | S      | Short description (max 500 chars)        |
| tokens      | M      | Full ThemeTokens object (map)            |
| custom_css  | S      | Optional CSS string (max 100KB)          |
| created_by  | S      | User ID who created it                   |
| created_at  | N      | Unix timestamp                           |
| updated_at  | N      | Unix timestamp                           |

Active theme tracking uses the existing `cms-settings-{env}` table with key `active_theme_id`.

## API Design

### GET /api/v1/themes
**Auth:** admin, editor (authenticated)
**Response:**
```json
{
  "items": [
    {
      "id": "celestium-neon",
      "name": "Celestium Neon",
      "description": "Dark cyberpunk...",
      "builtin": true,
      "is_active": true,
      "preview_colors": {
        "primary": "139 92 246",
        "background": "3 7 18",
        "surface": "30 41 59",
        "accent": "34 211 238"
      }
    },
    {
      "id": "uuid-custom-theme",
      "name": "My Custom Theme",
      "description": "...",
      "builtin": false,
      "is_active": false,
      "preview_colors": { ... },
      "created_at": 1783400000,
      "updated_at": 1783400000
    }
  ]
}
```

### POST /api/v1/themes
**Auth:** admin, editor
**Body:**
```json
{
  "name": "My Theme",
  "description": "Optional description",
  "tokens": { /* full ThemeTokens object */ },
  "custom_css": "/* optional */"
}
```
**Response:** 201 with the created theme object.

### GET /api/v1/themes/{id}
**Auth:** admin, editor
**Response:** Full theme object including tokens and custom_css.

### PUT /api/v1/themes/{id}
**Auth:** admin, editor
**Body:** Partial update (name, description, tokens, custom_css).
**Response:** Updated theme object.
**Error:** 403 if attempting to modify a builtin theme.

### DELETE /api/v1/themes/{id}
**Auth:** admin
**Error:** 403 if builtin. 409 if currently active.

### POST /api/v1/themes/{id}/activate
**Auth:** admin
**Effect:** Sets `active_theme_id` setting to this theme's ID.
**Response:** 200 with `{ "active_theme_id": "..." }`

### POST /api/v1/themes/{id}/duplicate
**Auth:** admin, editor
**Effect:** Creates a copy with name "Copy of {original}" and new UUID.
**Response:** 201 with the new theme object.

### GET /api/v1/themes/active (PUBLIC - no auth)
**Response:**
```json
{
  "id": "celestium-bromide",
  "name": "Celestium Bromide",
  "tokens": { /* full ThemeTokens */ },
  "custom_css": "/* optional */"
}
```
Returns the active theme's full tokens for the public website to apply.

## Frontend Components

### Admin Panel

```
src/pages/Appearance.tsx          — Main gallery page
src/pages/ThemeEditor.tsx         — Full visual editor
src/components/ThemeCard.tsx       — Gallery card with color swatches
src/components/ThemeColorPicker.tsx — Color token editor
src/components/ThemePreview.tsx    — Live preview panel
src/services/themeService.ts      — API client for theme CRUD
src/hooks/useThemes.ts            — React Query hooks
```

**Sidebar addition:** "Appearance" item between "Settings" and "Plugins" with a 🎨 icon.

**Gallery layout:** Responsive grid (2-3 columns) of ThemeCards. Active theme has a highlighted border and badge. Builtin themes show a subtle "Built-in" label.

**Editor layout:** Two-column: left side is the token editor (tabbed: Colors, Typography, Spacing, Effects, CSS), right side is the live preview panel showing sample content.

### Public Website

Modify `ThemeProvider.tsx` to:
1. On mount, fetch `GET /api/v1/themes/active`
2. If no localStorage preference exists, apply the server response
3. If localStorage preference exists, use that (user choice > admin default)
4. Cache the response for 5 minutes

## CSS Sanitization Rules

The backend validates custom CSS by rejecting:
- `@import` directives (prevents loading external resources)
- `url()` with absolute URLs to external domains
- `expression()` (IE-specific script execution)
- `javascript:` protocol in any value
- `-moz-binding` (Firefox XBL injection)
- Strings longer than 100KB

Implementation: regex-based scanner in Python, not a full CSS parser (keeps Lambda lightweight).

## Lambda Structure

```
lambda/themes/
  __init__.py
  create.py      — POST /themes
  get.py         — GET /themes, GET /themes/{id}, GET /themes/active
  update.py      — PUT /themes/{id}
  delete.py      — DELETE /themes/{id}
  activate.py    — POST /themes/{id}/activate
  duplicate.py   — POST /themes/{id}/duplicate
  validator.py   — Theme token validation + CSS sanitization
```

Shared dependency: `lambda/shared/themes_db.py` (ThemeRepository class following existing ContentRepository pattern).

## Migration & Rollout

1. CDK deploys the new table + Lambdas + routes
2. No data migration needed — starts empty
3. Settings page theme dropdown continues to work (backward compatible)
4. Public website gracefully falls back when no active theme is set via API
5. Admin Appearance page is additive (doesn't replace Settings theme dropdown initially)
