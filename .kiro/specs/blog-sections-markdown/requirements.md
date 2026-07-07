# Requirements Document

## Introduction

This feature adds two major capabilities to the serverless CMS: hierarchical blog sections for organizing posts into a navigable tree structure, and a full extended markdown rendering pipeline that replaces direct HTML output with a proper markdown-to-HTML conversion system supporting GFM tables, footnotes, math/LaTeX, syntax-highlighted code blocks, and more.

## Glossary

- **Section**: A named organizational unit within the blog that groups related posts and can contain child Subsections, forming a hierarchy (e.g., "Technology" > "Web Development" > "React")
- **Sections_Table**: A DynamoDB table that stores Section records with their parent-child relationships and metadata
- **Section_Repository**: A Python class that provides CRUD operations and hierarchical queries against the Sections_Table
- **Markdown_Renderer**: A frontend module that converts markdown source text into sanitized HTML, supporting extended syntax including GFM tables, footnotes, math, and code highlighting
- **Content_Editor**: The admin panel page where authors create and edit content, currently using TipTap for WYSIWYG HTML editing
- **Blog_Navigation**: The public website component that renders the section hierarchy as a navigable tree or sidebar
- **Content_Table**: The existing DynamoDB table storing all CMS content items (posts, pages, galleries, projects)
- **Markdown_Parser**: The processing pipeline that reads markdown input and produces an AST (abstract syntax tree) for transformation into HTML
- **TOC_Generator**: A module that extracts heading elements from rendered markdown content and produces a table of contents structure

## Requirements

### Requirement 1: Section Data Model

**User Story:** As a CMS administrator, I want to define hierarchical sections for blog posts, so that content is organized into navigable categories with parent-child relationships.

#### Acceptance Criteria

1. THE Sections_Table SHALL store each Section with a unique identifier (UUID), name (maximum 100 characters), slug (maximum 120 characters, lowercase alphanumeric and hyphens only), optional parent_id, sort_order (integer 0 to 1000), description (maximum 500 characters), created_at (Unix timestamp), and updated_at (Unix timestamp)
2. WHEN a Section is created with a parent_id, THE Section_Repository SHALL validate that the referenced parent Section exists
3. IF a Section is created with a parent_id that references a non-existent Section, THEN THE Section_Repository SHALL return a validation error indicating the parent Section was not found
4. WHEN a Section is created without a parent_id, THE Section_Repository SHALL treat the Section as a root-level Section
5. THE Section_Repository SHALL enforce unique slugs across all Sections
6. IF a Section is created with a slug that already exists, THEN THE Section_Repository SHALL return a validation error indicating the slug is already in use
7. THE Section_Repository SHALL support a maximum nesting depth of 5 levels
8. IF a Section creation would exceed the maximum nesting depth, THEN THE Section_Repository SHALL return a validation error

### Requirement 2: Section CRUD Operations

**User Story:** As a CMS administrator, I want to create, read, update, and delete blog sections, so that I can manage the organizational structure of the blog.

#### Acceptance Criteria

1. WHEN an authenticated admin sends a POST request with section data containing at minimum a name and slug, THE Section_Repository SHALL create a new Section with auto-generated id and timestamps, and return the created record
2. WHEN an authenticated admin sends a PUT request with updated section data for an existing Section, THE Section_Repository SHALL update only the provided fields, set the updated_at timestamp, and return the updated record
3. WHEN an authenticated admin sends a DELETE request for an existing Section that has no child Sections and no assigned posts, THE Section_Repository SHALL delete the Section and return a success confirmation
4. IF a Section targeted for deletion has child Sections, THEN THE Section_Repository SHALL return an error indicating the Section has children and cannot be deleted, without modifying any data
5. IF a Section targeted for deletion has assigned posts, THEN THE Section_Repository SHALL return an error indicating the Section has assigned content, without modifying any data
6. WHEN a GET request is made for all Sections, THE Section_Repository SHALL return the complete Section hierarchy as a nested tree structure without requiring authentication
7. IF a POST or PUT request contains a slug that already exists for a different Section, THEN THE Section_Repository SHALL return a validation error indicating the slug must be unique
8. IF a PUT or DELETE request references a Section id that does not exist, THEN THE Section_Repository SHALL return a not-found error
9. IF a POST or PUT request is missing required fields or contains invalid data (name exceeding 100 characters, slug exceeding 120 characters, or slug containing characters other than lowercase alphanumeric and hyphens), THEN THE Section_Repository SHALL return a validation error indicating the specific field failures

### Requirement 3: Content-Section Assignment

**User Story:** As an author, I want to assign posts to sections, so that readers can find content organized by topic.

#### Acceptance Criteria

