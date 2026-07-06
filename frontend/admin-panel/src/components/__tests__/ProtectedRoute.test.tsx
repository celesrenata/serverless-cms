import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { ProtectedRoute } from '../ProtectedRoute';

describe('ProtectedRoute', () => {
  it('shows loading state when isLoading is true', () => {
    renderWithProviders(
      <ProtectedRoute>
        <p>Protected Content</p>
      </ProtectedRoute>,
      {
        authState: {
          isLoading: true,
          isAuthenticated: false,
        },
      }
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('does not render children when unauthenticated', () => {
    renderWithProviders(
      <ProtectedRoute>
        <p>Protected Content</p>
      </ProtectedRoute>,
      {
        authState: {
          isLoading: false,
          isAuthenticated: false,
        },
      }
    );

    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('renders children when authenticated', () => {
    renderWithProviders(
      <ProtectedRoute>
        <p>Protected Content</p>
      </ProtectedRoute>,
      {
        authState: {
          isLoading: false,
          isAuthenticated: true,
        },
      }
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
