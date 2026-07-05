import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../services/api', () => ({ api: { getPublicSettings: vi.fn() } }));

import { api } from '../../services/api';
import { SettingsProvider, useSettings } from '../SettingsContext';

function TestConsumer() {
  const { settings, loading, error } = useSettings();

  return (
    <div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="error">{error ?? 'null'}</div>
      <div data-testid="settings">{settings ? JSON.stringify(settings) : 'null'}</div>
      <div data-testid="site-title">{settings?.site_title ?? 'null'}</div>
      <div data-testid="site-description">{settings?.site_description ?? 'null'}</div>
      <div data-testid="theme">{settings?.theme ?? 'null'}</div>
      <div data-testid="registration-enabled">
        {settings ? String(settings.registration_enabled) : 'null'}
      </div>
      <div data-testid="comments-enabled">{settings ? String(settings.comments_enabled) : 'null'}</div>
      <div data-testid="captcha-enabled">{settings ? String(settings.captcha_enabled) : 'null'}</div>
    </div>
  );
}

describe('SettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  it('shows loading state initially', () => {
    vi.mocked(api.getPublicSettings).mockReturnValue(new Promise(() => {}));

    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>,
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('settings')).toHaveTextContent('null');
  });

  it('provides fetched settings to children after successful load', async () => {
    vi.mocked(api.getPublicSettings).mockResolvedValue({
      site_title: 'Test Site',
      site_description: 'A test site description',
      theme: 'light',
      registration_enabled: true,
      comments_enabled: true,
      captcha_enabled: false,
    });

    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('null');
    expect(screen.getByTestId('site-title')).toHaveTextContent('Test Site');
    expect(screen.getByTestId('site-description')).toHaveTextContent('A test site description');
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('registration-enabled')).toHaveTextContent('true');
    expect(screen.getByTestId('comments-enabled')).toHaveTextContent('true');
    expect(screen.getByTestId('captcha-enabled')).toHaveTextContent('false');
  });

  it('sets error message and provides default settings when API call rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.getPublicSettings).mockRejectedValue(new Error('Network error'));

    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Failed to load site settings');
    expect(screen.getByTestId('site-title')).toHaveTextContent('Celestium CMS');
    expect(screen.getByTestId('site-description')).toHaveTextContent('');
    expect(screen.getByTestId('theme')).toHaveTextContent('default');
    expect(screen.getByTestId('registration-enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('comments-enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('captcha-enabled')).toHaveTextContent('false');

    consoleErrorSpy.mockRestore();
  });

  it('applies data-theme attribute to document.documentElement when theme is provided', async () => {
    vi.mocked(api.getPublicSettings).mockResolvedValue({
      site_title: 'Themed Site',
      site_description: 'A themed site',
      theme: 'dark',
      registration_enabled: false,
      comments_enabled: true,
      captcha_enabled: false,
    });

    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
  });
});
