# Requirements: Backup & Restore Admin UI

## Introduction

A comprehensive backup and restore management interface in the CMS admin panel that enables administrators to create, manage, schedule, and restore backups of all CMS data components. Backups are stored as compressed archives in a dedicated S3 bucket. The system supports per-component granularity — administrators can back up or restore individual components (content, media metadata, users, settings, comments, plugins, sections, themes, S3 media files) independently or all at once.

## Glossary

- **Backup_Job**: A tracked operation representing a backup or restore task with status, progress, and metadata stored in DynamoDB
- **Archive**: A compressed collection of NDJSON files and optional media files stored in S3, representing a point-in-time snapshot of selected CMS components
- **Component**: An individual CMS data store (DynamoDB table or S3 bucket) that can be independently backed up or restored
- **Job_Status**: The lifecycle state of a backup/restore operation: `queued`, `running`, `completed`, `failed`, `cancelled`
- **Backup_Schedule**: An EventBridge rule that triggers automatic periodic backups at configured intervals

## Requirements

### Requirement 1: Backup Creation

**User Story:** As an admin, I want to create backups of my CMS data with component-level granularity, so that I can protect specific data without backing up everything.

#### Acceptance Criteria

1. THE system SHALL provide a "Create Backup" action that triggers a new backup job.
2. THE backup creation UI SHALL allow selecting which components to include: Content, Media Metadata, Users, Settings, Comments, Plugins, Sections, Themes, and S3 Media Files.
3. WHEN "All Components" is selected, THE system SHALL back up all DynamoDB tables and S3 media.
4. THE system SHALL export each selected DynamoDB table to NDJSON format (one JSON object per line).
5. WHEN S3 Media Files is selected, THE system SHALL copy all objects from the media bucket to the backup archive location in S3.
6. THE system SHALL store backup archives in a dedicated S3 bucket: `serverless-cms-backups-{env}-{account_id}`.
7. THE backup archive SHALL be organized as: `backups/{job_id}/manifest.json`, `backups/{job_id}/{table_name}.ndjson.gz`, `backups/{job_id}/media/...`.
8. THE system SHALL compress NDJSON files with gzip before storing to S3.
9. THE system SHALL generate a `manifest.json` containing: job ID, timestamp, selected components, item counts per table, S3 object count, total size, and source environment.
10. ONLY users with the `admin` role SHALL be able to create backups.

### Requirement 2: Restore Operations

**User Story:** As an admin, I want to restore CMS data from a backup archive with component-level control, so that I can recover specific data without overwriting everything.

#### Acceptance Criteria

1. THE system SHALL provide a "Restore" action on each backup archive in the history.
2. THE restore UI SHALL allow selecting which components to restore from the archive (only components that were included in the original backup).
3. BEFORE restoring, THE system SHALL display a confirmation dialog showing: archive date, components to restore, item counts, and a clear warning that existing data will be overwritten.
4. THE restore confirmation SHALL require the admin to type "RESTORE" to proceed.
5. WHEN restoring a DynamoDB table, THE system SHALL use BatchWriteItem to import all items from the NDJSON archive.
6. WHEN restoring S3 media, THE system SHALL copy archived media objects back to the media bucket.
7. THE system SHALL NOT delete existing items before restoring (additive restore, not destructive).
8. ONLY users with the `admin` role SHALL be able to trigger restores.
9. THE system SHALL prevent concurrent backup/restore operations (only one job running at a time).

### Requirement 3: Job Status and Progress

**User Story:** As an admin, I want to see real-time progress of backup/restore operations, so that I know how long to wait and whether it succeeded.

#### Acceptance Criteria

1. THE system SHALL track each backup/restore operation as a job with states: `queued`, `running`, `completed`, `failed`, `cancelled`.
2. WHILE a job is running, THE system SHALL update progress percentage in the jobs table (0-100).
3. THE admin UI SHALL poll job status every 3 seconds while a job is running.
4. THE UI SHALL display a progress bar with percentage, current phase (e.g., "Exporting content table..."), and elapsed time.
5. WHEN a job completes, THE system SHALL update the job record with: completion time, total items processed, total bytes, and duration.
6. WHEN a job fails, THE system SHALL record the error message and the phase where failure occurred.
7. THE system SHALL support cancelling a running job (best-effort — completes current batch then stops).

