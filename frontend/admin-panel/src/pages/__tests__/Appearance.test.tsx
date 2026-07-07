import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Appearance } from '../Appearance';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import * as themeService from '../../services/themeService';

vi.mock('../../services/themeService', () => ({
  getThemes: vi.fn(),
  getTheme: vi.fn(),
  createTheme: vi.fn(),
  updateTheme: vi.fn(),
  deleteTheme: vi.fn(),
  activateTheme: vi.fn(),
  duplicateTheme: vi.fn(),
}));

const mockThemeList = {
  items: [
    {
      id: 'celestium-neon',
      name: 'Celestium Neon',
      description: 'Dark cyberpunk with neon accents',
      builtin: true,
      is_active: true,
      preview_colors: {
        primary: '139 92 246',
        background: '3 7 18',
        surface: '30 41 59',
        accent: '34 211 238',
      },
    },
    {
      id: 'custom-1',
      name: 'My Custom Theme',
      description: 'A custom test theme',
      builtin: false,
      is_active: false,
      preview_colors: {
        primary: '100 200 50',
        background: '10 20 30',
        surface: '40 50 60',
        accent: '200 100 50',
      },
      created_at: 1700000000,
      updated_at: 1700000000,
    },
  ],
};

describe('Appearance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(themeService.getThemes).mockResolvedValue(mockThemeList);
  });

  it('renders the Appearance heading', async () => {
    renderWithProviders(<Appearance />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    // Make getThemes never resolve to test loading
    vi.mocked(themeService.getThemes).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Appearance />, {
      authState: { isAuthenticated: true },
    });

    expect(screen.getByText('Loading themes...')).toBeInTheDocument();
  });

  it('renders theme cards after loading', async () => {
    renderWithProviders(<Appearance />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Celestium Neon')).toBeInTheDocument();
      expect(screen.getByText('My Custom Theme')).toBeInTheDocument();
    });
  });

  it('shows "+ Create Theme" button', async () => {
    renderWithProviders(<Appearance />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('+ Create Theme')).toBeInTheDocument();
    });
  });

  it('shows "Import Theme" button', async () => {
    renderWithProviders(<Appearance />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Import Theme')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    vi.mocked(themeService.getThemes).mockRejectedValue(new Error('Network error'));

    renderWithProviders(<Appearance />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText(/Error loading themes/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no themes exist', async () => {
    vi.mocked(themeService.getThemes).mockResolvedValue({ items: [] });

    renderWithProviders(<Appearance />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('No themes available')).toBeInTheDocument();
    });
  });

  it('shows Active badge on the active theme card', async () => {
    renderWithProviders(<Appearance />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('shows Built-in badge on builtin themes', async () => {
    renderWithProviders(<Appearance />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Built-in')).toBeInTheDocument();
    });
  });
});
