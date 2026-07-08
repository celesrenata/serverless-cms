# Implementation Plan: Serverless Site Facelift Theme Engine

## Overview

Implement the serverless-site-facelift-theme-engine feature for the React 18 + TypeScript + Vite + Tailwind CSS public website at `frontend/public-website/`. The work delivers a CSS custom properties-based theme engine with five built-in themes, custom CSS upload with csstree validation, an interactive architecture map, command palette, scroll reveal effects, and comprehensive accessibility/performance/security hardening. All property-based tests use the existing fast-check dependency and run via Vitest.

## Tasks

- [x] 1. Audit and Foundation
  - [x] 1.1 Create site audit documentation
    - Add `frontend/public-website/docs/facelift-audit.md` documenting current framework, routing, build/deploy pipeline, CSS strategy, existing components/pages, assets, fonts, metadata, accessibility issues, performance baseline (Lighthouse scores), and hydration/routing problems
    - Include inventory of existing CSS custom properties, Tailwind config, and theme files
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Implement CSS layer architecture
    - Create `src/styles/layers.css` with `@layer reset, tokens, base, components, utilities, themes, user` declaration
    - Configure PostCSS/Tailwind to map Tailwind's built-in layers into the native cascade layers
    - Import the layer file as the first stylesheet in the Vite entry point
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.3 Refactor layout to semantic HTML landmarks
    - Update Layout component to use `<header>`, `<nav>`, `<main>`, `<footer>` landmarks
    - Add skip-to-content link targeting `<main>`
    - Preserve existing routing and render behavior
    - _Requirements: 12.1, 12.2_

  - [x] 1.4 Implement SEO and metadata foundation
    - Create a reusable `PageMeta` component using react-helmet-async for title, description, canonical, OG tags, and Twitter cards
    - Wire default metadata into the root layout
    - Add favicon and Apple touch icon references to document head
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [x] 1.5 Write unit tests for layout landmarks and metadata
    - Verify semantic landmarks render correctly
    - Verify PageMeta produces expected title, description, and OG/Twitter tags
    - _Requirements: 12.1, 15.1, 15.2_

- [x] 2. Design System
  - [x] 2.1 Define ThemeTokens TypeScript interface and token schema
    - Create `src/theme/tokens.ts` with the full ThemeTokens interface (colors, typography, radius, shadow, motion, patterns)
    - Implement `validateTokens()` function that type-checks imported JSON against the schema
    - Define default token values matching the "Celestium Neon" theme
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.2 Implement token serialization and import normalization
    - Add `exportTheme()` that serializes ThemeTokens to stable JSON
    - Add `importTheme()` that parses JSON, validates against schema, strips unknown keys, and returns TokenValidationResult
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 2.3 Write property test: token round-trip (Property 1)
    - **Property 1: Theme token round-trip (export/import)**
    - Generate arbitrary valid ThemeTokens via custom fast-check Arbitrary
    - Assert export → import → deepEqual with original (modulo unknown keys stripped)
    - **Validates: Requirements 18.5**

  - [x] 2.4 Write property test: schema rejects invalid types (Property 2)
    - **Property 2: Token schema validation rejects invalid types**
    - Generate tokens with random type corruption (number where string expected, missing required keys)
    - Assert validateTokens returns `{ valid: false }` with error entries identifying invalid fields
    - **Validates: Requirements 3.3**

  - [x] 2.5 Write property test: unknown keys ignored (Property 5)
    - **Property 5: Unknown token keys are ignored on import**
    - Generate valid ThemeTokens extended with arbitrary additional keys
    - Assert importTheme applies only recognized token values and discards unknown keys without error
    - **Validates: Requirements 18.3**

  - [x] 2.6 Implement ThemeProvider context and theme application
    - Create `src/theme/ThemeProvider.tsx` with ThemeContextValue interface
    - Apply active theme by setting `data-theme` on `<html>` and updating CSS custom properties within a single animation frame
    - Add blocking inline script in `index.html` (~200 bytes) to read localStorage and set `data-theme` before first paint (FOUC prevention)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.7 Write property test: theme application produces valid CSS properties (Property 4)
    - **Property 4: Theme application produces valid custom properties**
    - Generate valid ThemeTokens, apply via setTheme, read CSS custom properties on document element
    - Assert each color property is a valid space-separated RGB triplet matching input tokens
    - **Validates: Requirements 4.1, 4.2**

  - [x] 2.8 Build reusable themed UI primitives
    - Create shared components: Button, Card, Badge, Input, Tooltip, Dialog primitives
    - Components consume theme tokens via Tailwind classes referencing CSS custom properties
    - Include accessible focus indicators, disabled states, hover/active states
    - _Requirements: 12.2, 16.1_

  - [x] 2.9 Write unit tests for UI primitives
    - Verify accessible names, keyboard focusability, disabled behavior
    - Verify components use token-based styling (no hardcoded color values)
    - _Requirements: 12.2_

