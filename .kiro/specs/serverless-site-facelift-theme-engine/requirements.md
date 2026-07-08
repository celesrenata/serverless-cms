# Requirements Document

## Introduction

A major visual and mechanical overhaul of the public website at `frontend/public-website/`, transforming it from a standard content-driven homepage into a polished serverless engineering showcase. The upgrade introduces a CSS custom properties-based theme engine with five built-in themes, a serverless architecture map, interactive mechanics (command palette, theme lab drawer, scroll reveals), and manual stylesheet upload support. The site must remain fast, accessible, SEO-friendly, serverless-compatible, and crawlable.

## Glossary

- **Theme_Engine**: The client-side system responsible for loading, applying, switching, validating, and persisting visual themes via CSS custom properties and the `@layer` cascade.
- **Theme_Token**: A typed CSS custom property representing a single design value (color, font size, radius, shadow, motion preference, or background pattern) used consistently across components.
- **Theme_Panel**: A floating UI drawer allowing users to browse built-in themes, preview them live, and persist selection to localStorage.
- **Architecture_Map**: An interactive SVG/component-based diagram showing the serverless infrastructure as typed nodes and edges with hover/tap explanations.
- **Command_Palette**: A keyboard-activated overlay (Cmd+K / Ctrl+K) providing quick navigation and actions across the site.
- **CSS_Layer_Stack**: The ordered set of CSS layers used by the site: `@layer reset, tokens, base, components, utilities, themes, user`.
- **Custom_CSS_Previewer**: The subsystem that accepts user-uploaded CSS, validates it for safety, injects it into the `user` layer via a managed `<style>` tag, and displays a preview indicator.
- **Hero_Section**: The full-viewport landing section conveying the site owner's brand identity as an elite serverless engineer.
- **Capability_Cards**: Reusable card components showcasing skills, services, or technical highlights with depth effects.
- **Scroll_Reveal**: CSS/JS-driven entrance animations triggered as sections enter the viewport, respecting `prefers-reduced-motion`.
- **Token_Schema**: The typed JSON structure defining all theme tokens with their names, types, default values, and validation constraints.
- **Preview_Indicator**: A persistent visual badge informing the user that a custom CSS preview is active and unsaved.

## Requirements

### Requirement 1: Site Audit and Foundation Documentation

**User Story:** As a developer, I want a comprehensive audit of the existing public website, so that I can identify constraints, dependencies, and improvement opportunities before implementation.

#### Acceptance Criteria

1. WHEN the implementation begins, THE Audit_System SHALL produce a `docs/facelift-audit.md` file documenting the framework, routing, build/deploy pipeline, CSS strategy, existing components and pages, assets, fonts, metadata, accessibility issues, performance issues, and hydration or routing problems.
2. THE Audit_System SHALL identify all existing CSS custom properties, Tailwind configuration, and theme files currently in use.
3. THE Audit_System SHALL document the current Lighthouse performance and accessibility scores as baseline measurements.

### Requirement 2: CSS Layer Architecture

**User Story:** As a developer, I want a well-ordered CSS layer stack, so that theme tokens, component styles, and user overrides cascade predictably without specificity conflicts.

#### Acceptance Criteria

1. THE CSS_Layer_Stack SHALL define layers in the order: `reset, tokens, base, components, utilities, themes, user`.
2. WHEN a theme is applied, THE Theme_Engine SHALL inject theme token values into the `themes` layer.
3. WHEN a custom stylesheet is previewed, THE Custom_CSS_Previewer SHALL inject it exclusively into the `user` layer.
4. THE CSS_Layer_Stack SHALL ensure that the `user` layer takes precedence over all other layers for any conflicting properties.

### Requirement 3: Theme Token Model

**User Story:** As a developer, I want a typed token schema covering all visual properties, so that themes are consistent, validated, and extensible.

#### Acceptance Criteria

1. THE Token_Schema SHALL define tokens for the following categories: colors (primary, secondary, background, text, border, accent, status), typography (font-family, font-size scale, line-height, font-weight), radius (small, medium, large, full), shadow (small, medium, large, glow), motion (duration, easing, reduced-motion override), and background patterns (type, opacity, color).
2. THE Token_Schema SHALL be serializable as a JSON object conforming to a TypeScript interface.
3. WHEN a theme JSON is imported, THE Theme_Engine SHALL validate it against the Token_Schema and reject tokens with invalid types or missing required fields.
4. THE Token_Schema SHALL support forward-compatible extension by allowing additional token categories without breaking existing themes.

### Requirement 4: Theme Application Mechanism

**User Story:** As a site visitor, I want theme changes to apply instantly without a full page reload, so that I can explore themes fluidly.

