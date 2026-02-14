import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ContentFilters } from '../types';

export const useContent = (id: string) => {
  return useQuery({
    queryKey: ['content', id],
    queryFn: () => api.getContent(id),
    enabled: !!id,
  });
};

export const useContentBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['content', 'slug', slug],
    queryFn: () => api.getContentBySlug(slug),
    enabled: !!slug,
  });
};

export const useContentList = (filters: ContentFilters = {}) => {
  return useQuery({
    queryKey: ['content', 'list', filters],
    queryFn: () => api.listContent(filters),
  });
};
