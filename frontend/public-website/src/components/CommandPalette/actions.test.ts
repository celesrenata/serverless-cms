import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createPaletteActions, type PaletteAction } from './actions';

describe('createPaletteActions', () => {
  const navigate = vi.fn();
  const setTheme = vi.fn();
  const openThemePanel = vi.fn();

  let actions: PaletteAction[];

  beforeEach(() => {
    vi.clearAllMocks();
    actions = createPaletteActions(navigate, setTheme, openThemePanel);
  });

  it('returns 12 actions total', () => {
    expect(actions).toHaveLength(12);
  });

  it('each action has a unique id', () => {
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each action has non-empty title and keywords', () => {
    actions.forEach((action) => {
      expect(action.title.trim()).not.toBe('');
      expect(action.keywords.length).toBeGreaterThan(0);
      action.keywords.forEach((kw) => expect(kw.trim()).not.toBe(''));
    });
  });

  it('has 4 navigation, 5 theme, and 3 action categories', () => {
    expect(actions.filter((a) => a.category === 'navigation')).toHaveLength(4);
    expect(actions.filter((a) => a.category === 'theme')).toHaveLength(5);
    expect(actions.filter((a) => a.category === 'action')).toHaveLength(3);
  });

  it('all categories are valid', () => {
    const valid = ['navigation', 'theme', 'action'];
    actions.forEach((a) => expect(valid).toContain(a.category));
  });

  it('navigation actions call navigate with correct paths', () => {
    const expected: Record<string, string> = {
      'navigate-home': '/',
      'navigate-blog': '/blog',
      'navigate-gallery': '/gallery',
      'navigate-projects': '/projects',
    };

    Object.entries(expected).forEach(([id, path]) => {
      const action = actions.find((a) => a.id === id);
      expect(action).toBeDefined();
      action!.execute();
      expect(navigate).toHaveBeenLastCalledWith(path);
    });
  });

  it('theme actions call setTheme with correct theme ids', () => {
    const expected: Record<string, string> = {
      'theme-celestium-neon': 'celestium-neon',
      'theme-aws-console-after-dark': 'aws-console-after-dark',
      'theme-glass-circuit': 'glass-circuit',
      'theme-paper-systems': 'paper-systems',
      'theme-terminal-witchcraft': 'terminal-witchcraft',
    };

    Object.entries(expected).forEach(([id, themeId]) => {
      const action = actions.find((a) => a.id === id);
      expect(action).toBeDefined();
      action!.execute();
      expect(setTheme).toHaveBeenLastCalledWith(themeId);
    });
  });

  it('open theme panel action calls openThemePanel', () => {
    const action = actions.find((a) => a.id === 'open-theme-panel');
    expect(action).toBeDefined();
    action!.execute();
    expect(openThemePanel).toHaveBeenCalledTimes(1);
  });

  it('scroll actions call scrollIntoView on the target element', () => {
    const scrollIntoView = vi.fn();
    vi.spyOn(document, 'getElementById').mockReturnValue({
      scrollIntoView,
    } as unknown as HTMLElement);

    const scrollActions: Record<string, string> = {
      'scroll-architecture-map': 'architecture-map',
      'scroll-capabilities': 'capabilities',
    };

    Object.entries(scrollActions).forEach(([id, elementId]) => {
      const action = actions.find((a) => a.id === id);
      expect(action).toBeDefined();
      action!.execute();
      expect(document.getElementById).toHaveBeenLastCalledWith(elementId);
      expect(scrollIntoView).toHaveBeenLastCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });
  });
});
