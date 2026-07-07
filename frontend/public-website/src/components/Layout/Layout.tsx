import React, { lazy, Suspense } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { PageMeta } from '../PageMeta';
import { CustomCSSPreviewIndicator } from '../CustomCSSPreviewIndicator';

// Lazy-loaded components (Req 13.3: non-critical sections via dynamic imports)
const ThemePanel = lazy(() => import('../ThemePanel/ThemePanel'));
const CommandPalette = lazy(() => import('../CommandPalette/CommandPalette'));

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <PageMeta />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="flex-grow">
        {children}
      </main>
      <Footer />
      <CustomCSSPreviewIndicator />
      <Suspense fallback={null}>
        <ThemePanel />
      </Suspense>
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
    </div>
  );
};
