export type UserRole = 'admin' | 'editor' | 'author' | 'viewer';

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string; // Display name from backend
  display_name?: string; // Legacy field
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  created_at: number;
  last_login: number;
}

export interface UserUpdate {
  name?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}
