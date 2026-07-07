import { describe, expect, it } from 'vitest';
import { validateTokens } from './tokens';
import { BUILTIN_THEMES } from './builtinThemes';

describe('Built-in themes validation', () => {
  it('should have exactly 5 built-in themes', () => {
    expect(BUILTIN_THEMES).toHaveLength(5);
  });

  it.each(BUILTIN_THEMES.map((t) => [t.name, t]))(
    '%s passes token schema validation',
    (_name, theme) => {
      const result = validateTokens(theme);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    },
  );

  it('all themes have unique IDs', () => {
    const ids = BUILTIN_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all themes have unique names', () => {
    const names = BUILTIN_THEMES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('includes expected theme IDs', () => {
    const ids = BUILTIN_THEMES.map((t) => t.id);
    expect(ids).toContain('celestium-neon');
    expect(ids).toContain('aws-console-after-dark');
    expect(ids).toContain('glass-circuit');
    expect(ids).toContain('paper-systems');
    expect(ids).toContain('terminal-witchcraft');
  });

  describe('WCAG AA contrast compliance', () => {
    /**
     * Compute relative luminance from space-separated RGB string.
     * Formula per WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
     */
    function relativeLuminance(rgb: string): number {
      const [r, g, b] = rgb.split(' ').map((v) => {
        const sRGB = parseInt(v, 10) / 255;
        return sRGB <= 0.03928
          ? sRGB / 12.92
          : Math.pow((sRGB + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function contrastRatio(rgb1: string, rgb2: string): number {
      const l1 = relativeLuminance(rgb1);
      const l2 = relativeLuminance(rgb2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    it.each(BUILTIN_THEMES.map((t) => [t.name, t]))(
      '%s: text over background meets 4.5:1 contrast',
      (_name, theme) => {
        const ratio = contrastRatio(theme.colors.text, theme.colors.background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      },
    );

    it.each(BUILTIN_THEMES.map((t) => [t.name, t]))(
      '%s: textMuted over background meets 4.5:1 contrast',
      (_name, theme) => {
        const ratio = contrastRatio(
          theme.colors.textMuted,
          theme.colors.background,
        );
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      },
    );

    it.each(BUILTIN_THEMES.map((t) => [t.name, t]))(
      '%s: primary over background meets 3:1 contrast (large text)',
      (_name, theme) => {
        const ratio = contrastRatio(
          theme.colors.primary,
          theme.colors.background,
        );
        expect(ratio).toBeGreaterThanOrEqual(3);
      },
    );
  });
});
