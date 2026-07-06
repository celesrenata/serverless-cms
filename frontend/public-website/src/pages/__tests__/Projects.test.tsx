import { screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockContent } from '../../test/mocks/data';
import { Projects } from '../Projects';

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

describe('Projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSiteSettings.mockReturnValue({
      data: { site_title: 'Test Site', site_description: 'A test site', registration_enabled: true, comments_enabled: true, captcha_enabled: false },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  it('renders project items after data loads', () => {
    const projects = [
      createMockContent({ id: 'p1', type: 'project', title: 'Project Alpha', slug: 'project-alpha', excerpt: 'Alpha description' }),
      createMockContent({ id: 'p2', type: 'project', title: 'Project Beta', slug: 'project-beta', excerpt: 'Beta description', metadata: { tags: ['react'], categories: [], custom_fields: { github_url: 'https://github.com/example/beta' } } }),
    ];

    mockUseContentList.mockReturnValue({
      data: { items: projects, last_key: undefined },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderWithProviders(
      <HelmetProvider>
        <Projects />
      </HelmetProvider>
    );

    expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Project Beta' })).toBeInTheDocument();
    expect(screen.getByText('Alpha description')).toBeInTheDocument();
    expect(screen.getByText('Beta description')).toBeInTheDocument();
    expect(screen.getByText('View on GitHub')).toBeInTheDocument();
  });
});
