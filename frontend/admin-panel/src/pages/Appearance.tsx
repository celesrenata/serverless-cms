import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useThemes,
  useActivateTheme,
  useDuplicateTheme,
  useDeleteTheme,
  useCreateTheme,
} from '../hooks/useThemes';
import { getTheme } from '../services/themeService';
import { ThemeCard } from '../components/ThemeCard';
import type { ThemeListItem, ThemeTokens, CreateThemePayload } from '../types/theme';

function isValidThemeTokens(tokens: unknown): tokens is ThemeTokens {
  if (!tokens || typeof tokens !== 'object') return false;
  const t = tokens as Record<string, unknown>;
  return (
    typeof t.colors === 'object' &&
    t.colors !== null &&
    typeof t.typography === 'object' &&
    t.typography !== null &&
    typeof t.radius === 'object' &&
    t.radius !== null &&
    typeof t.shadow === 'object' &&
    t.shadow !== null &&
    typeof t.motion === 'object' &&
    t.motion !== null
  );
}

interface ImportedTheme {
  name?: string;
  description?: string;
  tokens?: unknown;
  custom_css?: string;
}

export function Appearance() {
  const navigate = useNavigate();
  const { data: themeList, isLoading, error } = useThemes();
  const activateMutation = useActivateTheme();
  const duplicateMutation = useDuplicateTheme();
  const deleteMutation = useDeleteTheme();
  const createMutation = useCreateTheme();

  const themes = themeList?.items ?? [];

  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleActivate = (id: string) => {
    activateMutation.mutate(id);
  };

  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this theme? This cannot be undone.')) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleExport = async (theme: ThemeListItem) => {
    try {
      const fullTheme = await getTheme(theme.id);
      const exportData = {
        name: fullTheme.name,
        description: fullTheme.description,
        tokens: fullTheme.tokens,
        custom_css: fullTheme.custom_css || '',
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export theme:', err);
    }
  };

  const handleImportClick = () => {
    setImportError(null);
    setImportSuccess(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    if (!file.name.endsWith('.json')) {
      setImportError('Please select a .json file');
      return;
    }

    try {
      const text = await file.text();
      const parsed: ImportedTheme = JSON.parse(text);

      if (!parsed.name || typeof parsed.name !== 'string') {
        setImportError('Invalid theme file: missing "name" field');
        return;
      }

      if (!isValidThemeTokens(parsed.tokens)) {
        setImportError(
          'Invalid theme file: "tokens" must include colors, typography, radius, shadow, and motion objects'
        );
        return;
      }

      const themeData: CreateThemePayload = {
        name: parsed.name,
        description: parsed.description || '',
        tokens: parsed.tokens,
        custom_css: parsed.custom_css || '',
      };

      createMutation.mutate(themeData, {
        onSuccess: () => {
          setImportSuccess(`Theme "${parsed.name}" imported successfully!`);
          setImportError(null);
        },
        onError: () => {
          setImportError('Failed to import theme. The server rejected the request.');
        },
      });
    } catch (err) {
      if (err instanceof SyntaxError) {
        setImportError('Invalid JSON file');
      } else {
        setImportError('Failed to import theme. Check the file format and try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading themes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading themes: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appearance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your site&apos;s look and feel with themes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImportClick}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Import Theme
          </button>
          <button
            onClick={() => navigate('/appearance/new')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Theme
          </button>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Feedback messages */}
      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{importError}</p>
        </div>
      )}
      {importSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">{importSuccess}</p>
        </div>
      )}

      {/* Theme gallery grid */}
      {themes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No themes available</h3>
          <p className="text-gray-500 mb-4">
            Get started by creating or importing a theme
          </p>
          <button
            onClick={() => navigate('/appearance/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Theme
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              onActivate={handleActivate}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onExport={handleExport}
              isActivating={activateMutation.isPending}
              isDuplicating={duplicateMutation.isPending}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
