import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  ThemeTokens,
  TokenValidationResult,
  validateTokens,
  DEFAULT_THEME,
} from './tokens';
import { BUILTIN_THEMES } from './builtinThemes';

// --- Storage keys ---
const ACTIVE_THEME_KEY = 'celestium.theme.active';
const CUSTOM_THEME_KEY = 'celestium.theme.custom';
const MOTION_OVERRIDE_KEY = 'celestium.motion.override';

// --- Server active theme response ---
interface ActiveThemeResponse {
  id: string;
  name: string;
  tokens: ThemeTokens;
  custom_css?: string;
}

// --- API base URL ---
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// --- Fetch the server active theme ---
async function fetchActiveTheme(): Promise<ActiveThemeResponse> {
  const response = await fetch(`${API_BASE_URL}/themes/active`);
  if (!response.ok) {
    throw new Error(`Failed to fetch active theme: ${response.status}`);
  }
  return response.json();
}

// --- Public interface ---
export interface ThemeContextValue {
  activeTheme: string;
  tokens: ThemeTokens;
  builtinThemes: ThemeTokens[];
  customTheme: ThemeTokens | null;
  isPreviewActive: boolean;
  isServerThemeLoading: boolean;
  setTheme: (themeId: string) => void;
  applyCustomTheme: (tokens: ThemeTokens) => void;
  exportTheme: () => void;
  importTheme: (json: string) => TokenValidationResult;
  previewCSS: (css: string) => void;
  saveCustomCSS: () => void;
  dismissPreview: () => void;
  motionOverride: 'system' | 'reduce' | 'no-preference';
  setMotionOverride: (pref: 'system' | 'reduce' | 'no-preference') => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// --- Built-in themes loaded from builtinThemes.ts ---

// --- localStorage helpers (all reads wrapped in try/catch per Req 14.5/17.4) ---
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently fail — Req 17.4
  }
}

// --- Determine initial theme ID ---
function resolveInitialTheme(): string {
  const stored = safeGetItem(ACTIVE_THEME_KEY);

  // Req 4.4: restore from localStorage
  if (stored && BUILTIN_THEMES.some((t) => t.id === stored)) {
    return stored;
  }

  // Check if stored ID matches a custom theme in storage (Req 17.2)
  if (stored) {
    const customStored = safeGetItem(CUSTOM_THEME_KEY);
    if (customStored) {
      try {
        const parsed = JSON.parse(customStored);
        if (parsed && parsed.id === stored) {
          return stored;
        }
      } catch {
        // Invalid custom theme JSON — fall through
      }
    }
  }

  // Req 4.5/17.5: fall back to system color scheme
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  ) {
    return 'paper-systems';
  }
  return DEFAULT_THEME.id;
}

function resolveInitialCustomTheme(): ThemeTokens | null {
  const stored = safeGetItem(CUSTOM_THEME_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    const result = validateTokens(parsed);
    if (result.valid) {
      return parsed as ThemeTokens;
    }
  } catch {
    // Invalid JSON in storage — ignore
  }
  return null;
}

function resolveInitialMotion(): 'system' | 'reduce' | 'no-preference' {
  const stored = safeGetItem(MOTION_OVERRIDE_KEY);
  if (stored === 'reduce' || stored === 'no-preference') return stored;
  return 'system';
}

// --- Check if user has an explicit theme preference in localStorage ---
function hasUserThemePreference(): boolean {
  return safeGetItem(ACTIVE_THEME_KEY) !== null;
}

