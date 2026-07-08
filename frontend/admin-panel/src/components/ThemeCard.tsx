import type { ThemeListItem } from '../types/theme';

interface ThemeCardProps {
  theme: ThemeListItem;
  onActivate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (theme: ThemeListItem) => void;
  isActivating?: boolean;
  isDuplicating?: boolean;
  isDeleting?: boolean;
}

export function ThemeCard({
  theme,
  onActivate,
  onDuplicate,
  onDelete,
  onExport,
  isActivating,
  isDuplicating,
  isDeleting,
}: ThemeCardProps) {
  const canDelete = !theme.builtin && !theme.is_active;

  return (
    <div
      className={`relative bg-white rounded-lg border-2 shadow-sm overflow-hidden transition-all ${
        theme.is_active
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Color swatches preview */}
      <div className="flex h-16">
        <div
          className="flex-1"
          style={{ backgroundColor: `rgb(${theme.preview_colors.background})` }}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: `rgb(${theme.preview_colors.surface})` }}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: `rgb(${theme.preview_colors.primary})` }}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: `rgb(${theme.preview_colors.accent})` }}
        />
      </div>

      {/* Badges */}
      <div className="absolute top-2 right-2 flex gap-1">
        {theme.is_active && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            Active
          </span>
        )}
        {theme.builtin && (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            Built-in
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 truncate">{theme.name}</h3>
        <p className="mt-1 text-xs text-gray-500 line-clamp-2 min-h-[2rem]">
          {theme.description || 'No description'}
        </p>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {!theme.is_active && (
            <button
              onClick={() => onActivate(theme.id)}
              disabled={isActivating}
              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {isActivating ? 'Activating...' : 'Activate'}
            </button>
          )}
          <button
            onClick={() => onDuplicate(theme.id)}
            disabled={isDuplicating}
            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
          </button>
          <button
            onClick={() => onExport(theme)}
            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors"
          >
            Export JSON
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(theme.id)}
              disabled={isDeleting}
              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
