import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme, useCreateTheme, useUpdateTheme, useActivateTheme } from '../hooks/useThemes';
import type {
  ThemeTokens,
  ThemeColors,
  ThemeTypography,
  ThemeRadius,
  ThemeShadow,
  ThemeMotion,
  ThemePatterns,
} from '../types/theme';

type EditorTab = 'colors' | 'typography' | 'spacing' | 'effects' | 'patterns' | 'css';

interface ValidationErrors {
  [key: string]: string;
}

const COLOR_TOKEN_KEYS: (keyof ThemeColors)[] = [
  'primary', 'primaryHover', 'secondary', 'background', 'backgroundAlt',
  'surface', 'surfaceAlt', 'text', 'textMuted', 'textInverse',
  'border', 'borderLight', 'accent', 'success', 'warning', 'error', 'info',
];

const COLOR_TOKEN_LABELS: Record<keyof ThemeColors, string> = {
  primary: 'Primary',
  primaryHover: 'Primary Hover',
  secondary: 'Secondary',
  background: 'Background',
  backgroundAlt: 'Background Alt',
  surface: 'Surface',
  surfaceAlt: 'Surface Alt',
  text: 'Text',
  textMuted: 'Text Muted',
  textInverse: 'Text Inverse',
  border: 'Border',
  borderLight: 'Border Light',
  accent: 'Accent',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
};

const DEFAULT_TOKENS: ThemeTokens = {
  colors: {
    primary: '139 92 246',
    primaryHover: '124 58 237',
    secondary: '99 102 241',
    background: '3 7 18',
    backgroundAlt: '15 23 42',
    surface: '30 41 59',
    surfaceAlt: '51 65 85',
    text: '248 250 252',
    textMuted: '148 163 184',
    textInverse: '15 23 42',
    border: '51 65 85',
    borderLight: '71 85 105',
    accent: '34 211 238',
    success: '34 197 94',
    warning: '234 179 8',
    error: '239 68 68',
    info: '56 189 248',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontFamilyMono: 'JetBrains Mono, monospace',
    fontSizeBase: '1rem',
    fontSizeScale: 1.25,
    lineHeight: '1.6',
    fontWeightNormal: 400,
    fontWeightBold: 700,
  },
  radius: { sm: '0.25rem', md: '0.5rem', lg: '1rem', full: '9999px' },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 6px rgba(0,0,0,0.4)',
    lg: '0 10px 15px rgba(0,0,0,0.5)',
    glow: '0 0 20px rgba(139,92,246,0.3)',
  },
  motion: {
    durationFast: '150ms',
    durationNormal: '300ms',
    durationSlow: '500ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    reducedMotion: false,
  },
  patterns: { type: 'none', opacity: 0.1, color: '139 92 246' },
};

// --- Validation helpers ---

