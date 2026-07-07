import { describe, it, expect } from 'vitest';
import { renderMarkdownToHtml } from '../../../shared/markdown/renderMarkdown';

describe('Extended syntax plugins', () => {
  describe('Definition Lists', () => {
    it('parses definition list syntax into dl/dt/dd (separated form)', () => {
      const input = `Term 1\n\n:   Definition 1\n\nTerm 2\n\n:   Definition 2`;
      const result = renderMarkdownToHtml(input);
      expect(result.html).toContain('<dl>');
      expect(result.html).toContain('<dt>');
      expect(result.html).toContain('<dd>');
      expect(result.html).toContain('Term 1');
      expect(result.html).toContain('Definition 1');
      expect(result.html).toContain('Term 2');
      expect(result.html).toContain('Definition 2');
    });

    it('parses compact definition list (no blank lines)', () => {
      const input = `Term 1\n:   Definition 1`;
      const result = renderMarkdownToHtml(input);
      expect(result.html).toContain('<dl>');
      expect(result.html).toContain('<dt>');
      expect(result.html).toContain('<dd>');
      expect(result.html).toContain('Term 1');
      expect(result.html).toContain('Definition 1');
    });

    it('handles multiple definitions for one term', () => {
      const input = `Term\n:   Def A\n:   Def B`;
      const result = renderMarkdownToHtml(input);
      expect(result.html).toContain('Def A');
      expect(result.html).toContain('Def B');
    });
  });

  describe('Abbreviations', () => {
    it('wraps abbreviations with abbr tags', () => {
      const input = `The HTML specification is maintained by W3C.\n\n*[HTML]: Hyper Text Markup Language\n*[W3C]: World Wide Web Consortium`;
      const result = renderMarkdownToHtml(input);
      expect(result.html).toContain('<abbr');
      expect(result.html).toContain('title="Hyper Text Markup Language"');
      expect(result.html).toContain('title="World Wide Web Consortium"');
    });

    it('removes abbreviation definitions from output', () => {
      const input = `Some HTML text.\n\n*[HTML]: Hyper Text Markup Language`;
      const result = renderMarkdownToHtml(input);
      expect(result.html).not.toContain('*[HTML]');
    });
  });

  describe('Superscript and Subscript', () => {
    it('parses ^text^ as superscript', () => {
      const input = `E = mc^2^`;
      const result = renderMarkdownToHtml(input);
      expect(result.html).toContain('<sup>');
      expect(result.html).toContain('2');
    });

    it('parses ~text~ as subscript', () => {
      const input = `H~2~O`;
      const result = renderMarkdownToHtml(input);
      expect(result.html).toContain('<sub>');
      expect(result.html).toContain('2');
    });

    it('does not conflict with strikethrough ~~text~~', () => {
      const input = `~~deleted~~`;
      const result = renderMarkdownToHtml(input);
      expect(result.html).toContain('<del>');
      expect(result.html).not.toContain('<sub>');
    });
  });

  describe('Mermaid Passthrough', () => {
    it('preserves mermaid code blocks with appropriate classes', () => {
      const input = '```mermaid\ngraph TD\n  A --> B\n```';
      const result = renderMarkdownToHtml(input);
      expect(result.html).toContain('language-mermaid');
      expect(result.html).toContain('data-language="mermaid"');
      expect(result.html).toContain('graph TD');
      expect(result.html).toContain('A -->');
      // Should NOT contain Prism token spans
      expect(result.html).not.toContain('token keyword');
      expect(result.html).not.toContain('token operator');
    });
  });
});
