import { screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockContent } from '../../test/mocks/data';
import { Gallery } from '../Gallery';
import { Media } from '../../types';

vi.mock('../../hooks/useContent', () => ({
  useContentList: vi.fn(),
}));

vi.mock('../../hooks/useSiteSettings', () => ({
  useSiteSettings: vi.fn(),
}));

import { useContentList } from '../../hooks/useContent';
import { useSiteSettings } from '../../hooks/useSiteSettings';

const mockUseContentList = vi.mocked(useContentList);
const mockUseSiteSettings = vi.mocked(useSiteSettings);

const mockMedia: Media[] = [
  {
    id: 'media-001',
    filename: 'sunset.jpg',
    s3_key: 'media/sunset.jpg',
    s3_url: 'https://example.com/media/sunset.jpg',
    mime_type: 'image/jpeg',
    size: 204800,
    thumbnails: { small: 'https://example.com/small/sunset.jpg', medium: 'https://example.com/medium/sunset.jpg', large: 'https://example.com/large/sunset.jpg' },
    metadata: { alt_text: 'A beautiful sunset' },
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
    thumbnails: { small: 'https://example.com/small/mountain.jpg', medium: 'https://example.com/medium/mountain.jpg', large: 'https://example.com/large/mountain.jpg' },
    metadata: { alt_text: 'Mountain landscape' },
    uploaded_by: 'user-001',
    uploaded_at: 1700000000,
  },
];

function renderGallery() {
  return renderWithProviders(
    <HelmetProvider>
      <Gallery />
    </HelmetProvider>
  );
}

describe('Gallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSiteSettings.mockReturnValue({
      data: { site_title: 'Test Site', site_description: 'A test site', registration_enabled: true, comments_enabled: true, captcha_enabled: false },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  it('renders album cards in grid layout after data loads', () => {
    const galleries = [
      createMockContent({
        id: 'gallery-1',
        type: 'gallery',
        title: 'Nature Photos',
        slug: 'nature-photos',
        excerpt: 'Beautiful nature photography',
        metadata: { media: mockMedia },
      }),
    ];

    mockUseContentList.mockReturnValue({
      data: { items: galleries, last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderGallery();

    // Album card title renders
    expect(screen.getByRole('heading', { name: 'Nature Photos' })).toBeInTheDocument();
    // Album card excerpt renders
    expect(screen.getByText('Beautiful nature photography')).toBeInTheDocument();
    // Cover image renders with first media alt text
    expect(screen.getByAltText('A beautiful sunset')).toBeInTheDocument();
    // Image count badge renders
    expect(screen.getByText('2 images')).toBeInTheDocument();
    // Link navigates to album page
    const link = screen.getByRole('link', { name: /Nature Photos/i });
    expect(link).toHaveAttribute('href', '/gallery/nature-photos');
  });

  it('renders page heading', () => {
    mockUseContentList.mockReturnValue({
      data: { items: [], last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderGallery();

    expect(screen.getByRole('heading', { level: 1, name: 'Gallery' })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseContentList.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    renderGallery();

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows empty state when no galleries exist', () => {
    mockUseContentList.mockReturnValue({
      data: { items: [], last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderGallery();

    expect(screen.getByText('No galleries are available yet.')).toBeInTheDocument();
  });

  it('renders the correct number of album cards', () => {
    const galleries = [
      createMockContent({
        id: 'gallery-1',
        type: 'gallery',
        title: 'Nature Photos',
        slug: 'nature-photos',
        excerpt: 'Nature shots',
        metadata: { media: mockMedia },
      }),
      createMockContent({
        id: 'gallery-2',
        type: 'gallery',
        title: 'City Landscapes',
        slug: 'city-landscapes',
        excerpt: 'Urban photography',
        metadata: { media: [mockMedia[0]] },
      }),
      createMockContent({
        id: 'gallery-3',
        type: 'gallery',
        title: 'Portraits',
        slug: 'portraits',
        excerpt: 'Portrait collection',
        metadata: { media: mockMedia },
      }),
    ];

    mockUseContentList.mockReturnValue({
      data: { items: galleries, last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderGallery();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
  });

  it('renders album cards as <a> elements (semantic links)', () => {
    const galleries = [
      createMockContent({
        id: 'gallery-1',
        type: 'gallery',
        title: 'Nature Photos',
        slug: 'nature-photos',
        excerpt: 'Nature shots',
        metadata: { media: mockMedia },
      }),
    ];

    mockUseContentList.mockReturnValue({
      data: { items: galleries, last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderGallery();

    const link = screen.getByRole('link', { name: /Nature Photos/i });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/gallery/nature-photos');
  });

  it('applies responsive grid classes', () => {
    const galleries = [
      createMockContent({
        id: 'gallery-1',
        type: 'gallery',
        title: 'Nature Photos',
        slug: 'nature-photos',
        excerpt: 'Nature shots',
        metadata: { media: mockMedia },
      }),
    ];

    mockUseContentList.mockReturnValue({
      data: { items: galleries, last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderGallery();

    const grid = screen.getByRole('link', { name: /Nature Photos/i }).parentElement;
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-3');
  });

  it('applies hover feedback classes on album cards', () => {
    const galleries = [
      createMockContent({
        id: 'gallery-1',
        type: 'gallery',
        title: 'Nature Photos',
        slug: 'nature-photos',
        excerpt: 'Nature shots',
        metadata: { media: mockMedia },
      }),
    ];

    mockUseContentList.mockReturnValue({
      data: { items: galleries, last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderGallery();

    const link = screen.getByRole('link', { name: /Nature Photos/i });
    // Card has hover shadow transition class
    expect(link).toHaveClass('hover:shadow-lg');
    // Image inside has hover scale class via group-hover
    const img = screen.getByAltText('A beautiful sunset');
    expect(img).toHaveClass('group-hover:scale-105');
  });
});
