import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSection,
  deleteSection,
  getSection,
  getSections,
  updateSection,
} from '../services/sectionService';
import type {
  CreateSectionRequest,
  UpdateSectionRequest,
} from '../../../shared/sections/types';

export const useSections = () => {
  return useQuery({
    queryKey: ['sections'],
    queryFn: getSections,
  });
};

export const useSection = (id: string | undefined) => {
  return useQuery({
    queryKey: ['sections', id],
    queryFn: () => getSection(id!),
    enabled: !!id,
  });
};

export const useCreateSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSectionRequest) => createSection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};

export const useUpdateSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSectionRequest }) =>
      updateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};

export const useDeleteSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};
