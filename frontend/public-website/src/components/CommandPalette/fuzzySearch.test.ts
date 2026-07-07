import { describe, expect, it, vi } from 'vitest';
import { fuzzySearch } from './fuzzySearch';
import type { PaletteAction } from './actions';

function makeAction(overrides: {
  id: string;
  title: string;
  keywords?: string[];
  category?: PaletteAction['category'];
  icon?: string;
  shortcut?: string;
}): PaletteAction {
  return {
    id: overrides.id,
    title: overrides.title,
    keywords: overrides.keywords ?? [],
    category: overrides.category ?? 'action',
    icon: overrides.icon,
    shortcut: overrides.shortcut,
    execute: vi.fn(),
  };
}

describe('fuzzySearch', () => {
  it('returns all actions with score 0 for an empty query', () => {
    const actions = [
      makeAction({ id: 'gamma', title: 'Gamma Action' }),
      makeAction({ id: 'alpha', title: 'Alpha Action' }),
      makeAction({ id: 'beta', title: 'Beta Action' }),
    ];

    const results = fuzzySearch('', actions);

    expect(results).toHaveLength(actions.length);
    expect(results.every((r) => r.score === 0)).toBe(true);
  });

  it('scores exact matches as 100', () => {
    const action = makeAction({ id: 'open-file', title: 'Open File' });

    const results = fuzzySearch('Open File', [action]);

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe(action);
    expect(results[0].score).toBe(100);
  });

  it('scores prefix matches as 75', () => {
    const action = makeAction({ id: 'open-file', title: 'Open File' });

    const results = fuzzySearch('Open', [action]);

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe(action);
    expect(results[0].score).toBe(75);
  });

  it('scores substring matches as 50', () => {
    const action = makeAction({ id: 'open-file', title: 'Open File' });

    const results = fuzzySearch('File', [action]);

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe(action);
    expect(results[0].score).toBe(50);
  });

  it('scores fuzzy matches as 25 when query letters appear in order', () => {
    const action = makeAction({ id: 'open-file', title: 'Open File' });

    // "pnf" -> o[p]e[n] [f]ile — letters p, n, f appear in order
    const results = fuzzySearch('pnf', [action]);

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe(action);
    expect(results[0].score).toBe(25);
  });

  it('returns an empty array when there are no matches', () => {
    const actions = [
      makeAction({ id: 'open-file', title: 'Open File' }),
      makeAction({ id: 'toggle-theme', title: 'Toggle Theme' }),
    ];

    const results = fuzzySearch('xyz', actions);

    expect(results).toEqual([]);
  });

  it('is case-insensitive', () => {
    const action = makeAction({ id: 'toggle-theme', title: 'Toggle Theme' });

    const results = fuzzySearch('toggle theme', [action]);

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe(action);
    expect(results[0].score).toBe(100);
  });

  it('matches against keywords', () => {
    const action = makeAction({
      id: 'appearance',
      title: 'Appearance',
      keywords: ['theme', 'dark mode'],
    });

    const results = fuzzySearch('dark mode', [action]);

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe(action);
    expect(results[0].score).toBe(100);
  });

  it('sorts tied scores alphabetically by title for deterministic ordering', () => {
    const actions = [
      makeAction({ id: 'beta', title: 'Beta Action', keywords: ['common'] }),
      makeAction({ id: 'gamma', title: 'Gamma Action', keywords: ['common'] }),
      makeAction({ id: 'alpha', title: 'Alpha Action', keywords: ['common'] }),
    ];

    const results = fuzzySearch('common', actions);

    expect(results.map((r) => r.score)).toEqual([100, 100, 100]);
    expect(results.map((r) => r.action.title)).toEqual([
      'Alpha Action',
      'Beta Action',
      'Gamma Action',
    ]);
  });

  it('uses the highest score when multiple fields match at different levels', () => {
    const action = makeAction({
      id: 'settings',
      title: 'Open Settings Panel',
      keywords: ['settings'],
    });

    // "settings" is exact match on keyword (100) and substring on title (50)
    // Should pick the highest: 100
    const results = fuzzySearch('settings', [action]);

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe(action);
    expect(results[0].score).toBe(100);
  });

  it('handles whitespace-only queries as empty', () => {
    const actions = [makeAction({ id: 'test', title: 'Test' })];

    const results = fuzzySearch('   ', actions);

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0);
  });
});
