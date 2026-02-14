export interface SiteSettings {
  site_title: string;
  site_description: string;
  theme?: string;
  [key: string]: any;
}

export interface SettingsUpdate {
  [key: string]: any;
}
