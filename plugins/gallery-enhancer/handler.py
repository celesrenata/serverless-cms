"""
Gallery Enhancer Plugin
Enhances photo galleries with custom layouts, animations, and interactive features
"""
import json
import re
import boto3
from typing import Dict, List, Any

dynamodb = boto3.resource('dynamodb')

def get_plugin_settings(plugin_id):
    """Retrieve plugin settings from DynamoDB."""
    try:
        settings_table = dynamodb.Table('cms-settings')
        response = settings_table.get_item(Key={'key': f'plugin:{plugin_id}:config'})
        if 'Item' in response:
            return response['Item']['value']
        return {}
    except Exception as e:
        print(f"Error retrieving plugin settings: {e}")
        return {}

def extract_gallery_images(content):
    """
    Extract gallery images from content.
    Looks for gallery containers with image elements.
    """
    # Pattern for gallery div with images
    gallery_pattern = r'<div[^>]*class="[^"]*gallery[^"]*"[^>]*>(.*?)</div>'
    img_pattern = r'<img[^>]*src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*(?:data-caption="([^"]*)")?[^>]*/?>'
    
    galleries = []
    
    for gallery_match in re.finditer(gallery_pattern, content, re.DOTALL | re.IGNORECASE):
        gallery_html = gallery_match.group(1)
        images = []
        
        for img_match in re.finditer(img_pattern, gallery_html):
            images.append({
                'src': img_match.group(1),
                'alt': img_match.group(2) or '',
                'caption': img_match.group(3) or ''
            })
        
        if images:
            galleries.append({
                'full_match': gallery_match.group(0),
                'images': images,
                'start': gallery_match.start(),
                'end': gallery_match.end()
            })
    
    return galleries

def generate_gallery_css(settings):
    """Generate CSS for gallery based on settings."""
    layout = settings.get('layout', 'grid')
    columns = settings.get('columns', 3)
    gap = settings.get('gap', 16)
    animation = settings.get('animation', 'fade')
    
    css = f"""
.enhanced-gallery {{
    display: grid;
    gap: {gap}px;
    margin: 2rem 0;
}}

.enhanced-gallery.layout-grid {{
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}}

.enhanced-gallery.layout-masonry {{
    column-count: {columns};
    column-gap: {gap}px;
}}

.enhanced-gallery.layout-carousel {{
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: {gap}px;
}}

.enhanced-gallery.layout-justified {{
    display: flex;
    flex-wrap: wrap;
    gap: {gap}px;
}}

.gallery-item {{
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.3s ease;
}}

.gallery-item:hover {{
    transform: scale(1.02);
}}

.gallery-item img {{
    width: 100%;
    height: auto;
    display: block;
    transition: all 0.3s ease;
}}
"""

    # Add animation-specific CSS
    if animation == 'fade':
        css += """
.gallery-item:hover img {
    opacity: 0.8;
}
"""
    elif animation == 'zoom':
        css += """
.gallery-item:hover img {
    transform: scale(1.1);
}
"""
    elif animation == 'slide':
        css += """
.gallery-item:hover img {
    transform: translateY(-10px);
}
"""
    elif animation == 'flip':
        css += """
.gallery-item {
    perspective: 1000px;
}
.gallery-item:hover img {
    transform: rotateY(10deg);
}
"""

    # Caption styles
    css += """
.gallery-caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
    color: white;
    padding: 1rem;
    font-size: 0.875rem;
    transform: translateY(100%);
    transition: transform 0.3s ease;
}

.gallery-item:hover .gallery-caption {
    transform: translateY(0);
}

.enhanced-gallery.layout-masonry .gallery-item {
    break-inside: avoid;
    margin-bottom: {gap}px;
}

.enhanced-gallery.layout-carousel .gallery-item {
    flex: 0 0 300px;
    scroll-snap-align: start;
}

.enhanced-gallery.layout-justified .gallery-item {
    flex: 1 1 250px;
}

/* Lazy loading placeholder */
.gallery-item img[loading="lazy"] {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
}

@keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* Responsive design */
@media (max-width: 768px) {
    .enhanced-gallery.layout-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
    .enhanced-gallery.layout-masonry {
        column-count: 2;
    }
}

@media (max-width: 480px) {
    .enhanced-gallery.layout-grid {
        grid-template-columns: 1fr;
    }
    .enhanced-gallery.layout-masonry {
        column-count: 1;
    }
}
"""
    
    return css

