import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme, buildCSSVariables } from './ThemeProvider';
import { DEFAULT_THEME } from './tokens';

// Helper to create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

// Wrapper that provides QueryClient
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function TestConsumer() {
  const theme = useTheme();

  return (
    <div>
      <span data-testid="active-theme">{theme.activeTheme}</span>
      <span data-testid="motion">{theme.motionOverride}</span>
      <span data-testid="server-loading">{theme.isServerThemeLoading ? 'true' : 'false'}</span>
      <button data-testid="set-theme" onClick={() => theme.setTheme('test-theme')}>
        set
      </button>
      <button data-testid="set-motion" onClick={() => theme.setMotionOverride('reduce')}>
        motion
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    // Mock fetch to return 404 by default (no active theme on server)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders children', () => {
    render(
      <TestWrapper>
        <ThemeProvider>
          <div data-testid="child">Hello theme</div>
        </ThemeProvider>
      </TestWrapper>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('throws when useTheme is used outside ThemeProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    function Outside() {
      useTheme();
      return <div />;
    }

    expect(() => render(<TestWrapper><Outside /></TestWrapper>)).toThrow(
      'useTheme must be used within a ThemeProvider',
    );
  });

  it('initial activeTheme is celestium-neon', () => {
    render(
      <TestWrapper>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    expect(screen.getByTestId('active-theme')).toHaveTextContent('celestium-neon');
  });

  it('setTheme updates activeTheme and persists to localStorage', () => {
    render(
      <TestWrapper>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    act(() => {
      screen.getByTestId('set-theme').click();
    });

    expect(screen.getByTestId('active-theme')).toHaveTextContent('test-theme');
    expect(localStorage.getItem('celestium.theme.active')).toBe('test-theme');
  });

  it('sets data-theme attribute on document element after setTheme', () => {
    render(
      <TestWrapper>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    act(() => {
      screen.getByTestId('set-theme').click();
    });

    expect(document.documentElement).toHaveAttribute('data-theme', 'test-theme');
  });

  it('initializes with stored theme from localStorage', () => {
    localStorage.setItem('celestium.theme.active', 'celestium-neon');

    render(
      <TestWrapper>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    expect(screen.getByTestId('active-theme')).toHaveTextContent('celestium-neon');
  });

  it('falls back to default if stored theme ID is unknown', () => {
    localStorage.setItem('celestium.theme.active', 'nonexistent-theme');

    render(
      <TestWrapper>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    expect(screen.getByTestId('active-theme')).toHaveTextContent('celestium-neon');
  });

  it('motionOverride defaults to system and setMotionOverride persists', () => {
    render(
      <TestWrapper>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    expect(screen.getByTestId('motion')).toHaveTextContent('system');

    act(() => {
      screen.getByTestId('set-motion').click();
    });

    expect(screen.getByTestId('motion')).toHaveTextContent('reduce');
    expect(localStorage.getItem('celestium.motion.override')).toBe('reduce');
  });

  it('importTheme with invalid JSON returns valid: false', () => {
    let result: ReturnType<ReturnType<typeof useTheme>['importTheme']> | undefined;

    function ImportConsumer() {
      const theme = useTheme();
      return (
        <button
          data-testid="import"
          onClick={() => {
            result = theme.importTheme('{not valid json');
          }}
        >
          import
        </button>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <ImportConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    act(() => {
      screen.getByTestId('import').click();
    });

    expect(result).toBeDefined();
    expect(result!.valid).toBe(false);
    expect(result!.errors.length).toBeGreaterThan(0);
  });

  it('importTheme with valid theme JSON returns valid: true', () => {
    let result: ReturnType<ReturnType<typeof useTheme>['importTheme']> | undefined;

    function ImportConsumer() {
      const theme = useTheme();
      return (
        <button
          data-testid="import"
          onClick={() => {
            result = theme.importTheme(JSON.stringify(DEFAULT_THEME));
          }}
        >
          import
        </button>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <ImportConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    act(() => {
      screen.getByTestId('import').click();
    });

    expect(result).toBeDefined();
    expect(result!.valid).toBe(true);
    expect(result!.errors).toHaveLength(0);
  });
});

describe('buildCSSVariables', () => {
  it('maps color tokens to --color-* custom properties', () => {
    const vars = buildCSSVariables(DEFAULT_THEME);
    expect(vars.get('--color-primary')).toBe('139 92 246');
    expect(vars.get('--color-background')).toBe('3 7 18');
    expect(vars.get('--color-text')).toBe('248 250 252');
    expect(vars.get('--color-accent')).toBe('34 211 238');
  });

  it('maps typography tokens to --font-* custom properties', () => {
    const vars = buildCSSVariables(DEFAULT_THEME);
    expect(vars.get('--font-family')).toContain('Inter');
    expect(vars.get('--font-family-mono')).toContain('JetBrains Mono');
    expect(vars.get('--font-size-base')).toBe('1rem');
    expect(vars.get('--font-size-scale')).toBe('1.25');
    expect(vars.get('--font-line-height')).toBe('1.6');
    expect(vars.get('--font-weight-normal')).toBe('400');
    expect(vars.get('--font-weight-bold')).toBe('700');
  });

  it('maps radius tokens to --radius-* custom properties', () => {
    const vars = buildCSSVariables(DEFAULT_THEME);
    expect(vars.get('--radius-sm')).toBe('0.375rem');
    expect(vars.get('--radius-md')).toBe('0.5rem');
    expect(vars.get('--radius-lg')).toBe('0.75rem');
    expect(vars.get('--radius-full')).toBe('9999px');
  });

  it('maps shadow tokens to --shadow-* custom properties', () => {
    const vars = buildCSSVariables(DEFAULT_THEME);
    expect(vars.get('--shadow-sm')).toContain('0 1px 3px');
    expect(vars.get('--shadow-glow')).toContain('0 0 20px');
  });

  it('maps motion tokens to --motion-* custom properties', () => {
    const vars = buildCSSVariables(DEFAULT_THEME);
    expect(vars.get('--motion-duration-fast')).toBe('150ms');
    expect(vars.get('--motion-duration-normal')).toBe('300ms');
    expect(vars.get('--motion-duration-slow')).toBe('600ms');
    expect(vars.get('--motion-easing')).toContain('cubic-bezier');
  });

  it('maps pattern tokens to --pattern-* custom properties', () => {
    const vars = buildCSSVariables(DEFAULT_THEME);
    expect(vars.get('--pattern-type')).toBe('grid');
    expect(vars.get('--pattern-opacity')).toBe('0.05');
    expect(vars.get('--pattern-color')).toContain('rgba');
  });

  it('omits pattern vars when patterns is undefined', () => {
    const themeNoPatterns = { ...DEFAULT_THEME, patterns: undefined };
    const vars = buildCSSVariables(themeNoPatterns);
    expect(vars.has('--pattern-type')).toBe(false);
  });
});

describe('ThemeProvider - custom theme persistence (Req 17.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    // Mock fetch to return 404 by default (no active theme on server)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('applyCustomTheme persists tokens to celestium.theme.custom', () => {
    const customTokens = {
      ...DEFAULT_THEME,
      id: 'my-custom-theme',
      name: 'My Custom Theme',
    };

    function CustomConsumer() {
      const theme = useTheme();
      return (
        <div>
          <span data-testid="active">{theme.activeTheme}</span>
          <button
            data-testid="apply-custom"
            onClick={() => theme.applyCustomTheme(customTokens)}
          >
            apply
          </button>
        </div>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <CustomConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    act(() => {
      screen.getByTestId('apply-custom').click();
    });

    expect(screen.getByTestId('active')).toHaveTextContent('my-custom-theme');
    expect(localStorage.getItem('celestium.theme.active')).toBe('my-custom-theme');

    const storedCustom = localStorage.getItem('celestium.theme.custom');
    expect(storedCustom).not.toBeNull();
    const parsed = JSON.parse(storedCustom!);
    expect(parsed.id).toBe('my-custom-theme');
    expect(parsed.name).toBe('My Custom Theme');
  });

  it('initializes with stored custom theme from localStorage', () => {
    const customTokens = {
      ...DEFAULT_THEME,
      id: 'stored-custom',
      name: 'Stored Custom',
    };
    localStorage.setItem('celestium.theme.active', 'stored-custom');
    localStorage.setItem('celestium.theme.custom', JSON.stringify(customTokens));

    function CustomConsumer() {
      const theme = useTheme();
      return (
        <div>
          <span data-testid="active">{theme.activeTheme}</span>
          <span data-testid="name">{theme.tokens.name}</span>
          <span data-testid="has-custom">{theme.customTheme ? 'yes' : 'no'}</span>
        </div>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <CustomConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    expect(screen.getByTestId('active')).toHaveTextContent('stored-custom');
    expect(screen.getByTestId('name')).toHaveTextContent('Stored Custom');
    expect(screen.getByTestId('has-custom')).toHaveTextContent('yes');
  });

  it('falls back to default when stored custom theme JSON is invalid', () => {
    localStorage.setItem('celestium.theme.active', 'bad-custom');
    localStorage.setItem('celestium.theme.custom', 'not-valid-json');

    function CustomConsumer() {
      const theme = useTheme();
      return <span data-testid="active">{theme.activeTheme}</span>;
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <CustomConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    // Falls back to system preference / default (celestium-neon)
    expect(screen.getByTestId('active')).toHaveTextContent('celestium-neon');
  });

  it('saveCustomCSS persists CSS content to celestium.theme.custom', () => {
    function CSSConsumer() {
      const theme = useTheme();
      return (
        <div>
          <button
            data-testid="preview"
            onClick={() => theme.previewCSS('body { color: red; }')}
          >
            preview
          </button>
          <button data-testid="save" onClick={() => theme.saveCustomCSS()}>
            save
          </button>
          <span data-testid="preview-active">
            {theme.isPreviewActive ? 'yes' : 'no'}
          </span>
        </div>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <CSSConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    act(() => {
      screen.getByTestId('preview').click();
    });

    expect(screen.getByTestId('preview-active')).toHaveTextContent('yes');

    act(() => {
      screen.getByTestId('save').click();
    });

    expect(screen.getByTestId('preview-active')).toHaveTextContent('no');
    const stored = localStorage.getItem('celestium.theme.custom');
    expect(stored).not.toBeNull();
    expect(stored).toContain('body { color: red; }');
  });

  it('handles localStorage errors gracefully during custom theme persistence', () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    const customTokens = {
      ...DEFAULT_THEME,
      id: 'quota-theme',
      name: 'Quota Theme',
    };

    function CustomConsumer() {
      const theme = useTheme();
      return (
        <div>
          <span data-testid="active">{theme.activeTheme}</span>
          <button
            data-testid="apply-custom"
            onClick={() => theme.applyCustomTheme(customTokens)}
          >
            apply
          </button>
        </div>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <CustomConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    // Should not throw
    act(() => {
      screen.getByTestId('apply-custom').click();
    });

    // Theme still changes in memory even if storage fails
    expect(screen.getByTestId('active')).toHaveTextContent('quota-theme');

    Storage.prototype.setItem = originalSetItem;
  });
});


describe('ThemeProvider - Server theme loading (Task 8)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
    // Remove any injected style elements
    document.querySelectorAll('[data-server-theme-css]').forEach((el) => el.remove());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('applies server theme tokens when no localStorage preference exists', async () => {
    const serverTheme = {
      id: 'server-custom-theme',
      name: 'Server Custom',
      tokens: {
        ...DEFAULT_THEME,
        id: 'server-custom-theme',
        name: 'Server Custom',
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(serverTheme),
    }));

    function Consumer() {
      const theme = useTheme();
      return (
        <div>
          <span data-testid="active">{theme.activeTheme}</span>
          <span data-testid="name">{theme.tokens.name}</span>
        </div>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <Consumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('active')).toHaveTextContent('server-custom-theme');
    });

    expect(screen.getByTestId('name')).toHaveTextContent('Server Custom');
  });

  it('respects localStorage user preference over server default', async () => {
    // User has already chosen a theme
    localStorage.setItem('celestium.theme.active', 'celestium-neon');

    const serverTheme = {
      id: 'server-different-theme',
      name: 'Server Different',
      tokens: {
        ...DEFAULT_THEME,
        id: 'server-different-theme',
        name: 'Server Different',
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(serverTheme),
    }));

    function Consumer() {
      const theme = useTheme();
      return (
        <div>
          <span data-testid="active">{theme.activeTheme}</span>
          <span data-testid="name">{theme.tokens.name}</span>
        </div>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <Consumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    // Wait for query to resolve
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // User's localStorage preference should be retained
    expect(screen.getByTestId('active')).toHaveTextContent('celestium-neon');
    expect(screen.getByTestId('name')).toHaveTextContent('Celestium Neon');
  });

  it('injects custom_css from server theme into @layer user stylesheet', async () => {
    const serverTheme = {
      id: 'css-theme',
      name: 'CSS Theme',
      tokens: {
        ...DEFAULT_THEME,
        id: 'css-theme',
        name: 'CSS Theme',
      },
      custom_css: '.hero { background: purple; }',
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(serverTheme),
    }));

    render(
      <TestWrapper>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    await waitFor(() => {
      const styleEl = document.querySelector('[data-server-theme-css]');
      expect(styleEl).not.toBeNull();
    });

    const styleEl = document.querySelector('[data-server-theme-css]');
    expect(styleEl!.textContent).toContain('@layer user');
    expect(styleEl!.textContent).toContain('.hero { background: purple; }');
  });

  it('gracefully falls back to bundled default on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    function Consumer() {
      const theme = useTheme();
      return (
        <div>
          <span data-testid="active">{theme.activeTheme}</span>
          <span data-testid="name">{theme.tokens.name}</span>
        </div>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <Consumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    // Wait for query to fail
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Should still render with the default theme (no crash)
    expect(screen.getByTestId('active')).toHaveTextContent('celestium-neon');
    expect(screen.getByTestId('name')).toHaveTextContent('Celestium Neon');
  });

  it('gracefully falls back when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    function Consumer() {
      const theme = useTheme();
      return (
        <div>
          <span data-testid="active">{theme.activeTheme}</span>
          <span data-testid="name">{theme.tokens.name}</span>
        </div>
      );
    }

    render(
      <TestWrapper>
        <ThemeProvider>
          <Consumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    // Wait for query to fail
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Should still render with the default theme (no crash)
    expect(screen.getByTestId('active')).toHaveTextContent('celestium-neon');
    expect(screen.getByTestId('name')).toHaveTextContent('Celestium Neon');
  });

  it('does not inject style element when server theme has no custom_css', async () => {
    const serverTheme = {
      id: 'no-css-theme',
      name: 'No CSS Theme',
      tokens: {
        ...DEFAULT_THEME,
        id: 'no-css-theme',
        name: 'No CSS Theme',
      },
      // No custom_css field
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(serverTheme),
    }));

    render(
      <TestWrapper>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-theme')).toHaveTextContent('no-css-theme');
    });

    const styleEl = document.querySelector('[data-server-theme-css]');
    expect(styleEl).toBeNull();
  });
});
