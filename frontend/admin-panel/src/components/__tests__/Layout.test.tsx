import { beforeEach, describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { AdminLayout } from '../Layout/AdminLayout';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sidebar navigation links', () => {
    renderWithProviders(<AdminLayout />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Plugins')).toBeInTheDocument();
  });

  it('renders header with user information', () => {
    renderWithProviders(<AdminLayout />);

    expect(screen.getByText('Jane Editor')).toBeInTheDocument();
  });

  it('renders main content area', () => {
    renderWithProviders(<AdminLayout />);

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
