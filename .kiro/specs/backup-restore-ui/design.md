# Design: Backup & Restore Admin UI

## Overview

The backup/restore UI adds a managed backup system to the CMS admin panel. It uses a dedicated Lambda function (invoked asynchronously) to perform backup/restore operations, a DynamoDB table for job tracking, and a dedicated S3 bucket for archive storage. The admin panel provides a full management interface with real-time progress tracking.

## Architecture

### Components

| Component | Location | Responsibility |
|---|---|---|
| Backup Lambda | `lambda/backup/handler.py` | Orchestrates backup operations: scans DynamoDB tables, copies S3 media, writes archives to backup bucket |
| Restore Lambda | `lambda/backup/restore_handler.py` | Orchestrates restore: reads archives from backup bucket, writes to CMS tables/bucket |
| Backup API Lambda | `lambda/backup/api_handler.py` | Handles REST API requests: create job, list jobs, get status, delete archive, schedule management |
| Jobs Table | `cms-backup-jobs-{env}` | Tracks all backup/restore operations with status and progress |
| Backup Bucket | `serverless-cms-backups-{env}-{account_id}` | Stores backup archives (NDJSON.gz + media copies) |
| Admin UI Page | `frontend/admin-panel/src/pages/BackupRestore.tsx` | Full management interface |
| CDK Construct | `lib/constructs/backup.ts` | Infrastructure definition |

### Data Flow

**Backup:**
1. Admin clicks "Create Backup" → POST /api/v1/backup → API Lambda creates job record (status: queued)
2. API Lambda invokes Backup Lambda asynchronously (Lambda.invoke with InvocationType: Event)
3. Backup Lambda: sets status=running, scans tables → writes gzipped NDJSON to S3, copies media objects
4. Backup Lambda: updates progress in jobs table after each table/phase
5. Backup Lambda: writes manifest.json, sets status=completed
6. Frontend polls GET /api/v1/backup/jobs/{id} every 3s → shows progress bar

**Restore:**
1. Admin selects archive → clicks "Restore" → confirms → POST /api/v1/backup/{id}/restore
2. API Lambda creates restore job record, invokes Restore Lambda async
3. Restore Lambda: reads manifest, streams NDJSON from S3, BatchWriteItem to target tables
4. Restore Lambda: copies media objects back to media bucket
5. Frontend polls status → shows progress

### Job Record Schema (DynamoDB)

```json
{
  "id": "job-uuid",
  "type": "backup | restore",
  "status": "queued | running | completed | failed | cancelled",
  "components": ["content", "media_metadata", "users", "settings", "comments", "plugins", "sections", "themes", "s3_media"],
  "progress": 0-100,
  "phase": "Exporting content table...",
  "source_archive_id": "original-job-id (for restores)",
  "created_at": 1234567890,
  "started_at": 1234567891,
  "completed_at": 1234567920,
  "error": null,
  "result": {
    "tables": { "cms-content-prod": { "items": 44, "bytes": 123456 } },
    "s3_objects": 1149,
    "s3_bytes": 784000000,
    "total_duration_ms": 28700,
    "archive_size_bytes": 50000000
  },
  "created_by": "user-id"
}
```

### Component Mapping

| UI Component Name | DynamoDB Table / S3 Bucket |
|---|---|
| Content | `cms-content-{env}` |
| Media Metadata | `cms-media-{env}` |
| Users | `cms-users-{env}` |
| Settings | `cms-settings-{env}` |
| Comments | `cms-comments-{env}` |
| Plugins | `cms-plugins-{env}` |
| Sections | `cms-sections-{env}` |
| Themes | `cms-themes-{env}` |
| S3 Media Files | `serverless-cms-media-{env}-{account_id}` |

### Scheduled Backup Configuration (stored in cms-settings-{env})

```json
{
  "key": "backup_schedule",
  "value": {
    "enabled": true,
    "frequency": "daily",
    "components": ["content", "settings", "users", "sections", "themes"],
    "retention": 7,
    "last_run": 1234567890
  }
}
```

### S3 Archive Structure

```
s3://serverless-cms-backups-{env}-{account_id}/
└── backups/
    └── {job_id}/
        ├── manifest.json
        ├── cms-content-{env}.ndjson.gz
        ├── cms-media-{env}.ndjson.gz
        ├── cms-users-{env}.ndjson.gz
        ├── cms-settings-{env}.ndjson.gz
        ├── cms-comments-{env}.ndjson.gz
        ├── cms-plugins-{env}.ndjson.gz
        ├── cms-sections-{env}.ndjson.gz
        ├── cms-themes-{env}.ndjson.gz
        └── media/
            └── ... (S3 object keys preserved)
```

## Admin UI Layout

The BackupRestore page has three sections:

1. **Status Banner** — Last successful backup date, total archives count, total storage used, active job indicator
2. **Actions Bar** — "Create Backup" button (opens component selector modal), "Schedule Settings" button
3. **History Table** — Sortable table of all jobs with columns: Date, Type (backup/restore), Components, Size, Duration, Status, Actions (Restore, Download, Delete)

When a job is running, a progress panel appears at top showing: progress bar, current phase text, elapsed time, cancel button.
