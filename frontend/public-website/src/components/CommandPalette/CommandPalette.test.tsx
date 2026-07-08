import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommandPalette from './CommandPalette';

const { mockNavigate, mockSetTheme } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetTheme: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => mockNavigate),
}));

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: vi.fn(() => ({
    activeTheme: 'celestium-neon',
    setTheme: mockSetTheme,
    tokens: { id: 'celestium-neon', name: 'Celestium Neon' },
    builtinThemes: [],
    customTheme: null,
    isPreviewActive: false,
    applyCustomTheme: vi.fn(),
    exportTheme: vi.fn(),
    importTheme: vi.fn(),
    previewCSS: vi.fn(),
    saveCustomCSS: vi.fn(),
    dismissPreview: vi.fn(),
    motionOverride: 'system' as const,
    setMotionOverride: vi.fn(),
  })),
}));

function getActionItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[role="option"]'));
}

function getSelectedIndex(): number {
  return getActionItems().findIndex(
    (item) => item.getAttribute('aria-selected') === 'true',
  );
}

async function openPalette() {
  const user = userEvent.setup();
  render(<CommandPalette />);
  await user.click(screen.getByLabelText(/open command palette/i));
  await screen.findByRole('dialog');
  return user;
}

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the mobile trigger button', () => {
    render(<CommandPalette />);
    expect(screen.getByLabelText(/open command palette/i)).toBeInTheDocument();
  });

  it('opens when the trigger button is clicked', async () => {
    await openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens with the Ctrl+K keyboard shortcut', async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('closes with the Escape key', async () => {
    await openPalette();
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows all 12 actions when search is empty', async () => {
    await openPalette();
    await waitFor(() => {
      expect(getActionItems()).toHaveLength(12);
    });
  });

  it('filters results when typing in the search input', async () => {
    const user = await openPalette();
    const input = screen.getByPlaceholderText(/search pages/i);
    await user.type(input, 'blog');
    await waitFor(() => {
      const items = getActionItems();
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThan(12);
    });
  });

  it('navigates with ArrowDown key', async () => {
    await openPalette();
    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(getSelectedIndex()).toBe(0);
    });
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(getSelectedIndex()).toBe(1);
    });
  });

  it('executes action and closes on Enter', async () => {
    await openPalette();
    const dialog = screen.getByRole('dialog');
    // First item is "Go to Home" which calls navigate('/')
    fireEvent.keyDown(dialog, { key: 'Enter' });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes when clicking backdrop', async () => {
    await openPalette();
    // The backdrop is the outer fixed div wrapping the dialog
    const backdrop = screen.getByRole('dialog').parentElement!;
    fireEvent.mouseDown(backdrop);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
