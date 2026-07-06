import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlugins, usePluginSettings } from '../usePlugins';
import { api } from '../../services/api';
import type { Plugin, PluginSettings } from '../../types';

vi.mock('../../services/api', () => ({
  api: {
    listPlugins: vi.fn(),
    installPlugin: vi.fn(),
    activatePlugin: vi.fn(),
    deactivatePlugin: vi.fn(),
    deletePlugin: vi.fn(),
    getPluginSettings: vi.fn(),
    updatePluginSettings: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockPlugins: Plugin[] = [
  {
    id: 'plugin-1',
    name: 'SEO Plugin',
    version: '1.0.0',
    description: 'SEO optimization plugin',
    author: 'Test Author',
    active: true,
    hooks: [{ hook_name: 'content_publish', function_arn: 'arn:aws:lambda:us-east-1:123:function:seo', priority: 1 }],
    installed_at: 1710000000,
    updated_at: 1710000000,
  },
  {
    id: 'plugin-2',
    name: 'Analytics Plugin',
    version: '2.1.0',
    description: 'Analytics tracking plugin',
    author: 'Another Author',
    active: false,
    hooks: [],
    installed_at: 1710000001,
    updated_at: 1710000001,
  },
];

describe('usePlugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches plugins list on mount', async () => {
    vi.mocked(api.listPlugins).mockResolvedValue(mockPlugins);

    const { result } = renderHook(() => usePlugins(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.plugins).toEqual(mockPlugins);
    });

    expect(result.current.isLoading).toBe(false);
    expect(api.listPlugins).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when no plugins loaded yet', () => {
    vi.mocked(api.listPlugins).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePlugins(), {
      wrapper: createWrapper(),
    });

    expect(result.current.plugins).toEqual([]);
  });

  it('activatePlugin calls api.activatePlugin with id', async () => {
    vi.mocked(api.listPlugins).mockResolvedValue(mockPlugins);
    vi.mocked(api.activatePlugin).mockResolvedValue({ ...mockPlugins[1], active: true });

    const { result } = renderHook(() => usePlugins(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.plugins).toEqual(mockPlugins);
    });

    act(() => {
      result.current.activatePlugin('plugin-2');
    });

    await waitFor(() => {
      expect(api.activatePlugin).toHaveBeenCalledWith('plugin-2');
    });
  });

  it('deactivatePlugin calls api.deactivatePlugin with id', async () => {
    vi.mocked(api.listPlugins).mockResolvedValue(mockPlugins);
    vi.mocked(api.deactivatePlugin).mockResolvedValue({ ...mockPlugins[0], active: false });

    const { result } = renderHook(() => usePlugins(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.plugins).toEqual(mockPlugins);
    });

    act(() => {
      result.current.deactivatePlugin('plugin-1');
    });

    await waitFor(() => {
      expect(api.deactivatePlugin).toHaveBeenCalledWith('plugin-1');
    });
  });

  it('deletePlugin calls api.deletePlugin with id', async () => {
    vi.mocked(api.listPlugins).mockResolvedValue(mockPlugins);
    vi.mocked(api.deletePlugin).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePlugins(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.plugins).toEqual(mockPlugins);
    });

    act(() => {
      result.current.deletePlugin('plugin-1');
    });

    await waitFor(() => {
      expect(api.deletePlugin).toHaveBeenCalledWith('plugin-1');
    });
  });
});

describe('usePluginSettings', () => {
  const mockSettings: PluginSettings = {
    api_key: 'test-key-123',
    enabled: true,
    max_retries: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches plugin settings when pluginId is provided', async () => {
    vi.mocked(api.getPluginSettings).mockResolvedValue(mockSettings);

    const { result } = renderHook(() => usePluginSettings('plugin-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings);
    });

    expect(api.getPluginSettings).toHaveBeenCalledWith('plugin-1');
  });

  it('does not fetch when pluginId is null', async () => {
    const { result } = renderHook(() => usePluginSettings(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toBeUndefined();
    expect(api.getPluginSettings).not.toHaveBeenCalled();
  });

  it('updateSettings calls api.updatePluginSettings with id and settings', async () => {
    vi.mocked(api.getPluginSettings).mockResolvedValue(mockSettings);
    const updatedSettings: PluginSettings = { api_key: 'new-key', enabled: false, max_retries: 5 };
    vi.mocked(api.updatePluginSettings).mockResolvedValue(updatedSettings);

    const { result } = renderHook(() => usePluginSettings('plugin-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings);
    });

    act(() => {
      result.current.updateSettings({ id: 'plugin-1', settings: updatedSettings });
    });

    await waitFor(() => {
      expect(api.updatePluginSettings).toHaveBeenCalledWith('plugin-1', updatedSettings);
    });
  });
});