function isValidRgb(value: string): boolean {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function rgbToHex(rgb: string): string {
  const parts = rgb.trim().split(/\s+/).map(Number);
  if (parts.length !== 3) return '#000000';
  const [r, g, b] = parts;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0 0';
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}

const CSS_FORBIDDEN_PATTERNS = [
  /@import/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /-moz-binding/i,
  /url\s*\(\s*['"]?\s*https?:/i,
];

function validateCss(css: string): string | null {
  if (css.length > 100 * 1024) return 'CSS exceeds maximum 100KB limit';
  for (const pattern of CSS_FORBIDDEN_PATTERNS) {
    if (pattern.test(css)) return `Forbidden CSS pattern detected: ${pattern.source}`;
  }
  return null;
}

// --- Color Picker Section ---

function ColorPickerSection({
  colors,
  onChange,
  errors,
}: {
  colors: ThemeColors;
  onChange: (key: keyof ThemeColors, value: string) => void;
  errors: ValidationErrors;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Color Tokens</h3>
      <p className="text-sm text-gray-500">
        Space-separated RGB values (e.g. &quot;139 92 246&quot;)
      </p>
      <div className="grid grid-cols-1 gap-3">
        {COLOR_TOKEN_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="color"
              value={isValidRgb(colors[key]) ? rgbToHex(colors[key]) : '#000000'}
              onChange={(e) => onChange(key, hexToRgb(e.target.value))}
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0"
              title={COLOR_TOKEN_LABELS[key]}
            />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                {COLOR_TOKEN_LABELS[key]}
              </label>
              <input
                type="text"
                value={colors[key]}
                onChange={(e) => onChange(key, e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded ${
                  errors[`color_${key}`]
                    ? 'border-red-500'
                    : 'border-gray-300'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                placeholder="R G B"
              />
              {errors[`color_${key}`] && (
                <p className="text-xs text-red-600 mt-0.5">
                  {errors[`color_${key}`]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Typography Section ---

function TypographySection({
  typography,
  onChange,
}: {
  typography: ThemeTypography;
  onChange: (key: keyof ThemeTypography, value: string | number) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Typography</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Font Family</label>
          <input
            type="text"
            value={typography.fontFamily}
            onChange={(e) => onChange('fontFamily', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Inter, system-ui, sans-serif"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Mono Font Family</label>
          <input
            type="text"
            value={typography.fontFamilyMono}
            onChange={(e) => onChange('fontFamilyMono', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="JetBrains Mono, monospace"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Size Base</label>
            <input
              type="text"
              value={typography.fontSizeBase}
              onChange={(e) => onChange('fontSizeBase', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1rem"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Scale Ratio</label>
            <input
              type="number"
              value={typography.fontSizeScale}
              onChange={(e) => onChange('fontSizeScale', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={1.0}
              max={2.0}
              step={0.05}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Line Height</label>
            <input
              type="text"
              value={typography.lineHeight}
              onChange={(e) => onChange('lineHeight', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1.6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Normal Weight</label>
            <input
              type="number"
              value={typography.fontWeightNormal}
              onChange={(e) => onChange('fontWeightNormal', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={100}
              max={900}
              step={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bold Weight</label>
            <input
              type="number"
              value={typography.fontWeightBold}
              onChange={(e) => onChange('fontWeightBold', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={100}
              max={900}
              step={100}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Spacing Section ---

function SpacingSection({
  radius,
  onChange,
}: {
  radius: ThemeRadius;
  onChange: (key: keyof ThemeRadius, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Border Radius</h3>
      <div className="grid grid-cols-2 gap-3">
        {(['sm', 'md', 'lg', 'full'] as const).map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700">
              {key === 'full' ? 'Full (pill)' : key.toUpperCase()}
            </label>
            <input
              type="text"
              value={radius[key]}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={key === 'full' ? '9999px' : '0.5rem'}
            />
            <div
              className="mt-1 w-12 h-12 bg-blue-500"
              style={{ borderRadius: radius[key] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Effects Section ---

function EffectsSection({
  shadow,
  motion,
  onShadowChange,
  onMotionChange,
}: {
  shadow: ThemeShadow;
  motion: ThemeMotion;
  onShadowChange: (key: keyof ThemeShadow, value: string) => void;
  onMotionChange: (key: keyof ThemeMotion, value: string | boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Shadows</h3>
        <div className="space-y-3">
          {(['sm', 'md', 'lg', 'glow'] as const).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700">
                {key === 'glow' ? 'Glow' : `Shadow ${key.toUpperCase()}`}
              </label>
              <input
                type="text"
                value={shadow[key]}
                onChange={(e) => onShadowChange(key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div
                className="mt-1 w-16 h-16 bg-white rounded"
                style={{ boxShadow: shadow[key] }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Motion</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fast Duration</label>
            <input
              type="text"
              value={motion.durationFast}
              onChange={(e) => onMotionChange('durationFast', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="150ms"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Normal Duration</label>
            <input
              type="text"
              value={motion.durationNormal}
              onChange={(e) => onMotionChange('durationNormal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="300ms"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Slow Duration</label>
            <input
              type="text"
              value={motion.durationSlow}
              onChange={(e) => onMotionChange('durationSlow', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="500ms"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Easing</label>
            <input
              type="text"
              value={motion.easing}
              onChange={(e) => onMotionChange('easing', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="cubic-bezier(0.4, 0, 0.2, 1)"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reducedMotion"
            checked={motion.reducedMotion}
            onChange={(e) => onMotionChange('reducedMotion', e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="reducedMotion" className="text-sm text-gray-700">
            Reduced Motion (respect prefers-reduced-motion)
          </label>
        </div>
      </div>
    </div>
  );
}

// --- Patterns Section ---

const PATTERN_TYPES: ThemePatterns['type'][] = [
  'none', 'grid', 'dots', 'circuit', 'scanlines', 'noise',
];

function PatternsSection({
  patterns,
  onChange,
}: {
  patterns: ThemePatterns;
  onChange: (key: keyof ThemePatterns, value: string | number) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Background Pattern</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Pattern Type</label>
          <select
            value={patterns.type}
            onChange={(e) => onChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PATTERN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Opacity: {patterns.opacity.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={patterns.opacity}
            onChange={(e) => onChange('opacity', Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={isValidRgb(patterns.color) ? rgbToHex(patterns.color) : '#000000'}
            onChange={(e) => onChange('color', hexToRgb(e.target.value))}
            className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0"
          />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Pattern Color (RGB)
            </label>
            <input
              type="text"
              value={patterns.color}
              onChange={(e) => onChange('color', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="139 92 246"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Custom CSS Section ---

function CustomCssSection({
  css,
  onChange,
  error,
}: {
  css: string;
  onChange: (value: string) => void;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Custom CSS</h3>
      <p className="text-sm text-gray-500">
        Add custom styles. No @import, external URLs, expression(), javascript:,
        or -moz-binding allowed.
      </p>
      <textarea
        value={css}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-64 px-4 py-3 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholder="/* Your custom CSS here */"
        spellCheck={false}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-400">
        {css.length.toLocaleString()} / 102,400 characters
      </p>
    </div>
  );
}

// --- Live Preview Panel ---

function LivePreview({
  tokens,
  customCss,
}: {
  tokens: ThemeTokens;
  customCss: string;
}) {
  const previewStyles = useMemo(() => {
    const c = tokens.colors;
    const t = tokens.typography;
    const basePx = parseFloat(t.fontSizeBase) * 16 || 16;
    return {
      container: {
        backgroundColor: `rgb(${c.background})`,
        color: `rgb(${c.text})`,
        fontFamily: t.fontFamily,
        fontSize: `${basePx}px`,
        lineHeight: t.lineHeight,
        padding: '1.5rem',
        borderRadius: tokens.radius.lg,
        minHeight: '100%',
      } as React.CSSProperties,
      heading: {
        color: `rgb(${c.text})`,
        fontWeight: t.fontWeightBold,
        fontSize: `${basePx * t.fontSizeScale * t.fontSizeScale}px`,
        marginBottom: '0.75rem',
      } as React.CSSProperties,
      paragraph: {
        color: `rgb(${c.textMuted})`,
        fontWeight: t.fontWeightNormal,
        marginBottom: '1rem',
      } as React.CSSProperties,
      code: {
        backgroundColor: `rgb(${c.surfaceAlt})`,
        color: `rgb(${c.accent})`,
        padding: '1rem',
        borderRadius: tokens.radius.md,
        fontFamily: t.fontFamilyMono,
        fontSize: `${basePx * 0.875}px`,
        display: 'block' as const,
        marginBottom: '1rem',
        border: `1px solid rgb(${c.border})`,
      } as React.CSSProperties,
      card: {
        backgroundColor: `rgb(${c.surface})`,
        border: `1px solid rgb(${c.border})`,
        borderRadius: tokens.radius.md,
        padding: '1rem',
        boxShadow: tokens.shadow.md,
        marginBottom: '1rem',
      } as React.CSSProperties,
      button: {
        backgroundColor: `rgb(${c.primary})`,
        color: `rgb(${c.textInverse})`,
        padding: '0.5rem 1.25rem',
        borderRadius: tokens.radius.md,
        fontWeight: t.fontWeightBold,
        border: 'none',
        cursor: 'pointer',
        transition: `all ${tokens.motion.durationNormal} ${tokens.motion.easing}`,
      } as React.CSSProperties,
      buttonSecondary: {
        backgroundColor: 'transparent',
        color: `rgb(${c.primary})`,
        padding: '0.5rem 1.25rem',
        borderRadius: tokens.radius.md,
        fontWeight: t.fontWeightBold,
        border: `1px solid rgb(${c.primary})`,
        cursor: 'pointer',
        marginLeft: '0.5rem',
      } as React.CSSProperties,
    };
  }, [tokens]);

  return (
    <div className="h-full overflow-auto">
      <div style={previewStyles.container}>
        <h2 style={previewStyles.heading}>Preview Heading</h2>
        <p style={previewStyles.paragraph}>
          This is a sample paragraph demonstrating how body text will appear with
          the current typography and color settings applied to your theme.
        </p>
        <code style={previewStyles.code}>
          {`const theme = loadActiveTheme();\napplyTokens(theme.tokens);`}
        </code>
        <div style={previewStyles.card}>
          <h3
            style={{
              ...previewStyles.heading,
              fontSize: `${(parseFloat(tokens.typography.fontSizeBase) * 16 || 16) * tokens.typography.fontSizeScale}px`,
            }}
          >
            Card Component
          </h3>
          <p style={previewStyles.paragraph}>
            A surface element with border, shadow, and radius tokens applied.
          </p>
        </div>
        <div>
          <button style={previewStyles.button}>Primary Action</button>
          <button style={previewStyles.buttonSecondary}>Secondary</button>
        </div>
      </div>
      {customCss && <style>{customCss}</style>}
    </div>
  );
}

// --- Main ThemeEditor Component ---

export function ThemeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const { data: theme, isLoading } = useTheme(id);
  const createMutation = useCreateTheme();
  const updateMutation = useUpdateTheme();
  const activateMutation = useActivateTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_TOKENS);
  const [customCss, setCustomCss] = useState('');
  const [activeTab, setActiveTab] = useState<EditorTab>('colors');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [cssError, setCssError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  // Load theme data when editing
  useEffect(() => {
    if (theme) {
      setName(theme.name);
      setDescription(theme.description || '');
      setTokens(theme.tokens);
      setCustomCss(theme.custom_css || '');
    }
  }, [theme]);

  // --- Validation ---
  const validate = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    for (const key of COLOR_TOKEN_KEYS) {
      if (!isValidRgb(tokens.colors[key])) {
        newErrors[`color_${key}`] = 'Must be 3 space-separated numbers 0-255';
      }
    }

    const cssValidation = validateCss(customCss);
    if (cssValidation) {
      setCssError(cssValidation);
    } else {
      setCssError(null);
    }

    if (!name.trim()) {
      newErrors.name = 'Theme name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Theme name must be 100 characters or less';
    }

    if (description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !cssValidation;
  }, [tokens.colors, customCss, name, description]);

  // Real-time color validation
  const handleColorChange = useCallback(
    (key: keyof ThemeColors, value: string) => {
      setTokens((prev) => ({
        ...prev,
        colors: { ...prev.colors, [key]: value },
      }));
      if (value && !isValidRgb(value)) {
        setErrors((prev) => ({
          ...prev,
          [`color_${key}`]: 'Must be 3 space-separated numbers 0-255',
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[`color_${key}`];
          return next;
        });
      }
    },
    [],
  );

  const handleTypographyChange = useCallback(
    (key: keyof ThemeTypography, value: string | number) => {
      setTokens((prev) => ({
        ...prev,
        typography: { ...prev.typography, [key]: value },
      }));
    },
    [],
  );

  const handleRadiusChange = useCallback(
    (key: keyof ThemeRadius, value: string) => {
      setTokens((prev) => ({
        ...prev,
        radius: { ...prev.radius, [key]: value },
      }));
    },
    [],
  );

  const handleShadowChange = useCallback(
    (key: keyof ThemeShadow, value: string) => {
      setTokens((prev) => ({
        ...prev,
        shadow: { ...prev.shadow, [key]: value },
      }));
    },
    [],
  );

  const handleMotionChange = useCallback(
    (key: keyof ThemeMotion, value: string | boolean) => {
      setTokens((prev) => ({
        ...prev,
        motion: { ...prev.motion, [key]: value },
      }));
    },
    [],
  );

  const handlePatternChange = useCallback(
    (key: keyof ThemePatterns, value: string | number) => {
      setTokens((prev) => ({
        ...prev,
        patterns: { ...(prev.patterns || DEFAULT_TOKENS.patterns!), [key]: value },
      }));
    },
    [],
  );

  const handleCssChange = useCallback((value: string) => {
    setCustomCss(value);
    const err = validateCss(value);
    setCssError(err);
  }, []);

  // --- Save & Activate handlers ---

  const handleSave = async () => {
    if (!validate()) return;
    setSaveMessage('');

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        tokens,
        custom_css: customCss || undefined,
      };

      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        setSaveMessage('Theme created successfully!');
        navigate(`/appearance/edit/${created.id}`, { replace: true });
      } else {
        await updateMutation.mutateAsync({ id: id!, data: payload });
        setSaveMessage('Theme saved successfully!');
      }
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save theme';
      setSaveMessage(`Error: ${msg}`);
    }
  };

  const handleSaveAndActivate = async () => {
    if (!validate()) return;
    setSaveMessage('');

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        tokens,
        custom_css: customCss || undefined,
      };

      let themeId = id;
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        themeId = created.id;
        navigate(`/appearance/edit/${created.id}`, { replace: true });
      } else {
        await updateMutation.mutateAsync({ id: id!, data: payload });
      }

      await activateMutation.mutateAsync(themeId!);
      setSaveMessage('Theme saved and activated!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to save and activate';
      setSaveMessage(`Error: ${msg}`);
    }
  };

  const tabs: { key: EditorTab; label: string }[] = [
    { key: 'colors', label: 'Colors' },
    { key: 'typography', label: 'Typography' },
    { key: 'spacing', label: 'Spacing' },
    { key: 'effects', label: 'Effects' },
    { key: 'patterns', label: 'Patterns' },
    { key: 'css', label: 'CSS' },
  ];

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading theme...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/appearance')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'Create Theme' : `Edit: ${name}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-secondary"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleSaveAndActivate}
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save & Activate'}
          </button>
        </div>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div
          className={`px-4 py-2 rounded-lg text-sm ${
            saveMessage.startsWith('Error')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {saveMessage}
        </div>
      )}

      {/* Name and Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Theme Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="My Custom Theme"
            maxLength={100}
          />
          {errors.name && (
            <p className="text-xs text-red-600 mt-1">{errors.name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="A short description of this theme"
            maxLength={500}
          />
          {errors.description && (
            <p className="text-xs text-red-600 mt-1">{errors.description}</p>
          )}
        </div>
      </div>

      {/* Two-column layout: Editor + Preview */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        style={{ minHeight: '600px' }}
      >
        {/* Left: Token Editor */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'colors' && (
              <ColorPickerSection
                colors={tokens.colors}
                onChange={handleColorChange}
                errors={errors}
              />
            )}
            {activeTab === 'typography' && (
              <TypographySection
                typography={tokens.typography}
                onChange={handleTypographyChange}
              />
            )}
            {activeTab === 'spacing' && (
              <SpacingSection
                radius={tokens.radius}
                onChange={handleRadiusChange}
              />
            )}
            {activeTab === 'effects' && (
              <EffectsSection
                shadow={tokens.shadow}
                motion={tokens.motion}
                onShadowChange={handleShadowChange}
                onMotionChange={handleMotionChange}
              />
            )}
            {activeTab === 'patterns' && (
              <PatternsSection
                patterns={tokens.patterns || DEFAULT_TOKENS.patterns!}
                onChange={handlePatternChange}
              />
            )}
            {activeTab === 'css' && (
              <CustomCssSection
                css={customCss}
                onChange={handleCssChange}
                error={cssError}
              />
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Live Preview</h3>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            <LivePreview tokens={tokens} customCss={customCss} />
          </div>
        </div>
      </div>
    </div>
  );
}