### Requirement 4: Backup History

**User Story:** As an admin, I want to see a history of all backups with details, so that I can find and manage specific archives.

#### Acceptance Criteria

1. THE admin UI SHALL display a table of all backup jobs sorted by creation date (newest first).
2. EACH row SHALL show: date/time, status, components included, total size, item counts, and duration.
3. THE admin SHALL be able to delete old backup archives (removes both the job record and S3 objects).
4. THE admin SHALL be able to download individual NDJSON files from a backup archive.
5. THE system SHALL display total storage used by all backups.
6. COMPLETED backup rows SHALL have a "Restore" button that initiates a restore from that archive.

### Requirement 5: Scheduled Backups

**User Story:** As an admin, I want to schedule automatic periodic backups, so that I have regular recovery points without manual intervention.

#### Acceptance Criteria

1. THE admin UI SHALL provide a "Schedule" section with enable/disable toggle.
2. WHEN scheduling is enabled, THE admin SHALL select a frequency: daily, weekly, or monthly.
3. WHEN scheduling is enabled, THE admin SHALL select which components to include in scheduled backups.
4. THE system SHALL use EventBridge scheduled rules to trigger backup jobs at the configured interval.
5. THE system SHALL retain the last N scheduled backups (configurable, default: 7 for daily, 4 for weekly, 3 for monthly).
6. THE system SHALL automatically delete expired scheduled backups beyond the retention count.
7. THE schedule configuration SHALL be stored in the settings table under key `backup_schedule`.

### Requirement 6: Infrastructure

**User Story:** As a developer, I want the backup system to be fully managed via CDK, so that it deploys automatically with the rest of the stack.

#### Acceptance Criteria

1. THE CDK stack SHALL create a backup jobs DynamoDB table: `cms-backup-jobs-{env}` with partition key `id` (String).
2. THE CDK stack SHALL create a dedicated S3 bucket for backup archives: `serverless-cms-backups-{env}-{account_id}`.
3. THE S3 backup bucket SHALL have lifecycle rules to transition archives to Glacier after 90 days.
4. THE CDK stack SHALL create a backup Lambda function with 15-minute timeout and 1024 MB memory.
5. THE CDK stack SHALL create a restore Lambda function with 15-minute timeout and 1024 MB memory.
6. THE CDK stack SHALL create API Gateway routes for backup/restore operations.
7. THE backup Lambda SHALL have read access to all CMS DynamoDB tables and the media bucket.
8. THE restore Lambda SHALL have write access to all CMS DynamoDB tables and the media bucket.
9. BOTH Lambda functions SHALL have read/write access to the backup bucket and jobs table.
10. THE CDK stack SHALL create an EventBridge rule (initially disabled) for scheduled backups.

### Requirement 7: API Endpoints

**User Story:** As a frontend developer, I want clear REST API endpoints for all backup operations.

#### Acceptance Criteria

1. `POST /api/v1/backup` — Create a new backup job (body: { components: string[] })
2. `POST /api/v1/backup/{id}/restore` — Restore from a backup archive (body: { components: string[] })
3. `GET /api/v1/backup/jobs` — List all backup/restore jobs (paginated)
4. `GET /api/v1/backup/jobs/{id}` — Get single job status with progress
5. `DELETE /api/v1/backup/{id}` — Delete a backup archive and its job record
6. `GET /api/v1/backup/{id}/download/{file}` — Get presigned S3 URL for downloading a specific file
7. `PUT /api/v1/backup/schedule` — Update backup schedule configuration
8. `GET /api/v1/backup/schedule` — Get current schedule configuration
9. ALL endpoints SHALL require authentication with `admin` role.
10. ALL endpoints SHALL return JSON responses with appropriate HTTP status codes.
