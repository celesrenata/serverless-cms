import { useMemo } from 'react';
import { renderMarkdownToHtml } from '../../../shared/markdown';
import type { TocItem } from '../../../shared/markdown';
import { MermaidRenderer } from './MermaidRenderer';
import { GalleryEmbed } from './GalleryEmbed';
import type { GalleryEmbedProps } from './GalleryEmbed';
import 'katex/dist/katex.min.css';

interface MarkdownContentProps {
  markdown: string;
}

type ContentSegment = {
  type: 'html' | 'mermaid' | 'gallery';
  content: string;
  props?: GalleryEmbedProps;
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
 * Splits rendered HTML into segments, extracting gallery-embed divs
 * and mermaid code blocks so they can be rendered as React components.
 */
function extractSegments(html: string): ContentSegment[] {
  // First pass: extract gallery-embed divs
  const galleryRegex = /<div\s+class="gallery-embed"([^>]*)><\/div>/gi;
  const afterGallery: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = galleryRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      afterGallery.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    const attrs = match[1] ?? '';
    const props = parseGalleryAttributes(attrs);
    afterGallery.push({ type: 'gallery', content: '', props });
    lastIndex = galleryRegex.lastIndex;
  }

  if (lastIndex < html.length) {
    afterGallery.push({ type: 'html', content: html.slice(lastIndex) });
  }

  if (afterGallery.length === 0) {
    afterGallery.push({ type: 'html', content: html });
  }

  // Second pass: extract mermaid blocks from remaining html segments
  const result: ContentSegment[] = [];
  const mermaidBlockRegex =
    /<pre\b[^>]*>\s*<code\b[^>]*class=["'][^"']*\blanguage-mermaid\b[^"']*["'][^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi;

  for (const segment of afterGallery) {
    if (segment.type !== 'html') {
      result.push(segment);
      continue;
    }

    let segLastIndex = 0;
    mermaidBlockRegex.lastIndex = 0;

    while ((match = mermaidBlockRegex.exec(segment.content)) !== null) {
      if (match.index > segLastIndex) {
        result.push({ type: 'html', content: segment.content.slice(segLastIndex, match.index) });
      }
      result.push({ type: 'mermaid', content: decodeHtmlEntities(match[1] ?? '') });
      segLastIndex = mermaidBlockRegex.lastIndex;
    }

    if (segLastIndex < segment.content.length) {
      result.push({ type: 'html', content: segment.content.slice(segLastIndex) });
    }
  }

  return result;
}

function parseGalleryAttributes(attrString: string): GalleryEmbedProps {
  const get = (name: string): string | null => {
    const regex = new RegExp(`data-${name}="([^"]*)"`, 'i');
    const m = attrString.match(regex);
    return m ? m[1] : null;
  };

  return {
    albumId: get('album-id') ?? '',
    layout: (get('layout') as GalleryEmbedProps['layout']) || 'grid',
    limit: parseInt(get('limit') ?? '0', 10) || 0,
    showDescription: get('show-description') !== 'false',
    showTitle: get('show-title') !== 'false',
  };
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ markdown }) => {
  const { html, toc, shouldShowToc } = useMemo(
    () => renderMarkdownToHtml(markdown),
    [markdown],
  );

  const segments = useMemo(
    () => (html ? extractSegments(html) : []),
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
        if (segment.type === 'gallery' && segment.props) {
          return <GalleryEmbed key={index} {...segment.props} />;
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
