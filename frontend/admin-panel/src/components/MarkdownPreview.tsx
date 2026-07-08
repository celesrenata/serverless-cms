import { useState, useEffect, useRef } from 'react';
import { renderMarkdownToHtml } from '../../../shared/markdown';
import type { TocItem, MarkdownRenderResult } from '../../../shared/markdown';
import 'katex/dist/katex.min.css';

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

const DEBOUNCE_MS = 300;

const emptyResult: MarkdownRenderResult = {
  html: '',
  toc: [],
  shouldShowToc: false,
  warnings: [],
};

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

      <div
        className="prose prose-sm max-w-none prose-headings:scroll-mt-4 prose-code:before:content-none prose-code:after:content-none"
        dangerouslySetInnerHTML={{ __html: result.html }}
      />
    </div>
  );
};
