export interface BackupJob {
  id: string;
  type: 'backup' | 'restore';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  components: string[];
  progress: number;
  phase: string;
  source_archive_id?: string;
  created_at: number;
  started_at: number;
  completed_at: number;
  error: string | null;
  result: BackupResult | null;
  created_by: string;
}

export interface BackupResult {
  tables?: Record<string, { items: number; bytes: number }>;
  s3_objects?: number;
  s3_bytes?: number;
  total_duration_ms: number;
  archive_size_bytes?: number;
}

export interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  components: string[];
  retention: number;
  last_run: number;
}

export const ALL_BACKUP_COMPONENTS = [
  { id: 'content', name: 'Content', description: 'Posts, pages, galleries, and projects' },
  { id: 'media_metadata', name: 'Media Metadata', description: 'File records and thumbnails info' },
  { id: 'users', name: 'Users', description: 'User accounts and roles' },
  { id: 'settings', name: 'Settings', description: 'Site configuration' },
  { id: 'comments', name: 'Comments', description: 'Public comments' },
  { id: 'plugins', name: 'Plugins', description: 'Plugin configurations' },
  { id: 'sections', name: 'Sections', description: 'Blog sections hierarchy' },
  { id: 'themes', name: 'Themes', description: 'Custom theme definitions' },
  { id: 's3_media', name: 'S3 Media Files', description: 'Uploaded images and documents (~784 MB)' },
] as const;
