import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { ContentList } from '../ContentList';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockContentList } from '../../test/mocks/data';

vi.mock('../../services/api', () => ({
  api: {
    listContent: vi.fn(),
    deleteContent: vi.fn(),
    updateContent: vi.fn(),
  },
}));

describe('ContentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listContent).mockResolvedValue(createMockContentList(3));
  });

  it('renders content items after data loads', async () => {
    renderWithProviders(<ContentList />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Sample Content 1')).toBeInTheDocument();
      expect(screen.getByText('Sample Content 2')).toBeInTheDocument();
      expect(screen.getByText('Sample Content 3')).toBeInTheDocument();
    });
  });

  it('shows filtering controls for type and status', () => {
    renderWithProviders(<ContentList />, {
      authState: { isAuthenticated: true },
    });

    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });
});
