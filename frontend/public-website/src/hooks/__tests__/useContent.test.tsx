import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../services/api', () => ({
  api: {
    getContent: vi.fn(),
    getContentBySlug: vi.fn(),
    listContent: vi.fn(),
  },
}));

import { api } from '../../services/api';
import { useContent, useContentBySlug, useContentList } from '../useContent';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches content by id', async () => {
    const mockContent = { id: 'content-1', title: 'Test Post', slug: 'test-post' };
    vi.mocked(api.getContent).mockResolvedValueOnce(mockContent as any);

    const { result } = renderHook(() => useContent('content-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.getContent).toHaveBeenCalledWith('content-1');
    expect(result.current.data).toEqual(mockContent);
  });

  it('is disabled when id is empty', async () => {
    const { result } = renderHook(() => useContent(''), {
      wrapper: createWrapper(),
    });

    // Should not fetch when id is empty
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));

    expect(api.getContent).not.toHaveBeenCalled();
  });
});

describe('useContentBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches content by slug', async () => {
    const mockContent = { id: 'content-1', title: 'Test Post', slug: 'test-post' };
    vi.mocked(api.getContentBySlug).mockResolvedValueOnce(mockContent as any);

    const { result } = renderHook(() => useContentBySlug('test-post'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.getContentBySlug).toHaveBeenCalledWith('test-post');
    expect(result.current.data).toEqual(mockContent);
  });

  it('is disabled when slug is empty', async () => {
    const { result } = renderHook(() => useContentBySlug(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));

    expect(api.getContentBySlug).not.toHaveBeenCalled();
  });
});

describe('useContentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes filters to API', async () => {
    const mockResponse = {
      items: [
        { id: 'content-1', title: 'Post 1', status: 'published' },
        { id: 'content-2', title: 'Post 2', status: 'published' },
      ],
      last_key: undefined,
    };
    vi.mocked(api.listContent).mockResolvedValueOnce(mockResponse as any);

    const filters = { status: 'published', type: 'post' };
    const { result } = renderHook(() => useContentList(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.listContent).toHaveBeenCalledWith(filters);
    expect(result.current.data).toEqual(mockResponse);
  });
});
