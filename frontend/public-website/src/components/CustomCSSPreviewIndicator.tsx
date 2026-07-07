import { useTheme } from '../theme/ThemeProvider';

/**
 * Persistent visual badge displayed when a custom CSS preview is active.
 * Provides an accessible dismiss control to clear the preview.
 * Renders nothing when no preview is active.
 *
 * Requirements: 7.5, 12.2
 */
export function CustomCSSPreviewIndicator() {
  const { isPreviewActive, dismissPreview } = useTheme();

  if (!isPreviewActive) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md border border-theme-warning/50 bg-theme-surface px-3 py-2 shadow-lg"
    >
      <span className="text-xs font-medium text-theme-warning">
        CSS Preview Active
      </span>
      <button
        type="button"
        onClick={dismissPreview}
        aria-label="Dismiss CSS preview"
        className="ml-1 inline-flex items-center justify-center rounded p-1 text-theme-text-muted transition-colors hover:bg-theme-surface-alt hover:text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
