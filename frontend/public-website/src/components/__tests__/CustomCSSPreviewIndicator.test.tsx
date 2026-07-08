import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomCSSPreviewIndicator } from '../CustomCSSPreviewIndicator';

const mockDismissPreview = vi.fn();

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: vi.fn(() => ({
    isPreviewActive: true,
    dismissPreview: mockDismissPreview,
  })),
}));

// Access the mock so we can change return values per test
import { useTheme } from '../../theme/ThemeProvider';
const mockUseTheme = vi.mocked(useTheme);

describe('CustomCSSPreviewIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReturnValue({
      isPreviewActive: true,
      dismissPreview: mockDismissPreview,
    } as unknown as ReturnType<typeof useTheme>);
  });

  it('renders nothing when preview is not active', () => {
    mockUseTheme.mockReturnValue({
      isPreviewActive: false,
      dismissPreview: mockDismissPreview,
    } as unknown as ReturnType<typeof useTheme>);

    const { container } = render(<CustomCSSPreviewIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('renders badge when preview is active', () => {
    render(<CustomCSSPreviewIndicator />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('CSS Preview Active')).toBeInTheDocument();
  });

  it('has aria-live="polite" for accessibility', () => {
    render(<CustomCSSPreviewIndicator />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('has a dismiss button with accessible label', () => {
    render(<CustomCSSPreviewIndicator />);

    const button = screen.getByRole('button', { name: /dismiss css preview/i });
    expect(button).toBeInTheDocument();
  });

  it('calls dismissPreview when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    render(<CustomCSSPreviewIndicator />);

    const button = screen.getByRole('button', { name: /dismiss css preview/i });
    await user.click(button);

    expect(mockDismissPreview).toHaveBeenCalledTimes(1);
  });
});
