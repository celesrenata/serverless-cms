import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MediaLibrary } from '../MediaLibrary';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockMediaList } from '../../test/mocks/data';

vi.mock('../../services/api', () => ({
  api: {
    listMedia: vi.fn(),
    deleteMedia: vi.fn(),
    getMedia: vi.fn(),
    uploadMedia: vi.fn(),
    updateMedia: vi.fn(),
  },
}));

describe('MediaLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listMedia).mockResolvedValue(createMockMediaList(3));
  });

  it('renders media items in grid after data loads', async () => {
    renderWithProviders(<MediaLibrary />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('sample-image-001.jpg')).toBeInTheDocument();
      expect(screen.getByText('sample-image-002.jpg')).toBeInTheDocument();
      expect(screen.getByText('sample-image-003.jpg')).toBeInTheDocument();
    });
  });

  it('upload button is accessible', () => {
    renderWithProviders(<MediaLibrary />, {
      authState: { isAuthenticated: true },
    });

    const uploadButton = screen.getByRole('button', { name: /upload media/i });
    expect(uploadButton).toBeInTheDocument();
  });
});