- [x] 3. Checkpoint - Design system stable
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Homepage Facelift
  - [x] 4.1 Implement Hero section
    - Build full-viewport hero with site title, tagline, primary CTA, and technical background visual (CSS gradient/animated pattern)
    - Render meaningful content in initial HTML (no JS-only text injection)
    - Ensure LCP target of 2.5s by avoiding render-blocking resources in hero
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 13.1, 15.6_

  - [x] 4.2 Implement Capability Cards section
    - Create card grid showcasing technical skills/services with hover depth effects
    - Use shared Card component with theme tokens for shadows and borders
    - _Requirements: 8.5, 16.1_

  - [x] 4.3 Implement Projects/Build Notes section
    - Add section linking to recent projects from the CMS
    - Use responsive card/grid patterns with tokenized spacing
    - _Requirements: 8.6_

  - [x] 4.4 Implement Contact/Links section
    - Add professional links and social references section
    - Ensure accessible link semantics and responsive layout
    - _Requirements: 8.7, 12.2_

  - [x] 4.5 Wire homepage sections with responsive layout
    - Compose hero, capabilities, projects, contact into the homepage
    - Apply mobile-first spacing using design tokens, ensure 320px-2560px viewport support
    - Add per-page metadata via PageMeta component
    - _Requirements: 16.1, 16.5, 15.1_

  - [x] 4.6 Write component tests for homepage sections
    - Verify hero renders title, tagline, and CTA
    - Verify capability cards render with proper headings
    - Verify responsive layout does not overflow on narrow viewports
    - _Requirements: 8.1, 8.5, 16.1_

- [x] 5. Architecture Map
  - [x] 5.1 Define architecture map data model
    - Create `src/components/ArchitectureMap/data.ts` with typed ArchNode[], ArchEdge[] definitions
    - Include nodes for: client, CloudFront CDN, API Gateway, Lambda functions, DynamoDB, S3, Cognito auth, monitoring, CI/CD
    - Add both simple and technical descriptions per node
    - _Requirements: 9.1, 9.4_

  - [x] 5.2 Implement SVG architecture map rendering
    - Render nodes and edges as React SVG components (not raster images)
    - Use theme tokens for colors, strokes, and typography
    - Add accessible SVG title and desc elements
    - Implement simplified/scrollable layout for viewports under 768px
    - _Requirements: 9.1, 9.2, 9.5, 16.2_

  - [x] 5.3 Implement hover/tap tooltips with mode toggle
    - Show explanatory tooltip on node hover or tap
    - Add toggle between "Technical" and "Non-Technical" explanation modes
    - Provide text-based fallback description for screen readers
    - _Requirements: 9.3, 9.4, 9.5, 12.5_

  - [x] 5.4 Implement keyboard navigation for architecture map
    - Support arrow key navigation between nodes and Tab focus
    - Enter/Space to activate tooltip, Escape to dismiss
    - Ensure all nodes are reachable via keyboard
    - _Requirements: 9.6, 12.6_

  - [x] 5.5 Write unit tests for architecture map
    - Verify all data nodes have required labels and descriptions
    - Verify SVG includes accessible title/description and expected node count
    - Verify keyboard navigation cycles through nodes correctly
    - _Requirements: 9.1, 9.2, 9.6_

