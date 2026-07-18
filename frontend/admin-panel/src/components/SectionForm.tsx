import { useState, useEffect, useCallback } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  useSections,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
} from '../hooks/useSections';
import { api } from '../services/api';
import type {
  Section,
  SectionTreeNode,
} from '../../../shared/sections/types';

interface SectionFormProps {
  mode: 'create' | 'edit';
  section?: Section;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  slug: string;
  parent_id: string | null;
  description: string;
  sort_order: number;
  page_id: string | null;
  show_posts: boolean;
}

interface FlatOption {
  id: string;
  name: string;
  depth: number;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function flattenTree(
  nodes: SectionTreeNode[],
  depth: number = 0,
  excludeIds: Set<string> = new Set()
): FlatOption[] {
  const result: FlatOption[] = [];
  for (const node of nodes) {
    if (excludeIds.has(node.id)) continue;
    result.push({ id: node.id, name: node.name, depth });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1, excludeIds));
    }
  }
  return result;
}

function getDescendantIds(nodes: SectionTreeNode[], targetId: string): string[] {
  const ids: string[] = [];

  function collectAll(children: SectionTreeNode[]) {
    for (const node of children) {
      ids.push(node.id);
      if (node.children?.length) collectAll(node.children);
    }
  }

  function findNode(children: SectionTreeNode[]): SectionTreeNode | null {
    for (const node of children) {
      if (node.id === targetId) return node;
      if (node.children?.length) {
        const found = findNode(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  const target = findNode(nodes);
  if (target?.children?.length) {
    collectAll(target.children);
  }
  return ids;
}

function countChildrenFromTree(nodes: SectionTreeNode[], targetId: string): { count: number; names: string[] } {
  function findNode(children: SectionTreeNode[]): SectionTreeNode | null {
    for (const node of children) {
      if (node.id === targetId) return node;
      if (node.children?.length) {
        const found = findNode(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  const target = findNode(nodes);
  if (!target?.children?.length) return { count: 0, names: [] };
  return {
    count: target.children.length,
    names: target.children.map((c) => c.name),
  };
}

export default function SectionForm({ mode, section, onSuccess, onCancel }: SectionFormProps) {
  const { data: sections = [] } = useSections();
  const createMutation = useCreateSection();
  const updateMutation = useUpdateSection();
  const deleteMutation = useDeleteSection();

  const { data: publishedPages, isLoading: pagesLoading } = useQuery({
    queryKey: ['content', 'published-pages'],
    queryFn: () => api.listContent({ type: 'page', status: 'published' }),
  });

  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    parent_id: null,
    description: '',
    sort_order: 0,
    page_id: null,
    show_posts: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && section) {
      setFormData({
        name: section.name,
        slug: section.slug,
        parent_id: section.parent_id,
        description: section.description || '',
        sort_order: section.sort_order,
        page_id: section.page_id || null,
        show_posts: section.show_posts ?? true,
      });
      setSlugManuallyEdited(true);
    }
  }, [mode, section]);

  const allSlugs = useCallback((): string[] => {
    const slugs: string[] = [];
    function collect(nodes: SectionTreeNode[]) {
      for (const node of nodes) {
        slugs.push(node.slug);
        if (node.children?.length) collect(node.children);
      }
    }
    collect(sections);
    return slugs;
  }, [sections]);

  const isSlugTaken = useCallback(
    (slug: string): boolean => {
      if (!slug) return false;
      const existing = allSlugs();
      const taken = existing.includes(slug);
      if (mode === 'edit' && section && slug === section.slug) return false;
      return taken;
    },
    [allSlugs, mode, section]
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (formData.slug.length > 120) {
      newErrors.slug = 'Slug must be 120 characters or less';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    } else if (isSlugTaken(formData.slug)) {
      newErrors.slug = 'This slug is already in use';
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    if (
      formData.sort_order < 0 ||
      formData.sort_order > 1000 ||
      !Number.isInteger(formData.sort_order)
    ) {
      newErrors.sort_order = 'Sort order must be an integer between 0 and 1000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: mode === 'create' && !slugManuallyEdited ? generateSlug(value) : prev.slug,
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          parent_id: formData.parent_id || undefined,
          description: formData.description.trim() || undefined,
          sort_order: formData.sort_order,
          page_id: formData.page_id || undefined,
          show_posts: formData.show_posts,
        });
      } else if (section) {
        await updateMutation.mutateAsync({
          id: section.id,
          data: {
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            parent_id: formData.parent_id,
            description: formData.description.trim(),
            sort_order: formData.sort_order,
            page_id: formData.page_id,
            show_posts: formData.show_posts,
          },
        });
      }
      onSuccess();
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error ? error.message : 'An error occurred while saving the section',
      });
    }
  };

  const handleDelete = async () => {
    if (!section) return;
    try {
      await deleteMutation.mutateAsync(section.id);
      onSuccess();
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error ? error.message : 'Failed to delete section',
      });
      setShowDeleteDialog(false);
    }
  };

  // Build parent options excluding self and descendants in edit mode
  const excludeIds = new Set<string>();
  if (mode === 'edit' && section) {
    excludeIds.add(section.id);
    const descendantIds = getDescendantIds(sections, section.id);
    descendantIds.forEach((id) => excludeIds.add(id));
  }
  const parentOptions = flattenTree(sections, 0, excludeIds);

  // Get child info for delete dialog
  const childInfo = section ? countChildrenFromTree(sections, section.id) : { count: 0, names: [] };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={100}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g. Web Development"
          />
          <div className="flex justify-between mt-1">
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            <p className="text-gray-400 text-xs ml-auto">{formData.name.length}/100</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            maxLength={120}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.slug ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g. web-development"
          />
          <div className="flex justify-between mt-1">
            {errors.slug ? (
              <p className="text-red-500 text-sm">{errors.slug}</p>
            ) : (
              <p className="text-gray-400 text-xs">
                Lowercase letters, numbers, and hyphens only
              </p>
            )}
            <p className="text-gray-400 text-xs ml-auto">{formData.slug.length}/120</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Parent Section
          </label>
          <select
            value={formData.parent_id || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, parent_id: e.target.value || null }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">None (root level)</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {'\u00A0\u00A0'.repeat(opt.depth)}{opt.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            maxLength={500}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Optional description for this section"
          />
          <div className="flex justify-between mt-1">
            {errors.description && (
              <p className="text-red-500 text-sm">{errors.description}</p>
            )}
            <p className="text-gray-400 text-xs ml-auto">
              {formData.description.length}/500
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Landing Page
          </label>
          <select
            value={formData.page_id || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, page_id: e.target.value || null }))}
            disabled={pagesLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">None</option>
            {(publishedPages?.items || []).map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
          <p className="text-gray-400 text-xs mt-1">
            Select a published page to display as this section's landing content
          </p>
        </div>

        {formData.page_id && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show_posts"
              checked={formData.show_posts}
              onChange={(e) => setFormData((prev) => ({ ...prev, show_posts: e.target.checked }))}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="show_posts" className="text-sm text-gray-700">
              Show post index below landing page
            </label>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort Order
          </label>
          <input
            type="number"
            value={formData.sort_order}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                sort_order: parseInt(e.target.value, 10) || 0,
              }))
            }
            min={0}
            max={1000}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.sort_order ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.sort_order && (
            <p className="text-red-500 text-sm mt-1">{errors.sort_order}</p>
          )}
          <p className="text-gray-400 text-xs mt-1">
            Lower values appear first (0–1000)
          </p>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {mode === 'edit' && section && (
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={16} />
                Delete Section
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Saving...'
                : mode === 'create'
                  ? 'Create Section'
                  : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && section && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Section
              </h3>
            </div>

            <p className="text-gray-700 mb-4">
              Are you sure you want to delete <strong>{section.name}</strong>?
              This action cannot be undone.
            </p>

            {childInfo.count > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 font-medium mb-1">
                  This section has {childInfo.count} child section{childInfo.count !== 1 ? 's' : ''}:
                </p>
                <ul className="text-sm text-yellow-700 list-disc list-inside">
                  {childInfo.names.slice(0, 10).map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                  {childInfo.count > 10 && (
                    <li className="text-yellow-600">
                      ...and {childInfo.count - 10} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            <p className="text-sm text-gray-500 mb-4">
              Sections with child sections or assigned posts cannot be deleted.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
