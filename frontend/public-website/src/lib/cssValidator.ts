import * as csstree from 'css-tree';

export interface CSSValidationResult {
  valid: boolean;
  errors: Array<{ line?: number; column?: number; message: string }>;
}

const BLOCKED_PROTOCOLS = ['javascript', 'vbscript', 'data'];
const BLOCKED_PROPERTIES = ['-moz-binding', 'behavior'];
const BLOCKED_FUNCTIONS = ['expression'];

/** Maximum CSS file size in bytes (100KB) */
export const CSS_MAX_SIZE_BYTES = 102400;

/** Allowed MIME types for CSS uploads */
export const CSS_ALLOWED_MIME_TYPES = ['text/css'];

/** Allowed file extension for CSS uploads */
export const CSS_ALLOWED_EXTENSION = '.css';

/**
 * Validates a CSS upload by checking file metadata (size, extension, MIME type)
 * before delegating to the content validator.
 *
 * Checks are performed in order and return immediately on failure:
 * 1. File size ≤ 102400 bytes
 * 2. Filename ends with .css
 * 3. MIME type is text/css
 * 4. Content validation via validateCSS()
 */
export function validateCSSUpload(
  content: string,
  filename: string,
  mimeType: string,
): CSSValidationResult {
  // Check file size before parsing
  const byteLength = new TextEncoder().encode(content).length;
  if (byteLength > CSS_MAX_SIZE_BYTES) {
    return {
      valid: false,
      errors: [{ message: `File size ${byteLength} bytes exceeds maximum of ${CSS_MAX_SIZE_BYTES} bytes (100KB)` }],
    };
  }

  // Check file extension
  if (!filename.toLowerCase().endsWith(CSS_ALLOWED_EXTENSION)) {
    return {
      valid: false,
      errors: [{ message: `Invalid file extension. Only ${CSS_ALLOWED_EXTENSION} files are accepted` }],
    };
  }

  // Check MIME type
  if (!CSS_ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      errors: [{ message: `Invalid MIME type "${mimeType}". Only text/css is accepted` }],
    };
  }

  // All metadata checks pass — validate content
  return validateCSS(content);
}

/**
 * Validates a CSS string by parsing it into an AST and checking for
 * dangerous patterns that could be used for XSS or data exfiltration.
 */
export function validateCSS(css: string): CSSValidationResult {
  const errors: CSSValidationResult['errors'] = [];

  let ast: csstree.CssNode;
  try {
    ast = csstree.parse(css, {
      parseAtrulePrelude: false,
      parseCustomProperty: false,
      positions: true,
    });
  } catch {
    return { valid: false, errors: [{ message: 'CSS could not be parsed safely' }] };
  }

  csstree.walk(ast, (node: csstree.CssNode) => {
      // Reject @import at-rules
      if (node.type === 'Atrule' && node.name.toLowerCase() === 'import') {
        errors.push({
          line: node.loc?.start.line,
          column: node.loc?.start.column,
          message: '@import rules are not allowed',
        });
      }

      // Reject blocked properties (-moz-binding, behavior)
      if (node.type === 'Declaration') {
        const prop = node.property.toLowerCase();
        if (BLOCKED_PROPERTIES.includes(prop)) {
          errors.push({
            line: node.loc?.start.line,
            column: node.loc?.start.column,
            message: `Property "${node.property}" is not allowed`,
          });
        }
      }

      // Reject blocked functions (expression)
      if (node.type === 'Function') {
        const name = node.name.toLowerCase();
        if (BLOCKED_FUNCTIONS.includes(name)) {
          errors.push({
            line: node.loc?.start.line,
            column: node.loc?.start.column,
            message: `Function "${node.name}()" is not allowed`,
          });
        }
      }

      // Reject url() with dangerous protocols or external domains
      if (node.type === 'Url') {
        const url = node.value.trim();
        const urlLower = url.toLowerCase();

        // Check for blocked protocols
        for (const protocol of BLOCKED_PROTOCOLS) {
          if (urlLower.startsWith(`${protocol}:`)) {
            errors.push({
              line: node.loc?.start.line,
              column: node.loc?.start.column,
              message: `Protocol "${protocol}:" is not allowed in url()`,
            });
            return;
          }
        }

        // Check for external domains (anything with :// that's not same-origin)
        if (urlLower.includes('://')) {
          errors.push({
            line: node.loc?.start.line,
            column: node.loc?.start.column,
            message: 'External URLs are not allowed in url()',
          });
        }
      }

      // Scan Raw nodes for dangerous patterns that csstree didn't fully parse
      // (e.g., url(javascript:...) in property values parsed as Raw text)
      if (node.type === 'Raw') {
        const rawLower = node.value.toLowerCase();

        // Check for blocked protocols inside url()
        for (const protocol of BLOCKED_PROTOCOLS) {
          if (rawLower.includes(`url(${protocol}:`) || rawLower.includes(`url("${protocol}:`) || rawLower.includes(`url('${protocol}:`)) {
            errors.push({
              line: node.loc?.start.line,
              column: node.loc?.start.column,
              message: `Protocol "${protocol}:" is not allowed in url()`,
            });
          }
        }

        // Check for external URLs in Raw nodes
        if (rawLower.includes('url(http://') || rawLower.includes('url(https://') || rawLower.includes('url("http') || rawLower.includes("url('http")) {
          errors.push({
            line: node.loc?.start.line,
            column: node.loc?.start.column,
            message: 'External URLs are not allowed in url()',
          });
        }

        // Check for blocked functions in Raw nodes
        for (const fn of BLOCKED_FUNCTIONS) {
          if (rawLower.includes(`${fn}(`)) {
            errors.push({
              line: node.loc?.start.line,
              column: node.loc?.start.column,
              message: `Function "${fn}()" is not allowed`,
            });
          }
        }
      }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
