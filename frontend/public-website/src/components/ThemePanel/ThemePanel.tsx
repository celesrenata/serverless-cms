import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import CSSUploadControl from './CSSUploadControl';

// --- Media query hook ---
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// --- Focusable element selector ---
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function ThemePanel() {
  const {
    activeTheme,
    builtinThemes,
    setTheme,
    exportTheme,
    importTheme,
  } = useTheme();

  const panelTitleId = useId();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{ path: string; message: string }>>([]);

  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleThemes = useMemo(() => builtinThemes.slice(0, 5), [builtinThemes]);

  // --- Open/Close logic ---
  const openPanel = useCallback(() => {
    setShouldRender(true);
    requestAnimationFrame(() => {
      setIsOpen(true);
    });
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Focus close button when panel opens, lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Unmount after slide-out transition completes, restore focus
  useEffect(() => {
    if (isOpen || !shouldRender) return;

    const timer = window.setTimeout(() => {
      setShouldRender(false);
      openButtonRef.current?.focus();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isOpen, shouldRender]);

  // --- Focus trap + Escape ---
  const handlePanelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
        return;
      }

      if (event.key !== 'Tab') return;

      if (!panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    [closePanel],
  );

  // --- Import/Export ---
  const handleExport = useCallback(() => {
    exportTheme();
  }, [exportTheme]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const json = await file.text();
        const result = importTheme(json);
        if (result.valid) {
          setImportErrors([]);
        } else {
          setImportErrors(result.errors);
        }
      } finally {
        event.target.value = '';
      }
    },
    [importTheme],
  );

  return (
    <>
      {/* Floating toggle button */}
      <button
        ref={openButtonRef}
        type="button"
        aria-label="Open theme panel"
        onClick={openPanel}
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-theme-primary text-theme-text-inverse shadow-lg transition hover:scale-105 hover:bg-theme-primary-hover focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 md:bottom-6 md:right-6"
      >
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a7 7 0 0 0 0 14h.5" />
          <path d="M12 8v0" />
          <circle cx="7.5" cy="11.5" r="1.5" />
          <circle cx="12" cy="7.5" r="1.5" />
          <circle cx="16.5" cy="11.5" r="1.5" />
        </svg>
      </button>

      {/* Panel overlay */}
      {shouldRender && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            role="presentation"
            onClick={closePanel}
            className={[
              'absolute inset-0 bg-black/50 transition-opacity duration-300 ease-out',
              isOpen ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />

          {/* Panel dialog */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={panelTitleId}
            onKeyDown={handlePanelKeyDown}
            className={[
              'fixed bg-theme-surface text-theme-text shadow-2xl transition-all duration-300 ease-out border-theme-border overflow-hidden',
              isDesktop
                ? [
                    'right-0 top-0 h-full w-full max-w-md border-l',
                    isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
                  ].join(' ')
                : [
                    'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl border-t',
                    isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
                  ].join(' '),
            ].join(' ')}
          >
            <div className="flex h-full max-h-[85vh] flex-col md:max-h-full">
              {/* Header */}
              <header className="flex items-start justify-between gap-4 border-b border-theme-border px-5 py-4">
                <div>
                  <h2
                    id={panelTitleId}
                    className="text-lg font-semibold text-theme-text"
                  >
                    Choose a theme
                  </h2>
                  <p className="mt-1 text-sm text-theme-text-muted">
                    Select a built-in theme or import your own.
                  </p>
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Close theme panel"
                  onClick={closePanel}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-theme-border bg-theme-background text-theme-text transition hover:bg-theme-surface-alt focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2"
                >
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </header>

              {/* Theme cards list */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="grid gap-3">
                  {visibleThemes.map((theme) => {
                    const isActive = theme.id === activeTheme;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setTheme(theme.id)}
                        className={[
                          'w-full rounded-xl border p-4 text-left transition',
                          'focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2',
                          isActive
                            ? 'border-theme-primary ring-2 ring-theme-primary'
                            : 'border-theme-border hover:border-theme-accent hover:bg-theme-background-alt',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-medium text-theme-text">
                                {theme.name}
                              </h3>
                              {isActive && (
                                <span
                                  aria-label="Active theme"
                                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-theme-primary text-xs text-theme-text-inverse"
                                >
                                  ✓
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-theme-text-muted">
                              {theme.description}
                            </p>
                          </div>

                          {/* Color swatches */}
                          <div
                            aria-hidden="true"
                            className="flex shrink-0 items-center gap-1 pt-1"
                          >
                            {[
                              theme.colors.primary,
                              theme.colors.secondary,
                              theme.colors.accent,
                              theme.colors.background,
                            ].map((color, index) => (
                              <span
                                key={`${theme.id}-swatch-${index}`}
                                className="h-4 w-4 rounded-full border border-theme-border-light shadow-sm"
                                style={{ backgroundColor: `rgb(${color})` }}
                              />
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer with import/export */}
              <footer className="border-t border-theme-border px-5 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center justify-center rounded-lg border border-theme-border bg-theme-background px-4 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-surface-alt focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleImportClick}
                    className="inline-flex items-center justify-center rounded-lg bg-theme-primary px-4 py-2 text-sm font-medium text-theme-text-inverse transition hover:bg-theme-primary-hover focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2"
                  >
                    Import JSON
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={handleImportChange}
                  />
                </div>

                {/* CSS Upload */}
                <div className="mt-3">
                  <CSSUploadControl />
                </div>

                {/* Import validation errors */}
                {importErrors.length > 0 && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-950"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        Import failed — {importErrors.length} {importErrors.length === 1 ? 'error' : 'errors'}:
                      </p>
                      <button
                        type="button"
                        aria-label="Dismiss import errors"
                        onClick={() => setImportErrors([])}
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-400 dark:hover:text-red-200"
                      >
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {importErrors.map((error, index) => (
                        <li key={index} className="text-xs text-red-700 dark:text-red-400">
                          {error.path ? (
                            <><span className="font-mono font-semibold">{error.path}</span>: {error.message}</>
                          ) : (
                            error.message
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </footer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ThemePanel;
