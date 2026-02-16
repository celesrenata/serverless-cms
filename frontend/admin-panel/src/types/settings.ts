export interface SiteSettings {
  site_title: string;
  site_description: string;
  theme?: string;
  registration_enabled?: boolean;
  comments_enabled?: boolean;
  captcha_enabled?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface SettingsUpdate {
  [key: string]: string | number | boolean | undefined;
}
