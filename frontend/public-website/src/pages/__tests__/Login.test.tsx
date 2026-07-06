import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from '../Login';
import { api } from '../../services/api';
import { createMockSettings } from '../../test/mocks/data';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

vi.mock('../../services/api', () => ({
  api: {
    getPublicSettings: vi.fn(),
  },
}));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.getPublicSettings).mockResolvedValue(
      createMockSettings({
        registration_enabled: false,
      })
    );
  });

  it('renders email and password input fields with a submit button', () => {
    renderWithProviders(<Login />);

    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
