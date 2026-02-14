export interface PluginHook {
  hook_name: string;
  function_arn: string;
  priority: number;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  active: boolean;
  hooks: PluginHook[];
  config_schema?: Record<string, any>;
  installed_at: number;
  updated_at: number;
}

export interface PluginSettings {
  [key: string]: any;
}

export interface PluginInstall {
  file: File;
}
