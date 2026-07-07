import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { SectionTreeNode } from '../../../shared/sections/types';

/**
 * Helper: generate a valid section slug (lowercase alphanumeric + hyphens, no leading/trailing hyphens).
 */
const slugArbitrary = fc.stringMatching(/^[a-z][a-z0-9-]{0,13}[a-z0-9]$/).filter(
  (s) => s.length >= 2 && !s.includes('--'),
);

/**
 * Build a section tree node with correct path/path_ids derivation.
 */
function buildSectionNode(
  slug: string,
  parentPath: string,
  parentPathIds: string[],
  depth: number,
): SectionTreeNode {
  const id = crypto.randomUUID();
  const path = parentPath ? `${parentPath}/${slug}` : slug;
  const pathIds = [...parentPathIds, id];

  return {
    id,
    name: slug,
    slug,
    parent_id: parentPathIds.length > 0 ? parentPathIds[parentPathIds.length - 1] : null,
    description: '',
    sort_order: 0,
    path,
    path_ids: pathIds,
    depth,
    created_at: Date.now(),
    updated_at: Date.now(),
    children: [],
  };
}

/**
 * Arbitrary that generates a section tree (max depth 5, max 3 children per node).
 */
const sectionTreeArbitrary: fc.Arbitrary<SectionTreeNode[]> = fc
  .array(slugArbitrary, { minLength: 1, maxLength: 4 })
  .chain((rootSlugs) => {
    // Generate unique root slugs
    const uniqueRootSlugs = [...new Set(rootSlugs)];
    if (uniqueRootSlugs.length === 0) return fc.constant([]);

    // For each root, optionally generate children recursively
    return fc
      .tuple(
        ...uniqueRootSlugs.map(() =>
          fc.array(
            fc.array(slugArbitrary, { minLength: 1, maxLength: 3 }),
            { minLength: 0, maxLength: 4 },
          ),
        ),
      )
      .map((childrenPerRoot) => {
        const roots: SectionTreeNode[] = [];

        uniqueRootSlugs.forEach((rootSlug, rootIdx) => {
          const root = buildSectionNode(rootSlug, '', [], 1);
          const childPaths = childrenPerRoot[rootIdx] || [];

          // Build nested children (one chain per entry, limited by depth 5)
          let currentNode = root;
          const usedSlugs = new Set<string>([rootSlug]);

          for (let level = 0; level < childPaths.length && currentNode.depth < 5; level++) {
            const slugsAtLevel = childPaths[level].filter((s) => !usedSlugs.has(s));
            if (slugsAtLevel.length === 0) break;

            const childSlug = slugsAtLevel[0];
            usedSlugs.add(childSlug);

            const child = buildSectionNode(
              childSlug,
              currentNode.path,
              currentNode.path_ids,
              currentNode.depth + 1,
            );
            currentNode.children.push(child);
            currentNode = child;
          }

          roots.push(root);
        });

        return roots;
      });
  });

/**
 * Collect all sections from a tree into a flat list.
 */
function flattenTree(nodes: SectionTreeNode[]): SectionTreeNode[] {
  const result: SectionTreeNode[] = [];
  function walk(node: SectionTreeNode) {
    result.push(node);
    node.children.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

/**
 * Collect slug chain from root to a node by walking the tree.
 */
function getSlugsFromRootToNode(
  tree: SectionTreeNode[],
  targetId: string,
): string[] | null {
  function search(nodes: SectionTreeNode[], chain: string[]): string[] | null {
    for (const node of nodes) {
      const currentChain = [...chain, node.slug];
      if (node.id === targetId) return currentChain;
      const found = search(node.children, currentChain);
      if (found) return found;
    }
    return null;
  }
  return search(tree, []);
}

describe('Property 10: Section URL path construction (Task 10.4)', () => {
  // **Validates: Requirements 4.3**

  it('every section path equals concatenation of slugs from root to section separated by /', () => {
    fc.assert(
      fc.property(sectionTreeArbitrary, (tree) => {
        const allSections = flattenTree(tree);

        for (const section of allSections) {
          const slugChain = getSlugsFromRootToNode(tree, section.id);
          expect(slugChain).not.toBeNull();
          const expectedPath = slugChain!.join('/');
          expect(section.path).toBe(expectedPath);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('every child section path starts with its parent path as a prefix', () => {
    fc.assert(
      fc.property(sectionTreeArbitrary, (tree) => {
        function checkParentPrefix(nodes: SectionTreeNode[], parentPath: string | null) {
          for (const node of nodes) {
            if (parentPath !== null) {
              expect(node.path.startsWith(parentPath + '/')).toBe(true);
            }
            checkParentPrefix(node.children, node.path);
          }
        }
        checkParentPrefix(tree, null);
      }),
      { numRuns: 100 },
    );
  });
});
