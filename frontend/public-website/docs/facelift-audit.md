# Public Website Facelift Audit

## 1. Audit Scope

This document audits the public website located at:

```text
frontend/public-website/
```

The goal is to capture the current frontend architecture, styling strategy, accessibility posture, SEO/metadata status, performance risks, deployment pipeline, and facelift-readiness concerns.

---

## 2. Executive Summary

The public website is a React/Vite single-page application using TypeScript, React Router, React Query, Tailwind CSS, and several content-rendering utilities such as Mermaid and PrismJS.

### Key Strengths

- Modern React 18 + Vite stack
- TypeScript strict mode enabled
- React Query used for API data fetching and caching
- Existing CI/CD pipeline for dev, staging, and production
- Tailwind CSS already in place
- Theme concept exists with multiple theme files and CSS custom properties defined
- Content rendering supports code blocks, Mermaid diagrams, comments, gallery albums, and blog posts
- GitHub Actions pipeline runs lint, tests, and builds before deploy

### Key Issues

- Theme system relies heavily on `!important` overrides (60+ in dark theme alone)
- Tailwind config does not consume existing CSS custom properties
- Theme is applied after API settings fetch, causing FOUC (Flash Of Unstyled Content)
- No route-level code splitting or lazy loading
- Mermaid is imported globally despite being a large dependency
- All theme CSS files are imported unconditionally
- No 404 route or error boundary
- Mobile menu button exists but does not function
- No skip-to-content link or focus management on route changes
- Generic site metadata and limited SEO implementation
- No favicon, sitemap, robots.txt, Open Graph images, structured data

---

## 3. Framework & Dependency Baseline

| Area | Package / Tool | Version |
|---|---|---|
| UI Framework | React | 18.2.0 |
| DOM Renderer | React DOM | 18.2.0 |
| Build Tool | Vite | 5.0.8 |
| Language | TypeScript | 5.2.2 (strict mode) |
| Routing | React Router DOM | 6.20.0 (BrowserRouter) |
| Data Fetching | @tanstack/react-query | 5.12.0 |
| Metadata | react-helmet-async | 2.0.4 |
| HTTP Client | Axios | 1.6.2 |
| Diagrams | Mermaid | 11.16.0 |
| Syntax Highlighting | PrismJS | 1.29.0 |
| CSS Framework | Tailwind CSS | 3.3.6 |
| PostCSS Plugins | tailwindcss, autoprefixer | — |
| Testing | Vitest | 1.0.4 |
| Testing Utilities | @testing-library/react, jsdom | — |
| Property-Based Testing | fast-check | 4.8.0 |

---

## 4. Build & Deployment Pipeline

### Build Command

```bash
tsc && vite build
```

Output directory: `dist/`

### CI/CD via GitHub Actions

Pipeline file: `.github/workflows/ci-cd.yml`

Pipeline runs on pushes to `develop`, `staging`, and `main`:

1. Lint
2. Tests (Vitest)
3. Build (tsc + vite build)
4. Deploy via CDK scripts to S3/CloudFront

### Runtime Versions in CI

| Runtime | Version |
|---|---|
| Node.js | 20 |
| Python | 3.12 |

### Environment Mapping

| Branch | Environment | URL |
|---|---|---|
| `develop` | Development | dev.serverless.celestium.life |
| `staging` | Staging | staging.serverless.celestium.life |
| `main` | Production | serverless.celestium.life |

### Hosting

- S3 (static assets)
- CloudFront (CDN/distribution)

### Deployment Risk

Because the app uses `BrowserRouter`, CloudFront/S3 must serve `index.html` for all client-side routes. Without this fallback, direct navigation to routes like `/blog/example-post` returns a 404.

---

## 5. Routing

### Model

Client-side SPA routing via `BrowserRouter`. No SSR, no code splitting, no lazy loading of routes.

### Current Routes

| Route | Page Component |
|---|---|
| `/` | Home |
| `/blog` | Blog |
| `/blog/:slug` | Post |
| `/gallery` | Gallery |
| `/gallery/:slug` | AlbumPage |
| `/projects` | Projects |
| `/login` | Login |
| `/register` | Register |
| `/verify-email` | VerifyEmail |

### Routing Gaps

- No `404` / NotFound route defined — unmatched routes show blank page
- No route transition focus management
- No app-level error boundary
- BrowserRouter requires verified S3/CloudFront fallback handling

---

## 6. Page Inventory

| Page | Key Content |
|---|---|
| Home | Hero gradient, featured posts, recent projects, gallery preview |
| Blog | Post listing with pagination |
| Post | Individual blog post with comments |
| Gallery | Album grid view |
| AlbumPage | Individual album with lightbox |
| Projects | Project listing |
| Login | Authentication form |
| Register | Registration form |
| VerifyEmail | Email verification flow |

---

## 7. Component Inventory

### Layout

