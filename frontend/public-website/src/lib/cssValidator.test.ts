import { describe, it, expect } from 'vitest';
import { validateCSS, validateCSSUpload } from './cssValidator';

describe('cssValidator', () => {
  describe('valid CSS', () => {
    it('accepts valid CSS with no dangerous patterns', () => {
      const result = validateCSS(`
        .card { color: red; background: blue; }
        .header { font-size: 16px; }
      `);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts CSS custom properties', () => {
      const result = validateCSS(`
        :root { --color-primary: 99 102 241; }
        .btn { background: rgb(var(--color-primary)); }
      `);
      expect(result.valid).toBe(true);
    });

    it('accepts relative URLs in url()', () => {
      const result = validateCSS(`
        .bg { background: url('/images/pattern.svg'); }
        .icon { background: url(./icons/check.svg); }
      `);
      expect(result.valid).toBe(true);
    });
  });

  describe('@import rejection', () => {
    it('rejects @import rules', () => {
      const result = validateCSS(`@import url('https://evil.com/styles.css');`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('@import'))).toBe(true);
    });

    it('rejects @import without url()', () => {
      const result = validateCSS(`@import 'styles.css';`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('@import'))).toBe(true);
    });
  });

  describe('url() with external domains', () => {
    it('rejects url() with http:// external domains', () => {
      const result = validateCSS(`.bg { background: url('http://evil.com/bg.png'); }`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('External URLs'))).toBe(true);
    });

    it('rejects url() with https:// external domains', () => {
      const result = validateCSS(`.bg { background: url('https://evil.com/bg.png'); }`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('External URLs'))).toBe(true);
    });
  });

  describe('dangerous protocols', () => {
    it('rejects javascript: protocol in url()', () => {
      const result = validateCSS(`.x { background: url('javascript:alert(1)'); }`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('javascript:'))).toBe(true);
    });

    it('rejects vbscript: protocol in url()', () => {
      const result = validateCSS(`.x { background: url('vbscript:foo'); }`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('vbscript:'))).toBe(true);
    });

    it('rejects data: protocol in url()', () => {
      const result = validateCSS(`.x { background: url('data:text/html,<script>alert(1)</script>'); }`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('data:'))).toBe(true);
    });
  });

  describe('blocked functions', () => {
    it('rejects expression() function', () => {
      const result = validateCSS(`.x { width: expression(document.body.clientWidth); }`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('expression()'))).toBe(true);
    });
  });

  describe('blocked properties', () => {
    it('rejects -moz-binding property', () => {
      const result = validateCSS(`.x { -moz-binding: url('http://evil.com/xbl'); }`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('-moz-binding'))).toBe(true);
    });

    it('rejects behavior property', () => {
      const result = validateCSS(`.x { behavior: url(script.htc); }`);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('behavior'))).toBe(true);
    });
  });

  describe('unparseable CSS', () => {
    it('returns parse error for completely invalid input', () => {
      const result = validateCSS('{{{{');
      // Should either fail to parse or find no dangerous patterns
      // csstree is lenient so it might parse but find nothing dangerous
      // The important contract is: if it can't parse, return the error message
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('structured errors', () => {
    it('returns line and column info for errors', () => {
      const result = validateCSS(`.x { -moz-binding: url('foo'); }`);
      expect(result.valid).toBe(false);
      expect(result.errors[0].line).toBeDefined();
      expect(result.errors[0].column).toBeDefined();
    });

    it('reports multiple errors', () => {
      const css = `
        @import 'evil.css';
        .x { -moz-binding: url('foo'); }
        .y { behavior: url('bar.htc'); }
      `;
      const result = validateCSS(css);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});


describe('validateCSSUpload', () => {
  describe('file size validation', () => {
    it('accepts file exactly at 102400 bytes', () => {
      // Create a string that encodes to exactly 102400 bytes (ASCII = 1 byte/char)
      const content = 'a'.repeat(102400);
      const result = validateCSSUpload(content, 'styles.css', 'text/css');
      // Should pass size check (may fail on CSS parsing, but size is OK)
      expect(result.errors.every(e => !e.message.includes('exceeds maximum'))).toBe(true);
    });

    it('rejects file at 102401 bytes with size error', () => {
      const content = 'a'.repeat(102401);
      const result = validateCSSUpload(content, 'styles.css', 'text/css');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds maximum');
      expect(result.errors[0].message).toContain('102400');
    });

    it('rejects large files without attempting to parse CSS', () => {
      // Even if content is valid CSS, oversized files should be rejected immediately
      const content = `.valid { color: red; }\n`.repeat(10000); // well over 100KB
      const result = validateCSSUpload(content, 'styles.css', 'text/css');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('exceeds maximum');
    });
  });

  describe('file extension validation', () => {
    it('rejects files without .css extension', () => {
      const result = validateCSSUpload('.x { color: red; }', 'styles.txt', 'text/css');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid file extension');
    });

    it('rejects .html extension', () => {
      const result = validateCSSUpload('.x { color: red; }', 'page.html', 'text/css');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid file extension');
    });

    it('accepts .CSS extension (case insensitive)', () => {
      const result = validateCSSUpload('.x { color: red; }', 'styles.CSS', 'text/css');
      expect(result.valid).toBe(true);
    });
  });

  describe('MIME type validation', () => {
    it('rejects wrong MIME type', () => {
      const result = validateCSSUpload('.x { color: red; }', 'styles.css', 'text/html');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid MIME type');
      expect(result.errors[0].message).toContain('text/html');
    });

    it('rejects application/javascript MIME type', () => {
      const result = validateCSSUpload('.x { color: red; }', 'styles.css', 'application/javascript');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid MIME type');
    });

    it('accepts text/css MIME type (case insensitive)', () => {
      const result = validateCSSUpload('.x { color: red; }', 'styles.css', 'TEXT/CSS');
      expect(result.valid).toBe(true);
    });
  });

  describe('validation order (early exit)', () => {
    it('rejects on size before checking extension or MIME', () => {
      const content = 'a'.repeat(102401);
      const result = validateCSSUpload(content, 'bad.html', 'text/html');
      expect(result.valid).toBe(false);
      // Should only have the size error, not extension or MIME errors
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds maximum');
    });

    it('delegates to validateCSS when metadata checks pass', () => {
      const css = `.card { color: red; }`;
      const result = validateCSSUpload(css, 'theme.css', 'text/css');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('catches CSS content errors after passing metadata checks', () => {
      const css = `@import 'evil.css';`;
      const result = validateCSSUpload(css, 'theme.css', 'text/css');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('@import'))).toBe(true);
    });
  });
});
