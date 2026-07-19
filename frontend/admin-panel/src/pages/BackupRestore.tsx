import { useState, useEffect } from 'react';
import {
  useBackupJobs,
  useBackupJob,
  useCreateBackup,
  useRestoreBackup,
  useDeleteBackup,
  useBackupSchedule,
  useUpdateSchedule,
} from '../hooks/useBackup';
import { useQueryClient } from '@tanstack/react-query';
import JSZip from 'jszip';
import { api } from '../services/api';
import type { BackupJob, BackupSchedule } from '../types/backup';
import { ALL_BACKUP_COMPONENTS } from '../types/backup';

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

function formatDuration(ms: number): string {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusBadge(status: BackupJob['status']) {
  const colors: Record<string, string> = {
    queued: 'bg-yellow-100 text-yellow-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function typeBadge(type: BackupJob['type']) {
  const color = type === 'backup' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {type}
    </span>
  );
}

// ─── CreateBackupModal ──────────────────────────────────────────────

function CreateBackupModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(
    ALL_BACKUP_COMPONENTS.filter((c) => c.id !== 's3_media').map((c) => c.id)
  );
  const { createBackup, isPending } = useCreateBackup();

  const toggleComponent = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelected(ALL_BACKUP_COMPONENTS.map((c) => c.id));
  const deselectAll = () => setSelected([]);

  const handleStart = () => {
    createBackup(selected, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Create Backup</h2>

        <div className="flex gap-2 mb-3">
          <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">
            Select All
          </button>
          <button onClick={deselectAll} className="text-sm text-blue-600 hover:underline">
            Deselect All
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {ALL_BACKUP_COMPONENTS.map((comp) => (
            <label key={comp.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(comp.id)}
                onChange={() => toggleComponent(comp.id)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-sm">{comp.name}</div>
                <div className="text-xs text-gray-500">{comp.description}</div>
              </div>
            </label>
          ))}
        </div>

        {selected.includes('s3_media') && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            ⚠️ S3 Media Files backup may take a long time and consume significant storage (~784 MB).
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={isPending || selected.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Starting...' : 'Start Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RestoreDialog ──────────────────────────────────────────────────

function RestoreDialog({ job, onClose }: { job: BackupJob; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(job.components || []);
  const [confirmText, setConfirmText] = useState('');
  const { restoreBackup, isPending } = useRestoreBackup();

  const toggleComponent = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleRestore = () => {
    restoreBackup(
      { archiveId: job.id, components: selected },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-2">Restore Backup</h2>
        <p className="text-sm text-gray-500 mb-4">
          Archive from {formatDate(job.created_at)}
        </p>

        <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
          {job.components.map((compId) => {
            const comp = ALL_BACKUP_COMPONENTS.find((c) => c.id === compId);
            return (
              <label key={compId} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(compId)}
                  onChange={() => toggleComponent(compId)}
                />
                <span className="text-sm">{comp?.name || compId}</span>
              </label>
            );
          })}
        </div>

        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-700 font-medium">
            ⚠️ This will overwrite existing data for the selected components.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Type <strong>RESTORE</strong> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="RESTORE"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleRestore}
            disabled={isPending || confirmText !== 'RESTORE' || selected.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BackupProgress ─────────────────────────────────────────────────

function BackupProgress({ jobId }: { jobId: string }) {
  const { job } = useBackupJob(jobId);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!job || !job.started_at || Number(job.started_at) === 0) return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = now - Number(job.started_at);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [job]);

  if (!job) return null;

  if (job.status === 'completed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-lg">✓</span>
          <span className="text-green-800 font-medium">
            {job.type === 'backup' ? 'Backup' : 'Restore'} completed successfully
          </span>
          {job.result && (
            <span className="text-green-600 text-sm ml-auto">
              {formatDuration(job.result.total_duration_ms)}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (job.status === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-red-600 text-lg">✗</span>
          <span className="text-red-800 font-medium">
            {job.type === 'backup' ? 'Backup' : 'Restore'} failed
          </span>
        </div>
        {job.error && <p className="text-red-600 text-sm mt-2">{job.error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-blue-800 font-medium text-sm">
          {job.type === 'backup' ? 'Backup' : 'Restore'} in progress...
        </span>
        <span className="text-blue-600 text-xs">{elapsed}</span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${job.progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-blue-600">{job.phase || 'Starting...'}</span>
        <span className="text-xs text-blue-600">{job.progress}%</span>
      </div>
    </div>
  );
}

// ─── ScheduleSettings ───────────────────────────────────────────────

function ScheduleSettings({ onClose }: { onClose: () => void }) {
  const { schedule, isLoading } = useBackupSchedule();
  const { updateSchedule, isPending } = useUpdateSchedule();

  const [form, setForm] = useState<BackupSchedule>({
    enabled: false,
    frequency: 'daily',
    components: ['content', 'settings', 'users', 'sections', 'themes'],
    retention: 7,
    last_run: 0,
  });

  useEffect(() => {
    if (schedule) {
      setForm(schedule);
    }
  }, [schedule]);

  const toggleComponent = (id: string) => {
    setForm((prev) => ({
      ...prev,
      components: prev.components.includes(id)
        ? prev.components.filter((c) => c !== id)
        : [...prev.components, id],
    }));
  };

  const handleSave = () => {
    updateSchedule(form, {
      onSuccess: () => onClose(),
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Schedule Settings</h2>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="font-medium text-sm">Enable scheduled backups</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value as BackupSchedule['frequency'] })}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Components</label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {ALL_BACKUP_COMPONENTS.map((comp) => (
                <label key={comp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.components.includes(comp.id)}
                    onChange={() => toggleComponent(comp.id)}
                  />
                  {comp.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Retention (number of backups to keep)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={form.retention}
              onChange={(e) => setForm({ ...form, retention: parseInt(e.target.value) || 7 })}
              className="w-32 border rounded px-3 py-2 text-sm"
            />
          </div>

          {schedule?.last_run ? (
            <p className="text-xs text-gray-500">
              Last run: {formatDate(schedule.last_run)}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DownloadPanel ──────────────────────────────────────────────────

function DownloadPanel({ job, onClose }: { job: BackupJob; onClose: () => void }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleFileDownload = async (fileName: string) => {
    setDownloading(fileName);
    try {
      const { url } = await api.getDownloadUrl(job.id, fileName);
      window.open(url, '_blank');
    } catch {
      alert(`Failed to generate download link for ${fileName}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAllAsZip = async () => {
    setDownloading('all');
    try {
      const zip = new JSZip();

      // Download each table file and add to zip
      for (const file of tableFiles) {
        const { url } = await api.getDownloadUrl(job.id, file.name);
        const response = await fetch(url);
        const blob = await response.blob();
        zip.file(file.name, blob);
      }

      // Add manifest
      const { url: manifestUrl } = await api.getDownloadUrl(job.id, 'manifest.json');
      const manifestResp = await fetch(manifestUrl);
      const manifestBlob = await manifestResp.blob();
      zip.file('manifest.json', manifestBlob);

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `backup-${job.id.substring(0, 8)}-${new Date(job.created_at * 1000).toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      alert('Failed to create ZIP download');
      console.error(e);
    } finally {
      setDownloading(null);
    }
  };

  // Build file list from result.tables
  const tableFiles = job.result?.tables
    ? Object.entries(job.result.tables).map(([tableName, info]) => ({
        name: `${tableName}.ndjson.gz`,
        label: tableName.replace(/^cms-/, '').replace(/-(?:prod|dev|staging)$/, ''),
        items: info.items,
        bytes: info.bytes,
      }))
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-2">Download Backup Files</h2>
        <p className="text-sm text-gray-500 mb-4">
          Archive from {formatDate(job.created_at)}
          {job.result?.archive_size_bytes && (
            <span className="ml-2">({formatBytes(job.result.archive_size_bytes)} total)</span>
          )}
        </p>

        <button
          onClick={handleDownloadAllAsZip}
          disabled={downloading === 'all'}
          className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {downloading === 'all' ? 'Creating ZIP...' : '\u{1F4E6} Download All as ZIP'}
        </button>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tableFiles.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
            >
              <div>
                <div className="text-sm font-medium">{file.label}</div>
                <div className="text-xs text-gray-500">
                  {file.items} items &middot; {formatBytes(file.bytes)}
                </div>
              </div>
              <button
                onClick={() => handleFileDownload(file.name)}
                disabled={downloading === file.name}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {downloading === file.name ? '...' : 'Download'}
              </button>
            </div>
          ))}

          {/* S3 Media info */}
          {(job.components || []).includes('s3_media') && job.result?.s3_objects && job.result.s3_objects > 0 && (
            <div className="p-2 rounded bg-amber-50 border border-amber-200">
              <div className="text-sm font-medium">S3 Media Files</div>
              <div className="text-xs text-amber-700">
                {job.result.s3_objects} files &middot; {formatBytes(job.result.s3_bytes)} — Too large for browser download. Use AWS CLI:
              </div>
              <code className="text-xs text-gray-600 block mt-1 bg-white p-1 rounded">
                aws s3 cp s3://serverless-cms-backups-prod-776053071238/backups/{job.id}/media/ ./media/ --recursive
              </code>
            </div>
          )}

          {/* Manifest download */}
          <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50 border-t pt-3 mt-2">
            <div>
              <div className="text-sm font-medium">manifest.json</div>
              <div className="text-xs text-gray-500">Backup metadata</div>
            </div>
            <button
              onClick={() => handleFileDownload('manifest.json')}
              disabled={downloading === 'manifest.json'}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {downloading === 'manifest.json' ? '...' : 'Download'}
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UploadRestoreModal ──────────────────────────────────────────────

function UploadRestoreModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const queryClient = useQueryClient();

  const handleUploadAndRestore = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const zip = await JSZip.loadAsync(file);

      // Verify it has a manifest.json
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) {
        alert('Invalid backup ZIP: missing manifest.json');
        setUploading(false);
        return;
      }

      const manifest = JSON.parse(await manifestFile.async('text'));
      const archiveId = manifest.job_id || `upload-${Date.now()}`;

      // Upload each file to the backup bucket via presigned URLs
      const files = Object.keys(zip.files).filter(name => !zip.files[name].dir);

      for (const fileName of files) {
        const fileData = await zip.files[fileName].async('blob');

        // Upload to backup bucket via upload endpoint
        await api.uploadBackupFile(archiveId, fileName, fileData);
      }

      // Trigger restore from the uploaded archive
      const components = manifest.components || [];
      await api.restoreBackup(archiveId, components);

      queryClient.invalidateQueries({ queryKey: ['backup-jobs'] });
      onClose();
    } catch (error) {
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Upload & Restore Backup</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select backup ZIP file
          </label>
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm border rounded p-2"
          />
          {file && (
            <p className="text-xs text-gray-500 mt-1">
              {file.name} ({formatBytes(file.size)})
            </p>
          )}
        </div>

        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-700 font-medium">
            \u26A0\uFE0F Restoring will overwrite existing data with the backup contents.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Type <strong>RESTORE</strong> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="RESTORE"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleUploadAndRestore}
            disabled={uploading || !file || confirmText !== 'RESTORE'}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading & Restoring...' : 'Upload & Restore'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BackupRestore Page ─────────────────────────────────────────────

export function BackupRestore() {
  const { jobs, isLoading } = useBackupJobs();
  const { deleteBackup } = useDeleteBackup();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [restoreJob, setRestoreJob] = useState<BackupJob | null>(null);
  const [downloadJob, setDownloadJob] = useState<BackupJob | null>(null);

  const activeJob = jobs.find((j) => j.status === 'running' || j.status === 'queued');
  const completedBackups = jobs.filter((j) => j.type === 'backup' && j.status === 'completed');
  const lastBackup = completedBackups.length > 0
    ? completedBackups.reduce((a, b) => (a.completed_at > b.completed_at ? a : b))
    : null;

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this backup archive? This cannot be undone.')) {
      deleteBackup(id);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Backup & Restore</h1>

      {/* Status Banner */}
      <div className="bg-white rounded-lg border p-4 mb-6 flex items-center gap-6">
        <div>
          <div className="text-xs text-gray-500 uppercase">Last Backup</div>
          <div className="font-medium">
            {lastBackup ? formatDate(lastBackup.completed_at) : 'Never'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Total Archives</div>
          <div className="font-medium">{completedBackups.length}</div>
        </div>
        {activeJob && (
          <div className="ml-auto">
            {statusBadge(activeJob.status)}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!!activeJob}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Create Backup
        </button>
        <button
          onClick={() => setShowUploadModal(true)}
          disabled={!!activeJob}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Upload & Restore
        </button>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Schedule
        </button>
      </div>

      {/* Progress Indicator */}
      {activeJob && <BackupProgress jobId={activeJob.id} />}

      {/* History Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-4xl mb-3">💾</div>
          <h3 className="text-lg font-medium text-gray-700">No backups yet</h3>
          <p className="text-gray-500 text-sm mt-1">
            Create your first backup to protect your content.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Components</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Size</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(job.created_at)}</td>
                  <td className="px-4 py-3">{typeBadge(job.type)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(job.components || []).slice(0, 3).map((c) => (
                        <span key={c} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {ALL_BACKUP_COMPONENTS.find((comp) => comp.id === c)?.name || c}
                        </span>
                      ))}
                      {(job.components || []).length > 3 && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          +{(job.components || []).length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {formatBytes(job.result?.archive_size_bytes)}
                  </td>
                  <td className="px-4 py-3">
                    {formatDuration(job.result?.total_duration_ms || 0)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(job.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {job.type === 'backup' && job.status === 'completed' && (
                        <button
                          onClick={() => setRestoreJob(job)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Restore
                        </button>
                      )}
                      {job.type === 'backup' && job.status === 'completed' && (
                        <button
                          onClick={() => setDownloadJob(job)}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Download
                        </button>
                      )}
                      {(job.status === 'completed' || job.status === 'queued' || job.status === 'failed' || job.status === 'cancelled') && (
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && <CreateBackupModal onClose={() => setShowCreateModal(false)} />}
      {showScheduleModal && <ScheduleSettings onClose={() => setShowScheduleModal(false)} />}
      {showUploadModal && <UploadRestoreModal onClose={() => setShowUploadModal(false)} />}
      {restoreJob && <RestoreDialog job={restoreJob} onClose={() => setRestoreJob(null)} />}
      {downloadJob && <DownloadPanel job={downloadJob} onClose={() => setDownloadJob(null)} />}
    </div>
  );
}
