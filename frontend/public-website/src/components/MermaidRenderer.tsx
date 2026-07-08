import mermaid from 'mermaid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FullscreenOverlay } from './FullscreenOverlay';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    background: '#1e293b',
    primaryColor: '#334155',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#475569',
    secondaryColor: '#1e293b',
    secondaryTextColor: '#e2e8f0',
    secondaryBorderColor: '#475569',
    tertiaryColor: '#0f172a',
    tertiaryTextColor: '#e2e8f0',
    tertiaryBorderColor: '#475569',
    lineColor: '#94a3b8',
    textColor: '#e2e8f0',
    mainBkg: '#334155',
    nodeBorder: '#475569',
    clusterBkg: '#1e293b',
    titleColor: '#e2e8f0',
    edgeLabelBackground: '#1e293b',
    nodeTextColor: '#e2e8f0',
  },
  securityLevel: 'loose',
});

interface MermaidRendererProps {
  chart: string;
}

export const MermaidRenderer = ({ chart }: MermaidRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(7)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to render diagram');
          console.error('Mermaid render error:', err);
        }
      }
    };
    if (chart.trim()) {
      renderChart();
    }
    return () => {
      cancelled = true;
    };
  }, [chart]);

  const openExpanded = useCallback(() => setExpanded(true), []);
  const closeExpanded = useCallback(() => setExpanded(false), []);

  const diagram = useMemo(
    () => (
      <div
        ref={containerRef}
        className="relative group my-6 flex justify-center overflow-x-auto cursor-zoom-in"
        role="button"
        tabIndex={0}
        aria-label="Expand diagram"
        onClick={openExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openExpanded();
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="pointer-events-none absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-200/70">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H3v5" />
            <path d="M3 3l7 7" />
            <path d="M16 3h5v5" />
            <path d="M21 3l-7 7" />
            <path d="M8 21H3v-5" />
            <path d="M3 21l7-7" />
            <path d="M16 21h5v-5" />
            <path d="M21 21l-7-7" />
          </svg>
        </div>
      </div>
    ),
    [openExpanded, svg]
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
        <p className="text-red-600 text-sm">{error}</p>
        <pre className="text-xs text-red-400 mt-2 overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <>
      {diagram}

      {expanded && (
        <FullscreenOverlay onClose={closeExpanded}>
          <div className="bg-slate-800 rounded-lg p-8">
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </FullscreenOverlay>
      )}
    </>
  );
};