#### Acceptance Criteria

1. THE Theme_Engine SHALL apply the active theme by setting `data-theme` attribute on the `<html>` element.
2. WHEN a theme is switched, THE Theme_Engine SHALL update all CSS custom properties within a single animation frame without triggering a full page reload.
3. THE Theme_Engine SHALL persist the active theme selection to `localStorage` under the key `celestium.theme.active`.
4. WHEN the page loads, THE Theme_Engine SHALL restore the previously selected theme from `localStorage` before first paint.
5. IF no theme is stored in localStorage, THEN THE Theme_Engine SHALL default to the system color scheme preference (light or dark).

### Requirement 5: Built-in Themes

**User Story:** As a site visitor, I want five distinct built-in themes to choose from, so that I can personalize the site's visual presentation to my preference.

#### Acceptance Criteria

1. THE Theme_Engine SHALL include the "Celestium Neon" theme providing a dark cyberpunk aesthetic with neon accent colors, glow effects, and a dark background.
2. THE Theme_Engine SHALL include the "AWS Console After Dark" theme providing a professional dark interface inspired by cloud console design with subdued colors and clean typography.
3. THE Theme_Engine SHALL include the "Glass Circuit" theme providing translucent panels with backdrop blur effects, circuit-grid background patterns, and frosted glass borders.
4. THE Theme_Engine SHALL include the "Paper Systems" theme providing a light, technical-document aesthetic with serif typography, paper-texture backgrounds, and minimal color usage.
5. THE Theme_Engine SHALL include the "Terminal Witchcraft" theme providing a retro terminal aesthetic with monospace typography, green-on-black color scheme, scanline effects, and cursor-blink animations.
6. WHEN any built-in theme is applied, THE Theme_Engine SHALL ensure all page content meets WCAG 2.1 AA contrast requirements for text over background.

### Requirement 6: Theme Panel UI

**User Story:** As a site visitor, I want an accessible theme panel drawer, so that I can browse, preview, and switch themes without navigating away from my current page.

#### Acceptance Criteria

1. THE Theme_Panel SHALL be accessible via a floating button visible on all pages.
2. WHEN the floating button is activated, THE Theme_Panel SHALL open as a side drawer with a slide-in animation.
3. THE Theme_Panel SHALL display all built-in themes as selectable cards with a visual preview swatch for each.
4. WHEN a theme card is selected, THE Theme_Engine SHALL apply that theme immediately as a live preview.
5. THE Theme_Panel SHALL provide a JSON export button that serializes the current active theme tokens to a downloadable JSON file.
6. THE Theme_Panel SHALL provide a JSON import control that accepts a JSON file, validates it against the Token_Schema, and applies it as a custom theme.
7. IF an imported JSON file fails validation, THEN THE Theme_Panel SHALL display a descriptive error message identifying the invalid fields.
8. THE Theme_Panel SHALL be fully keyboard navigable with visible focus indicators.
9. WHEN the Escape key is pressed while the Theme_Panel is open, THE Theme_Panel SHALL close.

### Requirement 7: Manual CSS Upload and Preview

**User Story:** As an advanced user, I want to upload a custom CSS file and preview it safely, so that I can fully customize the site's appearance without risking security or breaking the page.

#### Acceptance Criteria

1. THE Custom_CSS_Previewer SHALL accept CSS files with the `.css` extension and `text/css` MIME type only.
2. THE Custom_CSS_Previewer SHALL reject uploaded files exceeding 100KB in size.
3. THE Custom_CSS_Previewer SHALL reject CSS content containing `@import` rules, remote URLs (`url()` references to external domains), `javascript:` protocol references, `expression()` calls, or `-moz-binding` declarations.
4. WHEN a valid CSS file is uploaded, THE Custom_CSS_Previewer SHALL inject its contents into a `<style data-custom-css-preview>` element scoped to `@layer user`.
5. WHILE a custom CSS preview is active, THE Preview_Indicator SHALL display a persistent visual badge informing the user that unsaved preview styles are applied.
6. THE Custom_CSS_Previewer SHALL NOT auto-persist custom CSS to localStorage; the user must explicitly choose to save.
7. WHEN the user dismisses the preview, THE Custom_CSS_Previewer SHALL remove the injected `<style>` element and restore the previous theme state.
8. IF the user explicitly saves the custom CSS, THEN THE Custom_CSS_Previewer SHALL persist it to `localStorage` under the key `celestium.theme.custom`.

### Requirement 8: Homepage Visual Identity

**User Story:** As a site visitor, I want the homepage to communicate a strong "elite serverless engineer" brand with depth, animation, and technical aesthetics, so that the site feels like a polished professional showcase.

#### Acceptance Criteria

