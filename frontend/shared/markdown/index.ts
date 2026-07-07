// Shared markdown rendering module
// Used by both admin-panel and public-website

export type {
  TocItem,
  MarkdownRenderOptions,
  MarkdownRenderResult,
  MarkdownRenderWarning,
  SupportedLanguage,
} from './types';

export {
  SUPPORTED_LANGUAGES,
  MAX_MARKDOWN_LENGTH,
  TOC_THRESHOLD,
} from './types';

export { renderMarkdownToHtml, isMarkdownEmpty } from './renderMarkdown';
export { createProcessor, createProcessorWithToc } from './createProcessor';
export { getSanitizeSchema } from './sanitizeSchema';
export { extractToc, shouldShowToc } from './toc';
export { slugifyHeading } from './slugify';
export { rehypeHeadingIds } from './plugins/rehypeHeadingIds';
export { rehypeExtractToc } from './plugins/rehypeExtractToc';
