import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { slugifyHeading } from '../../../shared/markdown/slugify';
import { shouldShowToc, extractToc } from '../../../shared/markdown/toc';
import { renderMarkdownToHtml } from '../../../shared/markdown/renderMarkdown';
import type { TocItem } from '../../../shared/markdown/types';

describe('Property 22: TOC anchor ID generation (Task 5.4)', () => {
  // **Validates: Requirements 9.3, 9.4**

  it('slugifyHeading produces valid lowercase anchor IDs without consecutive or edge hyphens', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (text) => {
        const slug = slugifyHeading(text);

        expect(slug).toMatch(/^[a-z0-9-]+$/);
        expect(slug).not.toContain('--');
        expect(slug.startsWith('-')).toBe(false);
        expect(slug.endsWith('-')).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('slugifyHeading deduplicates generated IDs when using a shared existingIds Map', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 20 }),
        (headingTexts) => {
          const existingIds = new Map<string, number>();
          const ids = headingTexts.map((text) => slugifyHeading(text, existingIds));
          const uniqueIds = new Set(ids);

          expect(uniqueIds.size).toBe(ids.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 23: TOC display threshold (Task 5.5)', () => {
  // **Validates: Requirements 9.5, 9.6**

  const headingArbitrary = fc.record({
    level: fc.integer({ min: 1, max: 6 }),
    text: fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s) => /[a-zA-Z]/.test(s) && !s.includes('\n') && !s.includes('#')),
  });

  it('rendered markdown shows the TOC iff the document has at least 3 headings', () => {
    fc.assert(
      fc.property(
        fc.array(headingArbitrary, { minLength: 0, maxLength: 10 }),
        (headings) => {
          const markdown = headings
            .map(({ level, text }) => `${'#'.repeat(level)} ${text}\n\n`)
            .join('');

          const result = renderMarkdownToHtml(markdown);

          expect(result.shouldShowToc).toBe(headings.length >= 3);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('shouldShowToc uses a threshold of exactly 3 headings', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (numHeadings) => {
        const items: TocItem[] = Array.from({ length: numHeadings }, (_, i) => ({
          id: `heading-${i}`,
          text: `Heading ${i + 1}`,
          level: ((i % 6) + 1) as TocItem['level'],
          children: [],
        }));

        expect(shouldShowToc(items)).toBe(numHeadings >= 3);
      }),
      { numRuns: 100 },
    );
  });
});
