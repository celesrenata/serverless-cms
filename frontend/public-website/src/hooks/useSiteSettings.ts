import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });
};
