import { vi } from 'vitest';
import { createMockSettings } from '../mocks/data';

interface SiteSettings {
  site_title: string;
  site_description: string;
  theme?: string;
  registration_enabled: boolean;
  comments_enabled: boolean;
  captcha_enabled: boolean;
}

interface SettingsContextType {
  settings: SiteSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface MockSettingsOptions {
  settings?: Partial<SiteSettings>;
  loading?: boolean;
  error?: string | null;
}

/**
 * Creates a mock SettingsContextType object with configurable state.
 * Defaults to loaded settings (not loading, no error) with realistic values.
 * Accepts options to override settings values, loading, and error state.
 */
export function createMockSettingsContext(options?: MockSettingsOptions): SettingsContextType {
  const { settings, loading = false, error = null } = options ?? {};

  return {
    settings: loading && !settings ? null : createMockSettings(settings),
    loading,
    error,
    refetch: vi.fn().mockResolvedValue(undefined),
  };
}
