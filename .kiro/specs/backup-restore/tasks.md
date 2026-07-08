# Implementation Plan: Backup and Restore

## Overview

Implement two Python CLI scripts (`scripts/backup.py` and `scripts/restore.py`) that provide full-fidelity export/import of all DynamoDB tables and S3 media for any stage of the Serverless CMS. Scripts follow existing conventions from `scripts/migrate_wordpress.py` and use boto3, concurrent.futures for parallel transfers, and argparse for CLI.

## Tasks

- [x] 1. Set up shared utilities and test dependencies
  - [x] 1.1 Add hypothesis to tests/requirements.txt
    - Add `hypothesis>=6.82.0` to the existing test dependencies file
    - _Requirements: Testing infrastructure_

  - [x] 1.2 Implement ProgressReporter class in `scripts/backup_utils.py`
    - Create shared utility module `scripts/backup_utils.py`
    - Implement `ProgressReporter` with `start_phase()`, `table_progress()`, `s3_progress()`, `warning()`, `error()`, and `summary()` methods
    - Use stderr for progress output so stdout stays clean for scripting
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 1.3 Implement ManifestManager class in `scripts/backup_utils.py`
    - Implement `create()`, `write()`, `load()`, `validate()` methods
    - Follow the manifest.json schema from the design (schema_version, source, dynamodb, s3 sections)
    - Validate returns list of errors (empty = valid)
    - _Requirements: 1.4, 5.5_

  - [x] 1.4 Implement CheckpointManager class in `scripts/backup_utils.py`
    - Implement `load()`, `save()`, `is_table_complete()`, `mark_table_complete()`, `is_object_complete()`, `mark_object_complete()`
    - Atomic writes via `checkpoint.json.tmp` → `os.replace()` → `checkpoint.json`
    - Separate backup/restore sections per the checkpoint schema
    - _Requirements: 7.4, 7.5_

  - [x] 1.5 Implement URLRewriter class in `scripts/backup_utils.py`
    - Implement `rewrite_url()` and `rewrite_item()` methods
    - Handle virtual-hosted URLs, path-style URLs, and s3:// URIs
    - Target fields: `s3_url` and `featured_image` in DynamoDB JSON items
    - Account ID: `776053071238`, bucket pattern: `serverless-cms-media-{stage}-{account_id}`
    - _Requirements: 2.4_

- [x] 2. Implement backup script
  - [x] 2.1 Implement DynamoDBExporter class in `scripts/backup.py`
    - Paginated scan using `LastEvaluatedKey` for all 6 tables
    - Write NDJSON (one DynamoDB JSON item per line) preserving all type annotations (S, N, BOOL, L, M, SS, NS, BS, NULL)
    - Integrate with CheckpointManager for resume support (skip completed tables)
    - Integrate with ProgressReporter for item counts per table
    - Retry with exponential backoff (5 attempts, base 0.25s, max 8s) on throttling
    - _Requirements: 1.1, 1.2, 7.1, 7.4_

  - [x] 2.2 Implement S3TransferManager download in `scripts/backup.py`
    - Parallel download with `ThreadPoolExecutor(max_workers=concurrency)`
    - Use `boto3.s3.transfer.TransferConfig(multipart_threshold=100*1024*1024)` for large files
    - Stream to disk (no full-object memory loading)
    - Retry up to 3 times per object; on exhaustion, log to errors list and continue
    - Integrate with CheckpointManager (skip already-downloaded objects on resume)
    - Integrate with ProgressReporter (objects, bytes, percentage)
    - _Requirements: 1.3, 3.1, 3.3, 3.5, 7.2, 7.4_

  - [x] 2.3 Implement backup CLI and main orchestration in `scripts/backup.py`
    - Argparse with: `--stage` (required), `--output-dir`, `--output-s3`, `--dry-run`, `--resume`, `--concurrency` (default 10), `--region` (default us-west-2)
    - `--help` prints usage; shebang `#!/usr/bin/env python3`
    - Validate stage is dev/staging/prod
    - Create archive directory: `backup-{stage}-{YYYYMMDD-HHMMSS}`
    - `--dry-run`: report table names, item counts, bucket name, object count, estimated size without transfer
    - `--resume`: load checkpoint and skip completed work
    - Orchestrate: export tables → download S3 → generate manifest → print summary
    - Exit 0 success, 1 partial errors, 2 validation error
    - Write errors.json if any errors occurred
    - _Requirements: 1.5, 4.1, 4.2, 4.3, 5.3, 6.5, 7.6, 8.1, 8.3, 8.5_

