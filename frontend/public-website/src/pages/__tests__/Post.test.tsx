import { screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import {
  createMockComment,
  createMockContent,
  createMockContentList,
  createMockSettings,
} from '../../test/mocks/data';
import { Post } from '../Post';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    getContentBySlug: vi.fn(),
    getComments: vi.fn(),
    getPublicSettings: vi.fn(),
    listContent: vi.fn(),
    createComment: vi.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const renderPost = (route = '/blog/test-post') =>
  renderWithProviders(
    <HelmetProvider>
      <Post />
    </HelmetProvider>,
    {
      route,
      routePath: '/blog/:slug',
      queryClient: createTestQueryClient(),
    },
  );

describe('Post', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.getContentBySlug).mockResolvedValue(createMockContent());
    vi.mocked(api.getComments).mockResolvedValue([createMockComment()]);
    vi.mocked(api.getPublicSettings).mockResolvedValue(
      createMockSettings({ comments_enabled: true }),
    );
    vi.mocked(api.listContent).mockResolvedValue(createMockContentList(3));
  });

  it('renders post title, content, and author after data loads', async () => {
    const post = createMockContent({
      title: 'Test Post',
      content: '<p>This is test content for the post.</p>',
      author_name: 'Test Author',
    });

    vi.mocked(api.getContentBySlug).mockResolvedValueOnce(post);

    renderPost();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Test Post' }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('This is test content for the post.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/By Test Author/)).toBeInTheDocument();

    expect(api.getContentBySlug).toHaveBeenCalledWith('test-post');
  });

  it('renders not-found message for non-existent slug', async () => {
    vi.mocked(api.getContentBySlug).mockRejectedValueOnce(
      new Error('Post not found'),
    );

    renderPost('/blog/missing-post');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /post not found/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("The post you're looking for doesn't exist."),
    ).toBeInTheDocument();

    expect(api.getContentBySlug).toHaveBeenCalledWith('missing-post');
  });
});
