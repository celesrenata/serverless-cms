import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GalleryEmbedPreview } from '../GalleryEmbedPreview';
import { api } from '../../../services/api';
import type { Content } from '../../../types';

vi.mock('../../../services/api', () => ({
  api: {
    getContentBySlug: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const defaultProps = {
  albumId: 'my-album',
  layout: 'grid',
  limit: '0',
  showDescription: 'true',
  showTitle: 'true',
};

const mockAlbum: Content = {
  id: 'album-123',
  type: 'gallery',
  title: 'Summer Photos',
  slug: 'summer-photos',
  content: 'A collection of summer memories',
  excerpt: '',
  author: 'user-1',
  status: 'published',
  featured_image: 'https://cdn.example.com/cover.jpg',
  metadata: {
    media: [
      { id: 'img-1', filename: 'beach.jpg' },
      { id: 'img-2', filename: 'sunset.jpg' },
      { id: 'img-3', filename: 'pool.jpg' },
    ],
  } as Content['metadata'],
  created_at: 1700000000,
  updated_at: 1700001000,
};

describe('GalleryEmbedPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton loading state while fetching album metadata', () => {
    vi.mocked(api.getContentBySlug).mockReturnValue(
      new Promise(() => {}) as Promise<Content>
    );

    const { container } = render(
      <GalleryEmbedPreview {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    // Should show the loading skeleton with animate-pulse
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows "Album not found" error state when API returns error', async () => {
    vi.mocked(api.getContentBySlug).mockRejectedValue(new Error('Not found'));

    render(
      <GalleryEmbedPreview {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    const errorText = await screen.findByText(/Album not found/);
    expect(errorText).toBeInTheDocument();

    // Should show the album ID in the error message
    expect(screen.getByText('my-album')).toBeInTheDocument();
  });

  it('shows album title, image count, and layout badge on success', async () => {
    vi.mocked(api.getContentBySlug).mockResolvedValue(mockAlbum);

    render(
      <GalleryEmbedPreview {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    // Album title
    expect(await screen.findByText('Summer Photos')).toBeInTheDocument();

    // Image count (3 images)
    expect(screen.getByText('3 images')).toBeInTheDocument();

    // Layout badge (grid → "Grid")
    expect(screen.getByText('Grid')).toBeInTheDocument();
  });

  it('shows cover image thumbnail when featured_image is available', async () => {
    vi.mocked(api.getContentBySlug).mockResolvedValue(mockAlbum);

    render(
      <GalleryEmbedPreview {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/cover.jpg');
    expect(img).toHaveAttribute('alt', 'Summer Photos');
  });
});
