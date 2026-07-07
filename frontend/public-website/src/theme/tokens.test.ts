import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, validateTokens, type ThemeTokens } from './tokens';

const cloneTheme = (): ThemeTokens =>
  JSON.parse(JSON.stringify(DEFAULT_THEME)) as ThemeTokens;

describe('theme tokens', () => {
  describe('DEFAULT_THEME', () => {
    it('passes validation', () => {
      const result = validateTokens(DEFAULT_THEME);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateTokens', () => {
    it('returns valid:true for a complete valid ThemeTokens object', () => {
      const result = validateTokens(cloneTheme());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('handles null input', () => {
      const result = validateTokens(null);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Expected object');
    });

    it('handles undefined input', () => {
      const result = validateTokens(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Expected object');
    });

    it('handles empty object with errors for missing fields', () => {
      const result = validateTokens({});
      expect(result.valid).toBe(false);
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain('id');
      expect(paths).toContain('name');
      expect(paths).toContain('colors');
      expect(paths).toContain('typography');
      expect(paths).toContain('radius');
      expect(paths).toContain('shadow');
      expect(paths).toContain('motion');
    });

    it('detects wrong type on a color field', () => {
      const tokens = cloneTheme();
      (tokens as Record<string, unknown>).colors = {
        ...(tokens.colors),
        primary: 123,
      };
      const result = validateTokens(tokens);
      expect(result.valid).toBe(false);
      const primaryError = result.errors.find((e) => e.path === 'colors.primary');
      expect(primaryError).toBeDefined();
      expect(primaryError!.message).toContain('Expected string');
    });

    it('detects missing nested field', () => {
      const tokens = cloneTheme();
      const colors = { ...tokens.colors } as Record<string, unknown>;
      delete colors.primary;
      (tokens as Record<string, unknown>).colors = colors;
      const result = validateTokens(tokens);
      expect(result.valid).toBe(false);
      const primaryError = result.errors.find((e) => e.path === 'colors.primary');
      expect(primaryError).toBeDefined();
      expect(primaryError!.message).toContain('Missing required field');
    });

    it('validates patterns.type enum (rejects invalid value)', () => {
      const tokens = cloneTheme();
      (tokens as Record<string, unknown>).patterns = {
        type: 'not-a-valid-type',
        opacity: 0.5,
        color: 'red',
      };
      const result = validateTokens(tokens);
      expect(result.valid).toBe(false);
      const typeError = result.errors.find((e) => e.path === 'patterns.type');
      expect(typeError).toBeDefined();
    });

    it('validates patterns.opacity range (rejects value > 1)', () => {
      const tokens = cloneTheme();
      (tokens as Record<string, unknown>).patterns = {
        type: 'grid',
        opacity: 1.5,
        color: 'red',
      };
      const result = validateTokens(tokens);
      expect(result.valid).toBe(false);
      const opacityError = result.errors.find((e) => e.path === 'patterns.opacity');
      expect(opacityError).toBeDefined();
      expect(opacityError!.message).toContain('between 0 and 1');
    });

    it('allows missing patterns (optional field)', () => {
      const tokens = cloneTheme();
      delete (tokens as Record<string, unknown>).patterns;
      const result = validateTokens(tokens);
      expect(result.valid).toBe(true);
    });

    it('handles array input', () => {
      const result = validateTokens([]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Expected object');
    });

    it('handles number input', () => {
      const result = validateTokens(42);
      expect(result.valid).toBe(false);
    });

    it('handles string input', () => {
      const result = validateTokens('hello');
      expect(result.valid).toBe(false);
    });
  });
});
