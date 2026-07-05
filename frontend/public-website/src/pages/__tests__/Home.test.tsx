import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockContent, createMockSettings } from '../../test/mocks/data';
import { Content, PaginatedResponse } from '../../types';

vi.mock('../../services/api', () => ({
  api: {
    listContent: vi.fn(),
    getPublicSettings: vi.fn(),
  },
}));

import { api } from '../../services/api';
import { Home } from '../Home';

const mockPosts: PaginatedResponse<Content> = {
  items: [
    createMockContent({ id: 'post-1', title: 'Featured Post 1', slug: 'featured-1', excerpt: 'First featured post excerpt' }),
    createMockContent({ id: 'post-2', title: 'Featured Post 2', slug: 'featured-2', excerpt: 'Second featured post excerpt' }),
    createMockContent({ id: 'post-3', title: 'Featured Post 3', slug: 'featured-3', excerpt: 'Third featured post excerpt' }),
  ],
};

const mockProjects: PaginatedResponse<Content> = {
  items: [
    createMockContent({ id: 'proj-1', type: 'project', title: 'Project Alpha', slug: 'project-alpha', excerpt: 'Alpha project description' }),
  ],
};

const mockGallery: PaginatedResponse<Content> = {
  items: [
    createMockContent({ id: 'gallery-1', type: 'gallery', title: 'Gallery Item', slug: 'gallery-item', featured_image: 'https://example.com/gallery.jpg' }),
  ],
};

const mockSettings = createMockSettings({
  site_title: 'My Awesome Site',
  site_description: 'Welcome to the best CMS',
});

function renderHome() {
  return renderWithProviders(
    <HelmetProvider>
      <Home />
    </HelmetProvider>
  );
}

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.getPublicSettings).mockResolvedValue(mockSettings);
    vi.mocked(api.listContent).mockImplementation((filters: any) => {
      if (filters?.type === 'post') return Promise.resolve(mockPosts);
      if (filters?.type === 'project') return Promise.resolve(mockProjects);
      if (filters?.type === 'gallery') return Promise.resolve(mockGallery);
      return Promise.resolve({ items: [] });
    });
  });

  it('renders page heading with site title', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'My Awesome Site' })).toBeInTheDocument();
    });
  });

  it('renders site description', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Welcome to the best CMS')).toBeInTheDocument();
    });
  });

  it('renders Explore Blog link', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /explore blog/i })).toBeInTheDocument();
    });
  });

  it('shows featured posts after data loads', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Featured Post 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Featured Post 2')).toBeInTheDocument();
    expect(screen.getByText('Featured Post 3')).toBeInTheDocument();
    expect(screen.getByText('First featured post excerpt')).toBeInTheDocument();
  });

  it('shows Recent Posts section heading', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Recent Posts' })).toBeInTheDocument();
    });
  });

  it('shows recent projects after data loads', async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    expect(screen.getByText('Alpha project description')).toBeInTheDocument();
  });

  it('renders fallback text when settings are not loaded yet', () => {
    vi.mocked(api.getPublicSettings).mockResolvedValue(undefined as any);
    vi.mocked(api.listContent).mockResolvedValue({ items: [] });

    renderHome();

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome' })).toBeInTheDocument();
  });
});
