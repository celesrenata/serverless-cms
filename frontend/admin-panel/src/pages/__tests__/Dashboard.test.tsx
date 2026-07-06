import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

vi.mock('../../services/api', () => ({
  api: {
    listContent: vi.fn(),
    listMedia: vi.fn(),
    listUsers: vi.fn(),
  },
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const contentList = {
      items: [
        { id: 'content-1', title: 'Published Post One', status: 'published', type: 'post', slug: 'pub-1', content: '', excerpt: '', author: 'u1', author_name: 'Author', featured_image: '', metadata: {}, created_at: 1700000000, updated_at: 1700000000, published_at: 1700000000 },
        { id: 'content-2', title: 'Draft Post', status: 'draft', type: 'post', slug: 'draft-1', content: '', excerpt: '', author: 'u1', author_name: 'Author', featured_image: '', metadata: {}, created_at: 1700000000, updated_at: 1700000000, published_at: 0 },
        { id: 'content-3', title: 'Published Post Two', status: 'published', type: 'page', slug: 'pub-2', content: '', excerpt: '', author: 'u1', author_name: 'Author', featured_image: '', metadata: {}, created_at: 1700000000, updated_at: 1700000000, published_at: 1700000000 },
        { id: 'content-4', title: 'Archived Post', status: 'archived', type: 'post', slug: 'arch-1', content: '', excerpt: '', author: 'u1', author_name: 'Author', featured_image: '', metadata: {}, created_at: 1700000000, updated_at: 1700000000, published_at: 0 },
      ],
    };

    const mediaList = {
      items: [
        { id: 'media-1', filename: 'image-1.png', s3_key: 'k1', s3_url: 'http://example.com/1.png', mime_type: 'image/png', size: 1000, uploaded_by: 'u1', uploaded_at: 1700000000 },
        { id: 'media-2', filename: 'image-2.png', s3_key: 'k2', s3_url: 'http://example.com/2.png', mime_type: 'image/png', size: 2000, uploaded_by: 'u1', uploaded_at: 1700000000 },
        { id: 'media-3', filename: 'image-3.png', s3_key: 'k3', s3_url: 'http://example.com/3.png', mime_type: 'image/png', size: 3000, uploaded_by: 'u1', uploaded_at: 1700000000 },
      ],
    };

    const users = [
      { id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'admin', created_at: 1700000000, last_login: 1700000000 },
      { id: 'user-2', email: 'user2@example.com', name: 'User Two', role: 'editor', created_at: 1700000000, last_login: 1700000000 },
    ];

    const recentContent = {
      items: [
        { id: 'recent-1', title: 'Recent Article One', status: 'published', type: 'post', slug: 'recent-1', content: '', excerpt: '', author: 'u1', author_name: 'Author', featured_image: '', metadata: {}, created_at: 1700000000, updated_at: 1700000000, published_at: 1700000000 },
        { id: 'recent-2', title: 'Recent Article Two', status: 'draft', type: 'post', slug: 'recent-2', content: '', excerpt: '', author: 'u1', author_name: 'Author', featured_image: '', metadata: {}, created_at: 1700000000, updated_at: 1700000000, published_at: 0 },
      ],
    };

    vi.mocked(api.listContent).mockImplementation((params?: { limit?: number }) =>
      Promise.resolve(params?.limit === 5 ? recentContent : contentList),
    );
    vi.mocked(api.listMedia).mockResolvedValue(mediaList);
    vi.mocked(api.listUsers).mockResolvedValue(users);
  });

  it('renders dashboard heading', () => {
    renderWithProviders(<Dashboard />, {
      authState: { isAuthenticated: true },
    });

    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
  });

  it('shows summary statistics after data loads', async () => {
    renderWithProviders(<Dashboard />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expectStatValue('Total Content', '4');
      expectStatValue('Media Files', '3');
      expectStatValue('Users', '2');
      expectStatValue('Published', '2');
    });
  });

  it('shows recent content items', async () => {
    renderWithProviders(<Dashboard />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Recent Article One' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Recent Article Two' }),
      ).toBeInTheDocument();
    });
  });
});

function expectStatValue(label: string, value: string) {
  const labelElement = screen.getByText(label);
  const card = labelElement.closest('.card');
  expect(card).not.toBeNull();
  expect(within(card as HTMLElement).getByText(value)).toBeInTheDocument();
}
