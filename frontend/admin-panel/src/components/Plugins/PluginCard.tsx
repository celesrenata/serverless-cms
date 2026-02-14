import { Plugin } from '../../types';

interface PluginCardProps {
  plugin: Plugin;
  onToggleActive: (plugin: Plugin) => void;
  onOpenSettings: (plugin: Plugin) => void;
}

export const PluginCard = ({ plugin, onToggleActive, onOpenSettings }: PluginCardProps) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{plugin.name}</h3>
          <p className="text-sm text-gray-500">v{plugin.version}</p>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => onToggleActive(plugin)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              plugin.active ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                plugin.active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{plugin.description}</p>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>By {plugin.author}</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          plugin.active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {plugin.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {plugin.hooks && plugin.hooks.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Hooks:</p>
          <div className="flex flex-wrap gap-1">
            {plugin.hooks.slice(0, 3).map((hook, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {hook.hook_name}
              </span>
            ))}
            {plugin.hooks.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                +{plugin.hooks.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {plugin.config_schema && (
        <button
          onClick={() => onOpenSettings(plugin)}
          className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Configure
        </button>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-400">
        Installed {new Date(plugin.installed_at * 1000).toLocaleDateString()}
      </div>
    </div>
  );
};
