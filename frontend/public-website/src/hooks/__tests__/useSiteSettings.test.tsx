import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../services/api', () => ({
  api: {
    getPublicSettings: vi.fn(),
  },
}));

import { api } from '../../services/api';
import { useSiteSettings } from '../useSiteSettings';

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

describe('useSiteSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches public settings on mount', async () => {
    const mockSettings = {
      site_title: 'My Site',
      site_description: 'A great site',
      theme: 'default',
      registration_enabled: true,
      comments_enabled: true,
      captcha_enabled: false,
    };
    vi.mocked(api.getPublicSettings).mockResolvedValueOnce(mockSettings as any);

    const { result } = renderHook(() => useSiteSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.getPublicSettings).toHaveBeenCalled();
  });

  it('returns settings data with all expected fields', async () => {
    const mockSettings = {
      site_title: 'Test Blog',
      site_description: 'A blog about testing',
      theme: 'dark',
      registration_enabled: false,
      comments_enabled: true,
      captcha_enabled: true,
    };
    vi.mocked(api.getPublicSettings).mockResolvedValueOnce(mockSettings as any);

    const { result } = renderHook(() => useSiteSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSettings);
    expect(result.current.data?.site_title).toBe('Test Blog');
    expect(result.current.data?.site_description).toBe('A blog about testing');
    expect(result.current.data?.theme).toBe('dark');
    expect(result.current.data?.registration_enabled).toBe(false);
    expect(result.current.data?.comments_enabled).toBe(true);
    expect(result.current.data?.captcha_enabled).toBe(true);
  });

  it('returns error state when API fails', async () => {
    vi.mocked(api.getPublicSettings).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSiteSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
