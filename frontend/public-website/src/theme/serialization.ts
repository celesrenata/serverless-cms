import { type ThemeTokens, type TokenValidationResult, validateTokens } from './tokens';

export type ImportResult = TokenValidationResult & { theme?: ThemeTokens };

const COLOR_KEYS = [
  'primary',
  'primaryHover',
  'secondary',
  'background',
  'backgroundAlt',
  'surface',
  'surfaceAlt',
  'text',
  'textMuted',
  'textInverse',
  'border',
  'borderLight',
  'accent',
  'success',
  'warning',
  'error',
  'info',
] as const satisfies readonly (keyof ThemeTokens['colors'])[];

const TYPOGRAPHY_KEYS = [
  'fontFamily',
  'fontFamilyMono',
  'fontSizeBase',
  'fontSizeScale',
  'fontWeightNormal',
  'fontWeightBold',
  'lineHeight',
] as const satisfies readonly (keyof ThemeTokens['typography'])[];

const RADIUS_KEYS = [
  'sm',
  'md',
  'lg',
  'full',
] as const satisfies readonly (keyof ThemeTokens['radius'])[];

const SHADOW_KEYS = [
  'sm',
  'md',
  'lg',
  'glow',
] as const satisfies readonly (keyof ThemeTokens['shadow'])[];

const MOTION_KEYS = [
  'durationFast',
  'durationNormal',
  'durationSlow',
  'easing',
  'reducedMotion',
] as const satisfies readonly (keyof ThemeTokens['motion'])[];

const PATTERN_KEYS = [
  'type',
  'opacity',
  'color',
] as const satisfies readonly (keyof NonNullable<ThemeTokens['patterns']>)[];

function sortKeysReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = record[key];
        return sorted;
      }, {});
  }

  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function pickKnownKeys<T extends object>(
  source: Record<string, unknown>,
  keys: readonly Extract<keyof T, string>[],
): T {
  const result: Record<string, unknown> = {};

  for (const key of keys) {
    result[key] = source[key];
  }

  return result as T;
}

export function exportTheme(tokens: ThemeTokens): string {
  return JSON.stringify(tokens, sortKeysReplacer, 2);
}

export function importTheme(json: string): ImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      valid: false,
      errors: [{ path: '', message: `Invalid JSON: ${message}` }],
      warnings: [],
    };
  }

  const validation = validateTokens(parsed);

  if (!validation.valid) {
    return validation;
  }

  return {
    valid: true,
    errors: [],
    warnings: [],
    theme: stripUnknownKeys(parsed as Record<string, unknown>),
  };
}

export function stripUnknownKeys(input: Record<string, unknown>): ThemeTokens {
  const theme: ThemeTokens = {
    id: input.id as string,
    name: input.name as string,
    description: input.description as string,
    colors: pickKnownKeys<ThemeTokens['colors']>(asRecord(input.colors), COLOR_KEYS),
    typography: pickKnownKeys<ThemeTokens['typography']>(
      asRecord(input.typography),
      TYPOGRAPHY_KEYS,
    ),
    radius: pickKnownKeys<ThemeTokens['radius']>(asRecord(input.radius), RADIUS_KEYS),
    shadow: pickKnownKeys<ThemeTokens['shadow']>(asRecord(input.shadow), SHADOW_KEYS),
    motion: pickKnownKeys<ThemeTokens['motion']>(asRecord(input.motion), MOTION_KEYS),
  };

  if (Object.prototype.hasOwnProperty.call(input, 'patterns')) {
    theme.patterns = pickKnownKeys<NonNullable<ThemeTokens['patterns']>>(
      asRecord(input.patterns),
      PATTERN_KEYS,
    );
  }

  return theme;
}
