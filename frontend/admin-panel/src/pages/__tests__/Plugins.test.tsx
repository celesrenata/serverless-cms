import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Plugins } from '../Plugins';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockPlugin } from '../../test/mocks/data';

vi.mock('../../services/api', () => ({
  api: {
    listPlugins: vi.fn(),
    activatePlugin: vi.fn(),
    deactivatePlugin: vi.fn(),
    deletePlugin: vi.fn(),
    installPlugin: vi.fn(),
  },
}));

vi.mock('../../components/Plugins/PluginUpload', () => ({
  PluginUpload: () => <div data-testid="plugin-upload" />,
}));

vi.mock('../../components/Plugins/PluginSettingsModal', () => ({
  PluginSettingsModal: () => <div data-testid="plugin-settings-modal" />,
}));

const mockPlugins = [
  createMockPlugin({
    id: 'plugin-1',
    name: 'Analytics Plugin',
    version: '1.0.0',
    active: true,
  }),
  createMockPlugin({
    id: 'plugin-2',
    name: 'SEO Plugin',
    version: '2.1.0',
    active: false,
  }),
];

describe('Plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listPlugins).mockResolvedValue(mockPlugins);
    vi.mocked(api.activatePlugin).mockResolvedValue(mockPlugins[1]);
    vi.mocked(api.deactivatePlugin).mockResolvedValue(mockPlugins[0]);
    vi.mocked(api.deletePlugin).mockResolvedValue(undefined);
    vi.mocked(api.installPlugin).mockResolvedValue(mockPlugins[0]);
  });

  it('renders installed plugins after data loads', async () => {
    renderWithProviders(<Plugins />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Analytics Plugin')).toBeInTheDocument();
    });

    expect(screen.getByText('SEO Plugin')).toBeInTheDocument();
    expect(api.listPlugins).toHaveBeenCalled();
  });

  it('shows activation and deactivation controls', async () => {
    renderWithProviders(<Plugins />, {
      authState: { isAuthenticated: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Analytics Plugin')).toBeInTheDocument();
    });

    // Active/Inactive status badges are rendered per plugin
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    // Toggle buttons exist (one per plugin card)
    const allButtons = screen.getAllByRole('button');
    // Each plugin card has: toggle button, configure (if schema), delete
    // Plus the page-level "Install Plugin" button
    expect(allButtons.length).toBeGreaterThanOrEqual(3);
  });
});
