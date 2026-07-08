import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Settings } from '../Settings';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

vi.mock('../../services/api', () => ({
  api: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

const mockSettings = {
  site_title: 'Example CMS',
  site_description: 'A modern content management system.',
  theme: 'default',
  registration_enabled: false,
  comments_enabled: true,
  comment_moderation_enabled: true,
  captcha_enabled: false,
};

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getSettings).mockResolvedValue(mockSettings);
  });

  it('renders settings fields with correct values after data loads', async () => {
    renderWithProviders(<Settings />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/site title/i)).toHaveValue(mockSettings.site_title);
      expect(screen.getByLabelText(/site description/i)).toHaveValue(
        mockSettings.site_description,
      );
    });
  });

  it('renders the Save Settings button', async () => {
    renderWithProviders(<Settings />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
    });
  });
});
