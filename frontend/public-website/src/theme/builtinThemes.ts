import { ThemeTokens, DEFAULT_THEME } from './tokens';

/**
 * AWS Console After Dark
 * Professional dark interface inspired by cloud consoles, with subdued amber accents
 * and high-contrast neutral surfaces.
 */
export const AWS_CONSOLE_AFTER_DARK: ThemeTokens = {
  id: 'aws-console-after-dark',
  name: 'AWS Console After Dark',
  description:
    'Professional dark interface inspired by cloud consoles with subdued amber accents and clean typography',
  colors: {
    primary: '245 158 11',
    primaryHover: '251 191 36',
    secondary: '148 163 184',
    background: '11 18 32',
    backgroundAlt: '15 23 42',
    surface: '17 24 39',
    surfaceAlt: '30 41 59',
    text: '243 244 246',
    textMuted: '203 213 225',
    textInverse: '15 23 42',
    border: '71 85 105',
    borderLight: '51 65 85',
    accent: '251 146 60',
    success: '52 211 153',
    warning: '251 191 36',
    error: '248 113 113',
    info: '56 189 248',
  },
  typography: {
    fontFamily:
      '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilyMono:
      '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    fontSizeBase: '1rem',
    fontSizeScale: 1.2,
    lineHeight: '1.5',
    fontWeightNormal: 400,
    fontWeightBold: 700,
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.35)',
    md: '0 8px 24px rgba(0, 0, 0, 0.32)',
    lg: '0 18px 48px rgba(0, 0, 0, 0.38)',
    glow: '0 0 28px rgba(245, 158, 11, 0.22)',
  },
  motion: {
    durationFast: '120ms',
    durationNormal: '200ms',
    durationSlow: '320ms',
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    reducedMotion: false,
  },
  patterns: {
    type: 'dots',
    opacity: 0.08,
    color: 'rgba(245, 158, 11, 0.2)',
  },
};

/**
 * Glass Circuit
 * Cool blue-teal dark theme with frosted-glass surfaces, luminous circuit accents,
 * and translucent-panel styling.
 */
export const GLASS_CIRCUIT: ThemeTokens = {
  id: 'glass-circuit',
  name: 'Glass Circuit',
  description:
    'Translucent panels with backdrop blur effects, circuit-grid background patterns, and frosted glass borders',
  colors: {
    primary: '45 212 191',
    primaryHover: '94 234 212',
    secondary: '96 165 250',
    background: '5 15 25',
    backgroundAlt: '8 25 40',
    surface: '15 40 55',
    surfaceAlt: '22 58 76',
    text: '236 254 255',
    textMuted: '174 219 224',
    textInverse: '6 24 32',
    border: '56 189 248',
    borderLight: '34 211 238',
    accent: '34 211 238',
    success: '52 211 153',
    warning: '250 204 21',
    error: '251 113 133',
    info: '125 211 252',
  },
  typography: {
    fontFamily:
      '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilyMono:
      '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    fontSizeBase: '1rem',
    fontSizeScale: 1.22,
    lineHeight: '1.55',
    fontWeightNormal: 400,
    fontWeightBold: 700,
  },
  radius: {
    sm: '0.375rem',
    md: '0.75rem',
    lg: '1rem',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.35)',
    md: '0 10px 30px rgba(0, 0, 0, 0.35)',
    lg: '0 24px 64px rgba(0, 0, 0, 0.42)',
    glow: '0 0 32px rgba(45, 212, 191, 0.3)',
  },
  motion: {
    durationFast: '140ms',
    durationNormal: '240ms',
    durationSlow: '420ms',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    reducedMotion: false,
  },
  patterns: {
    type: 'circuit',
    opacity: 0.11,
    color: 'rgba(34, 211, 238, 0.3)',
  },
};

/**
 * Paper Systems
 * A light technical-document theme with paper-toned surfaces, serif typography,
 * dark ink text, and restrained blue accents.
 */