- `Layout` — flex column min-h-screen wrapper
- `Header` — site nav with mobile menu button (non-functional)
- `Footer` — copyright and site description

### Content

- `PostCard` — blog post preview card
- `BlogContent` — blog post body renderer
- `CodeBlock` — syntax-highlighted code blocks (PrismJS)
- `MermaidRenderer` — Mermaid diagram rendering

### Media

- `Lightbox` — full-screen image viewer
- `FullscreenOverlay` — overlay backdrop

### Comments

- `Comment` — single comment display
- `CommentForm` — comment submission form
- `CommentList` — threaded comment list

### Theme UI

No theme toggle UI component currently exists.

---

## 8. Services, Hooks, Utilities, and Contexts

### Services

- `services/api.ts` — Axios-based API client with S3→CloudFront URL rewriting interceptor

### Hooks

- `useContent` — fetch content by ID
- `useContentBySlug` — fetch content by slug
- `useContentList` — fetch paginated content list
- `useSiteSettings` — fetch public site settings
- `useComments` — comment data management
- `useSwipe` — touch swipe gesture detection

### Utilities

- `contentUtils` — content helper functions (image extraction)
- `galleryUtils` — gallery/album card conversion
- `sanitizeContent` — HTML content sanitization

### Contexts

- `SettingsContext` — fetches public settings, applies theme via `data-theme` attribute
  - Available themes: `default`, `dark`, `light`, `minimal`, `custom`
  - Theme applied AFTER API fetch (FOUC issue)

---

## 9. CSS Strategy

### Tailwind CSS 3.3.6

Current config (`tailwind.config.js`):

```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

- **Completely default** — no custom theme extensions
- No plugins configured
- Does NOT consume any CSS custom properties

### PostCSS

```js
{ tailwindcss: {}, autoprefixer: {} }
```

### Global Stylesheets

| File | Purpose |
|---|---|
| `src/index.css` | Tailwind directives + comment component styles |
| `src/styles/wp-content.css` | WordPress/rich-content rendering styles |

### Theme Files

| File | Theme |
|---|---|
| `src/themes/dark.css` | Dark theme |
| `src/themes/light.css` | Light theme |
| `src/themes/minimal.css` | Minimal/clean theme |
| `src/themes/custom.css` | Customizable purple-accent theme |

All four files are imported unconditionally in `main.tsx`.

---

## 10. Theme System Audit

### Current Implementation

Themes use `[data-theme="xxx"]` attribute selectors on `<html>`:

```css
[data-theme="dark"] .bg-white {
  background-color: #1e293b !important;
}
```

### Critical Issues

#### 1. Heavy `!important` Usage

The dark theme contains **60+ `!important` declarations**. This indicates the theme layer is fighting utility classes rather than integrating with them.

#### 2. Direct Tailwind Utility Overrides

Theme CSS overrides common Tailwind utilities (`.bg-white`, `.text-gray-500`, `.border-gray-200`). This is fragile — utility classes are intended to be final declarations.

#### 3. CSS Custom Properties Defined But Not Consumed

Themes define useful variables, but Tailwind config has empty `theme.extend: {}`. Components use raw Tailwind utilities instead of semantic token-backed classes.

#### 4. No CSS Layer Strategy

No `@layer` ordering exists. Specificity conflicts are resolved exclusively through `!important`.

#### 5. FOUC — Theme Applied Too Late

Theme is set by `SettingsContext` after API fetch. No blocking `<head>` script reads localStorage or sets initial theme before first paint.

### CSS Custom Properties Currently Defined

```css
/* Colors */
--color-primary
--color-primary-hover
--color-primary-light

/* Backgrounds */
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary

/* Text */
--color-text-primary
--color-text-secondary
--color-text-muted

/* Borders */
--color-border
--color-border-light

/* Status */
--color-success
--color-warning
--color-error
--color-info

