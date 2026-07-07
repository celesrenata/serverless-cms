import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ContentEditor } from '../ContentEditor';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import type { SectionTreeNode } from '../../../../shared/sections/types';

vi.mock('../../hooks/useContent', () => ({
  useContent: vi.fn(() => ({
    content: null,
    isLoading: false,
    create: vi.fn(),
    update: vi.fn(),
    isCreating: false,
    isUpdating: false,
  })),
}));

vi.mock('../../hooks/useSections', () => ({
  useSections: vi.fn(),
}));

vi.mock('../../components/Editor/RichTextEditor', () => ({
  RichTextEditor: ({ content }: { content?: string }) => (
    <div data-testid="rich-text-editor">{content}</div>
  ),
}));

vi.mock('../../components/MarkdownEditor', () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('../../components/Editor/MediaPicker', () => ({
  MediaPicker: () => null,
}));

vi.mock('../../../../shared/markdown', () => ({
  renderMarkdownToHtml: vi.fn(() => ({
    html: '<p>rendered</p>',
    toc: [],
    shouldShowToc: false,
    warnings: [],
  })),
}));

import { useSections } from '../../hooks/useSections';
import { useContent } from '../../hooks/useContent';

const mockSectionsTree: SectionTreeNode[] = [
  {
    id: 'sec-1',
    name: 'Technology',
    slug: 'technology',
    parent_id: null,
    description: 'Tech posts',
    sort_order: 10,
    path: 'technology',
    path_ids: ['sec-1'],
    depth: 1,
    created_at: 1700000000,
    updated_at: 1700000000,
    children: [
      {
        id: 'sec-2',
        name: 'Frontend',
        slug: 'frontend',
        parent_id: 'sec-1',
        description: 'Frontend dev',
        sort_order: 20,
        path: 'technology/frontend',
        path_ids: ['sec-1', 'sec-2'],
        depth: 2,
        created_at: 1700000000,
        updated_at: 1700000000,
        children: [],
      },
    ],
  },
];

describe('ContentEditor — Sections & Markdown Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSections).mockReturnValue({
      data: mockSectionsTree,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSections>);
  });

  it('shows mode toggle with WYSIWYG active by default for new content', () => {
    renderWithProviders(<ContentEditor />, {
      route: '/content/new',
      routePath: '/content/new',
    });

    const wysiwygBtn = screen.getByRole('button', { name: /WYSIWYG/i });
    const markdownBtn = screen.getByRole('button', { name: /Markdown/i });

    expect(wysiwygBtn).toBeInTheDocument();
    expect(markdownBtn).toBeInTheDocument();
    // WYSIWYG editor should be rendered
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
  });

  it('shows confirmation warning when switching to markdown with existing HTML content', () => {
    vi.mocked(useContent).mockReturnValue({
      content: {
        id: 'test-1',
        type: 'post',
        title: 'Test Post',
        slug: 'test-post',
        content: '<p>Some HTML content</p>',
        excerpt: '',
        author: 'user-1',
        status: 'draft',
        featured_image: '',
        metadata: {},
        created_at: 1700000000,
        updated_at: 1700000000,
        published_at: 0,
      },
      isLoading: false,
      create: vi.fn(),
      update: vi.fn(),
      isCreating: false,
      isUpdating: false,
    } as ReturnType<typeof useContent>);

    renderWithProviders(<ContentEditor />, {
      route: '/content/edit/test-1',
      routePath: '/content/edit/:id',
    });

    const markdownBtn = screen.getByRole('button', { name: /Markdown/i });
    fireEvent.click(markdownBtn);

    expect(screen.getByText(/Switching to markdown mode/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
    // There are multiple Cancel buttons (header + warning), just verify warning text is present
  });

  it('dismisses warning and stays in WYSIWYG mode when Cancel is clicked', () => {
    vi.mocked(useContent).mockReturnValue({
      content: {
        id: 'test-1',
        type: 'post',
        title: 'Test Post',
        slug: 'test-post',
        content: '<p>HTML content</p>',
        excerpt: '',
        author: 'user-1',
        status: 'draft',
        featured_image: '',
        metadata: {},
        created_at: 1700000000,
        updated_at: 1700000000,
        published_at: 0,
      },
      isLoading: false,
      create: vi.fn(),
      update: vi.fn(),
      isCreating: false,
      isUpdating: false,
    } as ReturnType<typeof useContent>);

    renderWithProviders(<ContentEditor />, {
      route: '/content/edit/test-1',
      routePath: '/content/edit/:id',
    });

    fireEvent.click(screen.getByRole('button', { name: /Markdown/i }));

    // The warning section has a Cancel button - find it by context (within the amber warning)
    const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i });
    // The warning Cancel is the one closest to the Confirm button
    const warningCancel = cancelButtons.find(
      (btn) => btn.closest('.bg-amber-50') !== null,
    );
    expect(warningCancel).toBeDefined();
    fireEvent.click(warningCancel!);

    // Warning should be gone
    expect(screen.queryByText(/Switching to markdown mode/)).not.toBeInTheDocument();
    // Still in WYSIWYG mode
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
  });

  it('switches to markdown editor when Confirm is clicked', () => {
    vi.mocked(useContent).mockReturnValue({
      content: {
        id: 'test-1',
        type: 'post',
        title: 'Test Post',
        slug: 'test-post',
        content: '<p>HTML content</p>',
        excerpt: '',
        author: 'user-1',
        status: 'draft',
        featured_image: '',
        metadata: {},
        created_at: 1700000000,
        updated_at: 1700000000,
        published_at: 0,
      },
      isLoading: false,
      create: vi.fn(),
      update: vi.fn(),
      isCreating: false,
      isUpdating: false,
    } as ReturnType<typeof useContent>);

    renderWithProviders(<ContentEditor />, {
      route: '/content/edit/test-1',
      routePath: '/content/edit/:id',
    });

    fireEvent.click(screen.getByRole('button', { name: /Markdown/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    // Warning gone, markdown editor shown
    expect(screen.queryByText(/Switching to markdown mode/)).not.toBeInTheDocument();
    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
  });

  it('renders section selector with hierarchical options', () => {
    renderWithProviders(<ContentEditor />, {
      route: '/content/new',
      routePath: '/content/new',
    });

    // Find the Section heading and select near it
    expect(screen.getByText('Section')).toBeInTheDocument();

    // The selector should have None + Technology + Frontend options
    const sectionSelects = screen.getAllByRole('combobox');
    // Find the section one (not content type or status)
    const sectionSelect = sectionSelects.find((s) => {
      const options = s.querySelectorAll('option');
      return Array.from(options).some((o) => o.textContent?.includes('Technology'));
    });

    expect(sectionSelect).toBeDefined();
    const options = sectionSelect!.querySelectorAll('option');
    const optionTexts = Array.from(options).map((o) => o.textContent);

    expect(optionTexts).toContain('None');
    expect(optionTexts.some((t) => t?.includes('Technology'))).toBe(true);
    expect(optionTexts.some((t) => t?.includes('Frontend'))).toBe(true);
  });
});
