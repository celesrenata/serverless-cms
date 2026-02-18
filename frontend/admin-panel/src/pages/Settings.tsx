import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';

export function Settings() {
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();
  
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [theme, setTheme] = useState('default');
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [commentModerationEnabled, setCommentModerationEnabled] = useState(true);
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Initialize form with settings data
  useEffect(() => {
    if (settings) {
      setSiteTitle(settings.site_title || '');
      setSiteDescription(settings.site_description || '');
      setTheme(settings.theme || 'default');
      setRegistrationEnabled(settings.registration_enabled ?? false);
      setCommentsEnabled(settings.comments_enabled ?? false);
      setCommentModerationEnabled(settings.comment_moderation_enabled ?? true);
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
          comment_moderation_enabled: commentModerationEnabled,
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

            {/* Comment Moderation Toggle */}
            <div className="flex items-center justify-between py-4 border-b">
              <div className="flex-1">
                <label htmlFor="comment_moderation_enabled" className="block text-sm font-medium text-gray-700">
                  Comment Moderation
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Require approval before comments are published (recommended)
                </p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={commentModerationEnabled}
                  onClick={() => setCommentModerationEnabled(!commentModerationEnabled)}
                  disabled={!commentsEnabled}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    !commentsEnabled ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    commentModerationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      commentModerationEnabled ? 'translate-x-5' : 'translate-x-0'
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
                  disabled={!commentsEnabled}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    !commentsEnabled ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
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


    </div>
  );
}
