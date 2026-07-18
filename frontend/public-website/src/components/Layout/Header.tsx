import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { fetchSectionTree } from '../../services/sectionService';
import type { SectionTreeNode } from '../../../../shared/sections/types';

export const Header: React.FC = () => {
  const { data: settings } = useSiteSettings();
  const [sections, setSections] = useState<SectionTreeNode[]>([]);

  useEffect(() => {
    fetchSectionTree()
      .then((data) => {
        // Safety: API may return { items: [...] } or raw array
        const tree = Array.isArray(data) ? data : ((data as unknown as { items: SectionTreeNode[] }).items || []);
        setSections(tree);
      })
      .catch(() => setSections([]));
  }, []);

  return (
    <header className="bg-white shadow-sm">
      <nav aria-label="Main navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded">
              {settings?.site_title || 'My Website'}
            </Link>
          </div>
          
          <div className="hidden md:flex space-x-8">
            <Link
              to="/"
              className="text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-3 py-2 text-sm font-medium"
            >
              Home
            </Link>
            <Link
              to="/blog"
              className="text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-3 py-2 text-sm font-medium"
            >
              Blog
            </Link>
            {sections
              .filter((s) => s.depth === 1 || String(s.depth) === '1')
              .map((section) => (
              <Link
                key={section.id}
                to={`/blog/sections/${section.path}`}
                className="text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-3 py-2 text-sm font-medium"
              >
                {section.name}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-2"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};
