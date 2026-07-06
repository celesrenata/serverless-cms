import { screen, fireEvent, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { AlbumPage } from '../AlbumPage';
import { useContentBySlug } from '../../hooks/useContent';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockContent } from '../../test/mocks/data';
import { formatAlbumTitle } from '../../utils/galleryUtils';
import type { Media } from '../../types';

vi.mock('../../hooks/useContent', () => ({ useContentBySlug: vi.fn() }));
vi.mock('../../hooks/useSiteSettings', () => ({ useSiteSettings: vi.fn() }));
vi.mock('../../components/Lightbox', () => ({
  Lightbox: ({ currentIndex, onClose }: any) => (
    <div data-testid="lightbox" data-index={currentIndex}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const mockUseContentBySlug = vi.mocked(useContentBySlug);
const mockUseSiteSettings = vi.mocked(useSiteSettings);

const mockMedia: Media[] = [
  {
    id: 'media-001',
    filename: 'sunset.jpg',
    s3_key: 'media/sunset.jpg',
    s3_url: 'https://example.com/media/sunset.jpg',
    mime_type: 'image/jpeg',
    size: 204800,
    thumbnails: {
      small: 'https://example.com/small/sunset.jpg',
      medium: 'https://example.com/medium/sunset.jpg',
      large: 'https://example.com/large/sunset.jpg',
    },
    metadata: {
      alt_text: 'A beautiful sunset',
      caption: 'Sunset over the mountains',
    },
    uploaded_by: 'user-001',
    uploaded_at: 1700000000,
  },
  {
    id: 'media-002',
    filename: 'mountain.jpg',
    s3_key: 'media/mountain.jpg',
    s3_url: 'https://example.com/media/mountain.jpg',
    mime_type: 'image/jpeg',
    size: 307200,
    thumbnails: {
      small: 'https://example.com/small/mountain.jpg',
      medium: 'https://example.com/medium/mountain.jpg',
      large: 'https://example.com/large/mountain.jpg',
    },
    metadata: {
      alt_text: 'Mountain landscape',
    },
    uploaded_by: 'user-001',
    uploaded_at: 1700000000,
  },
  {
    id: 'media-003',
    filename: 'river.jpg',
    s3_key: 'media/river.jpg',
    s3_url: 'https://example.com/media/river.jpg',
    mime_type: 'image/jpeg',
    size: 256000,
    thumbnails: {
      small: 'https://example.com/small/river.jpg',
      medium: 'https://example.com/medium/river.jpg',
      large: 'https://example.com/large/river.jpg',
    },
    metadata: {
      alt_text: 'Flowing river',
    },
    uploaded_by: 'user-001',
    uploaded_at: 1700000000,
  },
];

const renderAlbumPage = (route = '/gallery/test-album') =>
  renderWithProviders(
    <HelmetProvider>
      <AlbumPage />
    </HelmetProvider>,
    { route, routePath: '/gallery/:slug' },
  );

const createMockAlbum = (overrides = {}) =>
  createMockContent({
    id: 'album-001',
    title: 'Test Album',
    slug: 'test-album',
    type: 'gallery',
    status: 'published',
    excerpt: 'A test album description',
    metadata: {
      media: mockMedia,
    },
    ...overrides,
  });

describe('AlbumPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = '';

    mockUseSiteSettings.mockReturnValue({
      data: {
        site_title: 'Test Site',
        site_description: 'A test site',
        registration_enabled: true,
        comments_enabled: true,
        captcha_enabled: false,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  it('renders loading spinner while album is loading', () => {
    mockUseContentBySlug.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    renderAlbumPage();

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders not-found state when album data is null', () => {
    mockUseContentBySlug.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderAlbumPage('/gallery/missing-album');

    expect(screen.getByText('Gallery album not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to gallery/i })).toHaveAttribute(
      'href',
      '/gallery',
    );
  });

  it('renders not-found state when content is not a gallery type', () => {
    const post = createMockContent({
      id: 'post-001',
      title: 'Not a Gallery',
      slug: 'not-a-gallery',
      type: 'post',
      status: 'published',
      metadata: {},
    });

    mockUseContentBySlug.mockReturnValue({
      data: post,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderAlbumPage('/gallery/not-a-gallery');

    expect(screen.getByText('Gallery album not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to gallery/i })).toHaveAttribute(
      'href',
      '/gallery',
    );
  });

  it('renders empty album state when media is empty', () => {
    const album = createMockAlbum({
      metadata: { media: [] },
    });

    mockUseContentBySlug.mockReturnValue({
      data: album,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderAlbumPage();

    expect(screen.getByRole('heading', { name: 'Test Album' })).toBeInTheDocument();
    expect(
      screen.getByText('This album does not contain any images yet.'),
    ).toBeInTheDocument();
  });

  it('renders all images in the grid with correct sources', () => {
    const album = createMockAlbum();

    mockUseContentBySlug.mockReturnValue({
      data: album,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderAlbumPage();

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    expect(screen.getByAltText('A beautiful sunset')).toHaveAttribute(
      'src',
      'https://example.com/medium/sunset.jpg',
    );
    expect(screen.getByAltText('Mountain landscape')).toHaveAttribute(
      'src',
      'https://example.com/medium/mountain.jpg',
    );
    expect(screen.getByAltText('Flowing river')).toHaveAttribute(
      'src',
      'https://example.com/medium/river.jpg',
    );
  });

  it('renders images with loading="lazy" attribute', () => {
    const album = createMockAlbum();

    mockUseContentBySlug.mockReturnValue({
      data: album,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderAlbumPage();

    const images = screen.getAllByRole('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  it('renders back link to /gallery', () => {
    const album = createMockAlbum();

    mockUseContentBySlug.mockReturnValue({
      data: album,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderAlbumPage();

    const backLink = screen.getByRole('link', { name: /back to gallery/i });
    expect(backLink).toHaveAttribute('href', '/gallery');
  });

  it('sets SEO title and description via Helmet', async () => {
    const album = createMockAlbum();

    mockUseContentBySlug.mockReturnValue({
      data: album,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderAlbumPage();

    await waitFor(() => {
      expect(document.title).toBe(formatAlbumTitle('Test Album', 'Test Site'));
    });

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute('content', 'A test album description');
  });

  it('opens lightbox at correct index when image is clicked', () => {
    const album = createMockAlbum();

    mockUseContentBySlug.mockReturnValue({
      data: album,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderAlbumPage();

    // Click the second image (Mountain landscape, index 1)
    fireEvent.click(screen.getByRole('button', { name: /mountain landscape/i }));

    const lightbox = screen.getByTestId('lightbox');
    expect(lightbox).toBeInTheDocument();
    expect(lightbox).toHaveAttribute('data-index', '1');
  });
});