1. WHEN content is created or updated with a section_id in its metadata, THE Content_Table SHALL store the section_id as a string attribute in the content record's metadata, associating the post with exactly one Section at a time
2. IF content is created or updated with a section_id that does not reference an existing Section in the Sections_Table, THEN THE Content_Table SHALL reject the operation and return a validation error indicating the Section does not exist
3. THE Content_Table SHALL support querying all posts matching a given section_id, returning results ordered by published_at descending
4. WHEN a Section is requested by ID, THE Section_Repository SHALL return the count of posts with status "published" assigned to that Section (excluding draft and archived posts)
5. WHEN a post is assigned to a child Section, THE Blog_Navigation SHALL include the post in query results for all ancestor Sections up to the root, so that navigating any ancestor Section page lists the post alongside directly-assigned posts
6. THE Content_Editor SHALL provide a Section selector dropdown that displays the Section hierarchy using indentation (one level per depth) up to the maximum 5 levels, with an empty/none option to unassign the post from any Section
7. IF a Section is deleted that has posts assigned to it, THEN THE Section_Repository SHALL reject the deletion and return an error indicating the Section has assigned content

### Requirement 4: Section Navigation and URLs

**User Story:** As a reader, I want to browse the blog by section with dedicated URLs for each section, so that I can find content organized by topic.

#### Acceptance Criteria

1. THE Blog_Navigation SHALL render the Section hierarchy as a navigable tree in the blog sidebar or header, displaying all Sections up to 4 levels deep and ordered alphabetically within each level
2. WHEN a reader navigates to a Section URL (e.g., /blog/sections/technology/web-development), THE public website SHALL display all published posts belonging to that Section and its descendant Sections, sorted by published date descending and paginated with a maximum of 20 posts per page
3. THE public website SHALL generate Section URLs using the full slug path from root to the target Section, where each slug segment contains only lowercase alphanumeric characters and hyphens
4. WHEN a Section has child Sections, THE public website SHALL display links to those child Sections on the Section page, ordered alphabetically by Section name
5. WHEN a Section has no published posts or descendant posts, THE public website SHALL display a message stating that no posts are available in this section
6. IF a reader navigates to a Section URL that does not match any existing Section, THEN THE public website SHALL return a 404 status and display a not-found page indicating the section does not exist

### Requirement 5: Markdown Content Storage

**User Story:** As an author, I want to write blog posts in markdown format, so that I have precise control over formatting with a portable text format.

#### Acceptance Criteria

1. THE Content_Editor SHALL provide a markdown editing mode alongside the existing WYSIWYG mode, presenting a plain-text editing area with monospace font rendering the raw markdown source
2. WHEN content is saved in markdown mode, THE Content_Table SHALL store the raw markdown source in the `content_markdown` field (string, maximum 500,000 characters) and simultaneously store the pre-rendered HTML in the existing `content` field
3. WHEN content is saved in markdown mode and the markdown source exceeds 500,000 characters, THE Content_Table SHALL reject the save and THE Content_Editor SHALL display an error message indicating the content exceeds the maximum allowed length
4. THE Content_Editor SHALL allow authors to toggle between markdown mode and WYSIWYG mode per content item, with the active mode persisted as a `content_format` field (value `markdown` or `html`) in the Content_Table record
5. WHEN content has a `content_markdown` field, THE Content_Editor SHALL load the markdown source into the markdown editing area and activate markdown mode
6. IF an author toggles from WYSIWYG mode to markdown mode on content that has no existing `content_markdown` field, THEN THE Content_Editor SHALL display a confirmation prompt warning that the conversion may lose formatting fidelity, and SHALL NOT switch modes until the author confirms
7. IF an author toggles from markdown mode to WYSIWYG mode on content that has an existing `content_markdown` field, THEN THE Content_Editor SHALL load the pre-rendered HTML from the `content` field into the WYSIWYG editor and discard the `content_markdown` field only upon save

### Requirement 6: Extended Markdown Rendering

**User Story:** As an author, I want full extended markdown support including tables, footnotes, and math, so that I can create rich technical content.

#### Acceptance Criteria

