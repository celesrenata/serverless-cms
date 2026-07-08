import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { createPaletteActions, type PaletteAction } from './actions';
import { fuzzySearch } from './fuzzySearch';
import { useTheme } from '../../theme/ThemeProvider';

type PaletteCategory = 'navigation' | 'theme' | 'action';

const CATEGORY_ORDER: PaletteCategory[] = ['navigation', 'theme', 'action'];

const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  navigation: 'Navigation',
  theme: 'Theme',
  action: 'Actions',
};

const CATEGORY_ICONS: Record<PaletteCategory, string> = {
  navigation: '⌂',
  theme: '◑',
  action: '↕',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.tabIndex !== -1 &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.getClientRects().length > 0,
  );
}

function getOptionId(actionId: string): string {
  return `command-palette-option-${actionId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function CommandPalette() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const openThemePanel = useCallback((): void => {}, []);

  const actions = useMemo<PaletteAction[]>(
    () => createPaletteActions(navigate, setTheme, openThemePanel),
    [navigate, setTheme, openThemePanel],
  );

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const searchResults = useMemo(() => {
    if (!hasQuery) {
      return actions.map((action) => ({ action, score: 0 }));
    }
    return fuzzySearch(trimmedQuery, actions);
  }, [actions, hasQuery, trimmedQuery]);

  const visibleActions = useMemo<PaletteAction[]>(
    () => searchResults.map((result) => result.action),
    [searchResults],
  );

  const groupedActions = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        actions: visibleActions.filter((action) => action.category === category),
      })).filter((group) => group.actions.length > 0),
    [visibleActions],
  );

  const actionIndexById = useMemo(() => {
    const indexMap = new Map<string, number>();
    visibleActions.forEach((action, index) => {
      indexMap.set(action.id, index);
    });
    return indexMap;
  }, [visibleActions]);

  const activeAction = activeIndex >= 0 ? visibleActions[activeIndex] ?? null : null;
  const activeOptionId = activeAction ? getOptionId(activeAction.id) : undefined;

  const openPalette = useCallback((): void => {
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setActiveIndex(0);
    setIsOpen(true);
  }, []);

  const closePalette = useCallback((): void => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);

    const previouslyFocusedElement = previouslyFocusedElementRef.current;
    window.requestAnimationFrame(() => {
      if (previouslyFocusedElement && document.contains(previouslyFocusedElement)) {
        previouslyFocusedElement.focus({ preventScroll: true });
      }
    });
  }, []);

  const executeAction = useCallback(
    (action: PaletteAction): void => {
      action.execute();
      closePalette();
    },
    [closePalette],
  );

  // Global Cmd+K / Ctrl+K handler
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent): void => {
      const isCommandK =
        event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);

      if (!isCommandK || event.altKey || event.shiftKey) {
        return;
      }

      event.preventDefault();

      if (isOpen) {
        closePalette();
      } else {
        openPalette();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [closePalette, isOpen, openPalette]);

  // Focus input when opening
  useEffect(() => {
    if (!isOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Reset active index on query change
  useEffect(() => {
    setActiveIndex(visibleActions.length > 0 ? 0 : -1);
  }, [query, visibleActions.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const activeElement = dialogRef.current?.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`,
    );
    if (activeElement && typeof activeElement.scrollIntoView === 'function') {
      activeElement.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  const handleDialogKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePalette();
        return;
      }

      // Focus trap
      if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusableElements = getFocusableElements(dialog);
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        const currentElement = document.activeElement;

        if (event.shiftKey) {
          if (currentElement === firstFocusable || !dialog.contains(currentElement as Node)) {
            event.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (currentElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
          }
        }
        return;
      }

      if (visibleActions.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (i < 0 ? 0 : (i + 1) % visibleActions.length));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? visibleActions.length - 1 : i - 1));
        return;
      }

      if (event.key === 'Enter') {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.closest('[data-palette-ignore-enter="true"]')
        ) {
          return;
        }
        event.preventDefault();
        if (activeAction) {
          executeAction(activeAction);
        }
      }
    },
    [activeAction, closePalette, executeAction, visibleActions.length],
  );

  const handleBackdropMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      if (event.target === event.currentTarget) {
        closePalette();
      }
    },
    [closePalette],
  );

  const renderActionButton = useCallback(
    (action: PaletteAction) => {
      const index = actionIndexById.get(action.id) ?? -1;
      const isActive = index === activeIndex;
      const icon = CATEGORY_ICONS[action.category];

      return (
        <button
          key={action.id}
          id={getOptionId(action.id)}
          type="button"
          role="option"
          aria-selected={isActive}
          data-palette-index={index}
          className={[
            'group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]',
            isActive
              ? 'bg-[rgb(var(--color-primary))] text-[rgb(var(--color-background))]'
              : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-background))]',
          ].join(' ')}
          onMouseEnter={() => {
            if (index >= 0) setActiveIndex(index);
          }}
          onFocus={() => {
            if (index >= 0) setActiveIndex(index);
          }}
          onClick={() => executeAction(action)}
        >
          <span
            aria-hidden="true"
            className={[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm',
              isActive
                ? 'border-[rgb(var(--color-background))] text-[rgb(var(--color-background))]'
                : 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-muted))]',
            ].join(' ')}
          >
            {icon}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{action.title}</span>
            <span
              className={[
                'mt-0.5 block truncate text-xs',
                isActive
                  ? 'text-[rgb(var(--color-background))]'
                  : 'text-[rgb(var(--color-text-muted))]',
              ].join(' ')}
            >
              {CATEGORY_LABELS[action.category]}
              {action.keywords.length > 0
                ? ` · ${action.keywords.slice(0, 3).join(', ')}`
                : ''}
            </span>
          </span>

          {action.shortcut ? (
            <kbd
              className={[
                'ml-2 shrink-0 rounded-md border px-2 py-1 text-xs font-medium',
                isActive
                  ? 'border-[rgb(var(--color-background))] text-[rgb(var(--color-background))]'
                  : 'border-[rgb(var(--color-border))] text-[rgb(var(--color-text-muted))]',
              ].join(' ')}
            >
              {action.shortcut}
            </kbd>
          ) : null}
        </button>
      );
    },
    [actionIndexById, activeIndex, executeAction],
  );

  const resultCountText =
    visibleActions.length === 1
      ? '1 command available.'
      : `${visibleActions.length} commands available.`;

  return (
    <>
      {/* Mobile trigger button */}
      <button
        type="button"
        aria-label="Open command palette"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Open command palette (⌘K)"
        className={[
          'fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border',
          'border-[rgb(var(--color-border))] bg-[rgb(var(--color-primary))] text-[rgb(var(--color-background))] shadow-xl',
          'transition-transform hover:scale-105',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2',
          'focus-visible:ring-offset-[rgb(var(--color-background))]',
        ].join(' ')}
        onClick={openPalette}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      {/* Modal overlay */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={handleBackdropMouseDown}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            className={[
              'w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl',
              'border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]',
            ].join(' ')}
            onKeyDown={handleDialogKeyDown}
          >
            {/* Header with search */}
            <div className="border-b border-[rgb(var(--color-border))] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2
                  id="command-palette-title"
                  className="text-base font-semibold"
                >
                  Command palette
                </h2>

                <button
                  type="button"
                  data-palette-ignore-enter="true"
                  aria-label="Close command palette"
                  className={[
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg border',
                    'border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))]',
                    'hover:bg-[rgb(var(--color-background))] hover:text-[rgb(var(--color-text))]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]',
                  ].join(' ')}
                  onClick={closePalette}
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    ×
                  </span>
                </button>
              </div>

              <label htmlFor="command-palette-search" className="sr-only">
                Search commands
              </label>

              <div className="relative">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgb(var(--color-text-muted))]"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>

                <input
                  ref={inputRef}
                  id="command-palette-search"
                  type="search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded="true"
                  aria-controls="command-palette-results"
                  aria-activedescendant={activeOptionId}
                  aria-describedby="command-palette-result-count"
                  value={query}
                  placeholder="Search pages, themes, and actions…"
                  className={[
                    'w-full rounded-xl border py-3 pl-10 pr-4 text-sm',
                    'border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))]',
                    'placeholder:text-[rgb(var(--color-text-muted))]',
                    'focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))]',
                  ].join(' ')}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              <p
                id="command-palette-result-count"
                className="sr-only"
                aria-live="polite"
                aria-atomic="true"
              >
                {resultCountText}
              </p>
            </div>

            {/* Results */}
            <div
              id="command-palette-results"
              role="listbox"
              aria-label="Command palette results"
              className="max-h-[60vh] overflow-y-auto p-2"
            >
              {visibleActions.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-[rgb(var(--color-text))]">
                    No commands found
                  </p>
                  <p className="mt-1 text-sm text-[rgb(var(--color-text-muted))]">
                    Try searching for a page, theme, or action.
                  </p>
                </div>
              ) : hasQuery ? (
                <div className="space-y-1">
                  {visibleActions.map(renderActionButton)}
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedActions.map((group) => (
                    <section
                      key={group.category}
                      aria-labelledby={`palette-${group.category}`}
                    >
                      <div
                        id={`palette-${group.category}`}
                        className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--color-text-muted))]"
                      >
                        <span aria-hidden="true">
                          {CATEGORY_ICONS[group.category]}
                        </span>
                        <span>{CATEGORY_LABELS[group.category]}</span>
                      </div>
                      <div className="space-y-1">
                        {group.actions.map(renderActionButton)}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with keyboard hints */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[rgb(var(--color-border))] px-4 py-3 text-xs text-[rgb(var(--color-text-muted))]">
              <span>
                <kbd className="rounded border border-[rgb(var(--color-border))] px-1.5 py-0.5">
                  ↑↓
                </kbd>{' '}
                Navigate
              </span>
              <span>
                <kbd className="rounded border border-[rgb(var(--color-border))] px-1.5 py-0.5">
                  Enter
                </kbd>{' '}
                Run
              </span>
              <span>
                <kbd className="rounded border border-[rgb(var(--color-border))] px-1.5 py-0.5">
                  Esc
                </kbd>{' '}
                Close
              </span>
              <span>
                <kbd className="rounded border border-[rgb(var(--color-border))] px-1.5 py-0.5">
                  ⌘K
                </kbd>{' '}
                Toggle
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default CommandPalette;
