/**
 * Theme Management Types
 *
 * TypeScript interfaces for the theme management API.
 * ThemeTokens mirrors the public website's token structure.
 */

export interface ThemeColors {
  primary: string; // space-separated RGB e.g. "139 92 246"
  primaryHover: string;
  secondary: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderLight: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontFamilyMono: string;
  fontSizeBase: string;
  fontSizeScale: number;
  lineHeight: string;
  fontWeightNormal: number;
  fontWeightBold: number;
}

export interface ThemeRadius {
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface ThemeShadow {
  sm: string;
  md: string;
  lg: string;
  glow: string;
}

export interface ThemeMotion {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  easing: string;
  reducedMotion: boolean;
}

export interface ThemePatterns {
  type: 'none' | 'grid' | 'dots' | 'circuit' | 'scanlines' | 'noise';
  opacity: number;
  color: string;
}

export interface ThemeTokens {
  colors: ThemeColors;
  typography: ThemeTypography;
  radius: ThemeRadius;
  shadow: ThemeShadow;
  motion: ThemeMotion;
  patterns?: ThemePatterns;
}

export interface ThemePreviewColors {
  primary: string;
  background: string;
  surface: string;
  accent: string;
}

/** Full theme object returned by GET /themes/{id} */
export interface Theme {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  is_active: boolean;
  tokens: ThemeTokens;
  custom_css?: string;
  preview_colors: ThemePreviewColors;
  created_at?: number;
  updated_at?: number;
}

/** Lightweight theme object for gallery listing (GET /themes) */
export interface ThemeListItem {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  is_active: boolean;
  preview_colors: ThemePreviewColors;
  created_at?: number;
  updated_at?: number;
}

/** Response from GET /themes */
export interface ThemeListResponse {
  items: ThemeListItem[];
}

/** Request body for POST /themes */
export interface CreateThemePayload {
  name: string;
  description?: string;
  tokens: ThemeTokens;
  custom_css?: string;
}

/** Request body for PUT /themes/{id} */
export interface UpdateThemePayload {
  name?: string;
  description?: string;
  tokens?: ThemeTokens;
  custom_css?: string;
}

/** Response from POST /themes/{id}/activate */
export interface ActivateThemeResponse {
  active_theme_id: string;
}

/** Response from GET /themes/active (public endpoint) */
export interface ActiveThemeResponse {
  id: string;
  name: string;
  tokens: ThemeTokens;
  custom_css?: string;
}
