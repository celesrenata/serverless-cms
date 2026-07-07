# Requirements Document

## Introduction

Backup and restore scripts for the Serverless CMS that allow capturing the full state of any stage (dev, staging, prod) and restoring it to the same or a different stage. The feature covers all DynamoDB tables and S3 media assets, supports cross-stage restoration (e.g., backup prod → restore to dev), and handles large media buckets (5GB+) efficiently. Scripts follow existing project conventions (Python/Bash in `scripts/` directory) and accept stage as a CLI argument.

## Glossary

- **Stage**: One of the three deployment environments: `dev`, `staging`, or `prod`
- **Backup_Script**: A Python script at `scripts/backup.py` that exports all DynamoDB table data and S3 media for a given Stage to an archive
- **Restore_Script**: A Python script at `scripts/restore.py` that imports a previously created archive into a target Stage
- **Archive**: A timestamped directory (local filesystem or S3) containing exported DynamoDB JSON files and S3 media objects organized by table and bucket
- **DynamoDB_Tables**: The six tables per stage: `cms-content-{env}`, `cms-media-{env}`, `cms-users-{env}`, `cms-settings-{env}`, `cms-comments-{env}`, `cms-plugins-{env}`
- **Media_Bucket**: The S3 bucket `serverless-cms-media-{env}-{account-id}` storing uploaded media files for a given Stage
- **Manifest**: A JSON file within the Archive that records metadata about the backup including source stage, timestamp, table item counts, S3 object counts, and total size
- **Parallel_Transfer**: The use of concurrent threads or processes to upload/download S3 objects to handle large media buckets efficiently

## Requirements

### Requirement 1: Full Stage Backup

**User Story:** As a DevOps engineer, I want to backup the full state of any stage to an archive, so that I can preserve a point-in-time snapshot before risky deployments or for disaster recovery.

#### Acceptance Criteria

1. WHEN the Backup_Script is invoked with a `--stage` argument, THE Backup_Script SHALL export all items from each of the six DynamoDB_Tables for that Stage.
2. WHEN the Backup_Script completes a DynamoDB export, THE Backup_Script SHALL store each table's data as a newline-delimited JSON file (one JSON object per item per line) within the Archive directory.
3. WHEN the Backup_Script is invoked, THE Backup_Script SHALL copy all objects from the Media_Bucket for the specified Stage into the Archive.
4. WHEN the Backup_Script creates an Archive, THE Backup_Script SHALL generate a Manifest file containing source stage, backup timestamp (ISO 8601), AWS account ID, region, item counts per table, S3 object count, and total backup size in bytes.
5. THE Backup_Script SHALL name the Archive directory using the format `backup-{stage}-{YYYYMMDD-HHMMSS}`.

### Requirement 2: Cross-Stage Restore

**User Story:** As a developer, I want to restore a backup into any stage (including a different stage than the source), so that I can replicate production data into dev for testing or recover a stage from a prior snapshot.

#### Acceptance Criteria

1. WHEN the Restore_Script is invoked with `--archive` and `--target-stage` arguments, THE Restore_Script SHALL write all items from the Archive's DynamoDB JSON files into the DynamoDB_Tables of the target Stage.
2. WHEN the Restore_Script restores DynamoDB items, THE Restore_Script SHALL use batch write operations with exponential backoff on throttled requests.
3. WHEN the Restore_Script is invoked, THE Restore_Script SHALL upload all media files from the Archive into the Media_Bucket of the target Stage.
4. WHEN the source stage differs from the target stage, THE Restore_Script SHALL update S3 URLs stored in DynamoDB records (s3_url, featured_image fields) to reference the target Stage's Media_Bucket.
5. WHEN the Restore_Script is invoked with the `--clean` flag, THE Restore_Script SHALL delete all existing items in the target Stage's DynamoDB_Tables and all objects in the target Media_Bucket before restoring.

### Requirement 3: Large Media Handling

**User Story:** As a DevOps engineer, I want backup and restore to handle large S3 buckets (5GB+) efficiently, so that operations complete in a reasonable time without memory exhaustion.

#### Acceptance Criteria

1. WHEN copying S3 objects, THE Backup_Script SHALL use Parallel_Transfer with a configurable concurrency level (default: 10 concurrent transfers).
2. WHEN uploading S3 objects, THE Restore_Script SHALL use Parallel_Transfer with a configurable concurrency level (default: 10 concurrent transfers).
3. WHEN an individual S3 object exceeds 100MB, THE Backup_Script SHALL use multipart download to transfer it.
4. WHEN an individual S3 object exceeds 100MB, THE Restore_Script SHALL use multipart upload to transfer it.
5. THE Backup_Script SHALL stream S3 objects to disk rather than loading entire objects into memory.
6. THE Restore_Script SHALL stream S3 objects from disk rather than loading entire objects into memory.

### Requirement 4: Archive Storage Options

**User Story:** As a DevOps engineer, I want to choose between storing backups locally or in a dedicated S3 bucket, so that I can use local storage for quick dev backups and S3 for durable production backups.

#### Acceptance Criteria

