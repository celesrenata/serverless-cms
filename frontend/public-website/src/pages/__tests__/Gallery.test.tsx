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

vi.mock('../../components/Lightbox', () => ({
  Lightbox: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="lightbox">
      <button onClick={onClose}>Close</button>
    </div>
  ),
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

  it('renders gallery items in grid layout after data loads', () => {
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

    // Gallery title renders
    expect(screen.getByRole('heading', { name: 'Nature Photos' })).toBeInTheDocument();
    // Gallery excerpt renders
    expect(screen.getByText('Beautiful nature photography')).toBeInTheDocument();
    // Images render with alt text
    expect(screen.getByAltText('A beautiful sunset')).toBeInTheDocument();
    expect(screen.getByAltText('Mountain landscape')).toBeInTheDocument();
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

    expect(screen.getByText('No galleries found.')).toBeInTheDocument();
  });
});
