export interface ThemeTokens {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string; // space-separated RGB "99 102 241"
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
  };
  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    fontSizeBase: string;
    fontSizeScale: number;
    lineHeight: string;
    fontWeightNormal: number;
    fontWeightBold: number;
  };
  radius: { sm: string; md: string; lg: string; full: string };
  shadow: { sm: string; md: string; lg: string; glow: string };
  motion: {
    durationFast: string;
    durationNormal: string;
    durationSlow: string;
    easing: string;
    reducedMotion: boolean;
  };
  patterns?: {
    type: 'none' | 'grid' | 'dots' | 'circuit' | 'scanlines' | 'noise';
    opacity: number;
    color: string;
  };
}

export interface TokenValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
  warnings: Array<{ path: string; message: string }>;
}

type ValidationError = TokenValidationResult['errors'][number];

const VALID_PATTERN_TYPES = [
  'none',
  'grid',
  'dots',
  'circuit',
  'scanlines',
  'noise',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function getTypeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  return typeof value;
}

function addMissingError(errors: ValidationError[], path: string): void {
  errors.push({
    path,
    message: 'Missing required field',
  });
}

function validateRequiredString(
  object: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
): void {
  if (!hasOwn(object, key)) {
    addMissingError(errors, path);
    return;
  }

  const value = object[key];

  if (typeof value !== 'string') {
    errors.push({
      path,
      message: `Expected string, got ${getTypeName(value)}`,
    });
  }
}

function validateRequiredNumber(
  object: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
): void {
  if (!hasOwn(object, key)) {
    addMissingError(errors, path);
    return;
  }

  const value = object[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push({
      path,
      message: `Expected number, got ${getTypeName(value)}`,
    });
  }
}

function validateRequiredBoolean(
  object: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
): void {
  if (!hasOwn(object, key)) {
    addMissingError(errors, path);
    return;
  }

  const value = object[key];

  if (typeof value !== 'boolean') {
    errors.push({
      path,
      message: `Expected boolean, got ${getTypeName(value)}`,
    });
  }
}

function validateRequiredObject(
  object: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
): Record<string, unknown> | undefined {
  if (!hasOwn(object, key)) {
    addMissingError(errors, path);
    return undefined;
  }

  const value = object[key];

  if (!isPlainObject(value)) {
    errors.push({
      path,
      message: `Expected object, got ${getTypeName(value)}`,
    });
    return undefined;
  }

  return value;
}

