import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemePanel from './ThemePanel';

const { mockSetTheme, mockExportTheme, mockImportTheme, mockBuiltinThemes } =
  vi.hoisted(() => {
    const makeColors = (primary: string) => ({
      primary,
      primaryHover: '124 58 237',
      secondary: '236 72 153',
      background: '3 7 18',
      backgroundAlt: '15 23 42',
      surface: '30 41 59',
      surfaceAlt: '51 65 85',
      text: '248 250 252',
      textMuted: '148 163 184',
      textInverse: '15 23 42',
      border: '71 85 105',
      borderLight: '100 116 139',
      accent: '34 211 238',
      success: '52 211 153',
      warning: '251 191 36',
      error: '248 113 113',
      info: '96 165 250',
    });

    return {
      mockSetTheme: vi.fn(),
      mockExportTheme: vi.fn(),
      mockImportTheme: vi.fn(() => ({
        valid: true,
        errors: [],
        warnings: [],
      })),
      mockBuiltinThemes: [
        {
          id: 'celestium-neon',
          name: 'Celestium Neon',
          description: 'Dark cyberpunk aesthetic with neon accents',
          colors: makeColors('139 92 246'),
          typography: {
            fontFamily: '"Inter", system-ui, sans-serif',
            fontFamilyMono: '"JetBrains Mono", monospace',
            fontSizeBase: '1rem',
            fontSizeScale: 1.25,
            lineHeight: '1.6',
            fontWeightNormal: 400,
            fontWeightBold: 700,
          },
          radius: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', full: '9999px' },
          shadow: { sm: '0 1px 3px rgba(0,0,0,0.1)', md: '0 4px 12px rgba(0,0,0,0.15)', lg: '0 12px 40px rgba(0,0,0,0.2)', glow: '0 0 20px rgba(139,92,246,0.4)' },
          motion: { durationFast: '150ms', durationNormal: '300ms', durationSlow: '600ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)', reducedMotion: false },
        },
        {
          id: 'aws-console-after-dark',
          name: 'AWS Console After Dark',
          description: 'Professional dark interface inspired by cloud consoles',
          colors: makeColors('245 158 11'),
          typography: {
            fontFamily: '"Inter", system-ui, sans-serif',
            fontFamilyMono: '"SFMono-Regular", monospace',
            fontSizeBase: '1rem',
            fontSizeScale: 1.2,
            lineHeight: '1.5',
            fontWeightNormal: 400,
            fontWeightBold: 700,
          },
          radius: { sm: '0.25rem', md: '0.5rem', lg: '0.75rem', full: '9999px' },
          shadow: { sm: '0 1px 2px rgba(0,0,0,0.35)', md: '0 8px 24px rgba(0,0,0,0.32)', lg: '0 18px 48px rgba(0,0,0,0.38)', glow: '0 0 28px rgba(245,158,11,0.22)' },
          motion: { durationFast: '120ms', durationNormal: '200ms', durationSlow: '320ms', easing: 'cubic-bezier(0.2, 0, 0, 1)', reducedMotion: false },
        },
        {
          id: 'glass-circuit',
          name: 'Glass Circuit',
          description: 'Translucent panels with frosted glass borders',
          colors: makeColors('45 212 191'),
          typography: {
            fontFamily: '"Inter", system-ui, sans-serif',
            fontFamilyMono: '"Cascadia Code", monospace',
            fontSizeBase: '1rem',
            fontSizeScale: 1.22,
            lineHeight: '1.55',
            fontWeightNormal: 400,
            fontWeightBold: 700,
          },
          radius: { sm: '0.375rem', md: '0.75rem', lg: '1rem', full: '9999px' },
          shadow: { sm: '0 1px 3px rgba(0,0,0,0.35)', md: '0 10px 30px rgba(0,0,0,0.35)', lg: '0 24px 64px rgba(0,0,0,0.42)', glow: '0 0 32px rgba(45,212,191,0.3)' },
          motion: { durationFast: '140ms', durationNormal: '240ms', durationSlow: '420ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', reducedMotion: false },
        },
        {
          id: 'paper-systems',
          name: 'Paper Systems',
          description: 'Light technical-document aesthetic',
          colors: makeColors('30 64 120'),
          typography: {
            fontFamily: 'Georgia, serif',
            fontFamilyMono: '"IBM Plex Mono", monospace',
            fontSizeBase: '1.0625rem',
            fontSizeScale: 1.2,
            lineHeight: '1.65',
            fontWeightNormal: 400,
            fontWeightBold: 700,
          },
          radius: { sm: '0.125rem', md: '0.25rem', lg: '0.5rem', full: '9999px' },
          shadow: { sm: '0 1px 2px rgba(23,32,51,0.08)', md: '0 6px 18px rgba(23,32,51,0.1)', lg: '0 16px 36px rgba(23,32,51,0.14)', glow: '0 0 24px rgba(30,64,120,0.14)' },
          motion: { durationFast: '120ms', durationNormal: '180ms', durationSlow: '280ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', reducedMotion: false },
        },
        {
          id: 'terminal-witchcraft',
          name: 'Terminal Witchcraft',
          description: 'Retro terminal aesthetic with green-on-black',
          colors: makeColors('34 197 94'),
          typography: {
            fontFamily: '"IBM Plex Mono", monospace',
            fontFamilyMono: '"IBM Plex Mono", monospace',
            fontSizeBase: '1rem',
            fontSizeScale: 1.18,
            lineHeight: '1.55',
            fontWeightNormal: 400,
            fontWeightBold: 700,
          },
          radius: { sm: '0rem', md: '0.125rem', lg: '0.25rem', full: '9999px' },
          shadow: { sm: '0 1px 2px rgba(0,0,0,0.45)', md: '0 8px 22px rgba(0,0,0,0.5)', lg: '0 18px 48px rgba(0,0,0,0.6)', glow: '0 0 28px rgba(34,197,94,0.38)' },
          motion: { durationFast: '80ms', durationNormal: '140ms', durationSlow: '260ms', easing: 'steps(2, end)', reducedMotion: false },
        },
      ],
    };
  });

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: vi.fn(() => ({
    activeTheme: 'celestium-neon',
    builtinThemes: mockBuiltinThemes,
    setTheme: mockSetTheme,
    exportTheme: mockExportTheme,
    importTheme: mockImportTheme,
    tokens: mockBuiltinThemes[0],
    customTheme: null,
    isPreviewActive: false,
    applyCustomTheme: vi.fn(),
    previewCSS: vi.fn(),
    saveCustomCSS: vi.fn(),
    dismissPreview: vi.fn(),
    motionOverride: 'system' as const,
    setMotionOverride: vi.fn(),
  })),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === '(min-width: 768px)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

