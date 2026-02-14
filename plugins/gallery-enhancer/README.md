# Gallery Enhancer Plugin

A plugin for the Serverless CMS that enhances photo galleries with custom layouts, animations, and interactive features.

## Features

- Multiple layout options (grid, masonry, carousel, justified)
- Configurable number of columns and spacing
- Hover animations (fade, slide, zoom, flip)
- Lazy loading for improved performance
- Optional image captions with smooth reveal
- Built-in lightbox functionality
- Responsive design for mobile devices
- Customizable thumbnail sizes

## Installation

1. Package the plugin:
```bash
cd plugins/gallery-enhancer
zip -r gallery-enhancer.zip .
```

2. Upload via Admin Panel:
   - Navigate to Plugins page
   - Click "Install Plugin"
   - Upload the `gallery-enhancer.zip` file

3. Activate the plugin from the Plugins page

## Configuration

The plugin can be configured with the following options:

- **layout**: Gallery layout style
  - Options: `grid`, `masonry`, `carousel`, `justified`
  - Default: `grid`

- **columns**: Number of columns in grid layout
  - Type: integer (1-6)
  - Default: `3`

- **gap**: Gap between images in pixels
  - Type: integer (0-50)
  - Default: `16`

- **animation**: Animation effect on image hover
  - Options: `none`, `fade`, `slide`, `zoom`, `flip`
  - Default: `fade`

- **lazy_load**: Enable lazy loading for images
  - Type: boolean
  - Default: `true`

- **show_captions**: Show image captions
  - Type: boolean
  - Default: `true`

- **lightbox_enabled**: Enable lightbox on image click
  - Type: boolean
  - Default: `true`

- **thumbnail_size**: Thumbnail size to use
  - Options: `small`, `medium`, `large`
  - Default: `medium`

## Usage

The plugin automatically processes gallery content. Galleries should be formatted as:

```html
<div class="gallery">
  <img src="/path/to/image1.jpg" alt="Image 1" data-caption="Beautiful sunset" />
  <img src="/path/to/image2.jpg" alt="Image 2" data-caption="Mountain view" />
  <img src="/path/to/image3.jpg" alt="Image 3" data-caption="Ocean waves" />
</div>
```

## Layout Options

### Grid Layout
A responsive grid that automatically adjusts columns based on available space.

### Masonry Layout
A Pinterest-style layout where images of different heights flow naturally.

### Carousel Layout
A horizontal scrolling gallery with snap-to-image behavior.

### Justified Layout
Images are arranged in rows with justified alignment, similar to Flickr.

## Animation Effects

- **None**: No hover effect
- **Fade**: Images fade slightly on hover
- **Slide**: Images slide up slightly on hover
- **Zoom**: Images zoom in on hover
- **Flip**: Images rotate slightly in 3D space on hover

## Lightbox

When enabled, clicking on any gallery image opens a full-screen lightbox view. Click anywhere on the overlay to close.

## Responsive Behavior

The plugin automatically adjusts layouts for different screen sizes:

- Desktop: Full column count
- Tablet (≤768px): Reduced columns (2 for masonry, auto for grid)
- Mobile (≤480px): Single column

## Performance

- Lazy loading reduces initial page load time
- Thumbnails are used instead of full-size images in the gallery
- CSS animations use GPU acceleration for smooth performance
- Images only load when they enter the viewport

## Customization

You can further customize the gallery appearance by adding custom CSS in your theme:

```css
.enhanced-gallery {
  /* Your custom styles */
}

.gallery-item {
  /* Custom item styles */
}
```

## Development

To modify the plugin:

1. Edit `handler.py` for the main logic
2. Update `plugin.json` for metadata or configuration schema
3. Test locally before packaging
4. Increment version number in `plugin.json`

## License

MIT License
