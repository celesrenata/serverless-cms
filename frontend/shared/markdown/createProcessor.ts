import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypePrism from 'rehype-prism-plus';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

import { getSanitizeSchema } from './sanitizeSchema';
import { rehypeHeadingIds } from './plugins/rehypeHeadingIds';
import { rehypeExtractToc } from './plugins/rehypeExtractToc';
import remarkDefinitionList from './plugins/remarkDefinitionList';
import remarkAbbreviations from './plugins/remarkAbbreviations';
import remarkSuperSub from './plugins/remarkSuperSub';
import remarkGalleryEmbed from './plugins/remarkGalleryEmbed';
import rehypeMermaidPassthrough from './plugins/rehypeMermaidPassthrough';
import type { TocItem } from './types';

export interface ProcessorResult {
  // Unified processor type varies based on plugin chain; use structural typing
  processor: {
    process(file: unknown): Promise<{ toString(): string }>;
    processSync(file: unknown): { toString(): string };
  };
  tocItems: TocItem[];
}

/**
 * Create the unified markdown processing pipeline with TOC extraction.
 *
 * Pipeline: remark-parse → remark-gfm → remark-math → remark-definition-list
 *           → remark-abbreviations → remark-super-sub → remark-rehype
 *           → rehype-heading-ids → rehype-extract-toc
 *           → rehype-katex → rehype-mermaid-passthrough → rehype-prism-plus
 *           → rehype-sanitize → rehype-stringify
 *
 * Returns both the processor and a shared tocItems array that gets populated
 * during processing.
 */
export function createProcessorWithToc(): ProcessorResult {
  const tocItems: TocItem[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkMath)
    .use(remarkDefinitionList)
    .use(remarkAbbreviations)
    .use(remarkSuperSub)
    .use(remarkGalleryEmbed)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeHeadingIds)
    .use(rehypeExtractToc, { tocItems })
    .use(rehypeKatex)
    .use(rehypePrism, { ignoreMissing: true })
    .use(rehypeMermaidPassthrough)
    .use(rehypeSanitize, getSanitizeSchema())
    .use(rehypeStringify);

  return { processor, tocItems };
}

/**
 * Create processor without TOC extraction (backward-compatible).
 */
export function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkMath)
    .use(remarkDefinitionList)
    .use(remarkAbbreviations)
    .use(remarkSuperSub)
    .use(remarkGalleryEmbed)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeHeadingIds)
    .use(rehypeKatex)
    .use(rehypePrism, { ignoreMissing: true })
    .use(rehypeMermaidPassthrough)
    .use(rehypeSanitize, getSanitizeSchema())
    .use(rehypeStringify);
}