1. THE Hero_Section SHALL render a full-viewport introductory panel with the site title, tagline, and a primary call-to-action.
2. THE Hero_Section SHALL include a technical background visual (gradient, particle effect, or animated pattern) that does not interfere with text readability.
3. THE Hero_Section SHALL render meaningful content with CSS only (no JavaScript required for above-the-fold text content).
4. WHEN the page loads, THE Hero_Section SHALL be fully visible and interactive within the Largest Contentful Paint budget of 2.5 seconds.
5. THE Homepage SHALL include a Capability_Cards section displaying technical skills or services as cards with hover depth effects.
6. THE Homepage SHALL include a Project/Build Notes section linking to recent projects from the CMS.
7. THE Homepage SHALL include a Contact/Links section with professional links and social references.

### Requirement 9: Serverless Architecture Map

**User Story:** As a site visitor, I want an interactive serverless stack diagram, so that I can understand the infrastructure behind the site with context-appropriate detail.

#### Acceptance Criteria

1. THE Architecture_Map SHALL render a data-driven diagram using typed node and edge definitions.
2. THE Architecture_Map SHALL be implemented as SVG or React components (not raster images) for resolution independence and accessibility.
3. WHEN a user hovers or taps a node, THE Architecture_Map SHALL display an explanatory tooltip describing that service's role.
4. THE Architecture_Map SHALL provide a toggle between "Technical" and "Non-Technical" explanation modes.
5. THE Architecture_Map SHALL include a text-based fallback description for screen readers and when JavaScript is disabled.
6. THE Architecture_Map SHALL support keyboard navigation between nodes using arrow keys and Tab.

### Requirement 10: Command Palette

**User Story:** As a power user, I want a command palette activated by keyboard shortcut, so that I can quickly navigate pages and trigger actions without scrolling or clicking menus.

#### Acceptance Criteria

1. WHEN the user presses Cmd+K (macOS) or Ctrl+K (other platforms), THE Command_Palette SHALL open as a centered modal overlay with a search input.
2. THE Command_Palette SHALL index all navigable pages and available actions (theme switch, scroll to section).
3. WHEN the user types in the search input, THE Command_Palette SHALL filter results in real-time using fuzzy matching.
4. WHEN the user selects a result with Enter or click, THE Command_Palette SHALL execute the action (navigate, switch theme, scroll) and close.
5. WHEN the Escape key is pressed, THE Command_Palette SHALL close without performing an action.
6. THE Command_Palette SHALL trap focus within the modal while open and restore focus to the previously focused element on close.

### Requirement 11: Scroll Reveal Effects

**User Story:** As a site visitor, I want sections to animate into view as I scroll, so that the page feels dynamic and polished.

#### Acceptance Criteria

1. WHEN a page section enters the viewport, THE Scroll_Reveal system SHALL trigger an entrance animation (fade-in, slide-up, or scale-in).
2. WHILE the user has `prefers-reduced-motion: reduce` enabled, THE Scroll_Reveal system SHALL disable all entrance animations and display content immediately.
3. THE Scroll_Reveal system SHALL use CSS transitions or the Web Animations API without adding third-party animation libraries.
4. THE Scroll_Reveal system SHALL use IntersectionObserver for viewport detection to avoid scroll-handler performance issues.

### Requirement 12: Accessibility Compliance

**User Story:** As a user with assistive technology, I want the site to be fully navigable and understandable, so that I can access all content and functionality regardless of my abilities.

#### Acceptance Criteria

1. THE Layout SHALL use semantic HTML landmarks (header, nav, main, footer, aside) for all major page regions.
2. THE Site SHALL provide visible focus indicators on all interactive elements that meet WCAG 2.1 AA requirements.
3. THE Site SHALL ensure all text content meets WCAG 2.1 AA minimum contrast ratio (4.5:1 for normal text, 3:1 for large text) across all built-in themes.
4. WHILE `prefers-reduced-motion: reduce` is active, THE Site SHALL suppress all non-essential animations and transitions.
5. THE Architecture_Map SHALL provide a text-equivalent description accessible to screen readers.
6. THE Theme_Panel, Command_Palette, and all modal overlays SHALL implement proper ARIA roles, labels, and focus management.
7. THE Site SHALL store the user's motion preference override in `localStorage` under the key `celestium.motion.override`.

### Requirement 13: Performance Requirements

**User Story:** As a site visitor, I want the page to load fast and remain responsive, so that I can access content without delay on any device or connection.

#### Acceptance Criteria

