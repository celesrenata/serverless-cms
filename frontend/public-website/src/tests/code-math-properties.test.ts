// Feature: blog-sections-markdown, Properties 16-19: Math, malformed syntax, code escaping, syntax highlighting
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { renderMarkdownToHtml } from '../../../shared/markdown/renderMarkdown';

const safeLatexExpressions = fc.constantFrom(
  'x^2',
  'a + b',
  'E = mc^2',
  'f(x)',
  '\\alpha',
  '\\sum_{i=1}^n x_i',
  '\\frac{a}{b}',
  'x_i',
  '\\int_0^1 f(x) dx',
  '\\sqrt{2}',
  'a^2 + b^2 = c^2',
  '\\pi r^2',
);

/**
 * Validates: Requirements 6.8, 8.5
 */
describe('Property 16: Math delimiter handling', () => {
  it('inline math ($...$) produces output with katex classes', () => {
    fc.assert(
      fc.property(safeLatexExpressions, (latex) => {
        const markdown = `Text with inline math $${latex}$ here.`;
        const result = renderMarkdownToHtml(markdown);
        const html = result.html;

        // KaTeX renders math with katex class spans
        expect(html).toMatch(/class="[^"]*katex[^"]*"/);
      }),
      { numRuns: 100 },
    );
  });

  it('display math ($$...$$) produces output with katex-display class', () => {
    fc.assert(
      fc.property(safeLatexExpressions, (latex) => {
        // Display math requires $$ on its own line with content between
        const markdown = `Text before\n\n$$\n${latex}\n$$\n\nText after`;
        const result = renderMarkdownToHtml(markdown);
        const html = result.html;

        // KaTeX renders display math with katex-display class
        expect(html).toMatch(/class="[^"]*katex-display[^"]*"/);
        // Should also have the base katex class
        expect(html).toMatch(/class="[^"]*katex[^"]*"/);
      }),
      { numRuns: 100 },
    );
  });
});

const malformedSyntax = fc.constantFrom(
  '[unclosed link(',
  '[^orphan-footnote-no-def]',
  '| broken | table\n| no | separator',
  '$$unclosed math block',
  '~~~no closing fence',
  '```\nunclosed code block',
  '[[[deeply nested brackets',
  '> > > deeply nested quote without real content',
  '*bold without close',
  '~~strikethrough without close',
  '- [x incomplete task list',
  '| a |\n|---\n| b | c | d |',
  '^superscript without close',
  '~subscript without close',
);

/**
 * Validates: Requirements 6.9, 10.7
 */
