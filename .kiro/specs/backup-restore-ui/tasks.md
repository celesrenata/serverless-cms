# Implementation Plan: Backup & Restore Admin UI

## Tasks

- [x] 1. CDK Infrastructure
  - [x] 1.1 Create backup construct (`lib/constructs/backup.ts`)
    - Create `cms-backup-jobs-{env}` DynamoDB table (partition key: `id`, billing: PAY_PER_REQUEST)
    - Add GSI `type-created_at-index` (partition: `type`, sort: `created_at`) for listing jobs
    - Create S3 bucket `serverless-cms-backups-{env}-{account_id}` with lifecycle rule (Glacier after 90 days)
    - Create Backup Lambda function (Python 3.12, 15min timeout, 1024MB memory, code from `lambda/backup`)
    - Create Restore Lambda function (Python 3.12, 15min timeout, 1024MB memory, code from `lambda/backup`)
    - Create API handler Lambda function (code from `lambda/backup`)
    - Grant read access to all CMS tables + media bucket for backup Lambda
    - Grant write access to all CMS tables + media bucket for restore Lambda
    - Grant read/write access to backup bucket + jobs table for both
    - Create EventBridge rule (initially disabled) targeting backup Lambda
    - Export bucket name and jobs table name as environment variables
    - _Requirements: 6.1–6.10_

  - [x] 1.2 Add API Gateway routes for backup
    - Add routes: POST /backup, POST /backup/{id}/restore, GET /backup/jobs, GET /backup/jobs/{id}, DELETE /backup/{id}, GET /backup/{id}/download/{file}, PUT /backup/schedule, GET /backup/schedule
    - Wire routes to the backup API handler Lambda
    - _Requirements: 7.1–7.10_

  - [x] 1.3 Wire backup construct into main stack
    - Import BackupConstruct in `lib/serverless-cms-stack.ts`
    - Pass all table references and bucket references
    - Add stack outputs for backup bucket name
    - Build and synth to verify no errors
    - _Requirements: 6.1_

- [x] 2. Backend - API Handler
  - [x] 2.1 Create backup API router (`lambda/backup/api_handler.py`)
    - Route incoming requests based on method + path
    - Implement POST /backup: validate components list, create job record (status: queued), invoke backup Lambda async, return job ID
    - Implement POST /backup/{id}/restore: validate archive exists, validate components, create restore job, invoke restore Lambda async
    - Implement GET /backup/jobs: list jobs from DynamoDB (paginated, sorted by created_at desc)
    - Implement GET /backup/jobs/{id}: get single job with full details
    - Implement DELETE /backup/{id}: delete job record + S3 archive prefix
    - Implement GET /backup/{id}/download/{file}: generate presigned S3 URL (5 min expiry)
    - Implement PUT /backup/schedule: validate and save schedule config to settings table
    - Implement GET /backup/schedule: read schedule config from settings table
    - All endpoints require admin role via @require_auth(roles=['admin'])
    - _Requirements: 7.1–7.10, 1.10, 2.8_

  - [x] 2.2 Create backup executor (`lambda/backup/backup_handler.py`)
    - Accept event with job_id and components list
    - Set job status=running, started_at=now
    - For each selected DynamoDB component: paginated scan → gzip → upload to S3 as {table}.ndjson.gz
    - For S3 media: list objects → copy each to backup bucket under media/ prefix
    - Update progress after each table (progress = tables_done / total_tables * 100)
    - Update phase text ("Exporting cms-content-prod...", "Copying media files...")
    - Generate manifest.json with counts and sizes
    - On completion: set status=completed, completed_at=now, store result metadata
    - On error: set status=failed, store error message
    - Handle cancellation: check job status before each phase, stop if cancelled
    - _Requirements: 1.1–1.9, 3.1–3.7_

  - [x] 2.3 Create restore executor (`lambda/backup/restore_handler.py`)
    - Accept event with job_id, source_archive_id, and components list
    - Read manifest.json from source archive in S3
    - Set job status=running
    - For each selected component: stream NDJSON.gz from S3, decompress, BatchWriteItem (batches of 25)
    - For S3 media restore: copy objects from backup bucket media/ back to CMS media bucket
    - Update progress after each component
    - On completion: set status=completed
    - On error: set status=failed with error details
    - _Requirements: 2.1–2.9, 3.1–3.7_

  - [x] 2.4 Create shared backup utilities (`lambda/backup/utils.py`)
    - Job status helpers: update_job_status, update_job_progress
    - Component-to-table mapping dictionary
    - Concurrency lock: check/set a "running" flag to prevent concurrent operations
    - _Requirements: 2.9, 3.1–3.2_

