import { vi } from 'vitest';
import type { AuthContextType } from '../../contexts/AuthContext';
import type { User, UserRole } from '../../types';
import { createMockUser } from '../mocks/data';

export interface MockAuthOptions {
  isAuthenticated?: boolean;
  isLoading?: boolean;
  user?: Partial<User> | null;
  role?: UserRole;
}

export function createMockAuthContext(options: MockAuthOptions = {}): AuthContextType {
  const {
    isAuthenticated = true,
    isLoading = false,
    role = 'admin',
  } = options;

  const user = options.user === null
    ? null
    : createMockUser({ role, ...options.user });

  return {
    user,
    isLoading,
    isAuthenticated,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    refreshUser: vi.fn().mockResolvedValue(undefined),
  };
}
