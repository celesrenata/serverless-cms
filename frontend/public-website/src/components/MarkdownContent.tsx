import { useMemo } from 'react';
import { renderMarkdownToHtml } from '../../../shared/markdown';
import type { TocItem } from '../../../shared/markdown';
import { MermaidRenderer } from './MermaidRenderer';
import 'katex/dist/katex.min.css';

interface MarkdownContentProps {
  markdown: string;
}

type ContentSegment = {
  type: 'html' | 'mermaid';
  content: string;
};

const decodeHtmlEntities = (content: string): string =>
  content
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

function TocList({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="list-none pl-4 space-y-1">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById(item.id)
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {item.text}
          </a>
          {item.children.length > 0 && <TocList items={item.children} />}
        </li>
      ))}
    </ul>
  );
}

/**
 * Splits rendered HTML into segments, extracting mermaid code blocks
 * so they can be rendered via MermaidRenderer.
 */
function extractMermaidSegments(html: string): ContentSegment[] {
  const mermaidBlockRegex =
    /<pre\b[^>]*>\s*<code\b[^>]*class=["'][^"']*\blanguage-mermaid\b[^"']*["'][^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi;

  const result: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mermaidBlockRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    result.push({ type: 'mermaid', content: decodeHtmlEntities(match[1] ?? '') });
    lastIndex = mermaidBlockRegex.lastIndex;
  }

  if (lastIndex < html.length) {
    result.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return result;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ markdown }) => {
  const { html, toc, shouldShowToc } = useMemo(
    () => renderMarkdownToHtml(markdown),
    [markdown],
  );

  const segments = useMemo(
    () => (html ? extractMermaidSegments(html) : []),
    [html],
  );

  if (!html) return null;

  return (
    <div>
      {shouldShowToc && (
        <nav
          aria-label="Table of contents"
          className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-8 bg-slate-50 dark:bg-slate-800/50"
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Table of Contents
          </h2>
          <TocList items={toc} />
        </nav>
      )}

      {segments.map((segment, index) => {
        if (segment.type === 'mermaid') {
          return <MermaidRenderer key={index} chart={segment.content} />;
        }
        return (
          <article
            key={index}
            className="prose prose-slate prose-lg max-w-none prose-img:rounded-lg prose-img:mx-auto prose-img:max-w-full prose-pre:max-w-full prose-pre:overflow-x-auto prose-a:break-words"
            dangerouslySetInnerHTML={{ __html: segment.content }}
          />
        );
      })}
    </div>
  );
};
