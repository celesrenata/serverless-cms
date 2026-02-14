export interface SiteSettings {
  site_title: string;
  site_description: string;
  theme?: string;
  [key: string]: string | undefined;
}

export interface SettingsUpdate {
  [key: string]: string | number | boolean | undefined;
}
