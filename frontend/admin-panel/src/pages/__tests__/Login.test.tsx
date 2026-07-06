import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockAuthContext } from '../../test/utils/createMockAuthContext';
import { Login } from '../Login';
import { useAuth } from '../../hooks/useAuthContext';

vi.mock('../../hooks/useAuthContext');

describe('Login', () => {
  let mockLogin: ReturnType<typeof vi.fn>;

  const mockUseAuth = (
    overrides: Partial<ReturnType<typeof createMockAuthContext>> = {},
  ) => {
    vi.mocked(useAuth).mockReturnValue({
      ...createMockAuthContext({
        isAuthenticated: false,
        isLoading: false,
      }),
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      ...overrides,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogin = vi.fn().mockResolvedValue(undefined);
    mockUseAuth();
  });

  it('renders email and password input fields with a login button', () => {
    renderWithProviders(<Login />);

    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls the login function from auth context with email and password on form submission', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText('Email address'), 'admin@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'ValidPassword123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@example.com', 'ValidPassword123!');
    });
  });

  it('shows an error message on failed login', async () => {
    const user = userEvent.setup();

    mockLogin.mockRejectedValueOnce({
      code: 'NotAuthorizedException',
      message: 'Incorrect email or password.',
    });

    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText('Email address'), 'admin@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'WrongPassword123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Incorrect email or password.')).toBeInTheDocument();
    });
  });

  it('redirects already-authenticated users', () => {
    mockUseAuth({
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithProviders(<Login />);

    expect(screen.queryByPlaceholderText('Email address')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });
});