// --- Convert camelCase to kebab-case ---
function toKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// --- Build CSS custom properties map from tokens ---
// eslint-disable-next-line react-refresh/only-export-components
export function buildCSSVariables(tokens: ThemeTokens): Map<string, string> {
  const vars = new Map<string, string>();

  // Colors → --color-{kebab}
  for (const [key, value] of Object.entries(tokens.colors)) {
    vars.set(`--color-${toKebab(key)}`, value);
  }

  // Typography → --font-{kebab}
  vars.set('--font-family', tokens.typography.fontFamily);
  vars.set('--font-family-mono', tokens.typography.fontFamilyMono);
  vars.set('--font-size-base', tokens.typography.fontSizeBase);
  vars.set('--font-size-scale', String(tokens.typography.fontSizeScale));
  vars.set('--font-line-height', tokens.typography.lineHeight);
  vars.set('--font-weight-normal', String(tokens.typography.fontWeightNormal));
  vars.set('--font-weight-bold', String(tokens.typography.fontWeightBold));

  // Radius → --radius-{size}
  for (const [key, value] of Object.entries(tokens.radius)) {
    vars.set(`--radius-${key}`, value);
  }

  // Shadow → --shadow-{size}
  for (const [key, value] of Object.entries(tokens.shadow)) {
    vars.set(`--shadow-${key}`, value);
  }

  // Motion → --motion-{kebab}
  vars.set('--motion-duration-fast', tokens.motion.durationFast);
  vars.set('--motion-duration-normal', tokens.motion.durationNormal);
  vars.set('--motion-duration-slow', tokens.motion.durationSlow);
  vars.set('--motion-easing', tokens.motion.easing);

  // Patterns (optional)
  if (tokens.patterns) {
    vars.set('--pattern-type', tokens.patterns.type);
    vars.set('--pattern-opacity', String(tokens.patterns.opacity));
    vars.set('--pattern-color', tokens.patterns.color);
  }

  return vars;
}