- [x] 3. Checkpoint - Ensure backup script works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement restore script
  - [x] 4.1 Implement DynamoDBImporter class in `scripts/restore.py`
    - Read NDJSON line by line (streaming, no full-file memory load)
    - Apply URLRewriter if source_stage != target_stage
    - BatchWriteItem in batches of 25
    - Retry UnprocessedItems with exponential backoff (5 attempts, base 0.25s, max 8s)
    - Integrate with CheckpointManager for resume (skip completed tables)
    - Integrate with ProgressReporter
    - _Requirements: 2.1, 2.2, 2.4, 7.5_

  - [x] 4.2 Implement S3TransferManager upload in `scripts/restore.py`
    - Parallel upload with `ThreadPoolExecutor(max_workers=concurrency)`
    - Use `TransferConfig(multipart_threshold=100*1024*1024)` for large files
    - Stream from disk (no full-object memory loading)
    - Retry up to 3 times per object; log failures to errors list
    - Integrate with CheckpointManager and ProgressReporter
    - _Requirements: 2.3, 3.2, 3.4, 3.6, 7.3, 7.5_

  - [x] 4.3 Implement safety checks and clean mode in `scripts/restore.py`
    - Production restore: prompt for `yes-restore-prod` confirmation (stdin)
    - `--clean` + prod: require both confirmation AND `--force` flag
    - Cross-account warning: if manifest account_id != current account, warn and require `--force`
    - `--clean`: delete all items in target tables (paginated scan+delete) and empty target bucket before restoring
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 4.4 Implement restore CLI and main orchestration in `scripts/restore.py`
    - Argparse with: `--archive` (required), `--target-stage` (required), `--clean`, `--force`, `--dry-run`, `--resume`, `--concurrency` (default 10), `--region` (default us-west-2)
    - `--help` prints usage; shebang `#!/usr/bin/env python3`
    - Load and validate manifest from archive
    - `--dry-run`: report target tables, item counts, target bucket, object count without writes
    - Orchestrate: safety checks → clean (optional) → import tables → upload S3 → print summary
    - Exit 0 success, 1 partial errors, 2 validation error, 3 safety check failed
    - Write errors.json if any errors occurred
    - _Requirements: 4.4, 4.5, 5.4, 6.6, 7.7, 8.2, 8.4, 8.6_

