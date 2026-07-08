// Feature: blog-sections-markdown, Property 27: Rendering path selection
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import { BlogContent } from '../components/BlogContent';

// Mock MermaidRenderer to avoid side effects in tests
vi.mock('../components/MermaidRenderer', () => ({
  MermaidRenderer: ({ chart }: { chart: string }) => (
    <div data-testid="mermaid-mock">{chart}</div>
  ),
}));

/**
 * **Validates: Requirements 12.1, 12.2, 12.5**
 *
 * Property 27: Rendering path selection
 * For any content item, if content_markdown is non-empty the public website renders
 * via Markdown_Renderer; if content_markdown is empty or absent, it renders the
 * content HTML field using the existing HTML path.
 */
describe('Property 27: Rendering path selection', () => {
  // Generator for non-empty markdown strings (at least one non-whitespace character)
  const nonEmptyMarkdown = fc
    .tuple(
      fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 5 }),
      fc.constantFrom(
        '# Hello',
        '**bold**',
        'Some text',
        '- list item',
        '> quote',
        '`code`',
        '[link](http://example.com)',
        'Paragraph with content.',
        '## Heading 2',
        '1. Ordered item',
      ),
      fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 5 }),
    )
    .map(([pre, content, post]) => `${pre.join('')}${content}${post.join('')}`);

  // Generator for HTML content (simple safe HTML)
  const htmlContent = fc.constantFrom(
    '<p>Hello world</p>',
    '<h1>Title</h1><p>Content here</p>',
    '<div><p>Some paragraph</p></div>',
    '<ul><li>Item 1</li><li>Item 2</li></ul>',
    '<p>Simple text paragraph</p>',
  );

  // Generator for empty/absent content_markdown values
  const emptyOrAbsentMarkdown = fc.constantFrom(
    undefined,
    '',
    ' ',
    '  ',
    '\t',
    '\n',
    '  \n  \t  ',
    '\r\n',
  );

  it('renders via MarkdownContent when content_markdown is non-empty', () => {
    fc.assert(
      fc.property(nonEmptyMarkdown, htmlContent, (markdown, html) => {
        const { container } = render(
          <BlogContent html={html} contentMarkdown={markdown} />,
        );

        // Markdown path does NOT use the "wp-content" class (that's the HTML path)
        const wpContentEl = container.querySelector('.wp-content');
        expect(wpContentEl).toBeNull();

        // Markdown path renders content (MarkdownContent component produces output)
        // The container should have some rendered content
        expect(container.innerHTML.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('renders via existing HTML path when content_markdown is empty or absent', () => {
    fc.assert(
      fc.property(emptyOrAbsentMarkdown, htmlContent, (markdown, html) => {
        const { container } = render(
          <BlogContent html={html} contentMarkdown={markdown as string | undefined} />,
        );

        // HTML path uses the "wp-content" class on its container div
        const wpContentEl = container.querySelector('.wp-content');
        expect(wpContentEl).not.toBeNull();

        // The HTML content should be rendered within the wp-content element
        expect(wpContentEl!.innerHTML.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('content_markdown takes precedence over content HTML when both are present', () => {
    fc.assert(
      fc.property(nonEmptyMarkdown, htmlContent, (markdown, html) => {
        const { container } = render(
          <BlogContent html={html} contentMarkdown={markdown} />,
        );

        // Should use markdown path (no wp-content), even when html is also provided
        const wpContentEl = container.querySelector('.wp-content');
        expect(wpContentEl).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
