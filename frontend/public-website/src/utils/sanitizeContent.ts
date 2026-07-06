/**
 * Clean WordPress HTML content for rendering.
 * Strips WordPress block comments and normalizes problematic markup.
 */
export function sanitizeWordPressContent(html: string): string {
  if (!html) return '';

  let cleaned = html;

  // Remove WordPress block comments (<!-- wp:anything --> and <!-- /wp:anything -->)
  cleaned = cleaned.replace(/<!--\s*\/?wp:[^>]*-->/g, '');

  // Remove empty paragraphs left behind
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');

  // Add loading="lazy" to images that don't have it
  cleaned = cleaned.replace(/<img(?![^>]*loading=)/g, '<img loading="lazy"');

  // Add target="_blank" rel="noopener noreferrer" to external links
  cleaned = cleaned.replace(
    /<a([^>]*href="https?:\/\/(?!staging\.serverless\.celestium\.life|serverless\.celestium\.life)[^"]*"[^>]*)>/g,
    (match, attrs) => {
      if (attrs.includes('target=')) return match;
      return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
    }
  );

  // Wrap WordPress code blocks in not-prose container
  // Match the Code Block Pro plugin output pattern
  cleaned = cleaned.replace(
    /<div[^>]*class="[^"]*wp-block-kevinbatdorf-code-block-pro[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>)?/g,
    '<div class="not-prose my-6 overflow-x-auto rounded-lg">$1</div>'
  );

  // Also handle raw <pre> blocks that might have complex inline styles
  cleaned = cleaned.replace(
    /<pre([^>]*)class="([^"]*shiki[^"]*)"([^>]*)>/g,
    '<pre$1class="$2 overflow-x-auto rounded-lg text-sm"$3>'
  );

  return cleaned.trim();
}
