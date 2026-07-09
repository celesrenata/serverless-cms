import { useState, useEffect, useRef, useMemo } from 'react';
import { renderMarkdownToHtml } from '../../../shared/markdown';
import type { TocItem, MarkdownRenderResult } from '../../../shared/markdown';
import { GalleryEmbedPreview } from './Editor/GalleryEmbedPreview';
import 'katex/dist/katex.min.css';

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

interface GalleryProps {
  albumId: string;
  layout: string;
  limit: string;
  showDescription: string;
  showTitle: string;
}

type PreviewSegment = {
  type: 'html' | 'gallery';
  content: string;
  props?: GalleryProps;
};

const DEBOUNCE_MS = 300;

const emptyResult: MarkdownRenderResult = {
  html: '',
  toc: [],
  shouldShowToc: false,
  warnings: [],
};

function parseDataAttributes(attrString: string): GalleryProps {
  const getAttr = (name: string, defaultValue: string): string => {
    const regex = new RegExp(`data-${name}=["']([^"']*)["']`);
    const match = attrString.match(regex);
    return match ? match[1] : defaultValue;
  };

  return {
    albumId: getAttr('album-id', ''),
    layout: getAttr('layout', 'grid'),
    limit: getAttr('limit', '0'),
    showDescription: getAttr('show-description', 'true'),
    showTitle: getAttr('show-title', 'true'),
  };
}

function extractGallerySegments(html: string): PreviewSegment[] {
  const galleryDivRegex = /<div class="gallery-embed"([^>]*)><\/div>/gi;

  const result: PreviewSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = galleryDivRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    const props = parseDataAttributes(match[1] ?? '');
    result.push({ type: 'gallery', content: '', props });
    lastIndex = galleryDivRegex.lastIndex;
  }

  if (lastIndex < html.length) {
    result.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return result;
}

function TocList({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-none pl-4 space-y-1">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
          >
            {item.text}
          </a>
          {item.children.length > 0 && <TocList items={item.children} />}
        </li>
      ))}
    </ul>
  );
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  markdown,
  className = '',
}) => {
  const [result, setResult] = useState<MarkdownRenderResult>(emptyResult);
  const [isRendering, setIsRendering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsRendering(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      if (!markdown || markdown.trim().length === 0) {
        setResult(emptyResult);
      } else {
        const rendered = renderMarkdownToHtml(markdown);
        setResult(rendered);
      }
      setIsRendering(false);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [markdown]);

  const segments = useMemo(
    () => (result.html ? extractGallerySegments(result.html) : []),
    [result.html],
  );

  if (!markdown || markdown.trim().length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-400 italic ${className}`}>
        Start typing to see a preview...
      </div>
    );
  }

  return (
    <div className={`overflow-auto ${className}`}>
      {isRendering && (
        <div className="text-xs text-gray-400 mb-2 animate-pulse">Rendering...</div>
      )}

      {result.shouldShowToc && (
        <nav className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Table of Contents</h4>
          <TocList items={result.toc} />
        </nav>
      )}

      <div className="prose prose-sm max-w-none prose-headings:scroll-mt-4 prose-code:before:content-none prose-code:after:content-none">
        {segments.map((segment, index) => {
          if (segment.type === 'gallery' && segment.props) {
            return <GalleryEmbedPreview key={index} {...segment.props} />;
          }
          return (
            <div
              key={index}
              dangerouslySetInnerHTML={{ __html: segment.content }}
            />
          );
        })}
      </div>
    </div>
  );
};
