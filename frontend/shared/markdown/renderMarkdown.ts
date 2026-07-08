import { createProcessorWithToc } from './createProcessor';
import { shouldShowToc } from './toc';
import type {
  MarkdownRenderOptions,
  MarkdownRenderResult,
  MarkdownRenderWarning,
} from './types';
import { MAX_MARKDOWN_LENGTH } from './types';

/**
 * Check if markdown input is empty or whitespace-only.
 */
export function isMarkdownEmpty(markdown: string): boolean {
  return markdown.trim().length === 0;
}

/**
 * Render markdown source to sanitized HTML.
 *
 * - Empty/whitespace input returns empty string
 * - Input exceeding maxLength is truncated with a warning
 * - Processor errors are caught and returned as escaped pre with a warning
 * - TOC is extracted and included in the result
 */
export function renderMarkdownToHtml(
  markdown: string,
  options: MarkdownRenderOptions = {},
): MarkdownRenderResult {
  if (isMarkdownEmpty(markdown)) {
    return {
      html: '',
      toc: [],
      shouldShowToc: false,
      warnings: [],
    };
  }

  const warnings: MarkdownRenderWarning[] = [];
  const maxLength = options.maxLength ?? MAX_MARKDOWN_LENGTH;

  let input = markdown;

  if (input.length > maxLength) {
    input = input.slice(0, maxLength);

    warnings.push({
      code: 'MAX_LENGTH_EXCEEDED',
      message: `Markdown input exceeded the maximum length of ${maxLength} characters and was truncated.`,
    });
  }

  try {
    const { processor, tocItems } = createProcessorWithToc();
    const result = processor.processSync(input);
    const html = String(result);

    return {
      html,
      toc: tocItems,
      shouldShowToc: shouldShowToc(tocItems),
      warnings,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'An unknown markdown rendering error occurred.';

    return {
      html: `<pre>${escapeHtml(input)}</pre>`,
      toc: [],
      shouldShowToc: false,
      warnings: [
        ...warnings,
        {
          code: 'MALFORMED_SYNTAX',
          message: `Failed to render markdown: ${message}`,
        },
      ],
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
