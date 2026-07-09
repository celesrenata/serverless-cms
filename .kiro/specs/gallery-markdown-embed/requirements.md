# Requirements Document

## Introduction

This feature adds a gallery album embed system to the markdown content pipeline. Authors can embed gallery albums directly into blog posts and pages using a markdown directive syntax. The admin panel's content editor provides a toolbar button and album picker dialog for inserting embeds without typing raw syntax. The public website renders embedded galleries as interactive image components with layout options.

## Glossary

- **Gallery_Embed_Directive**: A markdown directive syntax (e.g., `::gallery[album-id]{options}`) that represents an embedded gallery album within markdown content
- **Remark_Plugin**: A unified/remark processor plugin that transforms Gallery_Embed_Directive nodes in the markdown AST into renderable HTML or React-compatible output
- **Album_Picker_Dialog**: A modal dialog in the admin panel content editor that allows authors to browse and select gallery albums for embedding
- **Embed_Toolbar_Button**: A button in the content editor's toolbar that opens the Album_Picker_Dialog
- **Gallery_Embed_Component**: A React component on the public website that renders an embedded gallery album with its images, title, and description
- **Layout_Mode**: The visual arrangement for displaying gallery images within an embed; one of `grid`, `carousel`, or `masonry`
- **Directive_Parser**: The remark plugin responsible for parsing the Gallery_Embed_Directive syntax from raw markdown text into AST nodes
- **Content_Editor**: The admin panel's post/page editing interface, which supports both TipTap (WYSIWYG) and CodeMirror (markdown) editing modes
- **Markdown_Renderer**: The shared remark/rehype pipeline at `frontend/shared/markdown/` that processes markdown into HTML

## Requirements

### Requirement 1: Gallery Embed Directive Syntax

**User Story:** As an author, I want a concise markdown syntax for embedding gallery albums, so that I can include album content in my posts without complex markup.

#### Acceptance Criteria

1. THE Directive_Parser SHALL recognize the syntax `::gallery[ALBUM_ID]` as a valid Gallery_Embed_Directive where ALBUM_ID is a non-empty string matching the pattern `^[a-zA-Z0-9-]+$`
2. THE Directive_Parser SHALL recognize the extended syntax `::gallery[ALBUM_ID]{key=value key2=value2}` with optional attribute pairs
3. WHEN the Directive_Parser encounters a Gallery_Embed_Directive, THE Directive_Parser SHALL produce a dedicated AST node of type `galleryEmbed` containing the album ID and parsed attributes
4. IF the ALBUM_ID is empty or contains invalid characters, THEN THE Directive_Parser SHALL treat the directive as literal text and produce no `galleryEmbed` node
5. THE Directive_Parser SHALL support the following attributes: `layout` (grid, carousel, masonry), `limit` (positive integer), `showDescription` (true, false), `showTitle` (true, false)
6. WHEN an attribute has an unrecognized key, THE Directive_Parser SHALL ignore that attribute and parse remaining attributes normally
7. WHEN an attribute has an invalid value for its key, THE Directive_Parser SHALL use the default value for that attribute
8. THE Directive_Parser SHALL use these defaults: `layout=grid`, `limit=0` (show all), `showDescription=true`, `showTitle=true`

### Requirement 2: Remark Plugin Integration

**User Story:** As a developer, I want the gallery embed directive integrated into the existing remark/rehype pipeline, so that embedded albums are transformed into renderable output alongside other markdown content.

#### Acceptance Criteria

1. THE Remark_Plugin SHALL register with the unified pipeline in `frontend/shared/markdown/createProcessor.ts` alongside existing plugins
2. WHEN the Markdown_Renderer processes markdown containing a `galleryEmbed` AST node, THE Remark_Plugin SHALL transform the node into an HTML container element with data attributes encoding the album ID and options
3. THE Remark_Plugin SHALL produce an HTML element with the tag `div`, class `gallery-embed`, and data attributes `data-album-id`, `data-layout`, `data-limit`, `data-show-description`, `data-show-title`
4. WHEN multiple Gallery_Embed_Directives appear in one document, THE Remark_Plugin SHALL transform each independently without interference
5. THE Remark_Plugin SHALL NOT alter processing of other markdown elements in the same document
6. FOR ALL valid markdown inputs containing Gallery_Embed_Directives, parsing then rendering SHALL produce HTML containing a `gallery-embed` div for each directive (round-trip integrity)

### Requirement 3: Album Picker Dialog in Content Editor

**User Story:** As an author, I want a visual album picker in the content editor, so that I can browse available albums and insert embeds without memorizing album IDs or syntax.

#### Acceptance Criteria

1. WHEN an author clicks the Embed_Toolbar_Button, THE Content_Editor SHALL open the Album_Picker_Dialog as a modal overlay
2. THE Album_Picker_Dialog SHALL fetch and display all published gallery albums from the content API filtered by type `gallery` and status `published`
3. THE Album_Picker_Dialog SHALL display each album as a card showing the album title, cover image thumbnail, and image count
4. THE Album_Picker_Dialog SHALL support searching albums by title with a text input that filters results as the author types
5. WHEN an author selects an album in the Album_Picker_Dialog, THE Album_Picker_Dialog SHALL display a configuration panel with options for layout mode, image limit, show description toggle, and show title toggle
6. WHEN an author confirms their selection, THE Album_Picker_Dialog SHALL insert the complete Gallery_Embed_Directive syntax at the current cursor position in the markdown editor
7. WHEN an author confirms their selection while in WYSIWYG (TipTap) mode, THE Album_Picker_Dialog SHALL insert the Gallery_Embed_Directive as a custom node block in the TipTap editor
8. WHEN an author presses Escape or clicks outside the modal, THE Album_Picker_Dialog SHALL close without inserting any content
9. WHILE the Album_Picker_Dialog is fetching albums, THE Album_Picker_Dialog SHALL display a loading indicator
10. IF no published gallery albums exist, THEN THE Album_Picker_Dialog SHALL display a message indicating no albums are available

