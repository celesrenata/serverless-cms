import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useContent } from '../useContent';
import { api } from '../../services/api';
import type { ContentCreate, ContentUpdate } from '../../types/content';

vi.mock('../../services/api', () => ({
  api: {
    getContent: vi.fn(),
    createContent: vi.fn(),
    updateContent: vi.fn(),
    deleteContent: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially when id is provided', () => {
    vi.mocked(api.getContent).mockReturnValue(
      new Promise(() => {}) as ReturnType<typeof api.getContent>
    );

    const { result } = renderHook(() => useContent('content-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(api.getContent).toHaveBeenCalledWith('content-1');
  });

  it('fetches content and returns it when id is provided', async () => {
    const mockContent = {
      id: 'content-1',
      title: 'Test Content',
      content: 'Test body',
      type: 'page',
      status: 'published',
    } as Awaited<ReturnType<typeof api.getContent>>;

    vi.mocked(api.getContent).mockResolvedValue(mockContent);

    const { result } = renderHook(() => useContent('content-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.content).toEqual(mockContent);
    });

    expect(result.current.isLoading).toBe(false);
    expect(api.getContent).toHaveBeenCalledWith('content-1');
  });

  it('does not fetch when id is undefined', async () => {
    const { result } = renderHook(() => useContent(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.content).toBeUndefined();
    expect(api.getContent).not.toHaveBeenCalled();
  });

  it('create mutation calls api.createContent with the data', async () => {
    const createData = {
      type: 'page',
      title: 'New Content',
      content: 'New content body',
    } as unknown as ContentCreate;

    const mockCreatedContent = {
      id: 'content-1',
      ...createData,
    } as Awaited<ReturnType<typeof api.createContent>>;

    vi.mocked(api.createContent).mockResolvedValue(mockCreatedContent);

    const { result } = renderHook(() => useContent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.create(createData);
    });

    expect(api.createContent).toHaveBeenCalledWith(createData);
  });

  it('update mutation calls api.updateContent with id and data', async () => {
    const updateData: ContentUpdate = {
      title: 'Updated Content',
      content: 'Updated content body',
    };

    const mockUpdatedContent = {
      id: 'content-1',
      title: 'Updated Content',
      content: 'Updated content body',
    } as Awaited<ReturnType<typeof api.updateContent>>;

    vi.mocked(api.updateContent).mockResolvedValue(mockUpdatedContent);

    const { result } = renderHook(() => useContent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.update({ id: 'content-1', data: updateData });
    });

    expect(api.updateContent).toHaveBeenCalledWith('content-1', updateData);
  });

  it('delete mutation calls api.deleteContent with id', async () => {
    vi.mocked(api.deleteContent).mockResolvedValue(
      undefined as Awaited<ReturnType<typeof api.deleteContent>>
    );

    const { result } = renderHook(() => useContent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.delete('content-1');
    });

    expect(api.deleteContent).toHaveBeenCalledWith('content-1');
  });
});
