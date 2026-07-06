/// <reference types="vitest" />

const cognitoMocks = vi.hoisted(() => {
  type AuthenticateUserCallbacks = {
    onSuccess: (session: unknown) => void;
    onFailure: (err: Error) => void;
    newPasswordRequired: (userAttributes: unknown, requiredAttributes: unknown) => void;
  };

  type GetSessionCallback = (err: Error | null, session: unknown | null) => void;

  const state: {
    authenticateUserCallbacks?: AuthenticateUserCallbacks;
    getSessionCallback?: GetSessionCallback;
    completeNewPasswordCallbacks?: { onSuccess: (session: unknown) => void; onFailure: (err: Error) => void };
  } = {};

  const mockGetCurrentUser = vi.fn();

  const mockAuthenticateUser = vi.fn((_authenticationDetails: unknown, callbacks: AuthenticateUserCallbacks) => {
    state.authenticateUserCallbacks = callbacks;
  });

  const mockGetSession = vi.fn((callback: GetSessionCallback) => {
    state.getSessionCallback = callback;
  });

  const mockSignOut = vi.fn();

  const mockCompleteNewPasswordChallenge = vi.fn(
    (_newPassword: string, _userAttributes: Record<string, unknown>, callbacks: { onSuccess: (session: unknown) => void; onFailure: (err: Error) => void }) => {
      state.completeNewPasswordCallbacks = callbacks;
    },
  );

  const mockCognitoUserInstance = {
    authenticateUser: mockAuthenticateUser,
    getSession: mockGetSession,
    signOut: mockSignOut,
    completeNewPasswordChallenge: mockCompleteNewPasswordChallenge,
  };

  const mockCognitoUserPoolInstance = {
    getCurrentUser: mockGetCurrentUser,
  };

  const CognitoUserPool = vi.fn(function () {
    return mockCognitoUserPoolInstance;
  });

  const CognitoUser = vi.fn(function () {
    return mockCognitoUserInstance;
  });

  const AuthenticationDetails = vi.fn(function (details: unknown) {
    return details;
  });

  const CognitoUserSession = vi.fn();

  return {
    state,
    mockGetCurrentUser,
    mockAuthenticateUser,
    mockGetSession,
    mockSignOut,
    mockCompleteNewPasswordChallenge,
    mockCognitoUserInstance,
    mockCognitoUserPoolInstance,
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
    CognitoUserSession,
  };
});

vi.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: cognitoMocks.CognitoUserPool,
  CognitoUser: cognitoMocks.CognitoUser,
  AuthenticationDetails: cognitoMocks.AuthenticationDetails,
  CognitoUserSession: cognitoMocks.CognitoUserSession,
}));

import { AuthService } from '../auth';

const DEFAULT_TOKENS = {
  accessToken: 'mock-access-token',
  idToken: 'mock-id-token',
  refreshToken: 'mock-refresh-token',
};

