import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/api', () => ({
  api: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

import { useSettings } from '../useSettings';
import { api } from '../../services/api';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches settings on mount', async () => {
    vi.mocked(api.getSettings).mockResolvedValue({
      site_title: 'Test Site',
      site_description: 'Test Description',
    });

    renderHook(() => useSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(api.getSettings).toHaveBeenCalledTimes(1);
    });
  });

  it('returns settings data after successful fetch', async () => {
    const settings = {
      site_title: 'Test Site',
      site_description: 'Test Description',
      theme: 'dark',
      registration_enabled: true,
    };

    vi.mocked(api.getSettings).mockResolvedValue(settings);

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.settings).toEqual(settings);
    });
  });

  it('updateSettings calls api.updateSettings with data', async () => {
    const updateData = {
      site_title: 'Updated Site',
      registration_enabled: false,
    };

    vi.mocked(api.getSettings).mockResolvedValue({
      site_title: 'Test Site',
      site_description: 'Test Description',
    });
    vi.mocked(api.updateSettings).mockResolvedValue({
      site_title: 'Updated Site',
      site_description: 'Test Description',
      registration_enabled: false,
    });

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateSettings(updateData);
    });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith(updateData);
    });
  });
});