export function validateTokens(input: unknown): TokenValidationResult {
  const errors: TokenValidationResult['errors'] = [];
  const warnings: TokenValidationResult['warnings'] = [];

  if (!isPlainObject(input)) {
    errors.push({
      path: '',
      message: `Expected object, got ${getTypeName(input)}`,
    });

    return {
      valid: false,
      errors,
      warnings,
    };
  }

  validateRequiredString(input, 'id', 'id', errors);
  validateRequiredString(input, 'name', 'name', errors);
  validateRequiredString(input, 'description', 'description', errors);

  const colors = validateRequiredObject(input, 'colors', 'colors', errors);
  if (colors) {
    validateRequiredString(colors, 'primary', 'colors.primary', errors);
    validateRequiredString(colors, 'primaryHover', 'colors.primaryHover', errors);
    validateRequiredString(colors, 'secondary', 'colors.secondary', errors);
    validateRequiredString(colors, 'background', 'colors.background', errors);
    validateRequiredString(colors, 'backgroundAlt', 'colors.backgroundAlt', errors);
    validateRequiredString(colors, 'surface', 'colors.surface', errors);
    validateRequiredString(colors, 'surfaceAlt', 'colors.surfaceAlt', errors);
    validateRequiredString(colors, 'text', 'colors.text', errors);
    validateRequiredString(colors, 'textMuted', 'colors.textMuted', errors);
    validateRequiredString(colors, 'textInverse', 'colors.textInverse', errors);
    validateRequiredString(colors, 'border', 'colors.border', errors);
    validateRequiredString(colors, 'borderLight', 'colors.borderLight', errors);
    validateRequiredString(colors, 'accent', 'colors.accent', errors);
    validateRequiredString(colors, 'success', 'colors.success', errors);
    validateRequiredString(colors, 'warning', 'colors.warning', errors);
    validateRequiredString(colors, 'error', 'colors.error', errors);
    validateRequiredString(colors, 'info', 'colors.info', errors);
  }

  const typography = validateRequiredObject(input, 'typography', 'typography', errors);
  if (typography) {
    validateRequiredString(typography, 'fontFamily', 'typography.fontFamily', errors);
    validateRequiredString(
      typography,
      'fontFamilyMono',
      'typography.fontFamilyMono',
      errors,
    );
    validateRequiredString(typography, 'fontSizeBase', 'typography.fontSizeBase', errors);
    validateRequiredNumber(
      typography,
      'fontSizeScale',
      'typography.fontSizeScale',
      errors,
    );
    validateRequiredString(typography, 'lineHeight', 'typography.lineHeight', errors);
    validateRequiredNumber(
      typography,
      'fontWeightNormal',
      'typography.fontWeightNormal',
      errors,
    );
    validateRequiredNumber(
      typography,
      'fontWeightBold',
      'typography.fontWeightBold',
      errors,
    );
  }

  const radius = validateRequiredObject(input, 'radius', 'radius', errors);
  if (radius) {
    validateRequiredString(radius, 'sm', 'radius.sm', errors);
    validateRequiredString(radius, 'md', 'radius.md', errors);
    validateRequiredString(radius, 'lg', 'radius.lg', errors);
    validateRequiredString(radius, 'full', 'radius.full', errors);
  }

  const shadow = validateRequiredObject(input, 'shadow', 'shadow', errors);
  if (shadow) {
    validateRequiredString(shadow, 'sm', 'shadow.sm', errors);
    validateRequiredString(shadow, 'md', 'shadow.md', errors);
    validateRequiredString(shadow, 'lg', 'shadow.lg', errors);
    validateRequiredString(shadow, 'glow', 'shadow.glow', errors);
  }

  const motion = validateRequiredObject(input, 'motion', 'motion', errors);
  if (motion) {
    validateRequiredString(motion, 'durationFast', 'motion.durationFast', errors);
    validateRequiredString(motion, 'durationNormal', 'motion.durationNormal', errors);
    validateRequiredString(motion, 'durationSlow', 'motion.durationSlow', errors);
    validateRequiredString(motion, 'easing', 'motion.easing', errors);
    validateRequiredBoolean(motion, 'reducedMotion', 'motion.reducedMotion', errors);
  }

  if (hasOwn(input, 'patterns')) {
    const patternsValue = input.patterns;

    if (!isPlainObject(patternsValue)) {
      errors.push({
        path: 'patterns',
        message: `Expected object, got ${getTypeName(patternsValue)}`,
      });
    } else {
      if (!hasOwn(patternsValue, 'type')) {
        addMissingError(errors, 'patterns.type');
      } else if (
        typeof patternsValue.type !== 'string' ||
        !VALID_PATTERN_TYPES.includes(
          patternsValue.type as (typeof VALID_PATTERN_TYPES)[number],
        )
      ) {
        errors.push({
          path: 'patterns.type',
          message: `Expected one of ${VALID_PATTERN_TYPES.map((type) => `'${type}'`).join(', ')}, got '${String(patternsValue.type)}'`,
        });
      }

      if (!hasOwn(patternsValue, 'opacity')) {
        addMissingError(errors, 'patterns.opacity');
      } else if (
        typeof patternsValue.opacity !== 'number' ||
        !Number.isFinite(patternsValue.opacity)
      ) {
        errors.push({
          path: 'patterns.opacity',
          message: `Expected number, got ${getTypeName(patternsValue.opacity)}`,
        });
      } else if (patternsValue.opacity < 0 || patternsValue.opacity > 1) {
        errors.push({
          path: 'patterns.opacity',
          message: 'Expected number between 0 and 1',
        });
      }

      validateRequiredString(patternsValue, 'color', 'patterns.color', errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export const DEFAULT_THEME: ThemeTokens = {
  id: 'celestium-neon',
  name: 'Celestium Neon',
  description: 'Dark cyberpunk aesthetic with neon accents and glow effects',
  colors: {
    primary: '139 92 246',
    primaryHover: '124 58 237',
    secondary: '236 72 153',
    background: '3 7 18',
    backgroundAlt: '15 23 42',
    surface: '30 41 59',
    surfaceAlt: '51 65 85',
    text: '248 250 252',
    textMuted: '148 163 184',
    textInverse: '15 23 42',
    border: '71 85 105',
    borderLight: '100 116 139',
    accent: '34 211 238',
    success: '52 211 153',
    warning: '251 191 36',
    error: '248 113 113',
    info: '96 165 250',
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontFamilyMono: '"JetBrains Mono", "Fira Code", monospace',
    fontSizeBase: '1rem',
    fontSizeScale: 1.25,
    lineHeight: '1.6',
    fontWeightNormal: 400,
    fontWeightBold: 700,
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 3px rgba(139, 92, 246, 0.1)',
    md: '0 4px 12px rgba(139, 92, 246, 0.15)',
    lg: '0 12px 40px rgba(139, 92, 246, 0.2)',
    glow: '0 0 20px rgba(139, 92, 246, 0.4)',
  },
  motion: {
    durationFast: '150ms',
    durationNormal: '300ms',
    durationSlow: '600ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    reducedMotion: false,
  },
  patterns: {
    type: 'grid',
    opacity: 0.05,
    color: 'rgba(139, 92, 246, 0.3)',
  },
};
