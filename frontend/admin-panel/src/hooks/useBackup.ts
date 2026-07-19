import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { BackupJob, BackupSchedule } from '../types/backup';

export const useBackupJobs = () => {
  const query = useQuery({
    queryKey: ['backup-jobs'],
    queryFn: () => api.listBackupJobs(),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasActive = data.jobs.some(
        (j: BackupJob) => j.status === 'running' || j.status === 'queued'
      );
      return hasActive ? 3000 : false;
    },
  });

  return {
    jobs: query.data?.jobs || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useBackupJob = (id: string | null) => {
  const query = useQuery({
    queryKey: ['backup-job', id],
    queryFn: () => api.getBackupJob(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === 'running' || data.status === 'queued' ? 3000 : false;
    },
  });

  return {
    job: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useCreateBackup = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (components: string[]) => api.createBackup(components),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
    },
  });

  return {
    createBackup: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};

export const useRestoreBackup = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ archiveId, components }: { archiveId: string; components: string[] }) =>
      api.restoreBackup(archiveId, components),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
    },
  });

  return {
    restoreBackup: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};

export const useDeleteBackup = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => api.deleteBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
    },
  });

  return {
    deleteBackup: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};

export const useBackupSchedule = () => {
  const query = useQuery({
    queryKey: ['backup-schedule'],
    queryFn: () => api.getBackupSchedule(),
  });

  return {
    schedule: query.data?.schedule || null,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (schedule: BackupSchedule) => api.updateBackupSchedule(schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-schedule'] });
    },
  });

  return {
    updateSchedule: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};
