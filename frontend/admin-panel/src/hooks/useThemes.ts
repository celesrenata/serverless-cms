import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getThemes,
  getTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  activateTheme,
  duplicateTheme,
} from '../services/themeService';
import type { CreateThemePayload, UpdateThemePayload } from '../types';

const THEMES_QUERY_KEY = ['themes'] as const;

/** Fetch all themes (gallery listing) */
export const useThemes = () => {
  return useQuery({
    queryKey: THEMES_QUERY_KEY,
    queryFn: getThemes,
  });
};

/** Fetch a single theme by ID (full tokens included) */
export const useTheme = (id: string | undefined) => {
  return useQuery({
    queryKey: ['themes', id],
    queryFn: () => getTheme(id!),
    enabled: !!id,
  });
};

/** Create a new custom theme */
export const useCreateTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateThemePayload) => createTheme(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THEMES_QUERY_KEY });
    },
  });
};

/** Update an existing custom theme */
export const useUpdateTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateThemePayload }) =>
      updateTheme(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: THEMES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['themes', variables.id] });
    },
  });
};

/** Delete a custom theme */
export const useDeleteTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THEMES_QUERY_KEY });
    },
  });
};

/** Activate a theme as the site-wide default */
export const useActivateTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activateTheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THEMES_QUERY_KEY });
    },
  });
};

/** Duplicate a theme (builtin or custom) */
export const useDuplicateTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => duplicateTheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THEMES_QUERY_KEY });
    },
  });
};
