import { useEffect, useId, useRef, useState } from 'react';
import type { ArchEdge, ArchNode, NodeType } from './data';

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 600;

const NODE_WIDTH = 144;
const NODE_HEIGHT = 78;

export type ExplanationMode = 'simple' | 'technical';

export interface ArchitectureMapProps {
  nodes: readonly ArchNode[];
  edges: readonly ArchEdge[];
  className?: string;
  title?: string;
  description?: string;
}

interface SvgPoint {
  x: number;
  y: number;
}

function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function toSvgPoint(node: ArchNode): SvgPoint {
  return {
    x: (clampPercentage(node.x) / 100) * VIEWBOX_WIDTH,
    y: (clampPercentage(node.y) / 100) * VIEWBOX_HEIGHT,
  };
}

function getBoundaryPoint(from: SvgPoint, to: SvgPoint): SvgPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 0 && dy === 0) {
    return from;
  }

  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : NODE_WIDTH / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : NODE_HEIGHT / 2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY, 1);

  return {
    x: from.x + dx * scale,
    y: from.y + dy * scale,
  };
}

function getEdgeClassName(style: ArchEdge['style']): string {
  const base = 'architecture-map__edge';

  if (style === 'animated') {
    return `${base} architecture-map__edge--animated`;
  }

  if (style === 'dashed') {
    return `${base} architecture-map__edge--dashed`;
  }

  return base;
}

function splitLabel(label: string): string[] {
  if (label.length <= 16) {
    return [label];
  }

  const words = label.split(/\s+/);

  if (words.length === 1) {
    return [label];
  }

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > 16 && current && lines.length === 0) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 2);
}

function NodeIcon({ type }: { type: NodeType }) {
  const common = {
    fill: 'none',
    stroke: 'rgb(var(--color-primary))',
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  };

  switch (type) {
    case 'client':
      return (
        <g aria-hidden="true" {...common}>
          <rect x={-18} y={-16} width={36} height={24} rx={3} />
          <path d="M-7 15h14M0 8v7" />
        </g>
      );

    case 'cdn':
      return (
        <g aria-hidden="true" {...common}>
          <circle cx={0} cy={-14} r={6} />
          <circle cx={-18} cy={10} r={6} />
          <circle cx={18} cy={10} r={6} />
          <path d="M-4 -9-14 5M4 -9l10 14M-12 10h24" />
        </g>
      );

    case 'api-gateway':
      return (
        <g aria-hidden="true" {...common}>
          <circle cx={0} cy={0} r={7} />
          <path d="M0 -18v11M0 7v11M-18 0h11M7 0h11" />
          <circle cx={0} cy={-22} r={3} fill="rgb(var(--color-primary))" stroke="none" />
          <circle cx={0} cy={22} r={3} fill="rgb(var(--color-primary))" stroke="none" />
          <circle cx={-22} cy={0} r={3} fill="rgb(var(--color-primary))" stroke="none" />
          <circle cx={22} cy={0} r={3} fill="rgb(var(--color-primary))" stroke="none" />
        </g>
      );

    case 'lambda':
      return (
        <g aria-hidden="true">
          <text
            x={0}
            y={10}
            textAnchor="middle"
            fontSize={34}
            fontWeight={700}
            fill="rgb(var(--color-primary))"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            λ
          </text>
        </g>
      );

    case 'database':
      return (
        <g aria-hidden="true" {...common}>
          <ellipse cx={0} cy={-12} rx={20} ry={7} />
          <path d="M-20-12v24c0 4 9 7 20 7s20-3 20-7v-24" />
          <path d="M-20 0c0 4 9 7 20 7s20-3 20-7" />
        </g>
      );

    case 'storage':
      return (
        <g aria-hidden="true" {...common}>
          <path d="M-22-14h14l5 6h25v22a5 5 0 0 1-5 5h-34a5 5 0 0 1-5-5z" />
          <path d="M-22-4h44" />
        </g>
      );

    case 'auth':
      return (
        <g aria-hidden="true" {...common}>
          <path d="M0-22 18-14v12c0 13-8 21-18 25-10-4-18-12-18-25v-12z" />
          <circle cx={0} cy={0} r={5} />
          <path d="M0 5v8" />
        </g>
      );

    case 'monitoring':
      return (
        <g aria-hidden="true" {...common}>
          <rect x={-22} y={-18} width={44} height={36} rx={5} />
          <path d="M-15 4h8l5-12 8 20 5-8h10" />
        </g>
      );

    case 'ci-cd':
      return (
        <g aria-hidden="true" {...common}>
          <path d="M15-11A19 19 0 0 0-17-5" />
          <path d="M-15 11A19 19 0 0 0 17 5" />
          <path d="M-17-15v10h10M17 15V5H7" />
        </g>
      );

    default:
      return (
        <g aria-hidden="true" {...common}>
          <circle cx={0} cy={0} r={18} />
        </g>
      );
  }
}