- [x] 5. Checkpoint - Ensure restore script works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Property-based tests
  - [x] 6.1 Write property test for DynamoDB data round-trip preservation
    - **Property 1: DynamoDB Data Round-Trip Preservation**
    - Generate random DynamoDB JSON items with varied types (S, N, BOOL, L, M, SS, NS, BS, NULL) → serialize to NDJSON → deserialize → assert equality
    - Use `@settings(max_examples=100)`
    - Test file: `tests/test_backup_restore_properties.py`
    - **Validates: Requirements 1.1, 1.2, 2.1**

  - [x] 6.2 Write property test for manifest counts accuracy
    - **Property 2: Manifest Counts Match Actual Data**
    - Generate random item counts → create NDJSON files with that many lines → build manifest → assert counts match line counts and file counts in media/
    - Use `@settings(max_examples=100)`
    - **Validates: Requirements 1.4**

  - [x] 6.3 Write property test for archive directory naming
    - **Property 3: Archive Directory Naming Format**
    - Generate stage ∈ {dev, staging, prod} and datetime → format archive name → assert matches `backup-(dev|staging|prod)-\d{8}-\d{6}`
    - Use `@settings(max_examples=100)`
    - **Validates: Requirements 1.5**

  - [x] 6.4 Write property test for URL rewriting correctness
    - **Property 4: S3 URL Rewriting Correctness**
    - Generate S3 URLs (virtual-hosted, path-style, s3://) with random path segments → rewrite source→target → assert target bucket with same path; rewrite target→source → assert original recovered
    - Use `@settings(max_examples=100)`
    - **Validates: Requirements 2.4**

  - [x] 6.5 Write property test for exponential backoff formula
    - **Property 5: Exponential Backoff Formula**
    - Generate attempt n ∈ [1,5], base_delay ∈ (0, 2], max_delay ∈ [base_delay, 30] → compute backoff → assert equals `min(2^n * base_delay, max_delay)`
    - Use `@settings(max_examples=100)`
    - **Validates: Requirements 7.1**

  - [x] 6.6 Write property test for resume idempotence
    - **Property 6: Resume Idempotence**
    - Generate partial checkpoint state → simulate resume → compare output to fresh run → assert no duplicated NDJSON lines or media files
    - Use `@settings(max_examples=100)`
    - **Validates: Requirements 7.4, 7.5**

- [x] 7. Unit tests
  - [x] 7.1 Write unit tests for CLI argument parsing
    - Test all argparse arguments for both backup.py and restore.py
    - Test defaults (concurrency=10, region=us-west-2), required args validation
    - Test `--help` output
    - Test file: `tests/test_backup_restore_unit.py`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 7.2 Write unit tests for URLRewriter
    - Test virtual-hosted URLs, path-style URLs, s3:// URIs
    - Test non-S3 URLs are unchanged
    - Test rewrite_item with s3_url and featured_image fields
    - Test same-stage rewriting is a no-op
    - _Requirements: 2.4_

  - [x] 7.3 Write unit tests for ManifestManager and CheckpointManager
    - Test manifest create/write/load/validate round-trip
    - Test validation catches missing fields, count mismatches
    - Test checkpoint atomic writes, load/save, mark/check complete
    - Test corrupt checkpoint file handling
    - _Requirements: 1.4, 7.4, 7.5_

  - [x] 7.4 Write unit tests for safety checks
    - Test prod confirmation logic (correct/incorrect input)
    - Test --force requirements with --clean on prod
    - Test cross-account detection and warning
    - Test dry-run behavior (no writes)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Integration tests with moto
  - [x] 8.1 Write integration test for end-to-end backup
    - Use moto to mock DynamoDB tables and S3 bucket
    - Populate tables with test data, run backup, verify archive contents
    - Verify NDJSON files have correct line counts, media files downloaded, manifest accurate
    - Test file: `tests/test_backup_restore_integration.py`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 8.2 Write integration test for end-to-end restore
    - Create archive with known data, run restore, verify target tables and bucket populated
    - Verify item counts match, media objects uploaded
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 8.3 Write integration test for cross-stage restore with URL rewriting
    - Backup from staging, restore to dev
    - Verify all s3_url and featured_image fields rewritten to target bucket
    - _Requirements: 2.4_

  - [x] 8.4 Write integration test for clean restore
    - Pre-populate target tables and bucket, restore with --clean
    - Verify old data completely removed, new data in place
    - _Requirements: 5.1, 5.2_

  - [x] 8.5 Write integration test for resume (backup and restore)
    - Create partial archive (some tables complete), run backup with --resume
    - Verify only remaining tables exported, no duplicates
    - Create partial restore state, run restore with --resume
    - Verify only remaining items written, no duplicates
    - _Requirements: 7.4, 7.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The shared utility module `scripts/backup_utils.py` keeps both scripts DRY
- Scripts follow patterns from `scripts/migrate_wordpress.py` (shebang, argparse, boto3, same region/account)
- `hypothesis` needs to be added to `tests/requirements.txt`; `moto` is already present
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- Integration tests use moto to mock AWS services end-to-end

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 7, "tasks": ["6.6", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] }
  ]
}
```
