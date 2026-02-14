export interface PluginHook {
  hook_name: string;
  function_arn: string;
  priority: number;
}

export interface PluginConfigSchema {
  type: string;
  label?: string;
  required?: boolean;
  default?: string | number | boolean;
  description?: string;
  placeholder?: string;
  options?: string[];
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  active: boolean;
  hooks: PluginHook[];
  config_schema?: Record<string, PluginConfigSchema>;
  installed_at: number;
  updated_at: number;
}

export interface PluginSettings {
  [key: string]: string | number | boolean;
}

export interface PluginInstall {
  file: File;
}
