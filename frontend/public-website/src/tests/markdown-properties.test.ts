import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { renderMarkdownToHtml } from '../../../shared/markdown/renderMarkdown';

describe('Shared markdown renderer — property-based tests', () => {
  // **Validates: Requirements 10.2**
  describe('Property 24: Deterministic rendering', () => {
    it('produces byte-identical HTML on repeated invocations for any markdown input', () => {
      fc.assert(
        fc.property(fc.string(), (markdown) => {
          const first = renderMarkdownToHtml(markdown);
          const second = renderMarkdownToHtml(markdown);
          expect(second.html).toBe(first.html);
        }),
        { numRuns: 100 },
      );
    });
  });

  // **Validates: Requirements 10.3**
  describe('Property 25: XSS sanitization', () => {
    it('strips script tags, on* attributes, javascript: URLs, data: URIs, and iframes from output', () => {
      const dangerousPayloads = fc.constantFrom(
        '<script>alert("xss")</script>',
        '<SCRIPT>alert("xss")</SCRIPT>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)"></svg>',
        '<button onclick="alert(1)">Click</button>',
        '<a href="javascript:alert(1)">Click</a>',
        '[Click me](javascript:alert(1))',
        '[Click me](JaVaScRiPt:alert(1))',
        '<a href="data:text/html,<script>alert(1)</script>">Click</a>',
        '[Click me](data:text/html,<script>alert(1)</script>)',
        '<iframe src="https://example.com"></iframe>',
        '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      );

      const dangerousMarkdown = fc
        .tuple(
          dangerousPayloads,
          fc.constantFrom(
            (payload: string) => payload,
            (payload: string) => `# Heading\n\n${payload}`,
            (payload: string) => `Before\n\n${payload}\n\nAfter`,
            (payload: string) => `> ${payload}`,
            (payload: string) => `- ${payload}`,
            (payload: string) => `**bold** ${payload}`,
            (payload: string) => `\n\n${payload}\n\n`,
          ),
        )
        .map(([payload, wrap]) => wrap(payload));

      fc.assert(
        fc.property(dangerousMarkdown, (markdown) => {
          const { html } = renderMarkdownToHtml(markdown);
          const normalizedHtml = html.toLowerCase();

          expect(normalizedHtml).not.toContain('<script');
          expect(normalizedHtml).not.toContain('onerror=');
          expect(normalizedHtml).not.toContain('onload=');
          expect(normalizedHtml).not.toContain('onclick=');
          expect(normalizedHtml).not.toContain('javascript:');
          expect(normalizedHtml).not.toContain('data:text/html');
          expect(normalizedHtml).not.toContain('<iframe');
        }),
        { numRuns: 100 },
      );
    });
  });

  // **Validates: Requirements 10.4, 10.5**
  describe('Property 26: Whitespace/empty input handling', () => {
    it('returns empty string for any input that is empty or whitespace-only', () => {
      const whitespaceOnly = fc.oneof(
        fc.constant(''),
        fc.stringMatching(/^[ \t\n\r\f\v]*$/),
      );

      fc.assert(
        fc.property(whitespaceOnly, (markdown) => {
          const { html } = renderMarkdownToHtml(markdown);
          expect(html).toBe('');
        }),
        { numRuns: 100 },
      );
    });
  });
});
