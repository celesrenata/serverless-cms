import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Content } from '../types/content';

interface UseGalleriesQueryOptions {
  enabled: boolean;
}

export function useGalleriesQuery({ enabled }: UseGalleriesQueryOptions) {
  const query = useQuery<{ items: Content[]; last_key?: Record<string, string> }>({
    queryKey: ['content', 'galleries-published'],
    queryFn: () => api.listContent({ type: 'gallery', status: 'published' }),
    enabled,
  });

  return {
    galleries: query.data?.items ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