1. THE Markdown_Renderer SHALL convert GFM-style tables (pipe-delimited) into HTML table elements containing `<thead>`, `<tbody>`, `<th>`, and `<td>` elements with column alignment attributes matching the source delimiter alignment syntax (`:---`, `:---:`, `---:`)
2. THE Markdown_Renderer SHALL convert footnote references (e.g., `[^1]`) into superscript anchor links pointing to the corresponding footnote definition, and SHALL render footnote definitions as an ordered list in a `<footer>` section at the end of the rendered output, each with a back-reference link to the referring location
3. THE Markdown_Renderer SHALL convert task list items (e.g., `- [x]`, `- [ ]`) into read-only HTML checkbox inputs (disabled attribute set) wrapped in list items, where checked syntax (`[x]`) renders as a checked checkbox and unchecked syntax (`[ ]`) renders as an unchecked checkbox
4. THE Markdown_Renderer SHALL convert strikethrough syntax (e.g., `~~text~~`) into HTML `<del>` elements
5. THE Markdown_Renderer SHALL convert definition list syntax into HTML `<dl>`, `<dt>`, and `<dd>` elements
6. THE Markdown_Renderer SHALL convert abbreviation definitions into HTML `<abbr>` elements with title attributes containing the full expansion text from the abbreviation definition
7. THE Markdown_Renderer SHALL convert superscript (e.g., `^text^`) and subscript (e.g., `~text~`) syntax into HTML `<sup>` and `<sub>` elements respectively
8. THE Markdown_Renderer SHALL convert inline math (e.g., `$expression$`) into elements with class `math-inline` and display/block math (e.g., `$$expression$$`) into elements with class `math-block`, preserving the LaTeX expression content unmodified for client-side rendering
9. IF extended markdown syntax is malformed or incomplete (e.g., unclosed table row, footnote reference without matching definition, unmatched `~~`), THEN THE Markdown_Renderer SHALL render the source text as literal plain text without applying the corresponding transformation

### Requirement 7: Code Block Syntax Highlighting

**User Story:** As a technical author, I want syntax-highlighted code blocks in my markdown posts, so that code examples are readable and visually distinct.

#### Acceptance Criteria

