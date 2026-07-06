import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMedia, useMediaList } from '../useMedia';
import { api } from '../../services/api';
import type { Media, MediaListResponse } from '../../types/media';

vi.mock('../../services/api', () => ({
  api: {
    getMedia: vi.fn(),
    uploadMedia: vi.fn(),
    updateMedia: vi.fn(),
    deleteMedia: vi.fn(),
    listMedia: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMedia', () => {
  const mockMedia: Media = {
    id: 'media-1',
    filename: 'test-image.jpg',
    s3_key: 'uploads/test-image.jpg',
    s3_url: 'https://example.com/uploads/test-image.jpg',
    mime_type: 'image/jpeg',
    size: 1024,
    uploaded_by: 'user-1',
    uploaded_at: 1710000000,
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches media item when id provided', async () => {
    vi.mocked(api.getMedia).mockResolvedValue(mockMedia);

    const { result } = renderHook(() => useMedia('media-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.media).toEqual(mockMedia);
    });

    expect(api.getMedia).toHaveBeenCalledTimes(1);
    expect(api.getMedia).toHaveBeenCalledWith('media-1');
  });

  it('does not fetch when no id', async () => {
    const { result } = renderHook(() => useMedia(), {
      wrapper: createWrapper(),
    });

    expect(result.current.media).toBeUndefined();

    await waitFor(() => {
      expect(api.getMedia).not.toHaveBeenCalled();
    });
  });

  it('upload mutation calls api.uploadMedia with file and metadata', async () => {
    vi.mocked(api.uploadMedia).mockResolvedValue(mockMedia);

    const file = new File(['test content'], 'test-image.jpg', {
      type: 'image/jpeg',
    });
    const metadata = {
      alt: 'Test image',
      caption: 'A test image',
    };

    const { result } = renderHook(() => useMedia(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.upload({ file, metadata });
    });

    expect(api.uploadMedia).toHaveBeenCalledTimes(1);
    expect(api.uploadMedia).toHaveBeenCalledWith(file, metadata);
  });

  it('delete mutation calls api.deleteMedia with id', async () => {
    vi.mocked(api.deleteMedia).mockResolvedValue(undefined);

    const { result } = renderHook(() => useMedia(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.delete('media-1');
    });

    expect(api.deleteMedia).toHaveBeenCalledTimes(1);
    expect(api.deleteMedia).toHaveBeenCalledWith('media-1');
  });
});

describe('useMediaList', () => {
  const mockMedia: Media = {
    id: 'media-1',
    filename: 'test-image.jpg',
    s3_key: 'uploads/test-image.jpg',
    s3_url: 'https://example.com/uploads/test-image.jpg',
    mime_type: 'image/jpeg',
    size: 1024,
    uploaded_by: 'user-1',
    uploaded_at: 1710000000,
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches media list with params', async () => {
    const mockResponse: MediaListResponse = {
      items: [mockMedia],
      last_key: {
        id: 'media-1',
      },
    };

    vi.mocked(api.listMedia).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useMediaList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        pages: [mockResponse],
        pageParams: [undefined],
      });
    });

    expect(api.listMedia).toHaveBeenCalledTimes(1);
    expect(api.listMedia).toHaveBeenCalledWith({ limit: 50, last_key: undefined });
  });
});
