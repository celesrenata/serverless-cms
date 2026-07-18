import { useState, useCallback, useRef, useEffect } from 'react';
import { useSections, useUpdateSection } from '../hooks/useSections';
import SectionForm from '../components/SectionForm';
import type { SectionTreeNode, UpdateSectionRequest } from '../../../shared/sections/types';

interface EditState {
  sectionId: string;
  field: 'name' | 'description' | 'sort_order';
  value: string;
}

interface Toast {
  id: number;
  message: string;
}

function SectionTreeItem({
  node,
  onEdit,
  onFullEdit,
  editState,
  onEditChange,
  onEditSave,
  onEditCancel,
}: {
  node: SectionTreeNode;
  onEdit: (sectionId: string, field: EditState['field'], value: string) => void;
  onFullEdit: (node: SectionTreeNode) => void;
  editState: EditState | null;
  onEditChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasChildren = node.children && node.children.length > 0;

  useEffect(() => {
    if (editState?.sectionId === node.id && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editState, node.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onEditSave();
    } else if (e.key === 'Escape') {
      onEditCancel();
    }
  };

  const isEditing = (field: EditState['field']) =>
    editState?.sectionId === node.id && editState?.field === field;

  return (
    <div className="select-none">
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 group">
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label={expanded ? 'Collapse section' : 'Expand section'}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <span className="w-4 h-4" />
          )}
        </button>

        {/* Section name (editable) */}
        <div className="flex-1 min-w-0">
          {isEditing('name') ? (
            <input
              ref={inputRef}
              type="text"
              value={editState!.value}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onEditSave}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-0.5 text-sm font-medium border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
              aria-label="Edit section name"
            />
          ) : (
            <button
              onClick={() => onEdit(node.id, 'name', node.name)}
              className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-text text-left truncate block w-full"
              title="Click to edit name"
              aria-label={`Edit name: ${node.name}`}
            >
              {node.name}
            </button>
          )}

          {/* Description (editable) */}
          {isEditing('description') ? (
            <input
              ref={inputRef}
              type="text"
              value={editState!.value}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onEditSave}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5"
              maxLength={500}
              placeholder="Add description..."
              aria-label="Edit section description"
            />
          ) : (
            <button
              onClick={() => onEdit(node.id, 'description', node.description || '')}
              className="text-xs text-gray-500 hover:text-blue-600 cursor-text text-left truncate block w-full"
              title="Click to edit description"
              aria-label={`Edit description: ${node.description || 'empty'}`}
            >
              {node.description || 'No description'}
            </button>
          )}
        </div>

        {/* Sort order (editable) */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isEditing('sort_order') ? (
            <input
              ref={inputRef}
              type="number"
              value={editState!.value}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onEditSave}
              onKeyDown={handleKeyDown}
              className="w-16 px-2 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={0}
              max={1000}
              aria-label="Edit sort order"
            />
          ) : (
            <button
              onClick={() => onEdit(node.id, 'sort_order', String(node.sort_order))}
              className="text-xs text-gray-500 hover:text-blue-600 px-2 py-0.5 rounded hover:bg-gray-100"
              title="Click to edit sort order"
              aria-label={`Sort order: ${node.sort_order}. Click to edit.`}
            >
              #{node.sort_order}
            </button>
          )}

          {/* Post count badge */}
          {'post_count' in node && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {(node as SectionTreeNode & { post_count?: number }).post_count ?? 0} posts
            </span>
          )}

          {/* Edit button - visible on hover */}
          <button
            onClick={() => onFullEdit(node)}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 rounded transition-opacity"
            title="Edit all settings"
            aria-label={`Edit ${node.name} settings`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Slug display */}
          <span className="text-xs text-gray-400 font-mono hidden md:inline">
            /{node.slug}
          </span>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-6 border-l border-gray-200 pl-2">
          {node.children.map((child) => (
            <SectionTreeItem
              key={child.id}
              node={child}
              onEdit={onEdit}
              onFullEdit={onFullEdit}
              editState={editState}
              onEditChange={onEditChange}
              onEditSave={onEditSave}
              onEditCancel={onEditCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionManager() {
  const { data: sections, isLoading, error } = useSections();
  const updateSection = useUpdateSection();

  const [editState, setEditState] = useState<EditState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionTreeNode | null>(null);
  const toastIdRef = useRef(0);

  const showErrorToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const handleEdit = useCallback(
    (sectionId: string, field: EditState['field'], value: string) => {
      setEditState({ sectionId, field, value });
    },
    []
  );

  const handleEditChange = useCallback((value: string) => {
    setEditState((prev) => (prev ? { ...prev, value } : null));
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editState) return;

    const { sectionId, field, value } = editState;

    const data: UpdateSectionRequest = {};
    if (field === 'name') {
      if (!value.trim()) {
        showErrorToast('Section name cannot be empty');
        return;
      }
      data.name = value.trim();
    } else if (field === 'description') {
      data.description = value.trim();
    } else if (field === 'sort_order') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 0 || num > 1000) {
        showErrorToast('Sort order must be between 0 and 1000');
        return;
      }
      data.sort_order = num;
    }

    updateSection.mutate(
      { id: sectionId, data },
      {
        onSuccess: () => {
          setEditState(null);
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Failed to update section';
          showErrorToast(message);
          // Preserve edit state so user can retry
        },
      }
    );
  }, [editState, updateSection, showErrorToast]);

  const handleEditCancel = useCallback(() => {
    setEditState(null);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Sections</h1>
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <span className="ml-3 text-gray-600">Loading sections...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Sections</h1>
        <div className="card">
          <div className="text-center py-12">
            <p className="text-red-600 font-medium">Failed to load sections</p>
            <p className="text-sm text-gray-500 mt-1">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Sections</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Section
        </button>
      </div>

      {showCreateForm && (
        <div className="card">
          <SectionForm
            mode="create"
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {editingSection && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Edit Section: {editingSection.name}</h2>
          </div>
          <SectionForm
            mode="edit"
            section={editingSection}
            onSuccess={() => setEditingSection(null)}
            onCancel={() => setEditingSection(null)}
          />
        </div>
      )}

      <div className="card">
        {sections && sections.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {sections.map((section) => (
              <SectionTreeItem
                key={section.id}
                node={section}
                onEdit={handleEdit}
                onFullEdit={setEditingSection}
                editState={editState}
                onEditChange={handleEditChange}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-gray-500">No sections yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Create your first section to organize blog posts.
            </p>
          </div>
        )}
      </div>

      {/* Error toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm animate-pulse"
              role="alert"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">{toast.message}</span>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="ml-auto text-white hover:text-gray-200"
                  aria-label="Dismiss"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