- [x] 6. Checkpoint - Homepage and map complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Theme Engine
  - [x] 7.1 Implement five built-in themes
    - Define complete ThemeTokens for: Celestium Neon, AWS Console After Dark, Glass Circuit, Paper Systems, Terminal Witchcraft
    - Validate all built-in themes pass the token schema
    - Ensure all themes meet WCAG 2.1 AA contrast requirements (4.5:1 normal text, 3:1 large text)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 7.2 Build Theme Panel UI
    - Implement side drawer (desktop) / bottom sheet (mobile <768px) with slide-in animation
    - Display built-in themes as selectable cards with visual preview swatches
    - Add floating toggle button visible on all pages
    - Implement keyboard navigation, focus indicators, Escape to close
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.8, 6.9, 16.3_

  - [x] 7.3 Implement theme persistence and state management
    - Persist active theme to `celestium.theme.active` in localStorage
    - Persist custom theme overrides to `celestium.theme.custom`
    - Persist motion override to `celestium.motion.override`
    - Handle localStorage unavailable gracefully (fall back to system preferences)
    - Handle stored theme ID not matching any known theme (fall back to system color scheme)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 4.3, 4.4, 4.5_

  - [x] 7.4 Write property test: persistence round-trip (Property 8)
    - **Property 8: Theme persistence round-trip via localStorage**
    - Generate valid theme IDs from built-in set, call setTheme(id), verify localStorage value matches
    - Simulate page reload, verify ThemeProvider initializes with stored theme
    - **Validates: Requirements 4.3, 4.4, 17.1**

  - [x] 7.5 Implement JSON import and export
    - Export: serialize current tokens to downloadable JSON file with descriptive filename
    - Import: parse JSON, validate with validateTokens, apply valid tokens as custom theme
    - Display field-level validation errors for invalid imports
    - Handle malformed JSON gracefully with user-facing error
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 6.5, 6.6, 6.7_

  - [x] 7.6 Write integration tests for theme panel and import/export
    - Verify theme selection updates CSS custom properties on document
    - Verify JSON export produces valid parseable JSON
    - Verify JSON import with valid/invalid data shows appropriate results
    - Verify persistence hydrates correctly after state reset
    - _Requirements: 5.1, 6.1, 17.1, 18.1, 18.2_

- [x] 8. Custom CSS Preview
  - [x] 8.1 Implement csstree-based CSS validation
    - Install csstree dependency (~30KB gzipped)
    - Create `src/lib/cssValidator.ts` with AST-based validation
    - Reject: @import rules, url() with external domains, javascript:/vbscript:/data: protocols, expression(), -moz-binding, behavior property
    - Return structured validation errors identifying specific blocked patterns
    - _Requirements: 7.3, 14.3, 14.4_

  - [x] 8.2 Write property test: CSS rejects dangerous patterns (Property 3)
    - **Property 3: CSS validation rejects dangerous patterns**
    - Generate CSS strings containing @import, external url(), javascript:, expression(), -moz-binding at random positions
    - Assert validator rejects input and returns descriptive error
    - **Validates: Requirements 7.3, 14.3**

  - [x] 8.3 Implement CSS size limit validation
    - Enforce 100KB (102400 bytes) maximum before parsing
    - Check file extension (.css) and MIME type (text/css)
    - _Requirements: 7.1, 7.2, 14.2_

  - [x] 8.4 Write property test: CSS size limit enforcement (Property 7)
    - **Property 7: CSS size limit enforcement**
    - Generate strings with byte length around 102400 boundary
    - Assert strings exceeding limit are rejected before parsing
    - **Validates: Requirements 7.2, 14.2**

  - [x] 8.5 Build CSS upload and preview UI
    - Add file picker accepting .css files only
    - Display validation status and specific error messages
    - Do not inject invalid CSS
    - _Requirements: 7.1, 7.3, 6.6_

  - [x] 8.6 Implement safe CSS preview injection
    - Inject validated CSS into `<style data-custom-css-preview>` scoped to `@layer user`
    - Support clearing/removing injected preview on dismiss
    - User must explicitly save to persist to localStorage under `celestium.theme.custom`
    - _Requirements: 7.4, 7.6, 7.7, 7.8, 2.3_

  - [x] 8.7 Add preview active indicator
    - Display persistent visual badge when custom CSS preview is active
    - Include accessible dismiss/clear control
    - _Requirements: 7.5, 12.2_

  - [x] 8.8 Write integration tests for CSS upload flow
    - Verify valid CSS injects into style element
    - Verify invalid/oversized CSS is rejected without injection
    - Verify dismiss removes style element and hides indicator
    - Verify save persists to localStorage
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8_

