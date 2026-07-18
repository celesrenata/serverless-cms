# Bugfix Requirements Document

## Introduction

When a section has a `page_id` mapped (via the admin's Landing Page dropdown), clicking the section's navigation link renders the associated page content inside the blog section layout — showing the section name as h1, the section description, and raw HTML content without the page's own title, author byline, or publication date. The page should instead render as a full standalone page view, matching the presentation style used by the `Post` component.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a section has a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system renders the section's name as the h1 heading above the landing page content instead of the page's own title

1.2 WHEN a section has a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system renders the section description text above the landing page content as if it were a blog index page

1.3 WHEN a section has a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system does not display the page's author name or publication date as a byline

1.4 WHEN a section has a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system does not render the page title (h1) from the page's own `title` field

1.5 WHEN a section has a `page_id` mapped AND the backend returns the `landing_page` object THEN the response does not include `author_name` or `published_at` fields needed for rendering a proper page byline

### Expected Behavior (Correct)

2.1 WHEN a section has a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system SHALL render the page's own title as the h1 heading (not the section name)

2.2 WHEN a section has a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system SHALL NOT display the section description above the page content

2.3 WHEN a section has a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system SHALL display the page author's name and publication date as a byline beneath the title

2.4 WHEN a section has a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system SHALL render the full page content with rich HTML (including embedded galleries) in the same presentation style as the Post component

2.5 WHEN a section has a `page_id` mapped AND the backend returns the `landing_page` object THEN the response SHALL include `author_name` (string) and `published_at` (unix timestamp) fields

2.6 WHEN a section has a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system SHALL display a "← Back to Blog" navigation link

2.7 WHEN a section has a `page_id` mapped AND the section also has child subsections THEN the system SHALL display subsection links below the page content

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a section does NOT have a `page_id` mapped AND the user navigates to `/blog/sections/{path}` THEN the system SHALL CONTINUE TO display the section name as h1 and section description, followed by the paginated post index

3.2 WHEN a section does NOT have a `page_id` mapped AND the section has child subsections THEN the system SHALL CONTINUE TO display subsection links

3.3 WHEN a section does NOT have a `page_id` mapped AND posts exist THEN the system SHALL CONTINUE TO display post cards in a grid with pagination controls

3.4 WHEN a section has a `page_id` mapped but the referenced page is not published THEN the system SHALL CONTINUE TO fall back to the normal post index behavior (since `landing_page` will be null in the response)

3.5 WHEN navigating to a non-existent section path THEN the system SHALL CONTINUE TO display the 404 "Section Not Found" page
