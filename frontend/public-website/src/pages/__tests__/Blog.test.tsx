import { screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockContent } from '../../test/mocks/data';
import { Blog } from '../Blog';

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

describe('Blog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSiteSettings.mockReturnValue({
      data: { site_title: 'Test Site', site_description: 'A test site', registration_enabled: true, comments_enabled: true, captcha_enabled: false },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  it('renders blog page heading', () => {
    mockUseContentList.mockReturnValue({
      data: { items: [], last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithProviders(
      <HelmetProvider>
        <Blog />
      </HelmetProvider>
    );

    expect(screen.getByRole('heading', { name: 'Blog' })).toBeInTheDocument();
  });

  it('shows list of posts with titles after data loads', () => {
    const posts = [
      createMockContent({ id: '1', title: 'First Post', slug: 'first-post' }),
      createMockContent({ id: '2', title: 'Second Post', slug: 'second-post' }),
      createMockContent({ id: '3', title: 'Third Post', slug: 'third-post' }),
    ];

    mockUseContentList.mockReturnValue({
      data: { items: posts, last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithProviders(
      <HelmetProvider>
        <Blog />
      </HelmetProvider>
    );

    expect(screen.getByRole('heading', { name: 'First Post' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Second Post' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Third Post' })).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockUseContentList.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    renderWithProviders(
      <HelmetProvider>
        <Blog />
      </HelmetProvider>
    );

    expect(screen.getByRole('heading', { name: 'Blog' })).toBeInTheDocument();
    // Verify loading spinner is rendered (has animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    // Posts should not be rendered during loading
    expect(screen.queryByRole('heading', { name: 'Test Post' })).not.toBeInTheDocument();
  });
});
