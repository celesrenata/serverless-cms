import { useState } from 'react';
import { usePlugins } from '../hooks/usePlugins';
import { Plugin } from '../types';
import { PluginCard } from '../components/Plugins/PluginCard';
import { PluginUpload } from '../components/Plugins/PluginUpload';
import { PluginSettingsModal } from '../components/Plugins/PluginSettingsModal';

export const Plugins = () => {
  const { plugins, isLoading, error, activatePlugin, deactivatePlugin, deletePlugin } = usePlugins();
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const handleToggleActive = (plugin: Plugin) => {
    if (plugin.active) {
      deactivatePlugin(plugin.id);
    } else {
      activatePlugin(plugin.id);
    }
  };

  const handleDelete = (plugin: Plugin) => {
    deletePlugin(plugin.id);
  };

  const handleOpenSettings = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
  };

  const handleCloseSettings = () => {
    setSelectedPlugin(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading plugins...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading plugins: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plugins</h1>
          <p className="mt-1 text-sm text-gray-500">
            Extend your CMS functionality with plugins
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Install Plugin
        </button>
      </div>

      {plugins.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No plugins installed</h3>
          <p className="text-gray-500 mb-4">
            Get started by installing your first plugin
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Install Plugin
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onToggleActive={handleToggleActive}
              onOpenSettings={handleOpenSettings}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showUpload && (
        <PluginUpload onClose={() => setShowUpload(false)} />
      )}

      {selectedPlugin && (
        <PluginSettingsModal
          plugin={selectedPlugin}
          onClose={handleCloseSettings}
        />
      )}
    </div>
  );
};