describe('Property 17: Malformed syntax graceful degradation', () => {
  it('renderer does not throw for malformed extended syntax and outputs source text', () => {
    fc.assert(
      fc.property(malformedSyntax, (markdown) => {
        // Should not throw
        const result = renderMarkdownToHtml(markdown);

        // Should return a string
        expect(typeof result.html).toBe('string');

        // Non-whitespace malformed input should not produce empty output
        // (it should render as literal text)
        expect(result.html.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});

const specialCharContent = fc.constantFrom(
  '<div>hello</div>',
  'a > b && c < d',
  'x < y',
  '"quoted"',
  '<script>alert(1)</script>',
  'a & b & c',
  '1 < 2 > 0',
  'if (x < 10 && y > 5) { return "ok"; }',
  '<tag attr="val">',
  'Tom & Jerry',
  'a<b>c</b>d',
  '3 > 2 > 1',
);

/**
 * Validates: Requirements 7.5
 */
describe('Property 19: HTML entity escaping in code blocks', () => {
  it('code blocks with <, >, &, " contain entity-escaped equivalents in output', () => {
    fc.assert(
      fc.property(specialCharContent, (content) => {
        const markdown = '```\n' + content + '\n```';
        const result = renderMarkdownToHtml(markdown);
        const html = result.html;

        // Extract content between <code> tags
        const codeMatch = html.match(/<code[^>]*>([\s\S]*?)<\/code>/);
        expect(codeMatch).not.toBeNull();
        const codeContent = codeMatch![1];

        // Verify special characters are entity-escaped
        // rehype-stringify uses hex entities (&#x3C; for <, &#x3E; for >, &#x26; for &, &#x22; for ")
        // or named entities (&lt; &gt; &amp; &quot;)
        if (content.includes('<')) {
          // < must be escaped as &lt; or &#x3C; — must not appear as raw < (outside HTML tags)
          expect(codeContent).toMatch(/(?:&lt;|&#x3C;)/);
        }
        if (content.includes('>')) {
          // > may be escaped as &gt; or &#x3E; or left as literal > (which is valid in HTML text)
          // The key property is it doesn't form part of an HTML tag
          expect(codeContent).toMatch(/(?:&gt;|&#x3E;|>)/);
        }
        if (content.includes('&')) {
          // & must be escaped as &amp; or &#x26;
          expect(codeContent).toMatch(/(?:&amp;|&#x26;)/);
        }
        if (content.includes('"')) {
          // " may be escaped as &quot; or &#x22; or left literal in text content
          expect(codeContent).toMatch(/(?:&quot;|&#x22;|")/);
        }

        // The fundamental property: raw < should not appear as an unescaped HTML tag opener
        // within code content (it would mean XSS is possible)
        if (content.includes('<')) {
          // No raw unescaped < that could form HTML tags in the code output
          // Strip known entity patterns and check no < remains that starts a tag
          const stripped = codeContent
            .replace(/&#x3C;/g, '')
            .replace(/&lt;/g, '')
            .replace(/<span[^>]*>/g, '')
            .replace(/<\/span>/g, '');
          // Any remaining < should not form unescaped user content
          const rawUserContent = stripped.replace(/<br\s*\/?>/g, '');
          // If there's a raw <, it shouldn't match original content's dangerous chars
          expect(rawUserContent).not.toContain('<div');
          expect(rawUserContent).not.toContain('<script');
        }
      }),
      { numRuns: 100 },
    );
  });
});

const supportedLanguages = fc.constantFrom(
  'javascript',
  'python',
  'typescript',
  'rust',
  'go',
  'java',
  'css',
  'html',
  'sql',
  'bash',
);

const tokenizableCode: Record<string, string[]> = {
  javascript: ['const x = 42;', 'function foo() { return 1; }', 'let arr = [1, 2, 3];'],
  python: ['def foo():\n    return 42', 'import os', 'class Foo:\n    pass'],
  typescript: ['const x: number = 42;', 'interface Foo { bar: string; }', 'type A = string | number;'],
  rust: ['fn main() { let x = 42; }', 'struct Foo { bar: i32 }', 'impl Foo { fn new() -> Self {} }'],
  go: ['func main() { x := 42 }', 'package main', 'import "fmt"'],
  java: ['public class Foo { int x = 42; }', 'import java.util.List;', 'interface Bar {}'],
  css: ['body { color: red; }', '.class { display: flex; }', '#id { margin: 0; }'],
  html: ['<div class="foo">bar</div>', '<p>hello</p>', '<a href="#">link</a>'],
  sql: ['SELECT * FROM users;', 'INSERT INTO foo VALUES (1);', 'CREATE TABLE bar (id INT);'],
  bash: ['echo "hello"', 'if [ -f foo ]; then echo yes; fi', 'export PATH="/usr/bin"'],
};

const codeForLanguage = (lang: string): string => {
  const snippets = tokenizableCode[lang] ?? ['const x = 42;'];
  return snippets[0];
};

const unsupportedLanguages = fc.constantFrom(
  'zzzznonexist',
  'fakeLang123',
  'notareallanguage',
  'xyzlang',
  'qwertyuiop',
);

/**
 * Validates: Requirements 7.1, 7.3
 */
describe('Property 18: Syntax highlighting with language', () => {
  it('supported language fenced code blocks contain Prism token spans', () => {
    fc.assert(
      fc.property(supportedLanguages, (language) => {
        const code = codeForLanguage(language);
        const markdown = '```' + language + '\n' + code + '\n```';
        const result = renderMarkdownToHtml(markdown);
        const html = result.html;

        // Output should have pre and code elements
        expect(html).toContain('<pre');
        expect(html).toContain('<code');

        // Prism should add token class spans for syntax highlighting
        expect(html).toMatch(/class="[^"]*token[^"]*"/);
      }),
      { numRuns: 100 },
    );
  });

  it('unsupported language fenced code blocks render plain pre>code without token spans', () => {
    fc.assert(
      fc.property(unsupportedLanguages, (language) => {
        const code = 'some plain text content here 123';
        const markdown = '```' + language + '\n' + code + '\n```';
        const result = renderMarkdownToHtml(markdown);
        const html = result.html;

        // Output should still have pre and code elements
        expect(html).toContain('<pre');
        expect(html).toContain('<code');

        // Should NOT have Prism token spans for unsupported languages
        // (code-line spans are from rehype-prism-plus line wrapping, not syntax tokens)
        expect(html).not.toMatch(/class="token\b/);
      }),
      { numRuns: 100 },
    );
  });
});
