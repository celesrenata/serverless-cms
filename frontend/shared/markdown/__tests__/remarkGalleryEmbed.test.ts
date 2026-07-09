import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { renderMarkdownToHtml } from '../renderMarkdown';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { getSanitizeSchema } from '../sanitizeSchema';
import remarkGalleryEmbed from '../plugins/remarkGalleryEmbed';
import type { Node } from 'unist';

// --- Helpers for Properties 1-3 ---

interface GalleryEmbedNode extends Node {
  type: 'galleryEmbed';
  data: {
    hName: string;
    hProperties: {
      className: string;
      'data-album-id': string;
      'data-layout': string;
      'data-limit': string;
      'data-show-description': string;
      'data-show-title': string;
    };
  };
}

function findGalleryEmbedNodes(node: Node): GalleryEmbedNode[] {
  const results: GalleryEmbedNode[] = [];
  if (node.type === 'galleryEmbed') {
    results.push(node as GalleryEmbedNode);
  }
  if ('children' in node && Array.isArray((node as { children?: unknown[] }).children)) {
    for (const child of (node as { children: Node[] }).children) {
      results.push(...findGalleryEmbedNodes(child));
    }
  }
  return results;
}

function parseDirective(markdown: string): Node {
  const processor = unified().use(remarkParse).use(remarkGalleryEmbed);
  return processor.runSync(processor.parse(markdown));
}

/**
 * Render markdown through a minimal pipeline WITHOUT the gallery embed plugin.
 * Used to compare non-gallery output for Property 5.
 */
function renderWithoutGalleryPlugin(markdown: string): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, getSanitizeSchema())
    .use(rehypeStringify);
  return String(processor.processSync(markdown));
}

// Generators
const validAlbumId = fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,19}$/);

const validLayout = fc.constantFrom('grid', 'carousel', 'masonry');

const validLimit = fc.oneof(
  fc.constant(0),
  fc.integer({ min: 1, max: 100 }),
);

const validShowFlag = fc.constantFrom('true', 'false');

interface GalleryAttrs {
  layout: string;
  limit: number;
  showDescription: string;
  showTitle: string;
}

const validAttributes = fc.record({
  layout: validLayout,
  limit: validLimit,
  showDescription: validShowFlag,
  showTitle: validShowFlag,
});

function buildDirective(albumId: string, attrs: GalleryAttrs): string {
  const parts: string[] = [];
  parts.push(`layout=${attrs.layout}`);
  if (attrs.limit > 0) {
    parts.push(`limit=${attrs.limit}`);
  }
  parts.push(`showDescription=${attrs.showDescription}`);
  parts.push(`showTitle=${attrs.showTitle}`);
  return `::gallery[${albumId}]{${parts.join(' ')}}`;
}

