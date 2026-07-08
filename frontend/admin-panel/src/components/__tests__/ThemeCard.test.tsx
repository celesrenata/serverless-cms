import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeCard } from '../ThemeCard';
import type { ThemeListItem } from '../../types/theme';

function makeTheme(overrides: Partial<ThemeListItem> = {}): ThemeListItem {
  return {
    id: 'test-theme-1',
    name: 'Test Theme',
    description: 'A test theme description',
    builtin: false,
    is_active: false,
    preview_colors: {
      primary: '139 92 246',
      background: '3 7 18',
      surface: '30 41 59',
      accent: '34 211 238',
    },
    ...overrides,
  };
}

describe('ThemeCard', () => {
  const defaultProps = {
    onActivate: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onExport: vi.fn(),
  };

  it('renders theme name and description', () => {
    render(<ThemeCard theme={makeTheme()} {...defaultProps} />);
    expect(screen.getByText('Test Theme')).toBeInTheDocument();
    expect(screen.getByText('A test theme description')).toBeInTheDocument();
  });

  it('shows "No description" when description is empty', () => {
    render(<ThemeCard theme={makeTheme({ description: '' })} {...defaultProps} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('shows Active badge when theme is active', () => {
    render(<ThemeCard theme={makeTheme({ is_active: true })} {...defaultProps} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('does not show Active badge when theme is not active', () => {
    render(<ThemeCard theme={makeTheme({ is_active: false })} {...defaultProps} />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('shows Built-in badge for builtin themes', () => {
    render(<ThemeCard theme={makeTheme({ builtin: true })} {...defaultProps} />);
    expect(screen.getByText('Built-in')).toBeInTheDocument();
  });

  it('does not show Built-in badge for custom themes', () => {
    render(<ThemeCard theme={makeTheme({ builtin: false })} {...defaultProps} />);
    expect(screen.queryByText('Built-in')).not.toBeInTheDocument();
  });

  it('shows Delete button for non-builtin, non-active themes', () => {
    render(
      <ThemeCard
        theme={makeTheme({ builtin: false, is_active: false })}
        {...defaultProps}
      />,
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides Delete button for builtin themes', () => {
    render(
      <ThemeCard
        theme={makeTheme({ builtin: true, is_active: false })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('hides Delete button for the active theme', () => {
    render(
      <ThemeCard
        theme={makeTheme({ builtin: false, is_active: true })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('hides Activate button for already-active theme', () => {
    render(<ThemeCard theme={makeTheme({ is_active: true })} {...defaultProps} />);
    expect(screen.queryByText('Activate')).not.toBeInTheDocument();
  });

  it('shows Activate button for non-active themes', () => {
    render(<ThemeCard theme={makeTheme({ is_active: false })} {...defaultProps} />);
    expect(screen.getByText('Activate')).toBeInTheDocument();
  });

  it('always shows Duplicate and Export JSON buttons', () => {
    render(<ThemeCard theme={makeTheme()} {...defaultProps} />);
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
  });

  it('calls onActivate with theme ID when Activate is clicked', () => {
    const onActivate = vi.fn();
    render(
      <ThemeCard theme={makeTheme()} {...defaultProps} onActivate={onActivate} />,
    );
    fireEvent.click(screen.getByText('Activate'));
    expect(onActivate).toHaveBeenCalledWith('test-theme-1');
  });

  it('calls onDuplicate with theme ID when Duplicate is clicked', () => {
    const onDuplicate = vi.fn();
    render(
      <ThemeCard theme={makeTheme()} {...defaultProps} onDuplicate={onDuplicate} />,
    );
    fireEvent.click(screen.getByText('Duplicate'));
    expect(onDuplicate).toHaveBeenCalledWith('test-theme-1');
  });

  it('calls onDelete with theme ID when Delete is clicked', () => {
    const onDelete = vi.fn();
    render(
      <ThemeCard theme={makeTheme()} {...defaultProps} onDelete={onDelete} />,
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('test-theme-1');
  });

  it('calls onExport with theme object when Export JSON is clicked', () => {
    const onExport = vi.fn();
    const theme = makeTheme();
    render(<ThemeCard theme={theme} {...defaultProps} onExport={onExport} />);
    fireEvent.click(screen.getByText('Export JSON'));
    expect(onExport).toHaveBeenCalledWith(theme);
  });

  it('shows Activating... text when isActivating is true', () => {
    render(
      <ThemeCard theme={makeTheme()} {...defaultProps} isActivating={true} />,
    );
    expect(screen.getByText('Activating...')).toBeInTheDocument();
  });

  it('shows Duplicating... text when isDuplicating is true', () => {
    render(
      <ThemeCard theme={makeTheme()} {...defaultProps} isDuplicating={true} />,
    );
    expect(screen.getByText('Duplicating...')).toBeInTheDocument();
  });

  it('shows Deleting... text when isDeleting is true', () => {
    render(
      <ThemeCard theme={makeTheme()} {...defaultProps} isDeleting={true} />,
    );
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('renders color swatches from preview_colors', () => {
    const { container } = render(
      <ThemeCard theme={makeTheme()} {...defaultProps} />,
    );
    // There should be 4 swatch divs with background colors
    const swatchContainer = container.querySelector('.flex.h-16');
    expect(swatchContainer).toBeInTheDocument();
    expect(swatchContainer?.children.length).toBe(4);
  });
});
