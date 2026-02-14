import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { PluginSettings } from '../types';

export const usePlugins = () => {
  const queryClient = useQueryClient();

  const { data: plugins, isLoading, error } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => api.listPlugins(),
  });

  const installMutation = useMutation({
    mutationFn: (file: File) => api.installPlugin(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.activatePlugin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.deactivatePlugin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePlugin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  return {
    plugins: plugins || [],
    isLoading,
    error,
    installPlugin: installMutation.mutate,
    isInstalling: installMutation.isPending,
    installError: installMutation.error,
    activatePlugin: activateMutation.mutate,
    isActivating: activateMutation.isPending,
    deactivatePlugin: deactivateMutation.mutate,
    isDeactivating: deactivateMutation.isPending,
    deletePlugin: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};

export const usePluginSettings = (pluginId: string | null) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['plugin-settings', pluginId],
    queryFn: () => api.getPluginSettings(pluginId!),
    enabled: !!pluginId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, settings }: { id: string; settings: PluginSettings }) =>
      api.updatePluginSettings(id, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-settings', pluginId] });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
  };
};
