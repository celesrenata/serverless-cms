import { useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthService } from '../services/auth';
import { User } from '../types';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const authenticated = await AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        // Fetch user profile from API
        await fetchUserProfile();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const fetchUserProfile = async () => {
    try {
      // This will be implemented when API client is ready
      // For now, we'll set a placeholder
      const token = AuthService.getIdToken();
      if (token) {
        // Parse JWT to get user info (temporary until API is ready)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          username: payload['cognito:username'] || payload.email,
          display_name: payload.name || payload.email,
          role: payload['custom:role'] || 'viewer',
          created_at: Date.now() / 1000,
          last_login: Date.now() / 1000,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await AuthService.login(email, password);
      setIsAuthenticated(true);
      await fetchUserProfile();
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUserProfile();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