// --- Provider component ---
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [activeTheme, setActiveThemeState] = useState<string>(resolveInitialTheme);
  const [customTheme, setCustomTheme] = useState<ThemeTokens | null>(resolveInitialCustomTheme);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [motionOverride, setMotionOverrideState] = useState<
    'system' | 'reduce' | 'no-preference'
  >(resolveInitialMotion);
  const [serverThemeTokens, setServerThemeTokens] = useState<ThemeTokens | null>(null);

  const previousVarsRef = useRef<Set<string>>(new Set());
  const previewStyleRef = useRef<HTMLStyleElement | null>(null);
  const serverCssStyleRef = useRef<HTMLStyleElement | null>(null);
  const hasAppliedServerTheme = useRef(false);

  // --- Fetch active theme from server with 5-minute stale time ---
  const { data: serverThemeData, isLoading: isServerThemeLoading } = useQuery<ActiveThemeResponse>({
    queryKey: ['themes', 'active'],
    queryFn: fetchActiveTheme,
    staleTime: 5 * 60 * 1000, // 5-minute stale time
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // --- Apply server theme as default when no user preference exists ---
  useEffect(() => {
    if (!serverThemeData || hasAppliedServerTheme.current) return;

    const serverTokens = serverThemeData.tokens;
    if (!serverTokens) return;

    hasAppliedServerTheme.current = true;

    // Only apply server theme if user has no explicit localStorage preference
    if (!hasUserThemePreference()) {
      setServerThemeTokens(serverTokens);
      setActiveThemeState(serverTokens.id);
    }

    // Apply custom_css from active theme into @layer user stylesheet
    if (serverThemeData.custom_css) {
      let el = serverCssStyleRef.current;
      if (!el) {
        el = document.createElement('style');
        el.setAttribute('data-server-theme-css', '');
        document.head.appendChild(el);
        serverCssStyleRef.current = el;
      }
      el.textContent = `@layer user { ${serverThemeData.custom_css} }`;
    }
  }, [serverThemeData]);

  // Cleanup server CSS style element on unmount
  useEffect(() => {
    return () => {
      if (serverCssStyleRef.current) {
        serverCssStyleRef.current.remove();
        serverCssStyleRef.current = null;
      }
    };
  }, []);

  // Resolve active tokens
  const tokens = useMemo<ThemeTokens>(() => {
    if (customTheme && customTheme.id === activeTheme) {
      return customTheme;
    }
    // Check if server theme matches the active theme
    if (serverThemeTokens && serverThemeTokens.id === activeTheme) {
      return serverThemeTokens;
    }
    return BUILTIN_THEMES.find((t) => t.id === activeTheme) ?? DEFAULT_THEME;
  }, [activeTheme, customTheme, serverThemeTokens]);

  // Req 4.1, 4.2: apply theme via data-theme + CSS custom properties in single rAF
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const root = document.documentElement;
      const vars = buildCSSVariables(tokens);

      // Set data-theme attribute (Req 4.1)
      root.setAttribute('data-theme', activeTheme);

      // Remove stale vars
      for (const prev of previousVarsRef.current) {
        if (!vars.has(prev)) {
          root.style.removeProperty(prev);
        }
      }

      // Apply current vars
      for (const [name, value] of vars) {
        root.style.setProperty(name, value);
      }

      previousVarsRef.current = new Set(vars.keys());
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTheme, tokens]);

  // --- Actions ---

  const setTheme = useCallback((themeId: string) => {
    setActiveThemeState(themeId);
    // Req 4.3: persist to localStorage
    safeSetItem(ACTIVE_THEME_KEY, themeId);
  }, []);

  const applyCustomTheme = useCallback((newTokens: ThemeTokens) => {
    setCustomTheme(newTokens);
    setActiveThemeState(newTokens.id);
    safeSetItem(ACTIVE_THEME_KEY, newTokens.id);
    // Req 17.2: persist custom theme overrides
    safeSetItem(CUSTOM_THEME_KEY, JSON.stringify(newTokens));
  }, []);

  const exportTheme = useCallback(() => {
    const blob = new Blob([JSON.stringify(tokens, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tokens.id}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tokens]);

  const importTheme = useCallback(
    (json: string): TokenValidationResult => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        return {
          valid: false,
          errors: [{ path: '', message: 'Invalid JSON: unable to parse' }],
          warnings: [],
        };
      }

      const result = validateTokens(parsed);
      if (result.valid) {
        applyCustomTheme(parsed as ThemeTokens);
      }
      return result;
    },
    [applyCustomTheme],
  );

  const previewCSS = useCallback((css: string) => {
    let el = previewStyleRef.current;
    if (!el) {
      el = document.createElement('style');
      el.setAttribute('data-custom-css-preview', '');
      document.head.appendChild(el);
      previewStyleRef.current = el;
    }
    el.textContent = `@layer user { ${css} }`;
    setIsPreviewActive(true);
  }, []);

  const dismissPreview = useCallback(() => {
    if (previewStyleRef.current) {
      previewStyleRef.current.remove();
      previewStyleRef.current = null;
    }
    setIsPreviewActive(false);
  }, []);

  const saveCustomCSS = useCallback(() => {
    // Req 7.8/17.2: persist custom CSS to localStorage
    if (previewStyleRef.current) {
      const css = previewStyleRef.current.textContent ?? '';
      safeSetItem(CUSTOM_THEME_KEY, css);
    }
    dismissPreview();
  }, [dismissPreview]);

  const setMotionOverride = useCallback(
    (pref: 'system' | 'reduce' | 'no-preference') => {
      setMotionOverrideState(pref);
      safeSetItem(MOTION_OVERRIDE_KEY, pref);
    },
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      activeTheme,
      tokens,
      builtinThemes: BUILTIN_THEMES,
      customTheme,
      isPreviewActive,
      isServerThemeLoading,
      setTheme,
      applyCustomTheme,
      exportTheme,
      importTheme,
      previewCSS,
      saveCustomCSS,
      dismissPreview,
      motionOverride,
      setMotionOverride,
    }),
    [
      activeTheme,
      tokens,
      customTheme,
      isPreviewActive,
      isServerThemeLoading,
      setTheme,
      applyCustomTheme,
      exportTheme,
      importTheme,
      previewCSS,
      saveCustomCSS,
      dismissPreview,
      motionOverride,
      setMotionOverride,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