1. WHEN a fenced code block specifies a language from the supported set (e.g., ` ```python `), THE Markdown_Renderer SHALL wrap language tokens in `<span>` elements with Prism.js-compatible CSS classes within a `<pre><code>` block, enabling color-differentiated display of keywords, strings, comments, and operators
2. THE Markdown_Renderer SHALL support tokenization and class-based styling for at minimum the following 20 languages: Python, TypeScript, JavaScript, Rust, Go, Java, C, CSS, HTML, SQL, Bash, JSON, YAML, TOML, Markdown, Diff, Docker, Terraform, GraphQL, and Nix
3. WHEN a fenced code block specifies a language not in the supported set OR does not specify a language, THE Markdown_Renderer SHALL render the block as a `<pre><code>` element with plain preformatted text and no syntax token styling
4. THE Markdown_Renderer SHALL preserve existing Mermaid diagram rendering for code blocks with the `mermaid` language identifier, passing their content to the Mermaid renderer instead of applying syntax highlighting
5. WHEN a fenced code block contains HTML-special characters (`<`, `>`, `&`, `"`), THE Markdown_Renderer SHALL escape them as HTML entities to prevent interpretation as markup while preserving the original source text visually
6. WHEN a highlighted code block exceeds the visible container width, THE Markdown_Renderer SHALL render the block with horizontal scrolling enabled rather than wrapping or truncating lines

### Requirement 8: Math and LaTeX Rendering

**User Story:** As a technical author, I want to include mathematical expressions in my posts, so that I can present formulas and equations clearly.

#### Acceptance Criteria

1. WHEN inline math syntax (single dollar sign delimiters, e.g., `$E = mc^2$`) is present in content, THE Markdown_Renderer SHALL render the expression using KaTeX into an inline HTML element that does not break the surrounding text flow
2. WHEN display math syntax (double dollar sign delimiters, e.g., `$$\int_0^1 x^2 dx$$`) is present in content, THE Markdown_Renderer SHALL render the expression using KaTeX into a block-level HTML element separated from surrounding content
3. IF a LaTeX expression contains invalid syntax, THEN THE Markdown_Renderer SHALL display the raw LaTeX source text wrapped in a visually distinct container with a visible error message returned by KaTeX indicating the parsing failure
4. THE Markdown_Renderer SHALL load KaTeX CSS for proper rendering of mathematical symbols and layout
5. WHEN a dollar sign is escaped with a backslash (e.g., `\$`), THE Markdown_Renderer SHALL treat it as a literal dollar sign character and SHALL NOT interpret it as a math delimiter
6. THE Markdown_Renderer SHALL support LaTeX expressions up to 1000 characters in length per expression, and up to 50 math expressions per document

### Requirement 9: Table of Contents Generation

**User Story:** As a reader, I want an auto-generated table of contents for long posts, so that I can quickly navigate to relevant sections.

#### Acceptance Criteria

1. THE TOC_Generator SHALL extract all heading elements (h1 through h6) from rendered markdown content and return them as an ordered collection preserving document order
2. THE TOC_Generator SHALL produce a nested list structure reflecting the heading hierarchy, where each child heading level is nested under its nearest preceding parent heading of a higher level
3. THE TOC_Generator SHALL generate anchor IDs for each heading by converting the heading text to lowercase, replacing spaces and special characters with hyphens, removing non-alphanumeric characters (except hyphens), and collapsing consecutive hyphens into one
4. IF two or more headings in the same post produce identical slugified anchor IDs, THEN THE TOC_Generator SHALL append a numeric suffix starting at "-1" to each duplicate to ensure all anchor IDs are unique within the post
5. WHEN a post contains 3 or more headings, THE public website SHALL display the generated table of contents above the post content as a navigable nested list with each entry linking to its corresponding anchor ID
6. WHEN a post contains fewer than 3 headings, THE public website SHALL omit the table of contents entirely and render no TOC-related markup
7. WHEN a reader clicks a table of contents entry, THE public website SHALL scroll the viewport to the corresponding heading element identified by its anchor ID
8. THE TOC_Generator SHALL process headings from content with a maximum length of 100,000 characters and a maximum of 500 heading elements per post

### Requirement 10: Markdown Round-Trip Integrity

**User Story:** As a developer, I want confidence that the markdown pipeline produces correct and consistent output, so that content displays reliably.

#### Acceptance Criteria

1. THE Markdown_Renderer SHALL produce well-formed HTML5 output with no unclosed tags and no malformed attributes for any markdown input up to 500,000 characters that conforms to the CommonMark specification
2. WHEN the Markdown_Renderer processes the same markdown input multiple times, THE Markdown_Renderer SHALL produce byte-identical HTML output on each invocation
3. THE Markdown_Renderer SHALL sanitize output HTML to prevent XSS by removing script tags, event handler attributes (onclick, onerror, onload, and all on* attributes), javascript: URLs, data: URIs in link href attributes, and iframe elements from the rendered output
4. IF the markdown input is an empty string, THEN THE Markdown_Renderer SHALL return an empty string output
5. IF the markdown input contains only whitespace characters, THEN THE Markdown_Renderer SHALL return an empty string output
6. IF the markdown input exceeds 500,000 characters, THEN THE Markdown_Renderer SHALL reject the input and return an error indication specifying that the maximum input length was exceeded
7. IF the markdown input contains malformed or non-conformant syntax, THEN THE Markdown_Renderer SHALL render it as literal text rather than producing an error, preserving the raw characters in the output

### Requirement 11: Admin Section Management UI

**User Story:** As a CMS administrator, I want a dedicated interface to manage blog sections, so that I can organize the section hierarchy visually.

#### Acceptance Criteria

1. THE admin panel SHALL provide a Sections management page as a top-level item in the main navigation sidebar
2. THE Sections management page SHALL display the current Section hierarchy as a collapsible tree view showing each Section's name, post count, and sort order
3. THE Sections management page SHALL provide a creation form requiring name (1–100 characters), slug (1–120 characters, lowercase alphanumeric and hyphens only), optional parent selection from existing Sections, optional description (max 500 characters), and sort order (integer 0–1000)
4. WHEN the slug entered in the creation or edit form conflicts with an existing Section's slug, THE admin panel SHALL display an inline validation error indicating the slug is already in use and prevent form submission
5. THE Sections management page SHALL provide inline editing of Section name, description, parent, and sort order directly within the tree view, saving changes on field blur or Enter key
6. IF a create, edit, or delete operation fails, THEN THE admin panel SHALL display an error notification indicating the nature of the failure and preserve the user's unsaved input
7. WHEN a Section is deleted, THE admin panel SHALL display a confirmation dialog listing the count and names of affected child Sections (up to 10 shown, with a summary count if more) and the number of assigned posts

### Requirement 12: Backward Compatibility

**User Story:** As a site owner, I want existing posts to continue displaying correctly after the markdown feature is added, so that no published content breaks.

#### Acceptance Criteria

1. WHEN content does not have a `content_markdown` field or the `content_markdown` field is empty, THE public website SHALL render the `content` field as raw HTML using the existing HTML rendering path
2. WHEN content has a non-empty `content_markdown` field, THE public website SHALL render the markdown content using the Markdown_Renderer and SHALL ignore the `content` HTML field for display purposes
3. WHEN the Content_Editor opens content that has no `content_markdown` field, THE Content_Editor SHALL default to WYSIWYG mode and SHALL load the `content` HTML field for editing
4. THE public website SHALL continue to support Mermaid diagram rendering for both the HTML rendering path and the markdown rendering path
5. IF content has both a non-empty `content_markdown` field and a `content` HTML field with differing representations, THEN THE public website SHALL use the `content_markdown` field as the authoritative source for rendering