function createMockSession(
  options: {
    isValid?: boolean;
    tokens?: typeof DEFAULT_TOKENS;
  } = {},
) {
  const { isValid = true, tokens = DEFAULT_TOKENS } = options;

  return {
    getAccessToken: vi.fn(() => ({
      getJwtToken: vi.fn(() => tokens.accessToken),
    })),
    getIdToken: vi.fn(() => ({
      getJwtToken: vi.fn(() => tokens.idToken),
    })),
    getRefreshToken: vi.fn(() => ({
      getToken: vi.fn(() => tokens.refreshToken),
    })),
    isValid: vi.fn(() => isValid),
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    cognitoMocks.mockGetCurrentUser.mockReturnValue(null);

    cognitoMocks.state.authenticateUserCallbacks = undefined;
    cognitoMocks.state.getSessionCallback = undefined;
    cognitoMocks.state.completeNewPasswordCallbacks = undefined;

    delete (window as Window & { __cognitoUserForPasswordChange?: unknown }).__cognitoUserForPasswordChange;
  });

  describe('login', () => {
    it('stores tokens in localStorage and returns AuthTokens on successful authentication', async () => {
      const loginPromise = AuthService.login('admin@example.com', 'password123');

      expect(cognitoMocks.AuthenticationDetails).toHaveBeenCalledWith({
        Username: 'admin@example.com',
        Password: 'password123',
      });

      expect(cognitoMocks.CognitoUser).toHaveBeenCalledWith({
        Username: 'admin@example.com',
        Pool: cognitoMocks.mockCognitoUserPoolInstance,
      });

      expect(cognitoMocks.mockAuthenticateUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.state.authenticateUserCallbacks).toBeDefined();

      const session = createMockSession();
      cognitoMocks.state.authenticateUserCallbacks!.onSuccess(session);

      const result = await loginPromise;

      expect(result).toEqual(DEFAULT_TOKENS);
      expect(localStorage.getItem('accessToken')).toBe(DEFAULT_TOKENS.accessToken);
      expect(localStorage.getItem('idToken')).toBe(DEFAULT_TOKENS.idToken);
      expect(localStorage.getItem('refreshToken')).toBe(DEFAULT_TOKENS.refreshToken);
    });

    it('rejects with error on failed authentication', async () => {
      const authError = new Error('Invalid credentials');

      const loginPromise = AuthService.login('admin@example.com', 'wrong-password');

      expect(cognitoMocks.mockAuthenticateUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.state.authenticateUserCallbacks).toBeDefined();

      cognitoMocks.state.authenticateUserCallbacks!.onFailure(authError);

      await expect(loginPromise).rejects.toBe(authError);

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('idToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it("rejects with error code 'NewPasswordRequired' on newPasswordRequired challenge", async () => {
      const loginPromise = AuthService.login('admin@example.com', 'temporary-password');

      expect(cognitoMocks.mockAuthenticateUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.state.authenticateUserCallbacks).toBeDefined();

      cognitoMocks.state.authenticateUserCallbacks!.newPasswordRequired({}, []);

      await expect(loginPromise).rejects.toMatchObject({
        message: 'New password required',
        code: 'NewPasswordRequired',
      });

      expect(
        (window as Window & { __cognitoUserForPasswordChange?: unknown }).__cognitoUserForPasswordChange,
      ).toBe(cognitoMocks.mockCognitoUserInstance);

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('idToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('logout', () => {
    it('calls cognitoUser.signOut() and clears localStorage tokens', () => {
      localStorage.setItem('accessToken', 'stored-access-token');
      localStorage.setItem('idToken', 'stored-id-token');
      localStorage.setItem('refreshToken', 'stored-refresh-token');

      cognitoMocks.mockGetCurrentUser.mockReturnValue(cognitoMocks.mockCognitoUserInstance);

      AuthService.logout();

      expect(cognitoMocks.mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.mockSignOut).toHaveBeenCalledTimes(1);

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('idToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('getCurrentSession', () => {
    it('returns session when user exists and session is valid', async () => {
      const session = createMockSession({ isValid: true });

      cognitoMocks.mockGetCurrentUser.mockReturnValue(cognitoMocks.mockCognitoUserInstance);

      const sessionPromise = AuthService.getCurrentSession();

      expect(cognitoMocks.mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.mockGetSession).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.state.getSessionCallback).toBeDefined();

      cognitoMocks.state.getSessionCallback!(null, session);

      const result = await sessionPromise;
      expect(result).toBe(session);
    });

    it('returns null when no current user exists', async () => {
      cognitoMocks.mockGetCurrentUser.mockReturnValue(null);

      const result = await AuthService.getCurrentSession();

      expect(result).toBeNull();
      expect(cognitoMocks.mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.mockGetSession).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('returns tokens when session is valid', async () => {
      const session = createMockSession({ isValid: true });

      cognitoMocks.mockGetCurrentUser.mockReturnValue(cognitoMocks.mockCognitoUserInstance);

      const refreshPromise = AuthService.refreshToken();

      expect(cognitoMocks.mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.mockGetSession).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.state.getSessionCallback).toBeDefined();

      cognitoMocks.state.getSessionCallback!(null, session);

      const result = await refreshPromise;

      expect(result).toEqual(DEFAULT_TOKENS);
      expect(session.isValid).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('accessToken')).toBe(DEFAULT_TOKENS.accessToken);
      expect(localStorage.getItem('idToken')).toBe(DEFAULT_TOKENS.idToken);
      expect(localStorage.getItem('refreshToken')).toBe(DEFAULT_TOKENS.refreshToken);
    });

    it('returns null when no session exists', async () => {
      cognitoMocks.mockGetCurrentUser.mockReturnValue(cognitoMocks.mockCognitoUserInstance);

      const refreshPromise = AuthService.refreshToken();

      expect(cognitoMocks.mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.mockGetSession).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.state.getSessionCallback).toBeDefined();

      cognitoMocks.state.getSessionCallback!(null, null);

      const result = await refreshPromise;

      expect(result).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('idToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('getAccessToken and getIdToken', () => {
    it('reads tokens from localStorage', () => {
      localStorage.setItem('accessToken', 'stored-access-token');
      localStorage.setItem('idToken', 'stored-id-token');

      expect(AuthService.getAccessToken()).toBe('stored-access-token');
      expect(AuthService.getIdToken()).toBe('stored-id-token');
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when session is valid', async () => {
      const session = createMockSession({ isValid: true });

      cognitoMocks.mockGetCurrentUser.mockReturnValue(cognitoMocks.mockCognitoUserInstance);

      const authenticatedPromise = AuthService.isAuthenticated();

      expect(cognitoMocks.mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.mockGetSession).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.state.getSessionCallback).toBeDefined();

      cognitoMocks.state.getSessionCallback!(null, session);

      const result = await authenticatedPromise;

      expect(result).toBe(true);
      expect(session.isValid).toHaveBeenCalledTimes(1);
    });

    it('returns false when session is invalid', async () => {
      const session = createMockSession({ isValid: false });

      cognitoMocks.mockGetCurrentUser.mockReturnValue(cognitoMocks.mockCognitoUserInstance);

      const authenticatedPromise = AuthService.isAuthenticated();

      expect(cognitoMocks.mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.mockGetSession).toHaveBeenCalledTimes(1);
      expect(cognitoMocks.state.getSessionCallback).toBeDefined();

      cognitoMocks.state.getSessionCallback!(null, session);

      const result = await authenticatedPromise;

      expect(result).toBe(false);
      expect(session.isValid).toHaveBeenCalledTimes(1);
    });
  });
});
