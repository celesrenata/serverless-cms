import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { SectionManager } from '../SectionManager';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import type { SectionTreeNode } from '../../../../shared/sections/types';

const mockMutate = vi.fn();

vi.mock('../../hooks/useSections', () => ({
  useSections: vi.fn(),
  useUpdateSection: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

import { useSections, useUpdateSection } from '../../hooks/useSections';

const mockSections: SectionTreeNode[] = [
  {
    id: 'sec-1',
    name: 'Technology',
    slug: 'technology',
    parent_id: null,
    description: 'Tech articles',
    sort_order: 10,
    path: 'technology',
    path_ids: ['sec-1'],
    depth: 1,
    created_at: 1700000000,
    updated_at: 1700000000,
    post_count: 5,
    children: [
      {
        id: 'sec-2',
        name: 'Web Development',
        slug: 'web-dev',
        parent_id: 'sec-1',
        description: 'Web dev posts',
        sort_order: 20,
        path: 'technology/web-dev',
        path_ids: ['sec-1', 'sec-2'],
        depth: 2,
        created_at: 1700000000,
        updated_at: 1700000000,
        post_count: 3,
        children: [],
      },
    ],
  },
  {
    id: 'sec-3',
    name: 'Design',
    slug: 'design',
    parent_id: null,
    description: 'Design content',
    sort_order: 30,
    path: 'design',
    path_ids: ['sec-3'],
    depth: 1,
    created_at: 1700000000,
    updated_at: 1700000000,
    post_count: 2,
    children: [],
  },
];

describe('SectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while sections are being fetched', () => {
    vi.mocked(useSections).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useSections>);

    renderWithProviders(<SectionManager />);

    expect(screen.getByText('Loading sections...')).toBeInTheDocument();
  });

  it('shows error state when fetching sections fails', () => {
    vi.mocked(useSections).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network failure'),
    } as ReturnType<typeof useSections>);

    renderWithProviders(<SectionManager />);

    expect(screen.getByText('Failed to load sections')).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('shows empty state when no sections exist', () => {
    vi.mocked(useSections).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSections>);

    renderWithProviders(<SectionManager />);

    expect(screen.getByText('No sections yet.')).toBeInTheDocument();
  });

  it('renders section tree with names, post counts, and sort orders', () => {
    vi.mocked(useSections).mockReturnValue({
      data: mockSections,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSections>);

    renderWithProviders(<SectionManager />);

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Web Development')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();

    expect(screen.getByText('5 posts')).toBeInTheDocument();
    expect(screen.getByText('3 posts')).toBeInTheDocument();
    expect(screen.getByText('2 posts')).toBeInTheDocument();

    expect(screen.getByText('#10')).toBeInTheDocument();
    expect(screen.getByText('#20')).toBeInTheDocument();
    expect(screen.getByText('#30')).toBeInTheDocument();
  });

  it('enters inline edit mode when section name is clicked', () => {
    vi.mocked(useSections).mockReturnValue({
      data: mockSections,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSections>);

    renderWithProviders(<SectionManager />);

    const nameButton = screen.getByRole('button', { name: /Edit name: Technology/i });
    fireEvent.click(nameButton);

    const input = screen.getByLabelText('Edit section name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Technology');
  });

  it('saves inline edit on blur and calls update mutation', () => {
    vi.mocked(useSections).mockReturnValue({
      data: mockSections,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSections>);

    renderWithProviders(<SectionManager />);

    const nameButton = screen.getByRole('button', { name: /Edit name: Technology/i });
    fireEvent.click(nameButton);

    const input = screen.getByLabelText('Edit section name');
    fireEvent.change(input, { target: { value: 'Tech Updated' } });
    fireEvent.blur(input);

    expect(mockMutate).toHaveBeenCalledWith(
      { id: 'sec-1', data: { name: 'Tech Updated' } },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('shows error toast when update mutation fails', async () => {
    mockMutate.mockImplementation((_args, options) => {
      options.onError(new Error('Slug conflict'));
    });

    vi.mocked(useSections).mockReturnValue({
      data: mockSections,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSections>);

    renderWithProviders(<SectionManager />);

    const nameButton = screen.getByRole('button', { name: /Edit name: Technology/i });
    fireEvent.click(nameButton);

    const input = screen.getByLabelText('Edit section name');
    fireEvent.change(input, { target: { value: 'Updated' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Slug conflict')).toBeInTheDocument();
  });
});