export const PAPER_SYSTEMS: ThemeTokens = {
  id: 'paper-systems',
  name: 'Paper Systems',
  description:
    'Light technical-document aesthetic with serif typography, paper-texture backgrounds, and minimal color',
  colors: {
    primary: '30 64 120',
    primaryHover: '23 49 95',
    secondary: '91 77 61',
    background: '251 247 237',
    backgroundAlt: '246 240 226',
    surface: '255 252 245',
    surfaceAlt: '241 235 221',
    text: '23 32 51',
    textMuted: '75 85 99',
    textInverse: '255 252 245',
    border: '190 180 160',
    borderLight: '222 214 198',
    accent: '127 85 57',
    success: '22 101 52',
    warning: '146 64 14',
    error: '153 27 27',
    info: '30 64 120',
  },
  typography: {
    fontFamily:
      'Georgia, Cambria, "Times New Roman", Times, ui-serif, serif',
    fontFamilyMono:
      '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    fontSizeBase: '1.0625rem',
    fontSizeScale: 1.2,
    lineHeight: '1.65',
    fontWeightNormal: 400,
    fontWeightBold: 700,
  },
  radius: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.5rem',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(23, 32, 51, 0.08)',
    md: '0 6px 18px rgba(23, 32, 51, 0.1)',
    lg: '0 16px 36px rgba(23, 32, 51, 0.14)',
    glow: '0 0 24px rgba(30, 64, 120, 0.14)',
  },
  motion: {
    durationFast: '120ms',
    durationNormal: '180ms',
    durationSlow: '280ms',
    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    reducedMotion: false,
  },
  patterns: {
    type: 'dots',
    opacity: 0.035,
    color: 'rgba(30, 64, 120, 0.15)',
  },
};

/**
 * Terminal Witchcraft
 * Retro green-on-black terminal theme with phosphor glow, monospace typography,
 * and subtle scanline texture.
 */
export const TERMINAL_WITCHCRAFT: ThemeTokens = {
  id: 'terminal-witchcraft',
  name: 'Terminal Witchcraft',
  description:
    'Retro terminal aesthetic with monospace typography, green-on-black color scheme, scanline effects, and cursor-blink animations',
  colors: {
    primary: '34 197 94',
    primaryHover: '74 222 128',
    secondary: '163 230 53',
    background: '3 10 6',
    backgroundAlt: '1 18 10',
    surface: '2 24 14',
    surfaceAlt: '3 36 20',
    text: '187 247 208',
    textMuted: '134 239 172',
    textInverse: '0 20 8',
    border: '22 101 52',
    borderLight: '20 83 45',
    accent: '217 249 157',
    success: '74 222 128',
    warning: '253 224 71',
    error: '248 113 113',
    info: '125 211 252',
  },
  typography: {
    fontFamily:
      '"IBM Plex Mono", "Fira Code", "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    fontFamilyMono:
      '"IBM Plex Mono", "Fira Code", "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    fontSizeBase: '1rem',
    fontSizeScale: 1.18,
    lineHeight: '1.55',
    fontWeightNormal: 400,
    fontWeightBold: 700,
  },
  radius: {
    sm: '0rem',
    md: '0.125rem',
    lg: '0.25rem',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.45)',
    md: '0 8px 22px rgba(0, 0, 0, 0.5)',
    lg: '0 18px 48px rgba(0, 0, 0, 0.6)',
    glow: '0 0 28px rgba(34, 197, 94, 0.38)',
  },
  motion: {
    durationFast: '80ms',
    durationNormal: '140ms',
    durationSlow: '260ms',
    easing: 'steps(2, end)',
    reducedMotion: false,
  },
  patterns: {
    type: 'scanlines',
    opacity: 0.1,
    color: 'rgba(34, 197, 94, 0.25)',
  },
};

/**
 * All built-in themes in display order.
 * The first theme (Celestium Neon) is used as the default for dark preference.
 * Paper Systems is used as the default for light preference.
 */
export const BUILTIN_THEMES: ThemeTokens[] = [
  DEFAULT_THEME,
  AWS_CONSOLE_AFTER_DARK,
  GLASS_CIRCUIT,
  PAPER_SYSTEMS,
  TERMINAL_WITCHCRAFT,
];
