// Feature: serverless-site-facelift-theme-engine, Property 8: Theme persistence round-trip via localStorage
// Validates: Requirements 4.3, 4.4, 17.1

import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';

import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

const STORAGE_KEY = 'celestium.theme.active';

const BUILTIN_THEME_IDS = [
  'celestium-neon',
  'aws-console-after-dark',
  'glass-circuit',
  'paper-systems',
  'terminal-witchcraft',
] as const;

type BuiltinThemeId = (typeof BUILTIN_THEME_IDS)[number];

function ThemeTestConsumer({ themeToSet }: { themeToSet: BuiltinThemeId }) {
  const { activeTheme, setTheme } = useTheme();

  return (
    <div>
      <div data-testid="active-theme">{activeTheme}</div>
      <button data-testid="set-theme" type="button" onClick={() => setTheme(themeToSet)}>
        Set theme
      </button>
    </div>
  );
}

function renderThemeProvider(themeToSet: BuiltinThemeId) {
  return render(
    <ThemeProvider>
      <ThemeTestConsumer themeToSet={themeToSet} />
    </ThemeProvider>,
  );
}

describe('Theme persistence', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: vi.fn((callback: FrameRequestCallback): number => {
        callback(performance.now());
        return 1;
      }),
    });

    Object.defineProperty(window, 'cancelAnimationFrame', {
      writable: true,
      value: vi.fn(),
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string): MediaQueryList => {
        return {
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      }),
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  // Feature: serverless-site-facelift-theme-engine, Property 8: Theme persistence round-trip via localStorage
  it('Property 8: persists selected built-in theme and restores it on provider remount', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BUILTIN_THEME_IDS), (randomId) => {
        cleanup();
        window.localStorage.clear();

        // Step 1: Render ThemeProvider and call setTheme(randomId)
        const firstRender = renderThemeProvider(randomId);

        act(() => {
          screen.getByTestId('set-theme').click();
        });

        // Step 2: Verify localStorage contains the correct value
        expect(screen.getByTestId('active-theme')).toHaveTextContent(randomId);
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(randomId);

        // Step 3: Simulate "page reload" by unmounting and re-rendering
        firstRender.unmount();
        cleanup();

        // Step 4: Re-render ThemeProvider — it should initialize with stored theme
        const secondRender = renderThemeProvider(randomId);

        expect(screen.getByTestId('active-theme')).toHaveTextContent(randomId);

        secondRender.unmount();
        cleanup();
      }),
      {
        numRuns: 100,
      },
    );
  });
});
