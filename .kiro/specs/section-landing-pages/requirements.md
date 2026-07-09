# Requirements Document

## Introduction

This feature adds landing page support to blog sections. Each section can optionally link to a published page from the content table. When a section has a linked page, the public API includes the page's HTML content in the section posts response, and the public website renders it above the posts grid. The admin panel provides a dropdown to select or clear the linked page.

## Glossary

- **Section**: A hierarchical grouping of blog posts stored in the `cms-sections-{env}` DynamoDB table.
- **Landing_Page**: A published content item of type `page` from the `cms-content-{env}` table, linked to a section via the `page_id` field.
- **Section_API**: The backend Lambda handlers responsible for section CRUD and public section endpoints.
- **Section_Form**: The React admin component (`SectionForm.tsx`) used to create and edit sections.
- **Section_Page**: The React public website component (`BlogSectionPage.tsx`) that renders a section's landing content and posts grid.
- **Page_Picker**: A dropdown UI control in the admin panel that lists published pages for selection.
- **Content_Table**: The DynamoDB table `cms-content-{env}` storing posts, pages, galleries, and projects.

## Requirements

### Requirement 1: Section Data Model Extension

**User Story:** As a content administrator, I want to associate a published page with a section, so that the section can display introductory or landing content.

#### Acceptance Criteria

1. THE Section_API SHALL accept an optional `page_id` field (string or null) when creating a section.
2. THE Section_API SHALL accept an optional `page_id` field (string or null) when updating a section.
3. THE Section_API SHALL store the `page_id` value in the section item in DynamoDB.
4. WHEN `page_id` is not provided in a create request, THE Section_API SHALL default the value to null.
5. THE Section_API SHALL include the `page_id` field in all section responses (create, update, get, list, tree).

### Requirement 2: Page ID Validation

**User Story:** As a content administrator, I want the system to validate that my chosen page exists and is published, so that sections never link to missing or draft content.

#### Acceptance Criteria

1. WHEN a create or update request includes a non-null `page_id`, THE Section_API SHALL verify that a content item with that ID exists in the Content_Table.
2. WHEN a create or update request includes a non-null `page_id`, THE Section_API SHALL verify that the referenced content item has type `page`.
3. WHEN a create or update request includes a non-null `page_id`, THE Section_API SHALL verify that the referenced content item has status `published`.
4. IF the referenced content item does not exist, THEN THE Section_API SHALL return a 400 error with message "Referenced page not found".
5. IF the referenced content item is not of type `page`, THEN THE Section_API SHALL return a 400 error with message "Referenced content is not a page".
6. IF the referenced content item is not published, THEN THE Section_API SHALL return a 400 error with message "Referenced page is not published".
7. WHEN a create or update request includes a null `page_id` or omits the field, THE Section_API SHALL skip validation and clear any existing link.

### Requirement 3: Public Section Posts Response with Landing Page

**User Story:** As a public website visitor, I want the section endpoint to provide landing page content alongside posts, so that the frontend can render both in a single page load.

#### Acceptance Criteria

1. WHEN a section has a non-null `page_id`, THE Section_API SHALL fetch the linked page from the Content_Table in the posts endpoint response.
2. WHEN a section has a non-null `page_id` and the linked page is published, THE Section_API SHALL include a `landing_page` object in the posts endpoint response containing: `id`, `title`, `slug`, `content` (full HTML body), `featured_image`, and `excerpt`.
3. WHEN a section has a non-null `page_id` but the linked page is no longer published or no longer exists, THE Section_API SHALL omit the `landing_page` field from the response and return posts normally.
4. WHEN a section has a null `page_id`, THE Section_API SHALL omit the `landing_page` field from the posts endpoint response.
5. THE Section_API SHALL return the `landing_page` object at the top level of the posts response alongside the existing `items` and `pagination` fields.

### Requirement 4: Admin Page Picker

**User Story:** As a content administrator, I want a dropdown in the section form to choose a published page, so that I can easily link landing content to a section.

#### Acceptance Criteria

1. THE Section_Form SHALL display a Page_Picker dropdown field labeled "Landing Page".
2. THE Page_Picker SHALL list all content items of type `page` with status `published` from the Content_Table.
3. THE Page_Picker SHALL include a "None" option that sets `page_id` to null.
4. WHEN editing an existing section that has a `page_id`, THE Page_Picker SHALL pre-select the corresponding page.
5. WHEN creating a new section, THE Page_Picker SHALL default to "None".
6. THE Section_Form SHALL send the selected `page_id` value (string or null) in the create and update API requests.

### Requirement 5: Public Website Landing Page Rendering

**User Story:** As a public website visitor, I want to see the section's landing page content above the posts grid, so that I get context about the section before browsing posts.

#### Acceptance Criteria

1. WHEN the posts response includes a `landing_page` object, THE Section_Page SHALL render the landing page HTML content above the posts grid.
2. THE Section_Page SHALL render the landing page content inside a container that applies standard prose/article styling.
3. WHEN the posts response does not include a `landing_page` field, THE Section_Page SHALL render only the section header and posts grid as it does currently.
4. THE Section_Page SHALL display the landing page title as a visible heading within the landing content area.
5. WHEN a landing page has a `featured_image`, THE Section_Page SHALL display the image above the landing page content.

### Requirement 6: Shared Type Definitions

**User Story:** As a developer, I want the Section TypeScript types updated to include `page_id`, so that both frontend apps have type-safe access to the field.

#### Acceptance Criteria

1. THE Section interface in shared types SHALL include a `page_id` field typed as `string | null`.
2. THE CreateSectionRequest interface SHALL include an optional `page_id` field typed as `string | null | undefined`.
3. THE UpdateSectionRequest interface SHALL include an optional `page_id` field typed as `string | null | undefined`.
