import type { Plugin } from 'unified';
import type { Paragraph, Root, Text } from 'mdast';
import type { Node, Parent } from 'unist';

type AnyParent = Parent & {
  children: Node[];
};

type MdastHtmlData = {
  hName?: string;
  hProperties?: Record<string, unknown>;
};

/**
 * Regex to match gallery embed directives.
 * Pattern: ::gallery[ALBUM_ID]{attributes}
 * - ALBUM_ID must be non-empty and match [a-zA-Z0-9-]+
 * - Attributes block is optional
 */
const GALLERY_DIRECTIVE_RE =
  /^::gallery\[([a-zA-Z0-9-]+)\](?:\{([^}]*)\})?$/;

type Layout = 'grid' | 'carousel' | 'masonry';

interface GalleryEmbedAttributes {
  layout: Layout;
  limit: string;
  showDescription: 'true' | 'false';
  showTitle: 'true' | 'false';
}

const VALID_LAYOUTS: Layout[] = ['grid', 'carousel', 'masonry'];

const DEFAULTS: GalleryEmbedAttributes = {
  layout: 'grid',
  limit: '0',
  showDescription: 'true',
  showTitle: 'true',
};

function isParent(node: Node): node is AnyParent {
  return Array.isArray((node as Partial<AnyParent>).children);
}

function isParagraph(node: Node | undefined): node is Paragraph {
  return Boolean(node && node.type === 'paragraph');
}

function isText(node: unknown): node is Text {
  return Boolean(node && (node as Node).type === 'text');
}

/**
 * Parse space-separated key=value attribute pairs from the raw attribute string.
 * Validates each key/value pair and uses defaults for invalid values.
 * Unknown keys are silently ignored.
 */
function parseAttributes(raw: string | undefined): GalleryEmbedAttributes {
  const attrs: GalleryEmbedAttributes = { ...DEFAULTS };

  if (!raw || raw.trim().length === 0) {
    return attrs;
  }

  // Split on whitespace to get key=value pairs
  const pairs = raw.trim().split(/\s+/);

  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) {
      // No = sign, ignore this token
      continue;
    }

    const key = pair.slice(0, eqIndex);
    const value = pair.slice(eqIndex + 1);

    switch (key) {
      case 'layout':
        if (VALID_LAYOUTS.includes(value as Layout)) {
          attrs.layout = value as Layout;
        }
        // Invalid value → keep default
        break;

      case 'limit': {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed) && parsed > 0) {
          attrs.limit = String(parsed);
        }
        // Invalid or non-positive → keep default (0)
        break;
      }

      case 'showDescription':
        if (value === 'true' || value === 'false') {
          attrs.showDescription = value;
        }
        // Invalid value → keep default
        break;

      case 'showTitle':
        if (value === 'true' || value === 'false') {
          attrs.showTitle = value;
        }
        // Invalid value → keep default
        break;

      default:
        // Unknown keys: silently ignored
        break;
    }
  }

  return attrs;
}

/**
 * Create a galleryEmbed AST node with hName/hProperties for rehype transformation.
 */
function createGalleryEmbedNode(
  albumId: string,
  attrs: GalleryEmbedAttributes,
): Node {
  return {
    type: 'galleryEmbed',
    children: [],
    data: {
      hName: 'div',
      hProperties: {
        className: 'gallery-embed',
        'data-album-id': albumId,
        'data-layout': attrs.layout,
        'data-limit': attrs.limit,
        'data-show-description': attrs.showDescription,
        'data-show-title': attrs.showTitle,
      },
    } satisfies MdastHtmlData,
  } as unknown as Node;
}

/**
 * Check if a paragraph node contains a single text child matching the
 * gallery directive pattern. Returns the match or null.
 */
function matchGalleryDirective(
  node: Paragraph,
): RegExpMatchArray | null {
  if (node.children.length !== 1) {
    return null;
  }

  const child = node.children[0];
  if (!isText(child)) {
    return null;
  }

  return child.value.match(GALLERY_DIRECTIVE_RE);
}

/**
 * Recursively walk parent nodes, transforming gallery directives into
 * galleryEmbed AST nodes. Handles directives in blockquotes, lists,
 * and other container elements.
 */
function transformParent(parent: AnyParent): void {
  // First recurse into children that are themselves parents
  for (const child of parent.children) {
    if (isParent(child)) {
      transformParent(child);
    }
  }

  // Then scan this parent's children for gallery directives
  let index = 0;
  while (index < parent.children.length) {
    const current = parent.children[index];

    if (isParagraph(current)) {
      const match = matchGalleryDirective(current);
      if (match) {
        const albumId = match[1];
        const rawAttrs = match[2];
        const attrs = parseAttributes(rawAttrs);
        const embedNode = createGalleryEmbedNode(albumId, attrs);

        // Replace the paragraph with the gallery embed node
        parent.children.splice(index, 1, embedNode);
      }
    }

    index += 1;
  }
}

/**
 * Remark plugin that transforms `::gallery[ALBUM_ID]{attributes}` directives
 * into `galleryEmbed` AST nodes with `hName`/`hProperties` for rehype.
 *
 * Usage:
 *   unified().use(remarkGalleryEmbed)
 */
const remarkGalleryEmbed: Plugin<[], Root> = function remarkGalleryEmbed() {
  return function transformer(tree: Root): void {
    transformParent(tree as unknown as AnyParent);
  };
};

export { remarkGalleryEmbed };
export default remarkGalleryEmbed;
