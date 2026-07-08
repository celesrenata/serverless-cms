import {
  exportTheme,
  importTheme,
  stripUnknownKeys,
  type ImportResult,
} from './serialization';
import { DEFAULT_THEME, type ThemeTokens } from './tokens';

const cloneTheme = (theme: ThemeTokens = DEFAULT_THEME): ThemeTokens =>
  JSON.parse(JSON.stringify(theme)) as ThemeTokens;

const asRecord = (value: unknown): Record<string, unknown> =>
  value as Record<string, unknown>;

const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

describe('exportTheme', () => {
  it('produces valid parseable JSON', () => {
    const json = exportTheme(DEFAULT_THEME);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('produces sorted top-level keys', () => {
    const json = exportTheme(DEFAULT_THEME);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const keys = Object.keys(parsed);

    expect(keys).toEqual([...keys].sort());
  });

  it('contains all token values from input', () => {
    const json = exportTheme(DEFAULT_THEME);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual(DEFAULT_THEME);
  });
});

describe('importTheme', () => {
  it('returns valid result with theme for valid JSON', () => {
    const result: ImportResult = importTheme(JSON.stringify(DEFAULT_THEME));

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.theme).toEqual(DEFAULT_THEME);
  });

  it('returns parse error for invalid JSON', () => {
    const result: ImportResult = importTheme('not json {');

    expect(result.valid).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        path: '',
        message: expect.stringContaining('Invalid JSON:'),
      }),
    );
  });

  it('returns validation errors for JSON missing required fields', () => {
    const result: ImportResult = importTheme('{}');

    expect(result.valid).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('theme');
  });

  it('strips unknown top-level keys', () => {
    const input = asRecord(cloneTheme());
    input.unknownField = 'foo';

    const result = importTheme(JSON.stringify(input));

    expect(result.valid).toBe(true);
    expect(result.theme).toEqual(DEFAULT_THEME);
    expect(result.theme).not.toHaveProperty('unknownField');
  });

  it('strips unknown nested keys', () => {
    const input = cloneTheme() as ThemeTokens & {
      colors: Record<string, unknown>;
    };
    input.colors.unknownColor = '1 2 3';

    const result = importTheme(JSON.stringify(input));

    expect(result.valid).toBe(true);
    expect(result.theme).toEqual(DEFAULT_THEME);
    expect(result.theme?.colors).not.toHaveProperty('unknownColor');
  });

  it('round-trips exported theme back to DEFAULT_THEME', () => {
    const json = exportTheme(DEFAULT_THEME);
    const result = importTheme(json);

    expect(result.valid).toBe(true);
    expect(result.theme).toEqual(DEFAULT_THEME);
  });
});

describe('stripUnknownKeys', () => {
  it('preserves all known fields from a valid theme object', () => {
    const cleaned = stripUnknownKeys(asRecord(cloneTheme()));

    expect(cleaned).toEqual(DEFAULT_THEME);
  });

  it('removes unknown top-level keys', () => {
    const input = asRecord(cloneTheme());
    input.unknownField = 'foo';

    const cleaned = stripUnknownKeys(input);

    expect(cleaned).toEqual(DEFAULT_THEME);
    expect(cleaned).not.toHaveProperty('unknownField');
  });

  it('removes unknown keys inside nested objects', () => {
    const input = asRecord(cloneTheme());

    for (const value of Object.values(input)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        asRecord(value).__unknownNestedKey = 'remove me';
      }
    }

    const cleaned = stripUnknownKeys(input);

    expect(cleaned).toEqual(DEFAULT_THEME);

    for (const value of Object.values(asRecord(cleaned))) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        expect(value).not.toHaveProperty('__unknownNestedKey');
      }
    }
  });

  it('handles optional patterns field correctly', () => {
    const withPatterns = asRecord(cloneTheme());
    const cleanedWith = stripUnknownKeys(withPatterns);

    if (hasOwn(withPatterns, 'patterns')) {
      expect(cleanedWith).toHaveProperty('patterns');
      expect(asRecord(cleanedWith).patterns).toEqual(withPatterns.patterns);
    }

    const withoutPatterns = asRecord(cloneTheme());
    delete withoutPatterns.patterns;

    const cleanedWithout = stripUnknownKeys(withoutPatterns);

    expect(cleanedWithout).not.toHaveProperty('patterns');
  });
});
