import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { GalleryEmbed } from '../GalleryEmbed';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import type { Content, Media } from '../../types';

vi.mock('../../services/api', () => ({
  api: { getContentBySlug: vi.fn() },
}));

// --- Property Tests ---

describe('GalleryEmbed Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 7: Image Limit Invariant', () => {
    // **Validates: Requirements 6.6, 6.7, 6.8**
    it('renders at most min(L, N) images and shows "View all" iff N > L', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // N: number of images
          fc.integer({ min: 1, max: 15 }), // L: limit
          fc.constantFrom('grid' as const, 'carousel' as const, 'masonry' as const),
          async (n, limit, layout) => {
            const mediaItems: Media[] = Array.from({ length: n }, (_, i) => ({
              id: `media-${i}`,
              filename: `image-${i}.jpg`,
              s3_key: `uploads/image-${i}.jpg`,
              s3_url: `https://s3.example.com/image-${i}.jpg`,
              mime_type: 'image/jpeg',
              size: 1000,
              thumbnails: {
                small: `https://cdn.example.com/small/image-${i}.jpg`,
                medium: `https://cdn.example.com/medium/image-${i}.jpg`,
                large: `https://cdn.example.com/large/image-${i}.jpg`,
              },
              metadata: { alt_text: `Alt ${i}` },
              uploaded_by: 'user-1',
              uploaded_at: 1700000000,
            }));

            const album: Content = {
              id: 'album-1',
              type: 'gallery',
              title: 'Test Album',
              slug: 'test-album',
              content: 'Album description',
              excerpt: '',
              author: 'user-1',
              status: 'published',
              featured_image: '',
              metadata: { media: mediaItems },
              created_at: 1700000000,
              updated_at: 1700000000,
            };

            vi.mocked(api.getContentBySlug).mockResolvedValue(album);

            const { unmount } = renderWithProviders(
              <GalleryEmbed
                albumId="test-album"
                layout={layout}
                limit={limit}
                showDescription={true}
                showTitle={true}
              />
            );

            await waitFor(() => {
              expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
            });

            const images = screen.getAllByRole('img');
            const expectedCount = Math.min(limit, n);
            expect(images).toHaveLength(expectedCount);

            const viewAllLink = screen.queryByText(/view all/i);
            if (n > limit) {
              expect(viewAllLink).toBeInTheDocument();
            } else {
              expect(viewAllLink).not.toBeInTheDocument();
            }

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Render Completeness', () => {
    // **Validates: Requirements 6.12, 6.13, 7.1, 7.2**
    it('title, description presence matches props, aria-label is correct', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // showTitle
          fc.boolean(), // showDescription
          fc.string({ minLength: 3, maxLength: 20 }).map((s) => s.replace(/[^a-zA-Z]/g, 'a') || 'abc'), // title
          fc.string({ minLength: 3, maxLength: 40 }).map((s) => s.replace(/[^a-zA-Z]/g, 'b') || 'desc'), // description
          async (showTitle, showDescription, title, description) => {
            const mediaItems: Media[] = [{
              id: 'media-0',
              filename: 'photo.jpg',
              s3_key: 'uploads/photo.jpg',
              s3_url: 'https://s3.example.com/photo.jpg',
              mime_type: 'image/jpeg',
              size: 1000,
              thumbnails: {
                small: 'https://cdn.example.com/small/photo.jpg',
                medium: 'https://cdn.example.com/medium/photo.jpg',
                large: 'https://cdn.example.com/large/photo.jpg',
              },
              metadata: { alt_text: 'A photo' },
              uploaded_by: 'user-1',
              uploaded_at: 1700000000,
            }];

            const album: Content = {
              id: 'album-1',
              type: 'gallery',
              title,
              slug: 'test-album',
              content: description,
              excerpt: '',
              author: 'user-1',
              status: 'published',
              featured_image: '',
              metadata: { media: mediaItems },
              created_at: 1700000000,
              updated_at: 1700000000,
            };

            vi.mocked(api.getContentBySlug).mockResolvedValue(album);

            const { unmount } = renderWithProviders(
              <GalleryEmbed
                albumId="test-album"
                layout="grid"
                limit={0}
                showDescription={showDescription}
                showTitle={showTitle}
              />
            );

            await waitFor(() => {
              expect(screen.getByRole('region')).toBeInTheDocument();
            });

            // Check aria-label
            const container = screen.getByRole('region');
            expect(container).toHaveAttribute('aria-label', `Gallery: ${title}`);

            // Check title visibility
            if (showTitle) {
              expect(screen.getByText(title)).toBeInTheDocument();
            } else {
              // Title should not appear as a heading
              const headings = container.querySelectorAll('h3');
              const headingTexts = Array.from(headings).map((h) => h.textContent);
              expect(headingTexts).not.toContain(title);
            }

            // Check description visibility
            if (showDescription) {
              expect(screen.getByText(description)).toBeInTheDocument();
            } else {
              // Description should not appear as paragraph before images
              const paragraphs = container.querySelectorAll('p');
              const pTexts = Array.from(paragraphs).map((p) => p.textContent);
              expect(pTexts).not.toContain(description);
            }

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Image Optimization Correctness', () => {
    // **Validates: Requirements 6.6, 6.7, 6.8, 6.12, 6.13**
    it('all images lazy-loaded, grid/masonry use medium thumbnails, carousel uses large', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('grid' as const, 'carousel' as const, 'masonry' as const),
          fc.integer({ min: 1, max: 10 }), // number of images
          async (layout, n) => {
            const mediaItems: Media[] = Array.from({ length: n }, (_, i) => ({
              id: `media-${i}`,
              filename: `image-${i}.jpg`,
              s3_key: `uploads/image-${i}.jpg`,
              s3_url: `https://s3.example.com/original/image-${i}.jpg`,
              mime_type: 'image/jpeg',
              size: 1000,
              thumbnails: {
                small: `https://cdn.example.com/small/image-${i}.jpg`,
                medium: `https://cdn.example.com/medium/image-${i}.jpg`,
                large: `https://cdn.example.com/large/image-${i}.jpg`,
              },
              metadata: { alt_text: `Alt ${i}` },
              uploaded_by: 'user-1',
              uploaded_at: 1700000000,
            }));

            const album: Content = {
              id: 'album-1',
              type: 'gallery',
              title: 'Test Album',
              slug: 'test-album',
              content: 'Description',
              excerpt: '',
              author: 'user-1',
              status: 'published',
              featured_image: '',
              metadata: { media: mediaItems },
              created_at: 1700000000,
              updated_at: 1700000000,
            };

            vi.mocked(api.getContentBySlug).mockResolvedValue(album);

            const { unmount } = renderWithProviders(
              <GalleryEmbed
                albumId="test-album"
                layout={layout}
                limit={0}
                showDescription={true}
                showTitle={true}
              />
            );

            await waitFor(() => {
              expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
            });

            const images = screen.getAllByRole('img');

            // (a) All images have loading="lazy"
            for (const img of images) {
              expect(img).toHaveAttribute('loading', 'lazy');
            }

            // (b) & (c) Check src based on layout
            for (let i = 0; i < images.length; i++) {
              const src = images[i].getAttribute('src');
              if (layout === 'carousel') {
                expect(src).toContain('/large/');
              } else {
                // grid or masonry
                expect(src).toContain('/medium/');
              }
            }

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
