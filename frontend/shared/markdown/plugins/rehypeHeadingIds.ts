import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';

import { slugifyHeading } from '../slugify';

function isHeadingElement(node: Element): boolean {
  return /^h[1-6]$/.test(node.tagName);
}

/**
 * Rehype plugin: assign slugified IDs to heading elements (h1–h6).
 * Maintains a deduplication map so duplicate headings get -1, -2 suffixes.
 */
export function rehypeHeadingIds() {
  return (tree: Root): void => {
    const existingIds = new Map<string, number>();

    visit(tree, 'element', (node: Element) => {
      if (!isHeadingElement(node)) {
        return;
      }

      const text = toString(node);
      const id = slugifyHeading(text, existingIds);

      node.properties = node.properties ?? {};
      node.properties.id = id;
    });
  };
}
