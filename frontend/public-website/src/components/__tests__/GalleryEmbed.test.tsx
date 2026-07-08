import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GalleryEmbed } from '../GalleryEmbed';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import type { Content, Media } from '../../types';

vi.mock('../../services/api', () => ({
  api: { getContentBySlug: vi.fn() },
}));
vi.mock('../Lightbox', () => ({
  Lightbox: ({ currentIndex }: any) => <div data-testid="lightbox" data-index={currentIndex} />,
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

function createMockAlbum(imageCount: number): Content {
  return {
    id: 'album-1',
    type: 'gallery',
    title: 'Test Album',
    slug: 'test-album',
    content: 'Album description text',
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

const defaultProps = {
  albumId: 'test-album',
  layout: 'grid' as const,
  limit: 0,
  showDescription: true,
  showTitle: true,
};

describe('GalleryEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correct number of images in grid layout', async () => {
    const album = createMockAlbum(6);
    mockGetContentBySlug.mockResolvedValue(album);

    renderWithProviders(<GalleryEmbed {...defaultProps} layout="grid" />);

    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(6);
    });

    // Grid container has responsive column classes
    const gridContainer = screen.getAllByRole('img')[0].closest('.grid');
    expect(gridContainer).toHaveClass('grid-cols-2');
  });

  it('renders carousel layout with horizontal scroll container and nav buttons', async () => {
    const album = createMockAlbum(4);
    mockGetContentBySlug.mockResolvedValue(album);

    renderWithProviders(<GalleryEmbed {...defaultProps} layout="carousel" />);

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(4);
    });

    // Carousel has overflow-x-auto scroll container
    const scrollContainer = screen.getAllByRole('img')[0].closest('.flex');
    expect(scrollContainer).toHaveClass('overflow-x-auto');

    // Nav buttons present
    expect(screen.getByRole('button', { name: /previous image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next image/i })).toBeInTheDocument();
  });

  it('renders masonry layout with columns container', async () => {
    const album = createMockAlbum(5);
    mockGetContentBySlug.mockResolvedValue(album);

    renderWithProviders(<GalleryEmbed {...defaultProps} layout="masonry" />);

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(5);
    });

    const columnsContainer = screen.getAllByRole('img')[0].closest('.columns-2');
    expect(columnsContainer).toBeInTheDocument();
  });

  it('opens Lightbox when image is clicked', async () => {
    const user = userEvent.setup();
    const album = createMockAlbum(3);
    mockGetContentBySlug.mockResolvedValue(album);

    renderWithProviders(<GalleryEmbed {...defaultProps} layout="grid" />);

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(3);
    });

    // Click the second image
    const imageButtons = screen.getAllByRole('button');
    await user.click(imageButtons[1]);

    const lightbox = screen.getByTestId('lightbox');
    expect(lightbox).toBeInTheDocument();
    expect(lightbox).toHaveAttribute('data-index', '1');
  });

  it('renders error fallback with "Gallery unavailable" and link', async () => {
    mockGetContentBySlug.mockRejectedValue({ response: { status: 500 } });

    renderWithProviders(<GalleryEmbed {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Gallery unavailable')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /view album page/i });
    expect(link).toHaveAttribute('href', '/gallery/test-album');
  });

  it('shows skeleton loading state', () => {
    mockGetContentBySlug.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<GalleryEmbed {...defaultProps} layout="grid" />);

    const region = screen.getByRole('region', { name: /loading gallery/i });
    expect(region).toBeInTheDocument();

    // Skeleton has animate-pulse elements
    const skeletons = region.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows "This album has no images yet" when album has zero images', async () => {
    const album = createMockAlbum(0);
    mockGetContentBySlug.mockResolvedValue(album);

    renderWithProviders(<GalleryEmbed {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('This album has no images yet')).toBeInTheDocument();
    });
  });

  it('carousel nav buttons have proper aria-labels', async () => {
    const album = createMockAlbum(4);
    mockGetContentBySlug.mockResolvedValue(album);

    renderWithProviders(<GalleryEmbed {...defaultProps} layout="carousel" />);

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(4);
    });

    expect(screen.getByRole('button', { name: 'Previous image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next image' })).toBeInTheDocument();
  });

  it('shows "View all" link when limit < total images', async () => {
    const album = createMockAlbum(10);
    mockGetContentBySlug.mockResolvedValue(album);

    renderWithProviders(<GalleryEmbed {...defaultProps} limit={4} />);

    await waitFor(() => {
      // Only 4 images rendered
      expect(screen.getAllByRole('img')).toHaveLength(4);
    });

    const viewAllLink = screen.getByRole('link', { name: /view all 10 images/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/gallery/test-album');
  });

  it('renders nothing for not-found album', async () => {
    mockGetContentBySlug.mockRejectedValue({ response: { status: 404 } });

    const { container } = renderWithProviders(<GalleryEmbed {...defaultProps} />);

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
