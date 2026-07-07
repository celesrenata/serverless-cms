import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';

import type { TocItem } from '../types';
import { extractToc } from '../toc';

export interface RehypeExtractTocOptions {
  tocItems: TocItem[];
}

function isHeadingElement(node: Element): boolean {
  return /^h[1-6]$/.test(node.tagName);
}

function getHeadingLevel(node: Element): number {
  return Number.parseInt(node.tagName.slice(1), 10);
}

function getElementId(node: Element): string | undefined {
  const id = node.properties?.id;

  if (typeof id === 'string') {
    return id;
  }

  if (typeof id === 'number') {
    return String(id);
  }

  return undefined;
}

/**
 * Rehype plugin: extract TOC items during rehype processing.
 * Must run AFTER rehypeHeadingIds so that heading elements have IDs assigned.
 * The extracted TOC is written into the `options.tocItems` array.
 */
export function rehypeExtractToc(options: RehypeExtractTocOptions) {
  return (tree: Root): void => {
    const headings: Array<{ id: string; text: string; level: number }> = [];

    visit(tree, 'element', (node: Element) => {
      if (!isHeadingElement(node)) {
        return;
      }

      const id = getElementId(node);

      if (!id) {
        return;
      }

      headings.push({
        id,
        text: toString(node),
        level: getHeadingLevel(node),
      });
    });

    const extractedItems = extractToc(headings);

    // Mutate the provided array so the caller can read the results
    options.tocItems.splice(0, options.tocItems.length, ...extractedItems);
  };
}