- [x] 3. Frontend - Admin UI
  - [x] 3.1 Create BackupRestore page (`frontend/admin-panel/src/pages/BackupRestore.tsx`)
    - Status banner: last backup date, total archives, storage used
    - Actions bar: "Create Backup" button, "Schedule" button
    - History table: date, type, components (chips), size, duration, status badge, action buttons
    - Empty state when no backups exist yet
    - _Requirements: 4.1–4.6_

  - [x] 3.2 Create backup creation modal
    - Component selector with checkboxes (all 9 components + "Select All")
    - Descriptions for each component
    - Estimated size (if available from last backup)
    - "Start Backup" button that triggers the API call
    - _Requirements: 1.1–1.3_

  - [x] 3.3 Create restore confirmation dialog
    - Shows archive details: date, components available, sizes
    - Component selector (only components present in the archive)
    - Warning text about data overwrite
    - "Type RESTORE to confirm" input field
    - "Restore" button only enabled when confirmation text matches
    - _Requirements: 2.1–2.4_

  - [x] 3.4 Create progress indicator component
    - Progress bar with percentage
    - Current phase text
    - Elapsed time counter
    - Cancel button
    - Polls job status every 3 seconds while running
    - Auto-dismisses on completion (shows success toast)
    - Shows error state with message on failure
    - _Requirements: 3.1–3.7_

  - [x] 3.5 Create schedule settings panel
    - Enable/disable toggle
    - Frequency selector: daily, weekly, monthly
    - Component selector for scheduled backups
    - Retention count input
    - Save button
    - _Requirements: 5.1–5.7_

  - [x] 3.6 Add backup hooks and API service
    - `useBackupJobs()` — list jobs with polling when active
    - `useCreateBackup()` — mutation to trigger backup
    - `useRestoreBackup()` — mutation to trigger restore
    - `useDeleteBackup()` — mutation to delete archive
    - `useBackupSchedule()` — query/mutation for schedule config
    - API service methods for all backup endpoints
    - _Requirements: 7.1–7.10_

  - [x] 3.7 Add route and sidebar entry
    - Add `/backup` route to admin router
    - Add "Backup & Restore" item to sidebar (after Settings, before Appearance)
    - Use 💾 emoji or backup icon
    - Only visible for admin role
    - _Requirements: 1.10_

- [ ] 4. Testing & Integration
  - [-] 4.1 Backend tests
    - Test API handler routing and validation
    - Test job creation and status updates
    - Test component mapping
    - Test concurrent operation prevention
    - Mock DynamoDB and S3 operations
    - _Requirements: all_

  - [~] 4.2 Frontend tests
    - Test BackupRestore page renders correctly
    - Test component selector modal
    - Test restore confirmation dialog (RESTORE text validation)
    - Test progress polling behavior
    - Test schedule settings form
    - _Requirements: all_

  - [~] 4.3 CDK synth verification
    - Build TypeScript
    - Synthesize stack
    - Verify no circular dependencies
    - Verify IAM permissions are correct
    - _Requirements: 6.1–6.10_

- [~] 5. Checkpoint
  - Run full test suite
  - Verify CDK builds and synths
  - Commit and deploy
