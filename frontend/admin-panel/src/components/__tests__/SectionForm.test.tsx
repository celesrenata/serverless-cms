import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import SectionForm from '../SectionForm';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import type { SectionTreeNode } from '../../../../shared/sections/types';

const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

vi.mock('../../hooks/useSections', () => ({
  useSections: vi.fn(),
  useCreateSection: vi.fn(() => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  })),
  useUpdateSection: vi.fn(() => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  })),
  useDeleteSection: vi.fn(() => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  })),
}));

import { useSections } from '../../hooks/useSections';

const mockSectionsTree: SectionTreeNode[] = [
  {
    id: 'sec-1',
    name: 'Engineering',
    slug: 'engineering',
    parent_id: null,
    description: 'Engineering posts',
    sort_order: 10,
    path: 'engineering',
    path_ids: ['sec-1'],
    depth: 1,
    created_at: 1700000000,
    updated_at: 1700000000,
    children: [
      {
        id: 'sec-2',
        name: 'Backend',
        slug: 'backend',
        parent_id: 'sec-1',
        description: 'Backend dev',
        sort_order: 20,
        path: 'engineering/backend',
        path_ids: ['sec-1', 'sec-2'],
        depth: 2,
        created_at: 1700000000,
        updated_at: 1700000000,
        children: [],
      },
    ],
  },
];

describe('SectionForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSections).mockReturnValue({
      data: mockSectionsTree,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSections>);
  });

  it('shows "Name is required" error when name is empty on submit', async () => {
    renderWithProviders(
      <SectionForm mode="create" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
    );

    const submitBtn = screen.getByRole('button', { name: /Create Section/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('shows error when name exceeds 100 characters', async () => {
    renderWithProviders(
      <SectionForm mode="create" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
    );

    const nameInput = screen.getByPlaceholderText('e.g. Web Development');
    fireEvent.change(nameInput, { target: { value: 'A'.repeat(101) } });

    const slugInput = screen.getByPlaceholderText('e.g. web-development');
    fireEvent.change(slugInput, { target: { value: 'valid-slug' } });

    const submitBtn = screen.getByRole('button', { name: /Create Section/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Name must be 100 characters or less')).toBeInTheDocument();
  });

  it('shows "Slug is required" error when slug is empty on submit', async () => {
    renderWithProviders(
      <SectionForm mode="create" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
    );

    const nameInput = screen.getByPlaceholderText('e.g. Web Development');
    fireEvent.change(nameInput, { target: { value: 'Test Section' } });

    // Clear the auto-generated slug
    const slugInput = screen.getByPlaceholderText('e.g. web-development');
    fireEvent.change(slugInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Create Section/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Slug is required')).toBeInTheDocument();
  });

  it('shows error for invalid slug format (uppercase/special characters)', async () => {
    renderWithProviders(
      <SectionForm mode="create" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
    );

    const nameInput = screen.getByPlaceholderText('e.g. Web Development');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    const slugInput = screen.getByPlaceholderText('e.g. web-development');
    fireEvent.change(slugInput, { target: { value: 'INVALID_Slug!' } });

    const submitBtn = screen.getByRole('button', { name: /Create Section/i });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText('Slug must contain only lowercase letters, numbers, and hyphens'),
    ).toBeInTheDocument();
  });

  it('shows duplicate slug error when slug matches existing section', async () => {
    renderWithProviders(
      <SectionForm mode="create" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
    );

    const nameInput = screen.getByPlaceholderText('e.g. Web Development');
    fireEvent.change(nameInput, { target: { value: 'Engineering Dupe' } });

    const slugInput = screen.getByPlaceholderText('e.g. web-development');
    fireEvent.change(slugInput, { target: { value: 'engineering' } });

    const submitBtn = screen.getByRole('button', { name: /Create Section/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('This slug is already in use')).toBeInTheDocument();
  });

  it('shows hierarchical parent selector with indented options', () => {
    renderWithProviders(
      <SectionForm mode="create" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
    );

    const parentSelect = screen.getByRole('combobox');
    const options = parentSelect.querySelectorAll('option');

    // None + Engineering + Backend = 3 options
    expect(options.length).toBe(3);
    expect(options[0]).toHaveTextContent('None (root level)');
    expect(options[1]).toHaveTextContent('Engineering');
    // Backend should be indented (has nbsp characters)
    expect(options[2].textContent).toContain('Backend');
  });

  it('shows delete confirmation dialog in edit mode', () => {
    const editSection = {
      id: 'sec-1',
      name: 'Engineering',
      slug: 'engineering',
      parent_id: null,
      description: 'Engineering posts',
      sort_order: 10,
      path: 'engineering',
      path_ids: ['sec-1'],
      depth: 1,
      created_at: 1700000000,
      updated_at: 1700000000,
    };

    renderWithProviders(
      <SectionForm
        mode="edit"
        section={editSection}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /Delete Section/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();

    // Should show child section info
    expect(screen.getByText(/1 child section/)).toBeInTheDocument();
  });
});
