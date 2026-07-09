import { screen, waitFor } from '@testing-library/react';
import { MarkdownContent } from '../MarkdownContent';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import type { Content, Media } from '../../types';

vi.mock('../../services/api', () => ({
  api: { getContentBySlug: vi.fn() },
}));
vi.mock('../Lightbox', () => ({
  Lightbox: () => null,
}));
vi.mock('../MermaidRenderer', () => ({
  MermaidRenderer: () => null,
}));
vi.mock('../../hooks/useSwipe', () => ({
  useSwipe: () => ({
    onPointerDown: () => {},
    onPointerMove: () => {},
    onPointerUp: () => {},
    onPointerCancel: () => {},
  }),
}));

const mockGetContentBySlug = vi.mocked(api.getContentBySlug);

function createMockMedia(count: number): Media[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `img-${i + 1}`,
    filename: `photo${i + 1}.jpg`,
    s3_key: `media/photo${i + 1}.jpg`,
    s3_url: `https://cdn.example.com/photo${i + 1}.jpg`,
    mime_type: 'image/jpeg',
    size: 1000 * (i + 1),
    thumbnails: {
      small: `https://cdn.example.com/photo${i + 1}-small.jpg`,
      medium: `https://cdn.example.com/photo${i + 1}-medium.jpg`,
      large: `https://cdn.example.com/photo${i + 1}-large.jpg`,
    },
    metadata: { alt_text: `Photo ${i + 1}` },
    uploaded_by: 'user-1',
    uploaded_at: 1700000000,
  }));
}

function createMockAlbum(id: string, slug: string, title: string, imageCount: number): Content {
  return {
    id,
    type: 'gallery',
    title,
    slug,
    content: `${title} description`,
    excerpt: '',
    author: 'user-1',
    status: 'published',
    featured_image: '',
    metadata: {
      media: createMockMedia(imageCount),
    },
    created_at: 1700000000,
    updated_at: 1700000000,
  };
}

describe('GalleryEmbed Integration - Full Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a gallery embed from markdown directive through MarkdownContent', async () => {
    const album = createMockAlbum('album-1', 'my-album', 'My Album', 6);
    mockGetContentBySlug.mockResolvedValue(album);

    const markdown = '::gallery[my-album]{layout=grid limit=4}';

    renderWithProviders(<MarkdownContent markdown={markdown} />);

    // Wait for the album to load and images to appear
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      // limit=4, so only 4 images shown
      expect(images).toHaveLength(4);
    });

    // Verify album title is displayed
    expect(screen.getByText('My Album')).toBeInTheDocument();

    // Verify album description is displayed
    expect(screen.getByText('My Album description')).toBeInTheDocument();

    // Verify aria-label on the gallery region
    const region = screen.getByRole('region', { name: 'Gallery: My Album' });
    expect(region).toBeInTheDocument();

    // Verify images use medium thumbnails (grid layout)
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', 'https://cdn.example.com/photo1-medium.jpg');
    expect(images[0]).toHaveAttribute('alt', 'Photo 1');

    // Verify "View all" link is present (6 total, limit 4)
    expect(screen.getByRole('link', { name: /view all 6 images/i })).toBeInTheDocument();

    // Verify api was called with the album slug
    expect(mockGetContentBySlug).toHaveBeenCalledWith('my-album');
  });

  it('renders multiple gallery embeds in one markdown document independently', async () => {
    const album1 = createMockAlbum('album-1', 'travel-photos', 'Travel Photos', 5);
    const album2 = createMockAlbum('album-2', 'nature-shots', 'Nature Shots', 3);

    mockGetContentBySlug.mockImplementation((slug: string) => {
      if (slug === 'travel-photos') return Promise.resolve(album1);
      if (slug === 'nature-shots') return Promise.resolve(album2);
      return Promise.reject({ response: { status: 404 } });
    });

    const markdown = [
      '# My Blog Post',
      '',
      'Here are some travel photos:',
      '',
      '::gallery[travel-photos]{layout=grid limit=99}',
      '',
      'And here are some nature shots:',
      '',
      '::gallery[nature-shots]{layout=carousel limit=99}',
    ].join('\n');

    renderWithProviders(<MarkdownContent markdown={markdown} />);

    // Wait for both galleries to load
    await waitFor(() => {
      // 5 from travel + 3 from nature = 8 images total
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(8);
    });

    // Verify both gallery regions are present
    const travelRegion = screen.getByRole('region', { name: 'Gallery: Travel Photos' });
    expect(travelRegion).toBeInTheDocument();

    const natureRegion = screen.getByRole('region', { name: 'Gallery: Nature Shots' });
    expect(natureRegion).toBeInTheDocument();

    // Verify both titles rendered
    expect(screen.getByText('Travel Photos')).toBeInTheDocument();
    expect(screen.getByText('Nature Shots')).toBeInTheDocument();

    // Verify api was called for both albums
    expect(mockGetContentBySlug).toHaveBeenCalledWith('travel-photos');
    expect(mockGetContentBySlug).toHaveBeenCalledWith('nature-shots');

    // Verify the carousel has navigation buttons (nature-shots is carousel)
    expect(screen.getByRole('button', { name: 'Previous image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next image' })).toBeInTheDocument();
  });
});
