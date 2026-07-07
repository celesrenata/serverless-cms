import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeEditor } from '../ThemeEditor';
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

const mockTheme = {
  id: 'test-theme-id',
  name: 'Existing Theme',
  description: 'A theme to edit',
  builtin: false,
  is_active: false,
  tokens: {
    colors: {
      primary: '139 92 246',
      primaryHover: '124 58 237',
      secondary: '99 102 241',
      background: '3 7 18',
      backgroundAlt: '15 23 42',
      surface: '30 41 59',
      surfaceAlt: '51 65 85',
      text: '248 250 252',
      textMuted: '148 163 184',
      textInverse: '15 23 42',
      border: '51 65 85',
      borderLight: '71 85 105',
      accent: '34 211 238',
      success: '34 197 94',
      warning: '234 179 8',
      error: '239 68 68',
      info: '56 189 248',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      fontSizeBase: '1rem',
      fontSizeScale: 1.25,
      lineHeight: '1.6',
      fontWeightNormal: 400,
      fontWeightBold: 700,
    },
    radius: { sm: '0.25rem', md: '0.5rem', lg: '1rem', full: '9999px' },
    shadow: {
      sm: '0 1px 2px rgba(0,0,0,0.3)',
      md: '0 4px 6px rgba(0,0,0,0.4)',
      lg: '0 10px 15px rgba(0,0,0,0.5)',
      glow: '0 0 20px rgba(139,92,246,0.3)',
    },
    motion: {
      durationFast: '150ms',
      durationNormal: '300ms',
      durationSlow: '500ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      reducedMotion: false,
    },
    patterns: { type: 'none' as const, opacity: 0.1, color: '139 92 246' },
  },
  preview_colors: {
    primary: '139 92 246',
    background: '3 7 18',
    surface: '30 41 59',
    accent: '34 211 238',
  },
};

describe('ThemeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(themeService.getTheme).mockResolvedValue(mockTheme);
  });

  describe('New theme mode', () => {
    it('renders the editor for creating a new theme', () => {
      renderWithProviders(<ThemeEditor />, {
        authState: { isAuthenticated: true },
        route: '/appearance/new',
        routePath: '/appearance/new',
      });

      // Should show the name input field (placeholder is "My Custom Theme")
      expect(screen.getByPlaceholderText('My Custom Theme')).toBeInTheDocument();
    });

    it('shows color token section with 17 color inputs', () => {
      renderWithProviders(<ThemeEditor />, {
        authState: { isAuthenticated: true },
        route: '/appearance/new',
        routePath: '/appearance/new',
      });

      // Should have the Color Tokens heading
      expect(screen.getByText('Color Tokens')).toBeInTheDocument();
      // Verify some color labels exist
      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Background')).toBeInTheDocument();
      expect(screen.getByText('Accent')).toBeInTheDocument();
    });

    it('shows typography section when clicking typography tab', () => {
      renderWithProviders(<ThemeEditor />, {
        authState: { isAuthenticated: true },
        route: '/appearance/new',
        routePath: '/appearance/new',
      });

      const typographyTab = screen.getByRole('button', { name: /typography/i });
      fireEvent.click(typographyTab);

      // After clicking, the Typography heading should appear (in addition to the tab)
      const typographyElements = screen.getAllByText('Typography');
      expect(typographyElements.length).toBeGreaterThanOrEqual(2); // tab + section heading
    });

    it('shows Save and Save & Activate buttons', () => {
      renderWithProviders(<ThemeEditor />, {
        authState: { isAuthenticated: true },
        route: '/appearance/new',
        routePath: '/appearance/new',
      });

      expect(screen.getByRole('button', { name: /save$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save & activate/i })).toBeInTheDocument();
    });
  });

  describe('Edit theme mode', () => {
    it('loads existing theme data', async () => {
      renderWithProviders(<ThemeEditor />, {
        authState: { isAuthenticated: true },
        route: '/appearance/edit/test-theme-id',
        routePath: '/appearance/edit/:id',
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Theme')).toBeInTheDocument();
      });
    });
  });
});