- [x] 9. Checkpoint - Theme engine and CSS preview complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Site Mechanics
  - [x] 10.1 Implement command palette action registry
    - Create typed PaletteAction definitions for: page navigation, theme switching, scroll-to-section, architecture map focus
    - Include searchable keywords, category grouping, optional keyboard shortcut hints
    - _Requirements: 10.2_

  - [x] 10.2 Implement fuzzy search utility
    - Create deterministic fuzzy matching over action titles and keywords
    - Return ranked results with relevance scoring
    - _Requirements: 10.3_

  - [x] 10.3 Write property test: fuzzy search relevance (Property 6)
    - **Property 6: Fuzzy search returns relevant results**
    - Generate action sets and query substrings of at least one action's title/keywords
    - Assert matching actions appear in results
    - **Validates: Requirements 10.3**

  - [x] 10.4 Build command palette UI
    - Implement Cmd+K / Ctrl+K keyboard shortcut activation
    - Centered modal overlay with search input and real-time filtered results
    - Arrow key navigation, Enter to execute, Escape to close
    - Focus trap while open, restore focus on close
    - Add visible UI button for mobile access
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 16.4, 12.6_

  - [x] 10.5 Implement scroll reveal system
    - Create ScrollReveal hook/component using IntersectionObserver
    - Apply CSS transitions for fade-in/slide-up entrance animations
    - No third-party animation libraries
    - _Requirements: 11.1, 11.3, 11.4_

  - [x] 10.6 Integrate reduced-motion support for scroll reveal
    - Respect `prefers-reduced-motion: reduce` - disable animations and show content immediately
    - Honor user's `celestium.motion.override` localStorage preference
    - _Requirements: 11.2, 12.4, 12.7_

  - [x] 10.7 Write tests for command palette and scroll reveal
    - Verify palette opens/closes with keyboard shortcuts
    - Verify arrow navigation and Enter execution
    - Verify scroll reveal renders content immediately when reduced-motion is active
    - Verify graceful degradation when IntersectionObserver is unavailable
    - _Requirements: 10.1, 10.4, 10.5, 11.1, 11.2_

