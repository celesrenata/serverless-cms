import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeWordPressContent } from '../utils/sanitizeContent';
import { FullscreenOverlay } from './FullscreenOverlay';
import { MermaidRenderer } from './MermaidRenderer';
import { MarkdownContent } from './MarkdownContent';
import { GalleryEmbed } from './GalleryEmbed';
import type { GalleryEmbedProps } from './GalleryEmbed';

interface BlogContentProps {
  html: string;
  contentMarkdown?: string;
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

function ExpandableHtmlSegment({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const closeImage = useCallback(() => setExpandedImage(null), []);
  const closeCode = useCallback(() => setExpandedCode(null), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const imgEls = Array.from(container.querySelectorAll('img'));
    const preEls = Array.from(container.querySelectorAll('pre'));

    const imgHandlers = new Map<HTMLImageElement, EventListener>();

    imgEls.forEach((img) => {
      img.classList.add('cursor-zoom-in');

      const handler: EventListener = () => {
        if (img.src) setExpandedImage(img.src);
      };

      img.addEventListener('click', handler);
      imgHandlers.set(img, handler);
    });

    const addedWrappers: HTMLDivElement[] = [];
    const expandButtonHandlers = new Map<HTMLButtonElement, EventListener>();

    preEls.forEach((pre) => {
      const parent = pre.parentElement;
      if (!parent) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'relative group';

      parent.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Expand';
      btn.setAttribute('aria-label', 'Expand code block');
      btn.className =
        'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white rounded px-2 py-1 text-xs';

      const onExpand: EventListener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setExpandedCode(pre.outerHTML);
      };

      btn.addEventListener('click', onExpand);
      expandButtonHandlers.set(btn, onExpand);

      wrapper.appendChild(btn);
      addedWrappers.push(wrapper);
    });

    return () => {
      imgHandlers.forEach((handler, img) => {
        img.removeEventListener('click', handler);
      });

      expandButtonHandlers.forEach((handler, btn) => {
        btn.removeEventListener('click', handler);
      });

      addedWrappers.forEach((wrapper) => {
        const pre = wrapper.querySelector('pre');
        const parent = wrapper.parentElement;
        if (pre && parent) {
          parent.insertBefore(pre, wrapper);
        }
        wrapper.remove();
      });
    };
  }, [html]);

  return (
    <>
      <div
        ref={containerRef}
        className="wp-content prose prose-slate prose-lg max-w-none prose-img:rounded-lg prose-img:mx-auto prose-img:max-w-full prose-pre:max-w-full prose-pre:overflow-x-auto prose-a:break-words"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {expandedImage && (
        <FullscreenOverlay onClose={closeImage}>
          <img
            src={expandedImage}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          />
        </FullscreenOverlay>
      )}

      {expandedCode && (
        <FullscreenOverlay onClose={closeCode}>
          <div
            className="bg-slate-900 rounded-lg p-4 max-w-[95vw] max-h-[90vh] overflow-auto text-sm"
            dangerouslySetInnerHTML={{ __html: expandedCode }}
          />
        </FullscreenOverlay>
      )}
    </>
  );
}

export const BlogContent = ({ html, contentMarkdown }: BlogContentProps) => {
  // Rendering path selection: if content_markdown is non-empty, use markdown renderer
  if (contentMarkdown && contentMarkdown.trim().length > 0) {
    return <MarkdownBlogContent markdown={contentMarkdown} />;
  }

  return <HtmlBlogContent html={html} />;
};

/**
 * Renders markdown content through the MarkdownContent pipeline,
 * then extracts and renders Mermaid diagrams from the HTML output.
 */
function MarkdownBlogContent({ markdown }: { markdown: string }) {
  return <MarkdownContent markdown={markdown} />;
}

/**
 * Parse gallery directive attributes from the raw attribute string.
 */
function parseGalleryDirectiveAttrs(raw: string | undefined): Omit<GalleryEmbedProps, 'albumId'> {
  const defaults: Omit<GalleryEmbedProps, 'albumId'> = {
    layout: 'grid',
    limit: 0,
    showDescription: true,
    showTitle: true,
  };
  if (!raw) return defaults;

  const pairs = raw.trim().split(/\s+/);
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    switch (key) {
      case 'layout':
        if (['grid', 'carousel', 'masonry'].includes(value))
          defaults.layout = value as 'grid' | 'carousel' | 'masonry';
        break;
      case 'limit': {
        const n = parseInt(value, 10);
        if (!isNaN(n) && n >= 0) defaults.limit = n;
        break;
      }
      case 'showDescription':
        defaults.showDescription = value !== 'false';
        break;
      case 'showTitle':
        defaults.showTitle = value !== 'false';
        break;
    }
  }
  return defaults;
}

/**
 * Existing HTML rendering path with Mermaid and Gallery support.
 */
function HtmlBlogContent({ html }: { html: string }) {
  const sanitizedHtml = useMemo(() => sanitizeWordPressContent(html), [html]);

  const segments = useMemo<ContentSegment[]>(() => {
    // First pass: extract gallery directives from <p>::gallery[...]</p>
    const galleryRegex = /<p>\s*::gallery\[([a-zA-Z0-9-]+)\](?:\{([^}]*)\})?\s*<\/p>/gi;
    const intermediateSegments: ContentSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = galleryRegex.exec(sanitizedHtml)) !== null) {
      if (match.index > lastIndex) {
        intermediateSegments.push({ type: 'html', content: sanitizedHtml.slice(lastIndex, match.index) });
      }
      const albumId = match[1];
      const attrs = parseGalleryDirectiveAttrs(match[2]);
      intermediateSegments.push({
        type: 'gallery',
        content: '',
        props: { albumId, ...attrs },
      });
      lastIndex = galleryRegex.lastIndex;
    }

    if (lastIndex < sanitizedHtml.length) {
      intermediateSegments.push({ type: 'html', content: sanitizedHtml.slice(lastIndex) });
    }

    // Second pass: extract mermaid blocks from remaining HTML segments
    const mermaidBlockRegex =
      /<pre\b[^>]*>\s*<code\b[^>]*class=["'][^"']*\blanguage-mermaid\b[^"']*["'][^>]*>([\s\S]*?)<\/code>\s*<\/pre>|<div\b[^>]*class=["'][^"']*\bmermaid\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;

    const result: ContentSegment[] = [];

    for (const seg of intermediateSegments) {
      if (seg.type !== 'html') {
        result.push(seg);
        continue;
      }

      let segLastIndex = 0;
      mermaidBlockRegex.lastIndex = 0;

      while ((match = mermaidBlockRegex.exec(seg.content)) !== null) {
        if (match.index > segLastIndex) {
          result.push({ type: 'html', content: seg.content.slice(segLastIndex, match.index) });
        }
        result.push({ type: 'mermaid', content: decodeHtmlEntities(match[1] ?? match[2] ?? '') });
        segLastIndex = mermaidBlockRegex.lastIndex;
      }

      if (segLastIndex < seg.content.length) {
        result.push({ type: 'html', content: seg.content.slice(segLastIndex) });
      }
    }

    return result;
  }, [sanitizedHtml]);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'gallery' && segment.props) {
          return <GalleryEmbed key={index} {...segment.props} />;
        }
        if (segment.type === 'mermaid') {
          return <MermaidRenderer key={index} chart={segment.content} />;
        }
        return <ExpandableHtmlSegment key={index} html={segment.content} />;
      })}
    </>
  );
}