/* Shadows */
--shadow-sm
--shadow-md
--shadow-lg
```

These properties are defined in each theme file but NOT referenced by any Tailwind utility or component directly.

---

## 11. Assets, Typography, and Branding

### Fonts

- No custom fonts loaded — relies on Tailwind/system font defaults
- Minimal theme overrides to system font stack
- Custom theme references `Inter` (sans-serif) and `Georgia` (serif) but does NOT load them
- No `@font-face` declarations or font CDN links

### Favicon & Icons

- No favicon specified in `index.html`
- No apple-touch-icon
- No web app manifest

### Social/Branding Assets

- No Open Graph images
- No default social sharing image

---

## 12. Metadata & SEO

### Current State

- `index.html` title: `"Public Website"` (generic)
- `react-helmet-async` used on Home page for dynamic title/description
- Other pages may lack metadata coverage

### Missing

- Site-specific default title in `index.html`
- Open Graph metadata
- Twitter/X card metadata
- Structured data (JSON-LD)
- `sitemap.xml`
- `robots.txt`
- Canonical URL strategy
- Consistent route-level metadata

---

## 13. Accessibility Issues

| Issue | Impact |
|---|---|
| Mobile menu button non-functional | Mobile users cannot navigate |
| No skip-to-content link | Keyboard users must tab through nav |
| No ARIA landmarks on main sections | Screen readers lack orientation |
| No focus management on route changes | Users unaware of navigation |
| Color contrast (text-gray-500 on white) | May fail WCAG AA |
| No image alt text fallback strategy | Gallery images may lack alt text |
| Comment form lacks aria-describedby | Validation not announced |
| No error boundary | Runtime errors show blank page |

---

## 14. Performance Baseline

### Lighthouse Scores

**Status: TBD** — No scores measured yet. Should be captured before facelift begins.

### Current Performance Risks

| Risk | Details |
|---|---|
| No code splitting | Entire app loaded at once |
| Mermaid imported globally | ~500KB+ library loaded on every page |
| All theme CSS imported unconditionally | 4 theme files parsed regardless of active theme |
| No image optimization | No srcset, no lazy loading, no modern formats |
| Theme FOUC | Extra paint/layout shift on initial load |
| No bundle analysis | Unknown total bundle size |

### Performance Strengths

- React Query caching (5min stale time)
- Vite tree-shaking and bundling
- CloudFront CDN for static asset delivery

---

## 15. Hydration & Routing Problems

| Problem | Description |
|---|---|
| FOUC | Theme applied AFTER API fetch, not before first paint |
| No blocking head script | No localStorage read or `data-theme` set before render |
| No 404 route | Unmatched URLs render blank page |
| No loading states | Initial settings fetch shows nothing |
| No error boundary | Runtime errors crash to blank screen |
| SPA routing on S3 | Requires CloudFront custom error response → index.html |

---

## 16. Testing Infrastructure

### Current Stack

- Vitest 1.0.4 (test runner)
- @testing-library/react 14.1.2 (component testing)
- jsdom 23.0.1 (DOM environment)
- fast-check 4.8.0 (property-based testing)
- @vitest/coverage-v8 (coverage)

### CI Integration

Tests run in GitHub Actions before build/deploy.

### Test Directories

- `src/pages/__tests__/`
- `src/components/__tests__/`
- `src/contexts/__tests__/`
- `src/hooks/__tests__/`
- `src/services/__tests__/`
- `src/utils/__tests__/`

---

## 17. Priority Findings

### P0 — Critical Before Facelift

- Fix mobile menu functionality
- Add 404/NotFound route
- Add app-level error boundary
- Verify CloudFront/S3 SPA fallback routing
- Add basic metadata and favicon
- Resolve theme FOUC (blocking head script)
- Add skip-to-content link

### P1 — High Priority

- Refactor theme system away from `!important` overrides
- Extend Tailwind config with CSS custom property design tokens
- Add route-level metadata via react-helmet-async
- Add focus management on route changes
- Add image alt fallback strategy
- Verify color contrast across all themes
- Introduce route-level code splitting

### P2 — Medium Priority

- Lazy-load Mermaid and PrismJS
- Improve image optimization (srcset, lazy loading)
- Add structured data (JSON-LD)
- Add sitemap.xml and robots.txt
- Add social sharing images
- Add theme toggle UI
- Add visual regression testing

### P3 — Nice to Have

- Bundle size budgets
- Web app manifest
- Loading skeletons
- Advanced gallery placeholders
- Full design token documentation

---

## 18. Appendix: CSS Custom Properties by Theme

All themes define the same property set:

```css
--color-primary          --color-primary-hover     --color-primary-light
--color-bg-primary       --color-bg-secondary      --color-bg-tertiary
--color-text-primary     --color-text-secondary    --color-text-muted
--color-border           --color-border-light
--color-success          --color-warning           --color-error          --color-info
--shadow-sm              --shadow-md               --shadow-lg
```

| Theme | Primary Color | Background | Text |
|---|---|---|---|
| dark | #3b82f6 | #0f172a | #f1f5f9 |
| light | #2563eb | #ffffff | #0f172a |
| minimal | #000000 | #ffffff | #000000 |
| custom | #8b5cf6 | #fafafa | #171717 |

---

## 19. Appendix: Tailwind Configuration

Current `tailwind.config.js`:

```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

No custom colors, fonts, spacing, breakpoints, or plugins are configured.

---

## 20. Appendix: Theme File Locations

```text
src/themes/dark.css      — Dark theme (60+ !important overrides)
src/themes/light.css     — Light theme with custom properties
src/themes/minimal.css   — Clean/minimal theme
src/themes/custom.css    — Purple-accent customizable theme
src/index.css            — Global styles + Tailwind directives
src/styles/wp-content.css — WordPress/rich content styles
```

All imported unconditionally in `src/main.tsx`.
