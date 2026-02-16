/// <reference types="vite/client" />
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { AuthTokens } from '../types';

// Extend Window interface for temporary Cognito user storage
declare global {
  interface Window {
    __cognitoUserForPasswordChange?: CognitoUser;
  }
}

// Custom error type for new password requirement
interface NewPasswordRequiredError extends Error {
  code: string;
}

// These should be configured via environment variables
const poolData = {
  UserPoolId: import.meta.env.VITE_USER_POOL_ID || '',
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
};

// Validate configuration
if (!poolData.UserPoolId || !poolData.ClientId) {
  console.error('Cognito configuration missing:', {
    hasUserPoolId: !!poolData.UserPoolId,
    hasClientId: !!poolData.ClientId,
  });
}

const userPool = new CognitoUserPool(poolData);

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login(email: string, password: string): Promise<AuthTokens> {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          const tokens: AuthTokens = {
            accessToken: session.getAccessToken().getJwtToken(),
            idToken: session.getIdToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
          };
          
          // Store tokens in localStorage
          this.storeTokens(tokens);
          
          resolve(tokens);
        },
        onFailure: (err) => {
          reject(err);
        },
        newPasswordRequired: (_userAttributes, _requiredAttributes) => {
          // Store the user object for password change
          window.__cognitoUserForPasswordChange = cognitoUser;
          // Reject with a specific error code so the UI can handle it
          const error = new Error('New password required') as NewPasswordRequiredError;
          error.code = 'NewPasswordRequired';
          reject(error);
        },
      });
    });
  }

  /**
   * Complete new password challenge
   */
  static async completeNewPassword(newPassword: string): Promise<AuthTokens> {
    return new Promise((resolve, reject) => {
      const cognitoUser = window.__cognitoUserForPasswordChange;
      
      if (!cognitoUser) {
        reject(new Error('No pending password change'));
        return;
      }

      cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
        onSuccess: (session: CognitoUserSession) => {
          const tokens: AuthTokens = {
            accessToken: session.getAccessToken().getJwtToken(),
            idToken: session.getIdToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
          };
          
          // Store tokens and clean up
          this.storeTokens(tokens);
          delete window.__cognitoUserForPasswordChange;
          
          resolve(tokens);
        },
        onFailure: (err: Error) => {
          reject(err);
        },
      });
    });
  }

  /**
   * Logout current user
   */
  static logout(): void {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    this.clearTokens();
  }

  /**
   * Get current user session
   */
  static async getCurrentSession(): Promise<CognitoUserSession | null> {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          resolve(null);
          return;
        }
        
        resolve(session);
      });
    });
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(): Promise<AuthTokens | null> {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        console.log('refreshToken: No current user found');
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err) {
          console.error('refreshToken: getSession error:', err);
          resolve(null);
          return;
        }
        
        if (!session) {
          console.log('refreshToken: No session returned');
          resolve(null);
          return;
        }

        if (session.isValid()) {
          console.log('refreshToken: Session is valid, returning tokens');
          const tokens: AuthTokens = {
            accessToken: session.getAccessToken().getJwtToken(),
            idToken: session.getIdToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
          };
          
          this.storeTokens(tokens);
          resolve(tokens);
        } else {
          console.log('refreshToken: Session is invalid');
          resolve(null);
        }
      });
    });
  }

  /**
   * Get stored access token
   */
  static getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Get stored ID token
   */
  static getIdToken(): string | null {
    return localStorage.getItem('idToken');
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session !== null && session.isValid();
  }

  /**
   * Store tokens in localStorage
   */
  private static storeTokens(tokens: AuthTokens): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('idToken', tokens.idToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  /**
   * Clear tokens from localStorage
   */
  private static clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
  }
}