describe('remarkGalleryEmbed — directive parsing property tests', () => {
  // **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
  describe('Property 1: Directive Parsing Round Trip', () => {
    it('valid album IDs produce a galleryEmbed node with matching album ID and defaults', () => {
      const validIdGen = fc.stringMatching(/^[a-zA-Z0-9-]+$/).filter(s => s.length > 0);

      fc.assert(
        fc.property(validIdGen, (albumId) => {
          const markdown = `::gallery[${albumId}]`;
          const tree = parseDirective(markdown);
          const nodes = findGalleryEmbedNodes(tree);

          expect(nodes).toHaveLength(1);
          expect(nodes[0].data.hProperties['data-album-id']).toBe(albumId);
          expect(nodes[0].data.hProperties['data-layout']).toBe('grid');
          expect(nodes[0].data.hProperties['data-limit']).toBe('0');
          expect(nodes[0].data.hProperties['data-show-description']).toBe('true');
          expect(nodes[0].data.hProperties['data-show-title']).toBe('true');
        }),
        { numRuns: 100 },
      );
    });
  });

  // **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
  describe('Property 2: Invalid IDs Produce No Embed Node', () => {
    it('invalid album IDs produce zero galleryEmbed AST nodes', () => {
      // Exclude backslashes and brackets from generated IDs: in markdown, `\` acts as
      // an escape character (e.g. `\]` → `]`), which can turn an "invalid" source string
      // into a valid parsed text. We test the plugin's ID validation, not markdown escaping.
      const noMarkdownSpecial = (s: string) => !s.includes('\\') && !s.includes('[') && !s.includes(']');
      const invalidId = fc.oneof(
        fc.constant(''),
        fc.string().filter(s => s.length > 0 && !/^[a-zA-Z0-9-]+$/.test(s) && noMarkdownSpecial(s)),
        fc.array(fc.constantFrom(' ', '\t', '!', '@', '#', '$', '%', '^', '&', '*'), { minLength: 1, maxLength: 5 }).map(chars => chars.join('')),
        fc.string({ minLength: 1 }).filter(s => !/^[a-zA-Z0-9-]+$/.test(s) && noMarkdownSpecial(s)),
      );

      fc.assert(
        fc.property(invalidId, (albumId) => {
          const markdown = `::gallery[${albumId}]`;
          const tree = parseDirective(markdown);
          const nodes = findGalleryEmbedNodes(tree);

          expect(nodes).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  // **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
  describe('Property 3: Attribute Normalization', () => {
    it('recognized keys with valid values retain values, invalid use defaults, unknown keys absent', () => {
      const validLayoutGen = fc.constantFrom('grid', 'carousel', 'masonry');
      const invalidLayoutGen = fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/).filter(
        s => !['grid', 'carousel', 'masonry'].includes(s),
      );
      const validLimitGen = fc.integer({ min: 1, max: 1000 }).map(n => String(n));
      const invalidLimitGen = fc.constantFrom('0', '-1', 'abc', '3.5');
      const validBoolGen = fc.constantFrom('true', 'false');
      const invalidBoolGen = fc.stringMatching(/^[a-zA-Z0-9]{1,8}$/).filter(
        s => s !== 'true' && s !== 'false',
      );
      const unknownKeyGen = fc.stringMatching(/^[a-z][a-z0-9]{0,10}$/).filter(
        s => !['layout', 'limit', 'showDescription', 'showTitle'].includes(s),
      );
      const unknownValueGen = fc.stringMatching(/^[a-zA-Z0-9-]+$/);

      const attributeGen = fc.record({
        layout: fc.oneof(validLayoutGen, invalidLayoutGen, fc.constant(undefined)),
        limit: fc.oneof(validLimitGen, invalidLimitGen, fc.constant(undefined)),
        showDescription: fc.oneof(validBoolGen, invalidBoolGen, fc.constant(undefined)),
        showTitle: fc.oneof(validBoolGen, invalidBoolGen, fc.constant(undefined)),
        unknownKeys: fc.array(fc.tuple(unknownKeyGen, unknownValueGen), { minLength: 0, maxLength: 3 }),
      });

      fc.assert(
        fc.property(attributeGen, (attrs) => {
          const parts: string[] = [];
          if (attrs.layout !== undefined) parts.push(`layout=${attrs.layout}`);
          if (attrs.limit !== undefined) parts.push(`limit=${attrs.limit}`);
          if (attrs.showDescription !== undefined) parts.push(`showDescription=${attrs.showDescription}`);
          if (attrs.showTitle !== undefined) parts.push(`showTitle=${attrs.showTitle}`);
          for (const [key, value] of attrs.unknownKeys) {
            parts.push(`${key}=${value}`);
          }

          const attrString = parts.join(' ');
          const markdown = `::gallery[valid-id]{${attrString}}`;
          const tree = parseDirective(markdown);
          const nodes = findGalleryEmbedNodes(tree);

          expect(nodes).toHaveLength(1);
          const props = nodes[0].data.hProperties;

          // (a) Recognized keys with valid values retain values
          if (attrs.layout !== undefined && ['grid', 'carousel', 'masonry'].includes(attrs.layout)) {
            expect(props['data-layout']).toBe(attrs.layout);
          }
          if (attrs.limit !== undefined) {
            const parsed = parseInt(attrs.limit, 10);
            if (!isNaN(parsed) && parsed > 0) {
              expect(props['data-limit']).toBe(String(parsed));
            } else {
              expect(props['data-limit']).toBe('0');
            }
          }
          if (attrs.showDescription !== undefined && (attrs.showDescription === 'true' || attrs.showDescription === 'false')) {
            expect(props['data-show-description']).toBe(attrs.showDescription);
          }
          if (attrs.showTitle !== undefined && (attrs.showTitle === 'true' || attrs.showTitle === 'false')) {
            expect(props['data-show-title']).toBe(attrs.showTitle);
          }

          // (b) Invalid values use defaults
          if (attrs.layout !== undefined && !['grid', 'carousel', 'masonry'].includes(attrs.layout)) {
            expect(props['data-layout']).toBe('grid');
          }
          if (attrs.showDescription !== undefined && attrs.showDescription !== 'true' && attrs.showDescription !== 'false') {
            expect(props['data-show-description']).toBe('true');
          }
          if (attrs.showTitle !== undefined && attrs.showTitle !== 'true' && attrs.showTitle !== 'false') {
            expect(props['data-show-title']).toBe('true');
          }

          // (c) Unknown keys are absent from the data-* attributes
          for (const [key] of attrs.unknownKeys) {
            expect(props).not.toHaveProperty(`data-${key}`);
          }

          // (d) Missing recognized keys use defaults
          if (attrs.layout === undefined) {
            expect(props['data-layout']).toBe('grid');
          }
          if (attrs.limit === undefined) {
            expect(props['data-limit']).toBe('0');
          }
          if (attrs.showDescription === undefined) {
            expect(props['data-show-description']).toBe('true');
          }
          if (attrs.showTitle === undefined) {
            expect(props['data-show-title']).toBe('true');
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});

describe('remarkGalleryEmbed — pipeline property tests', () => {
  // **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 8.4**
  describe('Property 4: Pipeline Output Integrity', () => {
    it('full pipeline produces exactly one gallery-embed div with correct data attributes for any valid directive', () => {
      fc.assert(
        fc.property(validAlbumId, validAttributes, (albumId, attrs) => {
          const directive = buildDirective(albumId, attrs);
          const { html } = renderMarkdownToHtml(directive);

          // Should contain exactly one gallery-embed div
          const matches = html.match(/<div class="gallery-embed"[^>]*><\/div>/g);
          expect(matches).not.toBeNull();
          expect(matches).toHaveLength(1);

          const divMatch = matches![0];

          // Verify data-album-id matches
          expect(divMatch).toContain(`data-album-id="${albumId}"`);

          // Verify data-layout matches
          expect(divMatch).toContain(`data-layout="${attrs.layout}"`);

          // Verify data-limit: if limit > 0 it should be the string, otherwise "0"
          const expectedLimit = attrs.limit > 0 ? String(attrs.limit) : '0';
          expect(divMatch).toContain(`data-limit="${expectedLimit}"`);

          // Verify data-show-description
          expect(divMatch).toContain(`data-show-description="${attrs.showDescription}"`);

          // Verify data-show-title
          expect(divMatch).toContain(`data-show-title="${attrs.showTitle}"`);
        }),
        { numRuns: 100 },
      );
    });
  });

  // **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 8.4**
  describe('Property 5: Non-Interference', () => {
    it('non-gallery elements render identically with or without the gallery plugin, and each directive produces its own div', () => {
      const headingText = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,20}$/);
      const paragraphText = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 .,!?]{0,40}$/);

      fc.assert(
        fc.property(
          headingText,
          paragraphText,
          validAlbumId,
          validAttributes,
          (heading, paragraph, albumId, attrs) => {
            const directive = buildDirective(albumId, attrs);
            const markdown = `# ${heading}\n\n${paragraph}\n\n${directive}`;

            const { html: fullHtml } = renderMarkdownToHtml(markdown);
            const withoutGalleryHtml = renderWithoutGalleryPlugin(markdown);

            // Extract the heading from the full pipeline output
            const headingRegex = /<h1[^>]*>.*?<\/h1>/;
            const fullHeading = fullHtml.match(headingRegex);
            const noPluginHeading = withoutGalleryHtml.match(headingRegex);

            // Heading should be present in both
            expect(fullHeading).not.toBeNull();
            expect(noPluginHeading).not.toBeNull();

            // Compare heading content (ignoring id attributes added by rehypeHeadingIds)
            const stripId = (s: string) => s.replace(/ id="[^"]*"/, '');
            expect(stripId(fullHeading![0])).toBe(stripId(noPluginHeading![0]));

            // Extract paragraph content from both
            const paraRegex = /<p>.*?<\/p>/;
            const fullPara = fullHtml.match(paraRegex);
            const noPluginPara = withoutGalleryHtml.match(paraRegex);

            expect(fullPara).not.toBeNull();
            expect(noPluginPara).not.toBeNull();
            expect(fullPara![0]).toBe(noPluginPara![0]);

            // The gallery directive should produce its own div in the full pipeline
            const galleryDivs = fullHtml.match(/<div class="gallery-embed"[^>]*><\/div>/g);
            expect(galleryDivs).not.toBeNull();
            expect(galleryDivs).toHaveLength(1);

            // In the no-plugin version, the directive should remain as literal text (inside a <p>)
            expect(withoutGalleryHtml).not.toContain('class="gallery-embed"');
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
