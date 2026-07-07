import axios from 'axios';
import { AuthService } from './auth';
import type {
  Theme,
  ThemeListResponse,
  CreateThemePayload,
  UpdateThemePayload,
  ActivateThemeResponse,
  ActiveThemeResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_ENDPOINT || '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = AuthService.getIdToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/** GET /api/v1/themes — list all themes (builtin + custom) */
export async function getThemes(): Promise<ThemeListResponse> {
  const response = await axios.get<ThemeListResponse>(`${BASE_URL}/themes`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

/** GET /api/v1/themes/{id} — get a single theme with full tokens */
export async function getTheme(id: string): Promise<Theme> {
  const response = await axios.get<Theme>(`${BASE_URL}/themes/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

/** POST /api/v1/themes — create a new custom theme */
export async function createTheme(data: CreateThemePayload): Promise<Theme> {
  const response = await axios.post<Theme>(`${BASE_URL}/themes`, data, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  return response.data;
}

/** PUT /api/v1/themes/{id} — update a custom theme */
export async function updateTheme(id: string, data: UpdateThemePayload): Promise<Theme> {
  const response = await axios.put<Theme>(`${BASE_URL}/themes/${id}`, data, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  return response.data;
}

/** DELETE /api/v1/themes/{id} — delete a custom theme */
export async function deleteTheme(id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/themes/${id}`, {
    headers: getAuthHeaders(),
  });
}

/** POST /api/v1/themes/{id}/activate — set a theme as site-wide default */
export async function activateTheme(id: string): Promise<ActivateThemeResponse> {
  const response = await axios.post<ActivateThemeResponse>(
    `${BASE_URL}/themes/${id}/activate`,
    {},
    { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } },
  );
  return response.data;
}

/** POST /api/v1/themes/{id}/duplicate — duplicate a theme */
export async function duplicateTheme(id: string): Promise<Theme> {
  const response = await axios.post<Theme>(
    `${BASE_URL}/themes/${id}/duplicate`,
    {},
    { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } },
  );
  return response.data;
}

/** GET /api/v1/themes/active — public endpoint, get active theme tokens */
export async function getActiveTheme(): Promise<ActiveThemeResponse> {
  const response = await axios.get<ActiveThemeResponse>(`${BASE_URL}/themes/active`);
  return response.data;
}
