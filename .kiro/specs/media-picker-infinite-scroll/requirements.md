# Requirements Document

## Introduction

The Media Picker in the post editor currently loads a single page of 20 media items with no ability to browse beyond that initial set. This feature enhances the Media Picker with a tabbed interface providing infinite scroll with aggressive pre-fetching for the full media library, a gallery selection tab for embedding albums, and search capabilities — delivering a smooth browsing experience without traditional pagination controls.

## Glossary

- **Media_Picker**: The modal dialog component used within the post editor to browse and select media assets or galleries for insertion into content
- **Media_Library_Tab**: The tab within the Media_Picker that displays all uploaded media with infinite scroll and search
- **Gallery_Tab**: The tab within the Media_Picker that displays published gallery albums available for embedding
- **Scroll_Sentinel**: An invisible element positioned ahead of the current scroll position that triggers the next page fetch when it enters the viewport
- **Pagination_Cursor**: The opaque `last_key` token returned by the API indicating the position for the next page of results
- **Pre_Fetch_Threshold**: The scroll position at which the next page of results begins loading, set far enough ahead that data arrives before the user scrolls to it
- **Page_Size**: The number of media items requested per API call (default 20)

## Requirements

### Requirement 1: Tabbed Interface

**User Story:** As a content author, I want to switch between browsing all media and browsing galleries, so that I can quickly find the right asset type for my content.

#### Acceptance Criteria

1. WHEN the Media_Picker opens, THE Media_Picker SHALL display two tabs: "Media Library" and "Galleries"
2. WHEN the Media_Picker opens, THE Media_Picker SHALL activate the Media_Library_Tab by default
3. WHEN the user selects a tab, THE Media_Picker SHALL display the corresponding content panel and hide the other
4. THE Media_Picker SHALL preserve the scroll position and loaded items of each tab when switching between them

### Requirement 2: Infinite Scroll with Pre-Fetching

**User Story:** As a content author, I want to scroll through all my media without clicking pagination buttons, so that I can browse my library naturally and without interruption.

#### Acceptance Criteria

1. WHEN the Media_Library_Tab is displayed, THE Media_Library_Tab SHALL load the first Page_Size of media items from the API
2. WHEN the Scroll_Sentinel enters the viewport, THE Media_Library_Tab SHALL request the next page of results using the Pagination_Cursor
3. THE Media_Library_Tab SHALL position the Scroll_Sentinel at the Pre_Fetch_Threshold, which is 3 rows of items before the end of currently loaded content
4. WHILE a page request is in progress, THE Media_Library_Tab SHALL display a loading indicator at the bottom of the grid
5. WHEN the API returns a null Pagination_Cursor, THE Media_Library_Tab SHALL stop observing the Scroll_Sentinel and display no further loading indicators
6. THE Media_Library_Tab SHALL append newly fetched items to the existing grid without re-rendering or repositioning previously loaded items

### Requirement 3: Media Library Search

**User Story:** As a content author, I want to search my media library by filename or alt text, so that I can quickly locate a specific asset without scrolling.

#### Acceptance Criteria

1. THE Media_Library_Tab SHALL display a search input field above the media grid
2. WHEN the user enters text in the search field, THE Media_Library_Tab SHALL reset the infinite scroll state and fetch the first page of results filtered by the search term
3. WHEN the user clears the search field, THE Media_Library_Tab SHALL reset the infinite scroll state and fetch the first page of unfiltered results
4. THE Media_Library_Tab SHALL debounce search input by 300 milliseconds before initiating a fetch
5. WHILE a search request is in progress, THE Media_Library_Tab SHALL display a loading state in the grid area

### Requirement 4: Gallery Selection Tab

**User Story:** As a content author, I want to browse and select published galleries from within the media picker, so that I can embed album content directly into my post.

#### Acceptance Criteria

1. WHEN the Gallery_Tab is displayed, THE Gallery_Tab SHALL load all published galleries from the content API
2. THE Gallery_Tab SHALL display each gallery as a card showing the featured image, title, and image count
3. THE Gallery_Tab SHALL provide a search input to filter galleries by title
4. WHEN the user selects a gallery, THE Media_Picker SHALL insert the gallery embed directive into the editor content
5. WHEN the user selects a gallery, THE Media_Picker SHALL close the dialog after insertion

### Requirement 5: Media Selection

**User Story:** As a content author, I want to select a single media item from the library, so that I can insert it into my post.

#### Acceptance Criteria

1. WHEN the user clicks a media item in the Media_Library_Tab, THE Media_Picker SHALL invoke the selection callback with the chosen media object
2. WHEN the user selects a media item, THE Media_Picker SHALL close the dialog
3. THE Media_Library_Tab SHALL display a visual hover state on each media item indicating it is selectable
4. THE Media_Library_Tab SHALL display media items as a responsive grid with thumbnail images

### Requirement 6: Loading and Empty States

**User Story:** As a content author, I want clear feedback about loading progress and empty results, so that I understand the current state of the picker.

#### Acceptance Criteria

1. WHILE the initial page of media is loading, THE Media_Library_Tab SHALL display a skeleton loading grid
2. WHEN the API returns zero results for the current query, THE Media_Library_Tab SHALL display a message indicating no media was found
3. WHEN the API returns zero galleries, THE Gallery_Tab SHALL display a message indicating no published galleries are available
4. IF a network error occurs during a page fetch, THEN THE Media_Library_Tab SHALL display an error message with a retry option

### Requirement 7: Accessibility

**User Story:** As a content author using assistive technology, I want the infinite scroll media picker to be navigable via keyboard and announced by screen readers, so that I can use the feature without a mouse.

#### Acceptance Criteria

1. THE Media_Picker SHALL support keyboard navigation between tabs using arrow keys
2. THE Media_Picker SHALL apply appropriate ARIA roles: `tablist` for the tab container, `tab` for each tab, and `tabpanel` for each content panel
3. WHEN new media items are loaded via infinite scroll, THE Media_Library_Tab SHALL announce the addition to screen readers using an ARIA live region
4. THE Media_Picker SHALL trap focus within the dialog while it is open
5. WHEN the user presses the Escape key, THE Media_Picker SHALL close the dialog

### Requirement 8: Performance

**User Story:** As a content author, I want the media picker to remain responsive even with hundreds of loaded items, so that browsing large libraries does not degrade the experience.

#### Acceptance Criteria

1. THE Media_Library_Tab SHALL use thumbnail URLs from the `thumbnails.small` field for grid display to minimize bandwidth
2. THE Media_Library_Tab SHALL render images with explicit width and height attributes to prevent layout shifts during loading
3. THE Media_Library_Tab SHALL use lazy loading (`loading="lazy"`) for images not currently in the viewport
