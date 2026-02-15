import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { MediaUpdate } from '../types/media';

export const useMedia = (id?: string) => {
  const queryClient = useQueryClient();

  const { data: media, isLoading, error } = useQuery({
    queryKey: ['media', id],
    queryFn: () => api.getMedia(id!),
    enabled: !!id,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata?: Record<string, string> }) =>
      api.uploadMedia(file, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media', 'list'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MediaUpdate }) =>
      api.updateMedia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media', 'list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media', 'list'] });
    },
  });

  return {
    media,
    isLoading,
    error,
    upload: uploadMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useMediaList = (params?: { limit?: number; last_key?: string }) => {
  return useQuery({
    queryKey: ['media', 'list', params],
    queryFn: () => api.listMedia(params),
  });
};
