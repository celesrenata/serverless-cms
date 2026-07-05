import { useContext } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../useAuth';
import { AuthContext } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth';
import type { UserRole } from '../../types';

vi.mock('../../services/auth', () => ({
  AuthService: {
    isAuthenticated: vi.fn(),
    getIdToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'password123';

function createFakeJwt(payload: Record<string, unknown>) {
  const header = { alg: 'none', typ: 'JWT' };
  return `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(payload))}.signature`;
}

function createUserPayload(role: UserRole = 'admin') {
  return {
    sub: 'user-123',
    email: TEST_EMAIL,
    'cognito:username': 'admin-user',
    name: 'Admin User',
    'custom:role': role,
  };
}

function TestConsumer() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('TestConsumer must be used within AuthProvider');
  }

  return (
    <div>
      <div data-testid="is-loading">{String(auth.isLoading)}</div>
      <div data-testid="is-authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="user">{auth.user ? 'present' : 'null'}</div>
      <div data-testid="user-id">{auth.user?.id ?? ''}</div>
      <div data-testid="user-email">{auth.user?.email ?? ''}</div>
      <div data-testid="user-username">{auth.user?.username ?? ''}</div>
      <div data-testid="user-display-name">{auth.user?.display_name ?? ''}</div>
      <div data-testid="user-role">{auth.user?.role ?? ''}</div>

      <button
        type="button"
        data-testid="login-button"
        onClick={() => {
          void auth.login(TEST_EMAIL, TEST_PASSWORD);
        }}
      >
        Sign in
      </button>

      <button type="button" data-testid="logout-button" onClick={auth.logout}>
        Sign out
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(AuthService.isAuthenticated).mockResolvedValue(false);
    vi.mocked(AuthService.getIdToken).mockReturnValue(null);
    vi.mocked(AuthService.login).mockResolvedValue({
      idToken: 'id-token',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    vi.mocked(AuthService.logout).mockImplementation(() => undefined);
    vi.mocked(AuthService.refreshToken).mockResolvedValue(null);
  });

  it('starts unauthenticated when there are no stored credentials', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });

    expect(AuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('user-role').textContent).toBe('');
  });

  it('transitions to authenticated state on sign-in with user details and role', async () => {
    const user = userEvent.setup();
    const idToken = createFakeJwt(createUserPayload('admin'));

    vi.mocked(AuthService.getIdToken).mockReturnValue(idToken);
    vi.mocked(AuthService.login).mockResolvedValue({
      idToken,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');

    await user.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    });

    expect(AuthService.login).toHaveBeenCalledWith(TEST_EMAIL, TEST_PASSWORD);
    expect(screen.getByTestId('user').textContent).toBe('present');
    expect(screen.getByTestId('user-id').textContent).toBe('user-123');
    expect(screen.getByTestId('user-email').textContent).toBe(TEST_EMAIL);
    expect(screen.getByTestId('user-username').textContent).toBe('admin-user');
    expect(screen.getByTestId('user-display-name').textContent).toBe('Admin User');
    expect(screen.getByTestId('user-role').textContent).toBe('admin');
  });

  it('reverts to unauthenticated state on sign-out', async () => {
    const idToken = createFakeJwt(createUserPayload('editor'));

    vi.mocked(AuthService.isAuthenticated).mockResolvedValue(true);
    vi.mocked(AuthService.getIdToken).mockReturnValue(idToken);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    });

    expect(screen.getByTestId('user').textContent).toBe('present');
    expect(screen.getByTestId('user-role').textContent).toBe('editor');

    act(() => {
      screen.getByTestId('logout-button').click();
    });

    expect(AuthService.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('user-role').textContent).toBe('');
  });

  it.each<UserRole>(['admin', 'editor', 'author', 'viewer'])(
    'correctly parses the "%s" role from the ID token',
    async (role) => {
      const idToken = createFakeJwt(createUserPayload(role));

      vi.mocked(AuthService.isAuthenticated).mockResolvedValue(true);
      vi.mocked(AuthService.getIdToken).mockReturnValue(idToken);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
      });

      expect(screen.getByTestId('user').textContent).toBe('present');
      expect(screen.getByTestId('user-role').textContent).toBe(role);
    },
  );
});