interface ArchitectureNodeProps {
  node: ArchNode;
  isActive: boolean;
  description: string;
  onActivate: (nodeId: string) => void;
  onDeactivate: () => void;
  onToggle: (nodeId: string) => void;
  onArrowNav: (nodeId: string, direction: 1 | -1) => void;
}

function ArchitectureNode({
  node,
  isActive,
  description,
  onActivate,
  onDeactivate,
  onToggle,
  onArrowNav,
}: ArchitectureNodeProps) {
  const point = toSvgPoint(node);
  const labelLines = splitLabel(node.label);
  const firstLineY = labelLines.length === 1 ? 28 : 20;

  const handlePointerEnter = (event: React.PointerEvent<SVGGElement>) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      onActivate(node.id);
    }
  };

  const handlePointerLeave = (event: React.PointerEvent<SVGGElement>) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      onDeactivate();
    }
  };

  const handleClick = () => {
    onToggle(node.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(node.id);
    }
    if (event.key === 'Escape') {
      onDeactivate();
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      onArrowNav(node.id, 1);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      onArrowNav(node.id, -1);
    }
  };

  const handleFocus = () => {
    onActivate(node.id);
  };

  const handleBlur = () => {
    onDeactivate();
  };

  return (
    <g
      transform={`translate(${point.x} ${point.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${node.label}. ${description}`}
      aria-describedby={isActive ? `architecture-tooltip-${node.id}` : undefined}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{ cursor: 'pointer', outline: 'none' }}
      data-node-id={node.id}
    >
      <rect
        x={-NODE_WIDTH / 2}
        y={-NODE_HEIGHT / 2}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={16}
        fill="rgb(var(--color-surface))"
        stroke={isActive ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border))'}
        strokeWidth={isActive ? 2.5 : 1.5}
        vectorEffect="non-scaling-stroke"
      />

      <rect
        x={-NODE_WIDTH / 2 + 1}
        y={-NODE_HEIGHT / 2 + 1}
        width={NODE_WIDTH - 2}
        height={30}
        rx={15}
        fill="rgb(var(--color-primary) / 0.08)"
      />

      <g transform="translate(0 -11)">
        <NodeIcon type={node.type} />
      </g>

      <text
        textAnchor="middle"
        fill="rgb(var(--color-text))"
        fontSize={13}
        fontWeight={600}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {labelLines.map((line, index) => (
          <tspan key={line} x={0} y={firstLineY + index * 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function ArchitectureMap({
  nodes,
  edges,
  className = '',
  title = 'Architecture map',
  description,
}: ArchitectureMapProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `architecture-map-${reactId}-title`;
  const descId = `architecture-map-${reactId}-desc`;
  const arrowId = `architecture-map-${reactId}-arrow`;
  const primaryArrowId = `architecture-map-${reactId}-primary-arrow`;

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [mode, setMode] = useState<ExplanationMode>('simple');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const activeNode = activeNodeId ? nodesById.get(activeNodeId) ?? null : null;

  // Dismiss tooltip on click outside the component
  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setActiveNodeId(null);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, []);

  const getDescription = (node: ArchNode): string => {
    return mode === 'technical' ? node.descriptionTechnical : node.descriptionSimple;
  };

  const handleNodeActivate = (nodeId: string) => {
    setActiveNodeId(nodeId);
  };

  const handleNodeDeactivate = () => {
    setActiveNodeId(null);
  };

  const handleNodeToggle = (nodeId: string) => {
    setActiveNodeId((current) => (current === nodeId ? null : nodeId));
  };

  const handleArrowNav = (nodeId: string, direction: 1 | -1) => {
    const currentIndex = nodes.findIndex((n) => n.id === nodeId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + direction + nodes.length) % nodes.length;
    const nextNode = nodes[nextIndex];
    const el = svgRef.current?.querySelector<SVGGElement>(`[data-node-id="${nextNode.id}"]`);
    el?.focus();
  };

  const svgDescription =
    description ??
    `Architecture diagram containing ${nodes.length} nodes and ${edges.length} connections.`;

  return (
    <div className={className} ref={wrapperRef}>
      {/* Mode toggle - outside scrollable area */}
      <div
        className="flex items-center gap-2 mb-3"
        role="group"
        aria-label="Explanation mode"
      >
        <span className="text-sm font-medium text-theme-text-muted mr-1">Mode:</span>
        <button
          type="button"
          aria-pressed={mode === 'simple'}
          onClick={() => setMode('simple')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
            mode === 'simple'
              ? 'bg-theme-primary text-theme-text-inverse border-transparent'
              : 'bg-theme-surface text-theme-text border-theme-border hover:bg-theme-surface-alt'
          } focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2`}
        >
          Non-Technical
        </button>
        <button
          type="button"
          aria-pressed={mode === 'technical'}
          onClick={() => setMode('technical')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
            mode === 'technical'
              ? 'bg-theme-primary text-theme-text-inverse border-transparent'
              : 'bg-theme-surface text-theme-text border-theme-border hover:bg-theme-surface-alt'
          } focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2`}
        >
          Technical
        </button>
      </div>

      {/* SVG map with tooltip overlay */}
      <div className="w-full overflow-x-auto relative">
        <svg
          ref={svgRef}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          focusable="false"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          width="100%"
          height="auto"
          style={{ minWidth: 768 }}
          xmlns="http://www.w3.org/2000/svg"
          className="block"
        >
          <title id={titleId}>{title}</title>
          <desc id={descId}>{svgDescription}</desc>

          <style>
            {`
              .architecture-map__edge {
                fill: none;
                stroke-linecap: round;
                stroke-linejoin: round;
              }

              .architecture-map__edge--dashed {
                stroke-dasharray: 6 4;
              }

              .architecture-map__edge--animated {
                stroke-dasharray: 10 6;
                animation: architecture-map-dash 1.4s linear infinite;
              }

              @keyframes architecture-map-dash {
                to {
                  stroke-dashoffset: -32;
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .architecture-map__edge--animated {
                  animation: none;
                }
              }
            `}
          </style>

          <defs>
            <marker
              id={arrowId}
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={8}
              markerHeight={8}
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--color-border))" />
            </marker>

            <marker
              id={primaryArrowId}
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={8}
              markerHeight={8}
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--color-primary))" />
            </marker>
          </defs>

          <rect
            x={0}
            y={0}
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            rx={24}
            fill="rgb(var(--color-surface))"
            stroke="rgb(var(--color-border))"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          <g aria-hidden="true">
            {edges.map((edge) => {
              const fromNode = nodesById.get(edge.from);
              const toNode = nodesById.get(edge.to);

              if (!fromNode || !toNode) {
                return null;
              }

              const fromCenter = toSvgPoint(fromNode);
              const toCenter = toSvgPoint(toNode);

              const start = getBoundaryPoint(fromCenter, toCenter);
              const end = getBoundaryPoint(toCenter, fromCenter);

              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;

              const isAnimated = edge.style === 'animated';
              const edgeLabelWidth = edge.label ? Math.max(54, edge.label.length * 7 + 20) : 0;

              return (
                <g key={edge.id}>
                  <path
                    d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                    className={getEdgeClassName(edge.style)}
                    stroke={isAnimated ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border))'}
                    strokeWidth={2}
                    markerEnd={`url(#${isAnimated ? primaryArrowId : arrowId})`}
                    vectorEffect="non-scaling-stroke"
                  />

                  {edge.label ? (
                    <g>
                      <rect
                        x={midX - edgeLabelWidth / 2}
                        y={midY - 13}
                        width={edgeLabelWidth}
                        height={26}
                        rx={13}
                        fill="rgb(var(--color-surface))"
                        stroke="rgb(var(--color-border))"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />
                      <text
                        x={midX}
                        y={midY + 4}
                        textAnchor="middle"
                        fill="rgb(var(--color-text))"
                        fontSize={11}
                        fontWeight={500}
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                      >
                        {edge.label}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </g>

          <g>
            {nodes.map((node) => (
              <ArchitectureNode
                key={node.id}
                node={node}
                isActive={activeNodeId === node.id}
                description={getDescription(node)}
                onActivate={handleNodeActivate}
                onDeactivate={handleNodeDeactivate}
                onToggle={handleNodeToggle}
                onArrowNav={handleArrowNav}
              />
            ))}
          </g>
        </svg>

        {/* HTML tooltip positioned over the SVG */}
        {activeNode && (
          <div
            id={`architecture-tooltip-${activeNode.id}`}
            role="tooltip"
            className="absolute z-10 pointer-events-none max-w-[280px] px-3 py-2.5 rounded-lg bg-theme-surface-alt border border-theme-border shadow-lg text-sm text-theme-text"
            style={{
              left: `${activeNode.x}%`,
              top: `${activeNode.y}%`,
              transform: 'translate(-50%, calc(-100% - 48px))',
            }}
          >
            <p className="font-semibold text-theme-text mb-1">{activeNode.label}</p>
            <p className="text-theme-text-muted leading-relaxed">{getDescription(activeNode)}</p>
          </div>
        )}
      </div>

      {/* Screen reader text fallback */}
      <section className="sr-only" aria-label="Architecture map node descriptions">
        <h3>Architecture map descriptions ({mode === 'technical' ? 'Technical' : 'Non-Technical'} mode)</h3>
        <ul>
          {nodes.map((node) => (
            <li key={node.id}>
              <strong>{node.label}</strong>: {getDescription(node)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default ArchitectureMap;
