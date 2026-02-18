import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.getPublicSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