async function openPanel() {
  const user = userEvent.setup();
  render(<ThemePanel />);
  await user.click(screen.getByRole('button', { name: /open theme panel/i }));
  // Wait for the panel to appear
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  return user;
}

describe('ThemePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the floating toggle button', () => {
    render(<ThemePanel />);
    expect(screen.getByRole('button', { name: /open theme panel/i })).toBeInTheDocument();
  });

  it('opens panel when toggle button is clicked', async () => {
    await openPanel();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('panel displays all 5 theme cards', async () => {
    await openPanel();
    const themeCards = screen
      .getAllByRole('button')
      .filter((btn) => btn.hasAttribute('aria-pressed'));
    expect(themeCards).toHaveLength(5);
  });

  it('active theme card shows aria-pressed="true"', async () => {
    await openPanel();
    // Find the button containing the text "Celestium Neon"
    const buttons = screen.getAllByRole('button').filter(
      (btn) => btn.hasAttribute('aria-pressed') && btn.textContent?.includes('Celestium Neon'),
    );
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking a theme card calls setTheme with correct ID', async () => {
    const user = await openPanel();
    const awsButton = screen.getAllByRole('button').find(
      (btn) => btn.hasAttribute('aria-pressed') && btn.textContent?.includes('AWS Console After Dark'),
    );
    expect(awsButton).toBeTruthy();
    await user.click(awsButton!);
    expect(mockSetTheme).toHaveBeenCalledWith('aws-console-after-dark');
  });

  it('closes panel when close button is clicked', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: /close theme panel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes panel on Escape key', async () => {
    await openPanel();
    const dialog = screen.getByRole('dialog');
    // Focus inside the dialog to ensure keyboard event routes properly
    const closeBtn = screen.getByRole('button', { name: /close theme panel/i });
    closeBtn.focus();
    // Fire Escape keydown — it bubbles from close button to dialog's onKeyDown handler
    fireEvent.keyDown(closeBtn, { key: 'Escape', code: 'Escape', bubbles: true });
    // Verify the panel transitions to closed state (translate-x-full or translate-y-full)
    await waitFor(() => {
      expect(dialog.className).toContain('opacity-0');
    });
  });

  it('export button calls exportTheme', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: /export json/i }));
    expect(mockExportTheme).toHaveBeenCalledTimes(1);
  });

  it('panel has role="dialog" and aria-modal when open', async () => {
    await openPanel();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
});