1. THE Site SHALL achieve a Largest Contentful Paint (LCP) under 2.5 seconds on a simulated 4G connection.
2. THE Site SHALL prefer CSS and SVG animations over JavaScript-driven animations for visual effects.
3. THE Site SHALL lazy-load non-critical sections (Architecture_Map, Theme_Panel, below-fold content) using dynamic imports or IntersectionObserver triggers.
4. THE Site SHALL avoid render-blocking font loads by using `font-display: swap` or system font fallbacks.
5. WHEN a theme is switched, THE Theme_Engine SHALL complete the visual transition without a full page reload or layout shift.
6. THE Site SHALL not increase the initial JavaScript bundle by more than 50KB gzipped compared to the current bundle for core page load.

### Requirement 14: Security Requirements

**User Story:** As a site operator, I want uploaded and imported content to be sanitized, so that malicious input cannot compromise the site or its visitors.

#### Acceptance Criteria

1. WHEN parsing imported theme JSON, THE Theme_Engine SHALL use safe JSON parsing (try/catch around `JSON.parse`) and validate structure before applying values.
2. THE Custom_CSS_Previewer SHALL enforce a maximum file size of 100KB for uploaded CSS.
3. THE Custom_CSS_Previewer SHALL reject CSS containing `@import`, remote `url()` references, `javascript:` URIs, `expression()`, or `-moz-binding`.
4. THE Custom_CSS_Previewer SHALL NOT execute any JavaScript embedded within CSS content.
5. THE Site SHALL maintain compatibility with Content Security Policy headers that disallow `unsafe-inline` for scripts (theme/CSS operations must use approved injection methods).

### Requirement 15: SEO and Metadata

**User Story:** As a site owner, I want comprehensive metadata on all pages, so that search engines and social platforms display rich, accurate previews.

#### Acceptance Criteria

1. THE Site SHALL render a unique `<title>` tag on every page reflecting the page content.
2. THE Site SHALL render `<meta name="description">` with page-appropriate descriptions on every page.
3. THE Site SHALL render Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`) on every page.
4. THE Site SHALL render Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) on every page.
5. THE Site SHALL render a `<link rel="canonical">` tag with the canonical URL on every page.
6. THE Hero_Section SHALL render crawlable text content in the initial HTML (not injected solely by JavaScript after hydration).
7. THE Site SHALL include a favicon and Apple touch icon referenced in the document head.

### Requirement 16: Mobile Responsiveness

**User Story:** As a mobile user, I want the site to be fully functional and visually polished on small screens, so that I can access all features from my phone or tablet.

#### Acceptance Criteria

1. THE Site SHALL render all sections, components, and interactive elements correctly on viewports from 320px to 2560px wide.
2. THE Architecture_Map SHALL adapt its layout for mobile viewports, showing a simplified or scrollable version on screens under 768px.
3. THE Theme_Panel SHALL render as a full-width bottom sheet on mobile viewports (under 768px) instead of a side drawer.
4. THE Command_Palette SHALL be accessible via a visible UI button in addition to the keyboard shortcut for mobile users.
5. THE Hero_Section SHALL adjust typography scale and spacing to remain readable on mobile viewports without horizontal scrolling.

### Requirement 17: Theme Persistence and State Management

**User Story:** As a returning visitor, I want my theme preference to be remembered, so that the site loads with my chosen appearance on every visit.

#### Acceptance Criteria

1. THE Theme_Engine SHALL persist the active theme identifier to `localStorage` under the key `celestium.theme.active`.
2. THE Theme_Engine SHALL persist any custom theme token overrides to `localStorage` under the key `celestium.theme.custom`.
3. THE Theme_Engine SHALL persist the user's motion preference override to `localStorage` under the key `celestium.motion.override`.
4. WHEN localStorage is unavailable or throws an error, THE Theme_Engine SHALL fall back to system preferences and operate without persistence.
5. WHEN a stored theme identifier does not match any known theme, THE Theme_Engine SHALL fall back to the system color scheme preference.

### Requirement 18: Theme JSON Import and Export

**User Story:** As a power user, I want to export and import theme configurations as JSON, so that I can share themes or transfer them between browsers.

#### Acceptance Criteria

1. WHEN the export action is triggered, THE Theme_Panel SHALL serialize all current theme tokens into a JSON file with a descriptive filename and trigger a browser download.
2. WHEN a JSON file is imported, THE Theme_Engine SHALL parse it, validate all tokens against the Token_Schema, and apply valid tokens as a custom theme.
3. IF the imported JSON contains unknown token keys, THEN THE Theme_Engine SHALL ignore the unknown keys and apply only recognized tokens.
4. IF the imported JSON is malformed or unparseable, THEN THE Theme_Engine SHALL display an error message and make no changes to the current theme.
5. FOR ALL valid Token_Schema objects, exporting then importing SHALL produce a theme visually equivalent to the original (round-trip property).