1. WHEN the Backup_Script is invoked with `--output-dir`, THE Backup_Script SHALL write the Archive to the specified local directory.
2. WHEN the Backup_Script is invoked with `--output-s3`, THE Backup_Script SHALL write the Archive to the specified S3 bucket and prefix.
3. WHEN no output location is specified, THE Backup_Script SHALL default to writing the Archive under `./backups/` in the project root.
4. WHEN the Restore_Script is invoked with a local path as `--archive`, THE Restore_Script SHALL read the Archive from the local filesystem.
5. WHEN the Restore_Script is invoked with an S3 URI as `--archive`, THE Restore_Script SHALL read the Archive from the specified S3 location.

### Requirement 5: Safety and Confirmation

**User Story:** As a DevOps engineer, I want safeguards when restoring to production or using destructive options, so that I do not accidentally overwrite production data.

#### Acceptance Criteria

1. WHEN the Restore_Script targets the `prod` Stage, THE Restore_Script SHALL prompt for interactive confirmation with the message "You are about to restore to PRODUCTION. Type 'yes-restore-prod' to confirm:".
2. WHEN the Restore_Script is invoked with `--clean` and targets the `prod` Stage, THE Restore_Script SHALL require both the interactive confirmation and a `--force` flag.
3. WHEN the `--dry-run` flag is provided, THE Backup_Script SHALL report what would be backed up (table names, item counts, bucket name, object count, estimated size) without performing any data transfer.
4. WHEN the `--dry-run` flag is provided, THE Restore_Script SHALL report what would be restored (target tables, item counts, target bucket, object count) without performing any writes.
5. IF the Manifest indicates the backup originated from a different AWS account, THEN THE Restore_Script SHALL warn the user and require `--force` to proceed.

### Requirement 6: Progress Reporting

**User Story:** As a DevOps engineer, I want clear progress output during backup and restore operations, so that I can monitor long-running operations and estimate completion time.

#### Acceptance Criteria

1. WHILE exporting DynamoDB items, THE Backup_Script SHALL display a progress indicator showing items exported per table and percentage complete.
2. WHILE copying S3 objects, THE Backup_Script SHALL display a progress indicator showing objects transferred, bytes transferred, and percentage complete.
3. WHILE restoring DynamoDB items, THE Restore_Script SHALL display a progress indicator showing items written per table and percentage complete.
4. WHILE uploading S3 objects, THE Restore_Script SHALL display a progress indicator showing objects transferred, bytes transferred, and percentage complete.
5. WHEN an operation completes, THE Backup_Script SHALL print a summary including total time elapsed, items backed up, objects backed up, and total archive size.
6. WHEN an operation completes, THE Restore_Script SHALL print a summary including total time elapsed, items restored, objects restored, and target stage.

### Requirement 7: Error Handling and Resumability

**User Story:** As a DevOps engineer, I want backup and restore operations to handle transient errors gracefully and support resuming interrupted operations, so that a network blip does not require restarting from scratch.

#### Acceptance Criteria

1. IF a DynamoDB scan or batch write fails with a retryable error, THEN THE Backup_Script SHALL retry with exponential backoff up to 5 attempts before failing.
2. IF an S3 transfer fails with a retryable error, THEN THE Backup_Script SHALL retry up to 3 attempts before skipping the object and recording the failure in an errors log.
3. IF an S3 transfer fails with a retryable error, THEN THE Restore_Script SHALL retry up to 3 attempts before skipping the object and recording the failure in an errors log.
4. WHEN the Backup_Script is invoked with `--resume`, THE Backup_Script SHALL skip DynamoDB tables and S3 objects that already exist in the Archive directory.
5. WHEN the Restore_Script is invoked with `--resume`, THE Restore_Script SHALL skip DynamoDB tables and S3 objects that have already been successfully restored (tracked via a checkpoint file in the Archive).
6. IF any errors occurred during operation, THEN THE Backup_Script SHALL write a detailed `errors.json` file to the Archive and exit with a non-zero status code.
7. IF any errors occurred during operation, THEN THE Restore_Script SHALL write a detailed `errors.json` file to the Archive and exit with a non-zero status code.

### Requirement 8: CLI Interface Consistency

**User Story:** As a developer, I want the backup and restore scripts to follow the same CLI conventions as existing scripts (deploy.sh, migrate_wordpress.py), so that the tooling feels consistent and discoverable.

#### Acceptance Criteria

1. THE Backup_Script SHALL use Python argparse with `--stage` (required), `--output-dir`, `--output-s3`, `--dry-run`, `--resume`, `--concurrency`, and `--region` (default: us-west-2) arguments.
2. THE Restore_Script SHALL use Python argparse with `--archive` (required), `--target-stage` (required), `--clean`, `--force`, `--dry-run`, `--resume`, `--concurrency`, and `--region` (default: us-west-2) arguments.
3. THE Backup_Script SHALL print usage information when invoked with `--help`.
4. THE Restore_Script SHALL print usage information when invoked with `--help`.
5. THE Backup_Script SHALL exit with status code 0 on success and non-zero on failure.
6. THE Restore_Script SHALL exit with status code 0 on success and non-zero on failure.
