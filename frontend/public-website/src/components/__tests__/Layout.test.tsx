import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../Layout';
import { PageMeta } from '../PageMeta';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

import type { ReactElement } from 'react';

const renderPageMeta = (ui: ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </HelmetProvider>
  );

const getMetaContent = (selector: string) =>
  document.head.querySelector(selector)?.getAttribute('content');

describe('Layout', () => {
  it('renders semantic landmarks', () => {
    renderWithProviders(
      <HelmetProvider>
        <ThemeProvider>
          <Layout>
            <p>Page content</p>
          </Layout>
        </ThemeProvider>
      </HelmetProvider>
    );

    expect(screen.getByRole('banner').tagName).toBe('HEADER');
    expect(screen.getByRole('navigation', { name: /main navigation/i }).tagName).toBe('NAV');
    expect(screen.getByRole('main').tagName).toBe('MAIN');
    expect(screen.getByRole('contentinfo').tagName).toBe('FOOTER');
  });

  it('includes a skip-to-content link', () => {
    renderWithProviders(
      <HelmetProvider>
        <ThemeProvider>
          <Layout>
            <p>Page content</p>
          </Layout>
        </ThemeProvider>
      </HelmetProvider>
    );

    const link = screen.getByRole('link', { name: /skip to content/i });

    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('#main-content');
  });
});

describe('PageMeta', () => {
  it('renders title with "| Celestium" suffix when title prop is provided', async () => {
    renderPageMeta(<PageMeta title="About" />);

    await waitFor(() => {
      expect(document.title).toBe('About | Celestium');
    });
  });

  it('renders just "Celestium" as title when no title prop is given', async () => {
    renderPageMeta(<PageMeta />);

    await waitFor(() => {
      expect(document.title).toBe('Celestium');
    });
  });

  it('renders meta description', async () => {
    renderPageMeta(<PageMeta description="Custom page description." />);

    await waitFor(() => {
      expect(getMetaContent('meta[name="description"]')).toBe('Custom page description.');
    });
  });

  it('renders Open Graph tags', async () => {
    renderPageMeta(
      <PageMeta
        title="Services"
        description="Open Graph description."
        ogImage="/custom-og-image.png"
        ogUrl="https://celestium.dev/services"
      />
    );

    await waitFor(() => {
      expect(getMetaContent('meta[property="og:title"]')).toBe('Services | Celestium');
    });
    expect(getMetaContent('meta[property="og:description"]')).toBe('Open Graph description.');
    expect(getMetaContent('meta[property="og:image"]')).toBe('/custom-og-image.png');
    expect(getMetaContent('meta[property="og:url"]')).toBe('https://celestium.dev/services');
  });

  it('renders Twitter Card tags', async () => {
    renderPageMeta(
      <PageMeta
        title="Twitter"
        description="Twitter card description."
        ogImage="/twitter-image.png"
        twitterCard="summary"
      />
    );

    await waitFor(() => {
      expect(getMetaContent('meta[name="twitter:card"]')).toBe('summary');
    });
    expect(getMetaContent('meta[name="twitter:title"]')).toBe('Twitter | Celestium');
    expect(getMetaContent('meta[name="twitter:description"]')).toBe('Twitter card description.');
    expect(getMetaContent('meta[name="twitter:image"]')).toBe('/twitter-image.png');
  });
});