- [x] 11. Quality Pass
  - [x] 11.1 Accessibility hardening
    - Audit and fix: ARIA roles/labels on ThemePanel, CommandPalette, and modal overlays
    - Verify visible focus indicators meet WCAG 2.1 AA on all interactive elements across all themes
    - Verify text contrast meets 4.5:1 (normal) and 3:1 (large text) on all built-in themes
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 11.2 Performance validation
    - Verify lazy-loading of ThemePanel, CommandPalette, ArchitectureMap via dynamic imports
    - Verify font-display: swap on custom fonts
    - Verify theme switch completes without full page reload or layout shift
    - Verify initial JS bundle increase stays under 50KB gzipped
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 11.3 Security validation
    - Verify JSON import uses safe JSON.parse with structure validation before spreading
    - Verify CSS injection uses textContent (not innerHTML)
    - Verify CSP compatibility of style injection approach
    - Verify all localStorage reads are wrapped in try/catch
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 11.4 Complete per-page SEO metadata
    - Add unique PageMeta to blog, gallery, projects, and other routes
    - Verify canonical URLs and OG/Twitter tags render correctly
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 11.5 Mobile responsiveness pass
    - Verify all sections render correctly 320px-2560px
    - Verify ThemePanel renders as bottom sheet on mobile (<768px)
    - Verify ArchitectureMap simplified layout on mobile
    - Verify CommandPalette accessible via visible button on mobile
    - Verify Hero typography scales without horizontal scrolling
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 11.6 Write final regression tests
    - Cover token utilities, theme reducer, command registry, metadata helpers, CSS validator edge cases
    - Lock edge cases discovered during hardening with Vitest assertions
    - _Requirements: 3.3, 4.1, 10.2, 14.3, 15.1_

  - [x] 11.7 Write integration smoke tests for primary flows
    - Verify: homepage render, theme switch, JSON import/export, CSS preview lifecycle, command palette execution, architecture map interaction, persistence hydration
    - Tests must be deterministic and independent of network state
    - _Requirements: 5.1, 6.1, 7.1, 9.6, 10.4, 17.1, 18.2_

  - [x] 11.8 Verify property test suite completeness
    - Confirm fast-check suite covers all 8 design correctness properties
    - Add feature/property tags as comments in each test file
    - Ensure minimum 100 iterations per property test
    - _Requirements: 3.3, 7.3, 10.3, 14.2, 17.1, 18.5_

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at natural integration boundaries
- Property tests validate the 8 universal correctness properties from the design:
  - Property 1 (token round-trip): Task 2.3
  - Property 2 (schema rejects invalid): Task 2.4
  - Property 3 (CSS rejects dangerous): Task 8.2
  - Property 4 (valid CSS properties): Task 2.7
  - Property 5 (unknown keys ignored): Task 2.5
  - Property 6 (fuzzy search relevance): Task 10.3
  - Property 7 (CSS size limit): Task 8.4
  - Property 8 (persistence round-trip): Task 7.4
- The project uses fast-check@^4.8.0 (already installed) and Vitest for all testing
- csstree is the only new runtime dependency (~30KB gzipped)
- All style injection uses `<style>` element textContent (CSP-compatible, no innerHTML)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.6"] },
    { "id": 4, "tasks": ["2.3", "2.4", "2.5", "2.7", "2.8"] },
    { "id": 5, "tasks": ["2.9"] },
    { "id": 6, "tasks": ["4.1", "4.2", "5.1"] },
    { "id": 7, "tasks": ["4.3", "4.4", "4.5", "5.2"] },
    { "id": 8, "tasks": ["4.6", "5.3", "7.1"] },
    { "id": 9, "tasks": ["7.2", "7.3", "5.4"] },
    { "id": 10, "tasks": ["5.5", "7.4", "7.5"] },
    { "id": 11, "tasks": ["5.6", "7.6", "8.1"] },
    { "id": 12, "tasks": ["8.2", "8.3"] },
    { "id": 13, "tasks": ["8.4", "8.5"] },
    { "id": 14, "tasks": ["8.6", "8.7"] },
    { "id": 15, "tasks": ["8.8", "10.1"] },
    { "id": 16, "tasks": ["10.2", "10.5"] },
    { "id": 17, "tasks": ["10.3", "10.4", "10.6"] },
    { "id": 18, "tasks": ["10.7"] },
    { "id": 19, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 20, "tasks": ["11.4", "11.5"] },
    { "id": 21, "tasks": ["11.6", "11.7", "11.8"] }
  ]
}
```
