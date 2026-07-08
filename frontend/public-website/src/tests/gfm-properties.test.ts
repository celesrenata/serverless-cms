// Feature: blog-sections-markdown, Properties 12-14: GFM table, footnote, and task list rendering
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { renderMarkdownToHtml } from '../../../shared/markdown/renderMarkdown';

type Alignment = 'left' | 'center' | 'right' | 'none';

const safeWordArb = fc.constantFrom(
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'theta',
  'lambda',
  'omega',
  'table',
  'cell',
  'header',
  'footnote',
  'definition',
  'task'
);

const safeTextArb = fc
  .array(safeWordArb, { minLength: 1, maxLength: 4 })
  .map((words) => words.join(' '));

const alignmentArb = fc.constantFrom<Alignment>('left', 'center', 'right', 'none');

const alignmentMarker = (alignment: Alignment): string => {
  switch (alignment) {
    case 'left':
      return ':---';
    case 'center':
      return ':---:';
    case 'right':
      return '---:';
    case 'none':
      return '---';
  }
};

/**
 * Validates: Requirements 6.1
 */
describe('Property 12: GFM table rendering', () => {
  it('renders valid GFM tables with correct thead/tbody/th/td and alignment', () => {
    fc.assert(
      fc.property(
        fc.record({
          columnCount: fc.integer({ min: 2, max: 5 }),
          rowCount: fc.integer({ min: 1, max: 5 }),
          alignments: fc.array(alignmentArb, { minLength: 5, maxLength: 5 }),
          headers: fc.array(safeTextArb, { minLength: 5, maxLength: 5 }),
          rows: fc.array(fc.array(safeTextArb, { minLength: 5, maxLength: 5 }), {
            minLength: 5,
            maxLength: 5,
          }),
        }),
        ({ columnCount, rowCount, alignments, headers, rows }) => {
          const tableAlignments = alignments.slice(0, columnCount);
          const tableHeaders = headers.slice(0, columnCount);
          const tableRows = rows
            .slice(0, rowCount)
            .map((row) => row.slice(0, columnCount));

          const headerLine = `| ${tableHeaders.join(' | ')} |`;
          const separatorLine = `| ${tableAlignments.map(alignmentMarker).join(' | ')} |`;
          const bodyLines = tableRows.map((row) => `| ${row.join(' | ')} |`);

          const markdown = [headerLine, separatorLine, ...bodyLines].join('\n');
          const result = renderMarkdownToHtml(markdown);
          const html = result.html;

          expect(html).toContain('<thead>');
          expect(html).toContain('<tbody>');

          const thTags = html.match(/<th\b[^>]*>/g) ?? [];
          const tdTags = html.match(/<td\b[^>]*>/g) ?? [];

          expect(thTags).toHaveLength(columnCount);
          expect(tdTags.length).toBe(rowCount * columnCount);
          expect(tdTags.length).toBeGreaterThan(0);

          tableAlignments.forEach((alignment, columnIndex) => {
            const thTag = thTags[columnIndex];

            if (alignment === 'none') {
              expect(thTag).not.toMatch(/\balign="/);
            } else {
              const alignRegex = new RegExp(`\\balign="${alignment}"`);

              expect(thTag).toMatch(alignRegex);

              for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
                const tdTag = tdTags[rowIndex * columnCount + columnIndex];
                expect(tdTag).toMatch(alignRegex);
              }
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 6.2
 */
describe('Property 13: Footnote rendering integrity', () => {
  it('renders matching footnote references, footnotes section, and back-reference links', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(safeTextArb, { minLength: 5, maxLength: 5 }),
        (footnoteCount, definitions) => {
          const references = Array.from(
            { length: footnoteCount },
            (_, index) => `[^${index + 1}]`
          ).join(' ');

          const definitionLines = definitions
            .slice(0, footnoteCount)
            .map((definition, index) => `[^${index + 1}]: ${definition}`);

          const markdown = [
            `Paragraph with footnote references ${references}.`,
            ...definitionLines,
          ].join('\n\n');

          const result = renderMarkdownToHtml(markdown);
          const html = result.html;

          expect(html).toMatch(/href="#(?:user-content-)?fn-?\d+"/);
          expect(html).toMatch(/data-footnotes|class="[^"]*\bfootnotes\b[^"]*"/);

          // Count back-reference links by matching the <a> elements with data-footnote-backref attribute
          const backRefLinks = (html.match(/<a\b[^>]*data-footnote-backref[^>]*>/g) ?? []);

          expect(backRefLinks.length).toBe(footnoteCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 6.3
 */
describe('Property 14: Task list checkbox state', () => {
  it('renders task list checkboxes with correct disabled and checked state', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 2, maxLength: 8 }), (checkedStates) => {
        const markdown = checkedStates
          .map((checked, index) => `- [${checked ? 'x' : ' '}] Task item ${index + 1}`)
          .join('\n');

        const result = renderMarkdownToHtml(markdown);
        const html = result.html;

        const checkboxInputs = html.match(/<input\b[^>]*type="checkbox"[^>]*>/g) ?? [];
        const expectedCheckedCount = checkedStates.filter(Boolean).length;
        const actualCheckedCount = checkboxInputs.filter((input) =>
          /\bchecked(?:=""|(?=[\s>]))/.test(input)
        ).length;

        expect(checkboxInputs).toHaveLength(checkedStates.length);

        checkboxInputs.forEach((input, index) => {
          expect(input).toMatch(/\btype="checkbox"/);
          expect(input).toMatch(/\bdisabled(?:=""|(?=[\s>]))/);

          if (checkedStates[index]) {
            expect(input).toMatch(/\bchecked(?:=""|(?=[\s>]))/);
          } else {
            expect(input).not.toMatch(/\bchecked(?:=""|(?=[\s>]))/);
          }
        });

        expect(actualCheckedCount).toBe(expectedCheckedCount);
      }),
      { numRuns: 100 }
    );
  });
});
