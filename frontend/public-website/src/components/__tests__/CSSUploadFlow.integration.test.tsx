import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';
import { CustomCSSPreviewIndicator } from '../CustomCSSPreviewIndicator';
import CSSUploadControl from '../ThemePanel/CSSUploadControl';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

const CUSTOM_CSS_STORAGE_KEY = 'celestium.theme.custom';

const TEST_CSS = `.test-card { background: hotpink; color: white; }`;

function getPreviewStyle(): HTMLStyleElement | null {
  return document.head.querySelector<HTMLStyleElement>(
    'style[data-custom-css-preview]',
  );
}

function removePreviewStyles(): void {
  document
    .querySelectorAll('style[data-custom-css-preview]')
    .forEach((el) => el.remove());
}

/**
 * Harness that exposes ThemeProvider actions for direct integration testing.
 */
function TestHarness() {
  const { previewCSS, dismissPreview, saveCustomCSS, isPreviewActive } =
    useTheme();

  return (
    <div>
      <CustomCSSPreviewIndicator />
      <span data-testid="preview-state">{isPreviewActive ? 'active' : 'idle'}</span>
      <button onClick={() => previewCSS(TEST_CSS)}>Preview CSS</button>
      <button onClick={dismissPreview}>Dismiss Preview</button>
      <button onClick={saveCustomCSS}>Save</button>
    </div>
  );
}

function renderHarness() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TestHarness />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function renderUploadFlow() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CSSUploadControl />
        <CustomCSSPreviewIndicator />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

async function uploadFile(
  container: HTMLElement,
  content: string,
  filename = 'theme.css',
  mimeType = 'text/css',
) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([content], filename, { type: mimeType });

  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

describe('CSS Upload Flow Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    removePreviewStyles();
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
    removePreviewStyles();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
    vi.unstubAllGlobals();
  });

  // Validates: Requirements 7.4 — valid CSS injects into <style> element
  it('valid CSS injects into a style element in document.head', () => {
    renderHarness();

    expect(getPreviewStyle()).toBeNull();
    expect(screen.getByTestId('preview-state')).toHaveTextContent('idle');

    act(() => {
      screen.getByRole('button', { name: /Preview CSS/i }).click();
    });

    const style = getPreviewStyle();
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain('@layer user');
    expect(style!.textContent).toContain(TEST_CSS);
    expect(screen.getByTestId('preview-state')).toHaveTextContent('active');
    expect(screen.getByText('CSS Preview Active')).toBeInTheDocument();
  });

  // Validates: Requirements 7.7 — dismiss removes style element and hides indicator
  it('dismiss removes the style element from DOM and hides the indicator', () => {
    renderHarness();

    act(() => {
      screen.getByRole('button', { name: /Preview CSS/i }).click();
    });
    expect(getPreviewStyle()).not.toBeNull();

    act(() => {
      screen.getByRole('button', { name: 'Dismiss Preview' }).click();
    });

    expect(getPreviewStyle()).toBeNull();
    expect(screen.getByTestId('preview-state')).toHaveTextContent('idle');
    expect(screen.queryByText('CSS Preview Active')).not.toBeInTheDocument();
  });

  // Validates: Requirements 7.8 — save persists CSS to localStorage
  it('save persists injected CSS content to localStorage', () => {
    renderHarness();

    act(() => {
      screen.getByRole('button', { name: /Preview CSS/i }).click();
    });

    act(() => {
      screen.getByRole('button', { name: /Save/i }).click();
    });

    const stored = localStorage.getItem(CUSTOM_CSS_STORAGE_KEY);
    expect(stored).not.toBeNull();
    // ThemeProvider stores the full textContent: `@layer user { ... }`
    expect(stored).toContain(TEST_CSS);
    expect(stored).toContain('@layer user');
    // After save, preview is dismissed
    expect(getPreviewStyle()).toBeNull();
    expect(screen.getByTestId('preview-state')).toHaveTextContent('idle');
  });

  // Validates: Requirements 7.1, 7.2, 7.3 — invalid/oversized CSS is rejected without injection
  it('rejects invalid CSS via file upload without injecting a style element', async () => {
    const maliciousCSS = `@import url("https://evil.com/payload.css"); body { color: red; }`;
    const { container } = renderUploadFlow();

    await uploadFile(container, maliciousCSS, 'evil.css', 'text/css');

    await waitFor(() => {
      expect(screen.getByText(/Errors found/i)).toBeInTheDocument();
    });

    expect(getPreviewStyle()).toBeNull();
    expect(screen.queryByText('CSS Preview Active')).not.toBeInTheDocument();
  });

  it('rejects oversized CSS via file upload without injecting a style element', async () => {
    const oversizedCSS = 'a'.repeat(102401);
    const { container } = renderUploadFlow();

    await uploadFile(container, oversizedCSS, 'big.css', 'text/css');

    await waitFor(() => {
      expect(screen.getByText(/Errors found/i)).toBeInTheDocument();
    });

    expect(getPreviewStyle()).toBeNull();
    expect(screen.queryByText('CSS Preview Active')).not.toBeInTheDocument();
  });

  // Validates: Requirements 7.1, 7.4, 7.5 — valid file upload triggers injection and shows indicator
  it('valid CSS file upload triggers preview injection and shows indicator', async () => {
    const validCSS = `.card { border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }`;
    const { container } = renderUploadFlow();

    await uploadFile(container, validCSS, 'theme.css', 'text/css');

    await waitFor(() => {
      expect(screen.getByText(/Valid.*Preview active/i)).toBeInTheDocument();
    });

    const style = getPreviewStyle();
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain(validCSS);
    expect(screen.getByText('CSS Preview Active')).toBeInTheDocument();
  });
});
