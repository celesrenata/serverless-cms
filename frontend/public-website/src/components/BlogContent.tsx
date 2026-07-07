import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeWordPressContent } from '../utils/sanitizeContent';
import { FullscreenOverlay } from './FullscreenOverlay';
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
        result.push({ type: 'html', content: sanitizedHtml.slice(lastIndex, match.index) });
      }
      result.push({ type: 'mermaid', content: decodeHtmlEntities(match[1] ?? match[2] ?? '') });
      lastIndex = mermaidBlockRegex.lastIndex;
    }

    if (lastIndex < sanitizedHtml.length) {
      result.push({ type: 'html', content: sanitizedHtml.slice(lastIndex) });
    }

    return result;
  }, [sanitizedHtml]);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'mermaid') {
          return <MermaidRenderer key={index} chart={segment.content} />;
        }
        return <ExpandableHtmlSegment key={index} html={segment.content} />;
      })}
    </>
  );
};
