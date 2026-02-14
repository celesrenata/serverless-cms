import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ContentFilters, Content } from '../types/content';

export const useContentList = (filters: ContentFilters) => {
  return useQuery({
    queryKey: ['content', 'list', filters],
    queryFn: () => api.listContent(filters),
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
};

export const useBulkUpdateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Content> }) => {
      await Promise.all(ids.map(id => api.updateContent(id, updates)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
};
