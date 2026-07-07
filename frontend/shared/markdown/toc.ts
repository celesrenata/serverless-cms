import type { TocItem } from './types';
import { TOC_THRESHOLD } from './types';

function isTocLevel(level: number): level is TocItem['level'] {
  return level >= 1 && level <= 6;
}

/**
 * Build a nested TocItem tree from a flat list of headings.
 * Uses a stack to determine parent-child relationships based on heading level.
 */
export function extractToc(
  headings: Array<{ id: string; text: string; level: number }>,
): TocItem[] {
  const rootItems: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const heading of headings) {
    if (!isTocLevel(heading.level)) {
      continue;
    }

    const item: TocItem = {
      id: heading.id,
      text: heading.text,
      level: heading.level,
      children: [],
    };

    // Pop stack until we find a parent with a lower level
    while (
      stack.length > 0 &&
      stack[stack.length - 1].level >= item.level
    ) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    if (parent) {
      parent.children.push(item);
    } else {
      rootItems.push(item);
    }

    stack.push(item);
  }

  return rootItems;
}

/**
 * Count all headings in the TOC tree recursively.
 */
function countTocItems(items: TocItem[]): number {
  return items.reduce(
    (count, item) => count + 1 + countTocItems(item.children),
    0,
  );
}

/**
 * Determine whether TOC should be displayed (TOC_THRESHOLD+ headings).
 */
export function shouldShowToc(items: TocItem[]): boolean {
  return countTocItems(items) >= TOC_THRESHOLD;
}
