import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';

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

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Available themes
const THEMES = ['default', 'dark', 'light', 'minimal', 'custom'];

// Function to apply theme
const applyTheme = (theme: string) => {
  // Set data-theme attribute on root element
  const validTheme = THEMES.includes(theme) ? theme : 'default';
  document.documentElement.setAttribute('data-theme', validTheme);
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPublicSettings();
      setSettings(data);
      
      // Apply theme if specified
      if (data.theme) {
        applyTheme(data.theme);
      } else {
        applyTheme('default');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to load site settings');
      // Set defaults on error
      setSettings({
        site_title: 'Celestium CMS',
        site_description: '',
        theme: 'default',
        registration_enabled: false,
        comments_enabled: false,
        captcha_enabled: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
