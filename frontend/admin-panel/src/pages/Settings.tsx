import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuthContext';
import { useSettings } from '../hooks/useSettings';
import { api } from '../services/api';
import { User } from '../types';

export function Settings() {
  const { user } = useAuth();
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();
  
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [theme, setTheme] = useState('default');
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Fetch users list (admin only)
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.listUsers(),
    enabled: user?.role === 'admin',
  });

  // Initialize form with settings data
  useEffect(() => {
    if (settings) {
      setSiteTitle(settings.site_title || '');
      setSiteDescription(settings.site_description || '');
      setTheme(settings.theme || 'default');
      setRegistrationEnabled(settings.registration_enabled ?? false);
      setCommentsEnabled(settings.comments_enabled ?? false);
      setCaptchaEnabled(settings.captcha_enabled ?? false);
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage('');

    try {
      updateSettings(
        {
          site_title: siteTitle,
          site_description: siteDescription,
          theme: theme,
          registration_enabled: registrationEnabled,
          comments_enabled: commentsEnabled,
          captcha_enabled: captchaEnabled,
        },
        {
          onSuccess: () => {
            setSaveMessage('Settings saved successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
          },
          onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setSaveMessage(`Error: ${errorMessage}`);
          },
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSaveMessage(`Error: ${errorMessage}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Site Settings Form */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Site Settings</h2>
        
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Site Title */}
          <div>
            <label htmlFor="site_title" className="block text-sm font-medium text-gray-700 mb-2">
              Site Title
            </label>
            <input
              type="text"
              id="site_title"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              className="input w-full"
              placeholder="My Awesome Site"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              The name of your website
            </p>
          </div>

          {/* Site Description */}
          <div>
            <label htmlFor="site_description" className="block text-sm font-medium text-gray-700 mb-2">
              Site Description
            </label>
            <textarea
              id="site_description"
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="A brief description of your website"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              A short description used in search results and social media
            </p>
          </div>

          {/* Theme Selector */}
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="input w-full"
            >
              <option value="default">Default</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="minimal">Minimal</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Choose the visual theme for your public website
            </p>
          </div>

          {/* Feature Toggles Section */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Settings</h3>
            
            {/* User Registration Toggle */}
            <div className="flex items-center justify-between py-4 border-b">
              <div className="flex-1">
                <label htmlFor="registration_enabled" className="block text-sm font-medium text-gray-700">
                  User Registration
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Allow new users to register accounts on your site
                </p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={registrationEnabled}
                  onClick={() => setRegistrationEnabled(!registrationEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    registrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      registrationEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Comments Toggle */}
            <div className="flex items-center justify-between py-4 border-b">
              <div className="flex-1">
                <label htmlFor="comments_enabled" className="block text-sm font-medium text-gray-700">
                  Comments
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Enable comments on blog posts and pages
                </p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={commentsEnabled}
                  onClick={() => setCommentsEnabled(!commentsEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    commentsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      commentsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* CAPTCHA Toggle */}
            <div className="flex items-center justify-between py-4">
              <div className="flex-1">
                <label htmlFor="captcha_enabled" className="block text-sm font-medium text-gray-700">
                  CAPTCHA Protection
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Require CAPTCHA verification for comments to prevent spam
                </p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={captchaEnabled}
                  onClick={() => setCaptchaEnabled(!captchaEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    captchaEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      captchaEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {saveMessage && (
                <span
                  className={`text-sm ${
                    saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {saveMessage}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="btn-primary"
            >
              {isUpdating ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* User Management Section (Admin Only) */}
      {user?.role === 'admin' && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">User Management</h2>
          
          {users && users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u: User) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {u.avatar_url ? (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={u.avatar_url}
                                alt={u.name || u.display_name || u.email}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                                {(u.name || u.display_name || u.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {u.name || u.display_name || u.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {u.username || u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : ''}
                            ${u.role === 'editor' ? 'bg-blue-100 text-blue-800' : ''}
                            ${u.role === 'author' ? 'bg-green-100 text-green-800' : ''}
                            ${u.role === 'viewer' ? 'bg-gray-100 text-gray-800' : ''}
                          `}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.last_login * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          className="text-blue-600 hover:text-blue-900 mr-4"
                          onClick={() => {
                            // TODO: Implement edit user functionality
                            alert('Edit user functionality coming soon');
                          }}
                        >
                          Edit
                        </button>
                        {u.id !== user?.id && (
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => {
                              // TODO: Implement delete user functionality
                              if (confirm(`Are you sure you want to delete ${u.display_name}?`)) {
                                alert('Delete user functionality coming soon');
                              }
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No users found</p>
          )}

          <div className="mt-6 pt-6 border-t">
            <button
              className="btn-primary"
              onClick={() => {
                // TODO: Implement add user functionality
                alert('Add user functionality coming soon');
              }}
            >
              Add New User
            </button>
          </div>
        </div>
      )}

      {/* Access Denied for Non-Admin Users */}
      {user?.role !== 'admin' && (
        <div className="card bg-gray-50">
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              User Management
            </h3>
            <p className="text-gray-600">
              Only administrators can manage users
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
