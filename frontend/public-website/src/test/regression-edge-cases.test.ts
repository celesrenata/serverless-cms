// Regression tests: edge cases discovered during quality hardening (Task 11.6)
// Requirements: 3.3, 4.1, 10.2, 14.3, 15.1

import { describe, it, expect, vi } from 'vitest';
import { validateTokens, DEFAULT_THEME, type ThemeTokens } from '../theme/tokens';
import { buildCSSVariables } from '../theme/ThemeProvider';
import { createPaletteActions } from '../components/CommandPalette/actions';
import { fuzzySearch } from '../components/CommandPalette/fuzzySearch';
import { validateCSS, validateCSSUpload } from '../lib/cssValidator';
import type { PaletteAction } from '../components/CommandPalette/actions';

const cloneTheme = (): ThemeTokens =>
  JSON.parse(JSON.stringify(DEFAULT_THEME)) as ThemeTokens;

describe('regression edge cases: token utilities (Req 3.3)', () => {
  it('allows an empty string id (still a valid string type)', () => {
    const theme = cloneTheme();
    theme.id = '';
    const result = validateTokens(theme);
    expect(result.valid).toBe(true);
  });

  it('rejects NaN in typography.fontSizeScale (not a finite number)', () => {
    const theme = cloneTheme();
    (theme.typography as Record<string, unknown>).fontSizeScale = NaN;
    const result = validateTokens(theme);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'typography.fontSizeScale')).toBe(true);
  });

  it('rejects Infinity in typography.fontWeightNormal (not finite)', () => {
    const theme = cloneTheme();
    (theme.typography as Record<string, unknown>).fontWeightNormal = Infinity;
    const result = validateTokens(theme);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'typography.fontWeightNormal')).toBe(true);
  });

  it('allows unicode characters in color strings (type is string)', () => {
    const theme = cloneTheme();
    (theme.colors as Record<string, string>).primary = '🎨 色彩テスト';
    const result = validateTokens(theme);
    expect(result.valid).toBe(true);
  });

  it('allows patterns.opacity at exact boundary 0', () => {
    const theme = cloneTheme();
    theme.patterns = { type: 'grid', opacity: 0, color: 'red' };
    const result = validateTokens(theme);
    expect(result.valid).toBe(true);
  });

  it('allows patterns.opacity at exact boundary 1', () => {
    const theme = cloneTheme();
    theme.patterns = { type: 'grid', opacity: 1, color: 'red' };
    const result = validateTokens(theme);
    expect(result.valid).toBe(true);
  });

  it('rejects patterns.opacity at -0.001 (below lower boundary)', () => {
    const theme = cloneTheme();
    theme.patterns = { type: 'grid', opacity: -0.001, color: 'red' };
    const result = validateTokens(theme);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'patterns.opacity')).toBe(true);
  });

  it('rejects patterns.opacity at 1.001 (above upper boundary)', () => {
    const theme = cloneTheme();
    theme.patterns = { type: 'grid', opacity: 1.001, color: 'red' };
    const result = validateTokens(theme);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'patterns.opacity')).toBe(true);
  });
});

describe('regression edge cases: buildCSSVariables (Req 4.1)', () => {
  it('converts camelCase color keys to kebab-case (primaryHover → --color-primary-hover)', () => {
    const theme = cloneTheme();
    theme.colors.primaryHover = '124 58 237';
    const vars = buildCSSVariables(theme);
    expect(vars.get('--color-primary-hover')).toBe('124 58 237');
  });

  it('preserves empty string color values as empty CSS variable values', () => {
    const theme = cloneTheme();
    (theme.colors as Record<string, string>).primary = '';
    const vars = buildCSSVariables(theme);
    expect(vars.get('--color-primary')).toBe('');
  });

  it('does not emit --pattern-* variables when patterns is undefined', () => {
    const theme = cloneTheme();
    delete (theme as Partial<ThemeTokens>).patterns;
    const vars = buildCSSVariables(theme);
    const patternKeys = [...vars.keys()].filter((k) => k.startsWith('--pattern-'));
    expect(patternKeys).toEqual([]);
  });
});

describe('regression edge cases: command palette actions (Req 10.2)', () => {
  it('scroll actions do not throw when target element does not exist in DOM', () => {
    // Ensure no matching elements exist
    document.body.innerHTML = '';

    const navigate = vi.fn();
    const setTheme = vi.fn();
    const openThemePanel = vi.fn();
    const actions = createPaletteActions(navigate, setTheme, openThemePanel);

    const scrollActions = actions.filter((a) => a.id.startsWith('scroll-'));
    expect(scrollActions.length).toBeGreaterThan(0);

    for (const action of scrollActions) {
      expect(() => action.execute()).not.toThrow();
    }
  });
});

describe('regression edge cases: fuzzy search (Req 10.2)', () => {
  const makeAction = (overrides: Partial<PaletteAction> & { id: string; title: string }): PaletteAction => ({
    keywords: [],
    category: 'action',
    execute: vi.fn(),
    ...overrides,
  });

  it('matches unicode query characters present in action titles', () => {
    const actions = [makeAction({ id: 'rocket', title: 'Launch 🚀 Mode', keywords: ['rocket'] })];
    const results = fuzzySearch('🚀', actions);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty results for an empty actions array', () => {
    const results = fuzzySearch('anything', []);
    expect(results).toEqual([]);
  });

  it('does not throw for a very long query string', () => {
    const actions = [makeAction({ id: 'a', title: 'Short', keywords: ['short'] })];
    const longQuery = 'x'.repeat(50_000);
    expect(() => fuzzySearch(longQuery, actions)).not.toThrow();
  });
});

describe('regression edge cases: CSS validator (Req 14.3)', () => {
  it('treats empty CSS as valid (no dangerous patterns)', () => {
    const result = validateCSS('');
    expect(result.valid).toBe(true);
  });

  it('rejects @import even with unicode escape sequences in the URL', () => {
    const css = String.raw`@import url("\6A avascript:alert(1)");`;
    const result = validateCSS(css);
    expect(result.valid).toBe(false);
  });

  it('treats dangerous content inside CSS comments as safe', () => {
    const result = validateCSS("/* @import 'evil.css'; */\n.safe { color: red; }");
    expect(result.valid).toBe(true);
  });

  it('does not crash when CSS contains a null byte', () => {
    expect(() => validateCSS('body { color: red; }\0')).not.toThrow();
  });

  it('treats whitespace-only CSS as valid', () => {
    const result = validateCSS('   \n\t\r  ');
    expect(result.valid).toBe(true);
  });

  it('rejects upload with empty filename (no .css extension)', () => {
    const result = validateCSSUpload('body { color: red; }', '', 'text/css');
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('extension');
  });

  it('counts multi-byte unicode by byte size for upload size limit', () => {
    // Each 😀 is 4 bytes in UTF-8. 26000 emojis = 104000 bytes > 102400 limit
    // But string length is only ~26006 chars
    const content = `/* ${'😀'.repeat(26000)} */`;
    const byteLength = new TextEncoder().encode(content).length;
    expect(byteLength).toBeGreaterThan(102400);
    expect(content.length).toBeLessThan(102400);

    const result = validateCSSUpload(content, 'theme.css', 'text/css');
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('exceeds maximum');
  });
});
