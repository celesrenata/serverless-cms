import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { ContentEditor } from '../ContentEditor';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockContent } from '../../test/mocks/data';

vi.mock('../../services/api', () => ({
  api: {
    getContent: vi.fn(),
    createContent: vi.fn(),
    updateContent: vi.fn(),
    deleteContent: vi.fn(),
  },
}));

vi.mock('../../components/Editor/RichTextEditor', () => ({
  RichTextEditor: ({ content }: { content?: string }) => (
    <div data-testid="rich-text-editor">{content}</div>
  ),
}));

vi.mock('../../components/Editor/MediaPicker', () => ({
  MediaPicker: ({ isOpen }: { isOpen?: boolean }) =>
    isOpen ? <div data-testid="media-picker" /> : null,
}));

vi.mock('../../../../shared/markdown', () => ({
  renderMarkdownToHtml: vi.fn(() => ({
    html: '',
    toc: [],
    shouldShowToc: false,
    warnings: [],
  })),
}));

describe('ContentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty form for new post with save action', () => {
    renderWithProviders(<ContentEditor />, {
      route: '/content/new',
      routePath: '/content/new',
    });

    expect(
      screen.getByRole('heading', { name: /create new content/i }),
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText('Enter title...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
  });

  it('populates form with post data from mock API for existing post', async () => {
    vi.mocked(api.getContent).mockResolvedValue(createMockContent());

    renderWithProviders(<ContentEditor />, {
      route: '/content/edit/content-001',
      routePath: '/content/edit/:id',
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter title...')).toHaveValue(
        'Getting Started with Our CMS',
      );
    });

    expect(
      screen.getByRole('heading', { name: /edit content/i }),
    ).toBeInTheDocument();
  });
});