def generate_gallery_html(images: List[Dict[str, str]], settings: Dict[str, Any]) -> str:
    """Generate enhanced gallery HTML."""
    layout = settings.get('layout', 'grid')
    lazy_load = settings.get('lazy_load', True)
    show_captions = settings.get('show_captions', True)
    lightbox_enabled = settings.get('lightbox_enabled', True)
    thumbnail_size = settings.get('thumbnail_size', 'medium')
    
    # Start gallery container
    gallery_html = f'<div class="enhanced-gallery layout-{layout}">\n'
    
    for idx, img in enumerate(images):
        src = img['src']
        
        # Try to use thumbnail if available
        if thumbnail_size and 'thumbnails' in src:
            # Assume thumbnail URLs follow pattern
            src = src.replace('/uploads/', f'/thumbnails/{thumbnail_size}/')
        
        alt = img.get('alt', '')
        caption = img.get('caption', '')
        
        # Build image attributes
        img_attrs = f'src="{src}" alt="{alt}"'
        if lazy_load:
            img_attrs += ' loading="lazy"'
        
        # Build item attributes
        item_attrs = ''
        if lightbox_enabled:
            item_attrs = f'data-lightbox="gallery" data-index="{idx}" data-full-src="{img["src"]}"'
        
        # Build gallery item
        gallery_html += f'  <div class="gallery-item" {item_attrs}>\n'
        gallery_html += f'    <img {img_attrs} />\n'
        
        if show_captions and caption:
            gallery_html += f'    <div class="gallery-caption">{caption}</div>\n'
        
        gallery_html += '  </div>\n'
    
    gallery_html += '</div>\n'
    
    # Add lightbox JavaScript if enabled
    if lightbox_enabled:
        gallery_html += """
<script>
(function() {
    const galleryItems = document.querySelectorAll('.gallery-item[data-lightbox="gallery"]');
    
    galleryItems.forEach(item => {
        item.addEventListener('click', function() {
            const fullSrc = this.getAttribute('data-full-src');
            const index = parseInt(this.getAttribute('data-index'));
            
            // Create lightbox overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                cursor: pointer;
            `;
            
            const img = document.createElement('img');
            img.src = fullSrc;
            img.style.cssText = `
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
            `;
            
            overlay.appendChild(img);
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', function() {
                document.body.removeChild(overlay);
            });
        });
    });
})();
</script>
"""
    
    return gallery_html

def process_content(content, settings):
    """Process content and enhance all galleries."""
    galleries = extract_gallery_images(content)
    
    if not galleries:
        return content
    
    # Sort galleries by position (reverse order to maintain positions during replacement)
    galleries.sort(key=lambda x: x['start'], reverse=True)
    
    # Replace each gallery with enhanced version
    for gallery in galleries:
        enhanced_html = generate_gallery_html(gallery['images'], settings)
        content = content[:gallery['start']] + enhanced_html + content[gallery['end']:]
    
    # Add CSS styles to the beginning of content
    css = generate_gallery_css(settings)
    style_tag = f'<style>\n{css}\n</style>\n'
    content = style_tag + content
    
    return content

def handler(event, context):
    """
    Lambda handler for gallery enhancer plugin.
    Receives content via the content_render_gallery hook.
    """
    try:
        # Parse event
        hook_name = event.get('hook')
        data = event.get('data')
        
        if hook_name != 'content_render_gallery':
            return {
                'statusCode': 200,
                'body': json.dumps(data)
            }
        
        # Get plugin settings
        settings = get_plugin_settings('gallery-enhancer')
        
        # Process content if it's a string
        if isinstance(data, str):
            processed_content = process_content(data, settings)
            return {
                'statusCode': 200,
                'body': json.dumps(processed_content)
            }
        
        # Process content if it's a dict with content field
        if isinstance(data, dict) and 'content' in data:
            data['content'] = process_content(data['content'], settings)
            return {
                'statusCode': 200,
                'body': json.dumps(data)
            }
        
        # Return unchanged if format not recognized
        return {
            'statusCode': 200,
            'body': json.dumps(data)
        }
    
    except Exception as e:
        print(f"Error in gallery enhancer plugin: {e}")
        # Return original data on error
        return {
            'statusCode': 200,
            'body': json.dumps(event.get('data'))
        }