### Requirement 4: Editor Toolbar Integration

**User Story:** As an author, I want a gallery embed button in the editor toolbar, so that I can quickly access the embed functionality while writing content.

#### Acceptance Criteria

1. THE Content_Editor SHALL display the Embed_Toolbar_Button in both the TipTap toolbar and the CodeMirror markdown editor toolbar area
2. THE Embed_Toolbar_Button SHALL display a recognizable gallery icon and a tooltip reading "Insert Gallery"
3. WHILE no published gallery albums exist in the system, THE Embed_Toolbar_Button SHALL remain enabled but the Album_Picker_Dialog SHALL show the empty state message upon opening
4. THE Embed_Toolbar_Button SHALL be positioned after the existing image insert button in the toolbar layout

### Requirement 5: Editor Preview Rendering

**User Story:** As an author, I want to see a preview of embedded galleries while editing, so that I can verify the embed looks correct before publishing.

#### Acceptance Criteria

1. WHILE the markdown preview panel is visible, THE Content_Editor SHALL render Gallery_Embed_Directives as a preview placeholder showing the album title, cover image, image count, and selected layout mode
2. WHEN the preview renders a Gallery_Embed_Directive, THE Content_Editor SHALL fetch the album metadata from the content API using the embedded album ID
3. IF the album ID in a Gallery_Embed_Directive does not correspond to an existing published album, THEN THE Content_Editor SHALL render an error placeholder showing "Album not found" with the referenced ID
4. THE Content_Editor SHALL render the preview placeholder with a dashed border and a gallery icon to distinguish it from final rendered output
5. WHILE the album metadata is loading for preview, THE Content_Editor SHALL display a skeleton loading state within the embed placeholder

### Requirement 6: Public Website Gallery Embed Rendering

**User Story:** As a site visitor, I want embedded gallery albums in blog posts to display as interactive image galleries, so that I can browse album photos without leaving the page.

#### Acceptance Criteria

1. WHEN the public website renders HTML containing a `gallery-embed` div, THE Gallery_Embed_Component SHALL hydrate that element into an interactive gallery display
2. THE Gallery_Embed_Component SHALL fetch the album data (title, description, images) from the public content API using the `data-album-id` attribute
3. WHEN `data-layout` is `grid`, THE Gallery_Embed_Component SHALL display images in a responsive grid with columns: 2 on mobile, 3 on tablet, 4 on desktop
4. WHEN `data-layout` is `carousel`, THE Gallery_Embed_Component SHALL display images in a horizontal scrollable carousel with navigation arrows and swipe support
5. WHEN `data-layout` is `masonry`, THE Gallery_Embed_Component SHALL display images in a masonry layout preserving each image's aspect ratio
6. WHEN `data-limit` is a positive integer, THE Gallery_Embed_Component SHALL display at most that number of images and show a "View all N images" link to the full album page
7. WHEN `data-show-description` is `true`, THE Gallery_Embed_Component SHALL display the album description text above the image grid
8. WHEN `data-show-title` is `true`, THE Gallery_Embed_Component SHALL display the album title as a heading above the description
9. WHEN a visitor clicks an image in the Gallery_Embed_Component, THE Gallery_Embed_Component SHALL open the existing Lightbox component at the clicked image's index
10. IF the album ID does not correspond to an existing published album, THEN THE Gallery_Embed_Component SHALL render nothing and log a warning to the console
11. WHILE the album data is loading, THE Gallery_Embed_Component SHALL display a skeleton placeholder matching the configured layout dimensions
12. THE Gallery_Embed_Component SHALL use `loading="lazy"` on all embedded images for performance
13. THE Gallery_Embed_Component SHALL use thumbnail URLs (medium size) for grid and masonry layouts, and large thumbnails for carousel layout

### Requirement 7: Accessibility

**User Story:** As a site visitor using assistive technology, I want the embedded gallery to be accessible, so that I can navigate and understand the gallery content.

#### Acceptance Criteria

1. THE Gallery_Embed_Component SHALL include an `aria-label` attribute on the container reading "Gallery: {album_title}"
2. THE Gallery_Embed_Component SHALL render each image with an `alt` attribute derived from the image's `metadata.alt_text` field, falling back to the image filename
3. WHEN `data-layout` is `carousel`, THE Gallery_Embed_Component SHALL provide accessible navigation buttons with `aria-label` values "Previous image" and "Next image"
4. THE Gallery_Embed_Component SHALL use `role="region"` on the gallery container element

### Requirement 8: Error Handling and Edge Cases

**User Story:** As an author, I want the gallery embed system to handle errors gracefully, so that broken embeds do not disrupt the rest of my content.

#### Acceptance Criteria

1. IF the content API returns an error when fetching album data for a Gallery_Embed_Component, THEN THE Gallery_Embed_Component SHALL render an unobtrusive fallback showing "Gallery unavailable" with a link to the album page
2. IF a gallery album is deleted after being embedded in a post, THEN THE Gallery_Embed_Component SHALL render nothing on the public site and the editor preview SHALL show "Album not found"
3. WHEN an album has zero images, THE Gallery_Embed_Component SHALL render the album title and description with a message "This album has no images yet"
4. THE Directive_Parser SHALL handle Gallery_Embed_Directives appearing inside block quotes, list items, and other container elements by treating them as block-level elements that break out of inline context
