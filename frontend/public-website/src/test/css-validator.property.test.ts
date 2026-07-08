// Feature: serverless-site-facelift-theme-engine, Property 3: CSS validation rejects dangerous patterns
import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { validateCSS } from '../lib/cssValidator';

/**
 * Validates: Requirements 7.3, 14.3
 */
describe('Property 3: CSS validation rejects dangerous patterns', () => {
  it('rejects randomly injected dangerous CSS patterns', () => {
    const dangerousPatternArbitrary = fc.oneof(
      fc.constant({
        kind: 'atrule' as const,
        pattern: '@import url("https://evil.com/hack.css");',
      }),
      fc.constant({
        kind: 'value' as const,
        pattern: 'url(javascript:alert(1))',
      }),
      fc.constant({
        kind: 'value' as const,
        pattern: 'url(vbscript:exec)',
      }),
      fc.constant({
        kind: 'value' as const,
        pattern: 'url(data:text/html,<script>)',
      }),
      fc.constant({
        kind: 'value' as const,
        pattern: 'url(https://external.com/image.png)',
      }),
      fc.constant({
        kind: 'value' as const,
        pattern: 'expression(alert(1))',
      }),
      fc.constant({
        kind: 'declaration' as const,
        pattern: '-moz-binding: url(#)',
      }),
      fc.constant({
        kind: 'declaration' as const,
        pattern: 'behavior: url(script.htc)',
      }),
    );

    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 24 }),
        dangerousPatternArbitrary,
        (rawClassPrefix, dangerousPattern) => {
          const safeClassPrefix = rawClassPrefix.replace(/[^a-zA-Z0-9_-]/g, '-');
          const className = `p-${safeClassPrefix}-test-class`;

          const css =
            dangerousPattern.kind === 'atrule'
              ? `${dangerousPattern.pattern}\n.${className} { color: black; }`
              : dangerousPattern.kind === 'value'
                ? `.${className} { color: ${dangerousPattern.pattern}; }`
                : `.${className} { ${dangerousPattern.pattern}; }`;

          const result = validateCSS(css);

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: serverless-site-facelift-theme-engine, Property 7: CSS size limit enforcement
import { validateCSSUpload, CSS_MAX_SIZE_BYTES } from '../lib/cssValidator';

/**
 * Validates: Requirements 7.2, 14.2
 */
describe('Property 7: CSS size limit enforcement', () => {
  it('rejects strings exceeding 102400 bytes before parsing', () => {
    fc.assert(
      fc.property(
        // Generate ASCII strings with byte length above the limit (102401 to 110000)
        fc.integer({ min: CSS_MAX_SIZE_BYTES + 1, max: CSS_MAX_SIZE_BYTES + 7600 }).chain((len) =>
          fc.constant('a'.repeat(len)),
        ),
        (oversizedContent) => {
          const result = validateCSSUpload(oversizedContent, 'theme.css', 'text/css');
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBe(1);
          expect(result.errors[0].message).toContain('exceeds maximum');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not reject strings at or below 102400 bytes with a size error', () => {
    fc.assert(
      fc.property(
        // Generate ASCII strings with byte length at or below the limit (95000 to 102400)
        fc.integer({ min: CSS_MAX_SIZE_BYTES - 7400, max: CSS_MAX_SIZE_BYTES }).chain((len) =>
          fc.constant('.x{color:red}'.repeat(Math.ceil(len / 13)).slice(0, len)),
        ),
        (validSizeContent) => {
          const result = validateCSSUpload(validSizeContent, 'theme.css', 'text/css');
          // Should not have a size-related error (may have CSS parse errors, but not size)
          const sizeErrors = result.errors.filter((e) => e.message.includes('exceeds maximum'));
          expect(sizeErrors.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
