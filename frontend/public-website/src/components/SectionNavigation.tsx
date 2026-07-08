import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SectionTreeNode } from '../../../shared/sections/types';
import { fetchSectionTree } from '../services/sectionService';

interface SectionNavItemProps {
  node: SectionTreeNode;
  level: number;
  activePath: string;
}

const LEVEL_PADDING: Record<number, string> = {
  0: 'pl-0',
  1: 'pl-4',
  2: 'pl-8',
  3: 'pl-12',
};

function sortAlphabetically(nodes: SectionTreeNode[]): SectionTreeNode[] {
  return [...nodes].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

const SectionNavItem: React.FC<SectionNavItemProps> = ({ node, level, activePath }) => {
  const sectionUrl = `/blog/sections/${node.path}`;
  const isActive = activePath === sectionUrl;
  const sortedChildren = useMemo(() => sortAlphabetically(node.children), [node.children]);

  // Only render up to 4 levels deep (0-indexed: levels 0, 1, 2, 3)
  if (level > 3) return null;

  return (
    <li>
      <Link
        to={sectionUrl}
        className={`block py-1.5 px-2 rounded text-sm transition-colors ${LEVEL_PADDING[level] || 'pl-12'} ${
          isActive
            ? 'font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {node.name}
      </Link>
      {sortedChildren.length > 0 && level < 3 && (
        <ul role="group" aria-label={`Subsections of ${node.name}`}>
          {sortedChildren.map((child) => (
            <SectionNavItem
              key={child.id}
              node={child}
              level={level + 1}
              activePath={activePath}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export interface SectionNavigationProps {
  tree?: SectionTreeNode[];
}

export const SectionNavigation: React.FC<SectionNavigationProps> = ({ tree: treeProp }) => {
  const [tree, setTree] = useState<SectionTreeNode[]>(treeProp || []);
  const [loading, setLoading] = useState(!treeProp);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (treeProp) {
      setTree(treeProp);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTree() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSectionTree();
        if (!cancelled) {
          setTree(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load sections');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTree();

    return () => {
      cancelled = true;
    };
  }, [treeProp]);

  const sortedTree = useMemo(() => sortAlphabetically(tree), [tree]);

  if (loading) {
    return (
      <nav aria-label="Blog sections" className="py-2">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 ml-4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        </div>
      </nav>
    );
  }

  if (error) {
    return (
      <nav aria-label="Blog sections" className="py-2">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </nav>
    );
  }

  if (sortedTree.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Blog sections" className="py-2">
      <ul role="tree" aria-label="Section hierarchy">
        {sortedTree.map((node) => (
          <SectionNavItem
            key={node.id}
            node={node}
            level={0}
            activePath={location.pathname}
          />
        ))}
      </ul>
    </nav>
  );
};
