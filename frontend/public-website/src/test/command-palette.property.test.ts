// Feature: serverless-site-facelift-theme-engine, Property 6: Fuzzy search returns relevant results
import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { fuzzySearch } from '../components/CommandPalette/fuzzySearch';
import type { PaletteAction } from '../components/CommandPalette/actions';

/**
 * Validates: Requirements 10.3
 */
describe('Property 6: Fuzzy search returns relevant results', () => {
  const paletteActionArbitrary = fc
    .record({
      id: fc.string({ minLength: 1, maxLength: 20 }).map((s) =>
        s.replace(/[^a-zA-Z0-9]/g, 'x') || 'id',
      ),
      title: fc.string({ minLength: 2, maxLength: 30 }).map((s) => {
        const cleaned = s.replace(/[^a-zA-Z0-9 ]/g, 'a').trim();
        return cleaned.length >= 2 ? cleaned : 'default title';
      }),
      keywords: fc.array(
        fc.string({ minLength: 2, maxLength: 15 }).map((s) => {
          const cleaned = s.replace(/[^a-zA-Z0-9]/g, 'k').trim();
          return cleaned.length >= 2 ? cleaned : 'keyword';
        }),
        { minLength: 1, maxLength: 5 },
      ),
      category: fc.constantFrom('navigation' as const, 'theme' as const, 'action' as const),
    })
    .map(
      (rec): PaletteAction => ({
        ...rec,
        execute: () => {},
      }),
    );

  it('includes an action in results when query is a substring of its title', () => {
    fc.assert(
      fc.property(
        fc.array(paletteActionArbitrary, { minLength: 1, maxLength: 10 }),
        fc.nat(),
        fc.nat(),
        fc.nat(),
        (actions, actionIndexSeed, startSeed, lengthSeed) => {
          const targetAction = actions[actionIndexSeed % actions.length];
          const normalizedTitle = targetAction.title.trim().toLowerCase();

          if (normalizedTitle.length < 1) return;

          const start = startSeed % normalizedTitle.length;
          const maxLen = normalizedTitle.length - start;
          const subLen = (lengthSeed % maxLen) + 1;
          const query = normalizedTitle.slice(start, start + subLen);

          if (!query.trim()) return;

          const results = fuzzySearch(query, actions);
          const resultIds = results.map((r) => r.action.id);

          expect(resultIds).toContain(targetAction.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('includes an action in results when query is a substring of one of its keywords', () => {
    fc.assert(
      fc.property(
        fc.array(paletteActionArbitrary, { minLength: 1, maxLength: 10 }),
        fc.nat(),
        fc.nat(),
        fc.nat(),
        fc.nat(),
        (actions, actionIndexSeed, keywordIndexSeed, startSeed, lengthSeed) => {
          const targetAction = actions[actionIndexSeed % actions.length];
          const keyword =
            targetAction.keywords[keywordIndexSeed % targetAction.keywords.length];
          const normalizedKeyword = keyword.trim().toLowerCase();

          if (normalizedKeyword.length < 1) return;

          const start = startSeed % normalizedKeyword.length;
          const maxLen = normalizedKeyword.length - start;
          const subLen = (lengthSeed % maxLen) + 1;
          const query = normalizedKeyword.slice(start, start + subLen);

          if (!query.trim()) return;

          const results = fuzzySearch(query, actions);
          const resultIds = results.map((r) => r.action.id);

          expect(resultIds).toContain(targetAction.id);
        },
      ),
      { numRuns: 100 },
    );
  });
});
