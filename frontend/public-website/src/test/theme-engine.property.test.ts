// Feature: serverless-site-facelift-theme-engine, Property 1: Theme token round-trip (export/import)
// Feature: serverless-site-facelift-theme-engine, Property 2: Token schema validation rejects invalid types
// Feature: serverless-site-facelift-theme-engine, Property 4: Theme application produces valid custom properties
// Feature: serverless-site-facelift-theme-engine, Property 5: Unknown token keys are ignored on import

/**
 * Property tests for the theme engine.
 *
 * Covered properties:
 * - Property 1: Theme token round-trip (export/import) — Validates: Requirements 18.5
 * - Property 2: Token schema validation rejects invalid types — Validates: Requirements 3.3
 * - Property 4: Theme application produces valid custom properties — Validates: Requirements 4.1, 4.2
 * - Property 5: Unknown token keys are ignored on import — Validates: Requirements 18.3
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { importTheme, exportTheme } from '../theme/serialization';
import { ThemeTokens, DEFAULT_THEME, validateTokens } from '../theme/tokens';
import { buildCSSVariables } from '../theme/ThemeProvider';

// --- Shared arbitraries ---

const colorTripletArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(([r, g, b]) => `${r} ${g} ${b}`);

const remArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 8, max: 24 })
  .map((value) => `${value / 16}rem`);

const durationArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 50, max: 1500 })
  .map((value) => `${value}ms`);

const themeTokensArbitrary: fc.Arbitrary<ThemeTokens> = fc.record({
  id: fc.integer({ min: 0, max: 1_000_000 }).map((value) => `theme-${value}`),
  name: fc.integer({ min: 0, max: 1_000_000 }).map((value) => `Generated Theme ${value}`),
  description: fc
    .integer({ min: 0, max: 1_000_000 })
    .map((value) => `Generated property-test theme ${value}`),
  colors: fc.record({
    primary: colorTripletArbitrary,
    primaryHover: colorTripletArbitrary,
    secondary: colorTripletArbitrary,
    background: colorTripletArbitrary,
    backgroundAlt: colorTripletArbitrary,
    surface: colorTripletArbitrary,
    surfaceAlt: colorTripletArbitrary,
    text: colorTripletArbitrary,
    textMuted: colorTripletArbitrary,
    textInverse: colorTripletArbitrary,
    border: colorTripletArbitrary,
    borderLight: colorTripletArbitrary,
    accent: colorTripletArbitrary,
    success: colorTripletArbitrary,
    warning: colorTripletArbitrary,
    error: colorTripletArbitrary,
    info: colorTripletArbitrary,
  }),
  typography: fc.record({
    fontFamily: fc.constant(DEFAULT_THEME.typography.fontFamily),
    fontFamilyMono: fc.constant(DEFAULT_THEME.typography.fontFamilyMono),
    fontSizeBase: remArbitrary,
    fontSizeScale: fc.constantFrom(1.125, 1.2, 1.25, 1.333, 1.5),
    lineHeight: fc.constantFrom('1.4', '1.5', '1.6', '1.75'),
    fontWeightNormal: fc.constantFrom(300, 400, 500),
    fontWeightBold: fc.constantFrom(600, 700, 800),
  }),
  radius: fc.record({
    sm: fc.constant(DEFAULT_THEME.radius.sm),
    md: fc.constant(DEFAULT_THEME.radius.md),
    lg: fc.constant(DEFAULT_THEME.radius.lg),
    full: fc.constantFrom('9999px', '999px', '100%'),
  }),
  shadow: fc.record({
    sm: fc.constant(DEFAULT_THEME.shadow.sm),
    md: fc.constant(DEFAULT_THEME.shadow.md),
    lg: fc.constant(DEFAULT_THEME.shadow.lg),
    glow: fc.constant(DEFAULT_THEME.shadow.glow),
  }),
  motion: fc.record({
    durationFast: durationArbitrary,
    durationNormal: durationArbitrary,
    durationSlow: durationArbitrary,
    easing: fc.constant(DEFAULT_THEME.motion.easing),
    reducedMotion: fc.boolean(),
  }),
  patterns: fc.record({
    type: fc.constantFrom(
      'none' as const,
      'grid' as const,
      'dots' as const,
      'circuit' as const,
      'scanlines' as const,
      'noise' as const,
    ),
    opacity: fc.integer({ min: 0, max: 100 }).map((value) => value / 100),
    color: fc.constant('rgba(139, 92, 246, 0.3)'),
  }),
});

// --- Helpers for Property 2 ---

function cloneAsRecord(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function setAtPath(root: Record<string, unknown>, path: readonly string[], value: unknown): void {
  let current: Record<string, unknown> = root;
  for (const segment of path.slice(0, -1)) {
    current = current[segment] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

function deleteAtPath(root: Record<string, unknown>, path: readonly string[]): void {
  let current: Record<string, unknown> = root;
  for (const segment of path.slice(0, -1)) {
    current = current[segment] as Record<string, unknown>;
  }
  delete current[path[path.length - 1]];
}

const requiredStringTokenPathArbitrary = fc.constantFrom<readonly string[]>(
  ['id'],
  ['name'],
  ['description'],
  ['colors', 'primary'],
  ['colors', 'primaryHover'],
  ['colors', 'secondary'],
  ['colors', 'background'],
  ['colors', 'backgroundAlt'],
  ['colors', 'surface'],
  ['colors', 'surfaceAlt'],
  ['colors', 'text'],
  ['colors', 'textMuted'],
  ['colors', 'textInverse'],
  ['colors', 'border'],
  ['colors', 'borderLight'],
  ['colors', 'accent'],
  ['colors', 'success'],
  ['colors', 'warning'],
  ['colors', 'error'],
  ['colors', 'info'],
  ['typography', 'fontFamily'],
  ['typography', 'fontFamilyMono'],
  ['typography', 'fontSizeBase'],
  ['typography', 'lineHeight'],
  ['radius', 'sm'],
  ['radius', 'md'],
  ['radius', 'lg'],
  ['radius', 'full'],
  ['shadow', 'sm'],
  ['shadow', 'md'],
  ['shadow', 'lg'],
  ['shadow', 'glow'],
  ['motion', 'durationFast'],
  ['motion', 'durationNormal'],
  ['motion', 'durationSlow'],
  ['motion', 'easing'],
);

const requiredTokenPathArbitrary = fc.constantFrom<readonly string[]>(
  ['id'],
  ['name'],
  ['description'],
  ['colors'],
  ['colors', 'primary'],
  ['typography'],
  ['typography', 'fontSizeScale'],
  ['typography', 'fontWeightNormal'],
  ['typography', 'fontWeightBold'],
  ['radius'],
  ['shadow'],
  ['motion'],
  ['motion', 'reducedMotion'],
);

const invalidThemeTokensArbitrary: fc.Arbitrary<unknown> = fc.oneof(
  // Type corruption: inject a number where a string is expected
  fc
    .tuple(themeTokensArbitrary, requiredStringTokenPathArbitrary)
    .map(([tokens, path]) => {
      const invalidTokens = cloneAsRecord(tokens);
      setAtPath(invalidTokens, path, 12345);
      return invalidTokens;
    }),
  // Missing required keys
  fc
    .tuple(themeTokensArbitrary, requiredTokenPathArbitrary)
    .map(([tokens, path]) => {
      const invalidTokens = cloneAsRecord(tokens);
      deleteAtPath(invalidTokens, path);
      return invalidTokens;
    }),
);

// --- Helpers for Property 4 ---

const colorKeys: Array<keyof ThemeTokens['colors']> = [
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
];

const rgbTripletPattern =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d) (25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d) (25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

function toKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// --- Helpers for Property 5 ---

const unknownKeyArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 0, max: 1_000_000_000 })
  .map((value) => `__unknown_${value}`);

const unknownObjectArbitrary: fc.Arbitrary<Record<string, unknown>> = fc
  .uniqueArray(fc.tuple(unknownKeyArbitrary, fc.jsonValue()), {
    minLength: 1,
    maxLength: 5,
    selector: ([key]) => key,
  })
  .map((entries) => Object.fromEntries(entries) as Record<string, unknown>);

const extrasArbitrary = fc.record({
  topLevel: unknownObjectArbitrary,
  colors: unknownObjectArbitrary,
  typography: unknownObjectArbitrary,
  radius: unknownObjectArbitrary,
  shadow: unknownObjectArbitrary,
  motion: unknownObjectArbitrary,
});

const expectUnknownKeysAbsent = (
  object: Record<string, unknown>,
  extras: Record<string, unknown>,
): void => {
  for (const key of Object.keys(extras)) {
    expect(Object.prototype.hasOwnProperty.call(object, key)).toBe(false);
  }
};

// --- Property tests ---

describe('theme engine property tests', () => {
  // Feature: serverless-site-facelift-theme-engine, Property 1: Theme token round-trip (export/import)
  /**
   * Validates: Requirements 18.5
   */
  it('Property 1: round-trips valid theme tokens through exportTheme/importTheme', () => {
    fc.assert(
      fc.property(themeTokensArbitrary, (tokens) => {
        const exportedJson = exportTheme(tokens);
        const imported = importTheme(exportedJson);

        expect(imported.valid).toBe(true);
        expect(imported.errors).toHaveLength(0);
        expect(imported.theme).toEqual(tokens);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: serverless-site-facelift-theme-engine, Property 2: Token schema validation rejects invalid types
  /**
   * Validates: Requirements 3.3
   */
  it('Property 2: rejects tokens with invalid types or missing required keys', () => {
    fc.assert(
      fc.property(invalidThemeTokensArbitrary, (tokens) => {
        const result = validateTokens(tokens);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: serverless-site-facelift-theme-engine, Property 4: Theme application produces valid custom properties
  /**
   * Validates: Requirements 4.1, 4.2
   */
  it('Property 4: builds valid color CSS custom properties matching the input tokens', () => {
    fc.assert(
      fc.property(themeTokensArbitrary, (tokens) => {
        const cssVariables = buildCSSVariables(tokens);

        for (const colorKey of colorKeys) {
          const variableName = `--color-${toKebab(colorKey)}`;
          const variableValue = cssVariables.get(variableName);

          expect(variableValue).toBeDefined();
          expect(variableValue).toMatch(rgbTripletPattern);
          expect(variableValue).toBe(tokens.colors[colorKey]);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: serverless-site-facelift-theme-engine, Property 5: Unknown token keys are ignored on import
  /**
   * Validates: Requirements 18.3
   */
  it('Property 5: unknown token keys are ignored on import', () => {
    fc.assert(
      fc.property(themeTokensArbitrary, extrasArbitrary, (theme, extras) => {
        const themeWithUnknownKeys = {
          ...theme,
          ...extras.topLevel,
          colors: {
            ...theme.colors,
            ...extras.colors,
          },
          typography: {
            ...theme.typography,
            ...extras.typography,
          },
          radius: {
            ...theme.radius,
            ...extras.radius,
          },
          shadow: {
            ...theme.shadow,
            ...extras.shadow,
          },
          motion: {
            ...theme.motion,
            ...extras.motion,
          },
        };

        const json = JSON.stringify(themeWithUnknownKeys);
        const result = importTheme(json);

        expect(result.valid).toBe(true);
        expect(result.theme).toBeDefined();

        const importedTheme = result.theme as ThemeTokens;

        // Verify top-level unknown keys are absent
        expectUnknownKeysAbsent(
          importedTheme as unknown as Record<string, unknown>,
          extras.topLevel,
        );
        // Verify nested unknown keys are absent
        expectUnknownKeysAbsent(
          importedTheme.colors as unknown as Record<string, unknown>,
          extras.colors,
        );
        expectUnknownKeysAbsent(
          importedTheme.typography as unknown as Record<string, unknown>,
          extras.typography,
        );
        expectUnknownKeysAbsent(
          importedTheme.radius as unknown as Record<string, unknown>,
          extras.radius,
        );
        expectUnknownKeysAbsent(
          importedTheme.shadow as unknown as Record<string, unknown>,
          extras.shadow,
        );
        expectUnknownKeysAbsent(
          importedTheme.motion as unknown as Record<string, unknown>,
          extras.motion,
        );
      }),
      { numRuns: 100 },
    );
  });
});
