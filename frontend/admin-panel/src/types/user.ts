export type UserRole = 'admin' | 'editor' | 'author' | 'viewer';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  created_at: number;
  last_login: number;
}

export interface UserUpdate {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}
