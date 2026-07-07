import { useMemo } from 'react';
import { sanitizeWordPressContent } from '../utils/sanitizeContent';
import { MermaidRenderer } from './MermaidRenderer';

interface BlogContentProps {
  html: string;
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

export const BlogContent = ({ html }: BlogContentProps) => {
  const sanitizedHtml = useMemo(() => sanitizeWordPressContent(html), [html]);

  const segments = useMemo<ContentSegment[]>(() => {
    const mermaidBlockRegex =
      /<pre\b[^>]*>\s*<code\b[^>]*class=["'][^"']*\blanguage-mermaid\b[^"']*["'][^>]*>([\s\S]*?)<\/code>\s*<\/pre>|<div\b[^>]*class=["'][^"']*\bmermaid\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;

    const result: ContentSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mermaidBlockRegex.exec(sanitizedHtml)) !== null) {
      if (match.index > lastIndex) {
        result.push({
          type: 'html',
          content: sanitizedHtml.slice(lastIndex, match.index),
        });
      }

      result.push({
        type: 'mermaid',
        content: decodeHtmlEntities(match[1] ?? match[2] ?? ''),
      });

      lastIndex = mermaidBlockRegex.lastIndex;
    }

    if (lastIndex < sanitizedHtml.length) {
      result.push({
        type: 'html',
        content: sanitizedHtml.slice(lastIndex),
      });
    }

    return result;
  }, [sanitizedHtml]);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'mermaid') {
          return <MermaidRenderer key={index} chart={segment.content} />;
        }

        return (
          <div
            key={index}
            className="wp-content prose prose-slate prose-lg max-w-none prose-img:rounded-lg prose-img:mx-auto prose-img:max-w-full prose-pre:max-w-full prose-pre:overflow-x-auto prose-a:break-words"
            dangerouslySetInnerHTML={{ __html: segment.content }}
          />
        );
      })}
    </>
  );
};
