#!/usr/bin/env python3
"""Backup script for the Serverless CMS project.

Exports all DynamoDB tables and S3 media for a given stage to a local archive.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

import boto3
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError

from backup_utils import CheckpointManager, ManifestManager, ProgressReporter

DEFAULT_REGION = "us-west-2"
ACCOUNT_ID = "776053071238"
TABLE_TEMPLATES = [
    "cms-content-{env}",
    "cms-media-{env}",
    "cms-users-{env}",
    "cms-settings-{env}",
    "cms-comments-{env}",
    "cms-plugins-{env}",
]
RETRYABLE_ERROR_CODES = (
    "ProvisionedThroughputExceededException",
    "ThrottlingException",
    "InternalServerError",
)


@dataclass(frozen=True)
class ExportResult:
    """Result metadata for a DynamoDB table export."""

    table_name: str
    file_name: str
    item_count: int
    bytes_written: int


@dataclass
class TransferResult:
    """Result summary for an S3 transfer operation."""

    bucket: str
    object_count: int
    total_bytes: int
    errors: list[dict[str, Any]] = field(default_factory=list)


class DynamoDBExporter:
    """Export DynamoDB tables to newline-delimited JSON files."""

    def __init__(self, session: boto3.Session, region: str) -> None:
        """Create a DynamoDB exporter.

        Args:
            session: Boto3 session used to create AWS clients.
            region: AWS region containing the DynamoDB tables.
        """
        self.client = session.client("dynamodb", region_name=region)
        self.max_retries = 5
        self.base_delay = 0.25
        self.max_delay = 8.0

    def export_table(
        self,
        table_name: str,
        output_path: Path,
        checkpoint: CheckpointManager,
        progress: ProgressReporter,
    ) -> ExportResult:
        """Export a single DynamoDB table to an NDJSON file.

        Args:
            table_name: Name of the DynamoDB table to export.
            output_path: Destination path for the NDJSON export.
            checkpoint: Checkpoint manager used to skip completed tables.
            progress: Progress reporter for export updates.

        Returns:
            Export metadata for the table.

        Raises:
            ClientError: If a non-retryable DynamoDB error occurs, or if retry
                attempts are exhausted for a retryable error.
        """
        if checkpoint.is_table_complete("backup", table_name):
            return ExportResult(
                table_name=table_name,
                file_name=output_path.name,
                item_count=0,
                bytes_written=0,
            )

        item_count = 0
        bytes_written = 0
        last_evaluated_key: dict[str, Any] | None = None

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with output_path.open("w", encoding="utf-8") as output_file:
            while True:
                scan_kwargs: dict[str, Any] = {"TableName": table_name}
                if last_evaluated_key is not None:
                    scan_kwargs["ExclusiveStartKey"] = last_evaluated_key

                response = self._scan_with_retry(scan_kwargs)

                for item in response.get("Items", []):
                    line = json.dumps(item) + "\n"
                    output_file.write(line)
                    item_count += 1
                    bytes_written += len(line.encode("utf-8"))

                progress.table_progress(table_name, item_count)

                last_evaluated_key = response.get("LastEvaluatedKey")
                if not last_evaluated_key:
                    break

        checkpoint.mark_table_complete(
            "backup",
            table_name,
            {"item_count": item_count, "bytes_written": bytes_written},
        )

        return ExportResult(
            table_name=table_name,
            file_name=output_path.name,
            item_count=item_count,
            bytes_written=bytes_written,
        )

    def export_all(
        self,
        stage: str,
        archive_dir: Path,
        checkpoint: CheckpointManager,
        progress: ProgressReporter,
    ) -> list[ExportResult]:
        """Export all DynamoDB tables for a stage.

        Args:
            stage: Deployment stage/environment name.
            archive_dir: Directory where export files will be written.
            checkpoint: Checkpoint manager used to skip completed tables.
            progress: Progress reporter for export updates.

        Returns:
            Export metadata for each table.
        """
        table_names = [template.replace("{env}", stage) for template in TABLE_TEMPLATES]
        results: list[ExportResult] = []

        progress.start_phase("DynamoDB Export")

        for table_name in table_names:
            output_path = archive_dir / f"{table_name}.ndjson"
            results.append(
                self.export_table(
                    table_name=table_name,
                    output_path=output_path,
                    checkpoint=checkpoint,
                    progress=progress,
                )
            )

        return results

    def _scan_with_retry(self, scan_kwargs: dict[str, Any]) -> dict[str, Any]:
        """Run a DynamoDB scan page request with retryable error handling."""
        attempt = 0

        while True:
            try:
                return self.client.scan(**scan_kwargs)
            except ClientError as error:
                error_code = error.response.get("Error", {}).get("Code")
                if error_code not in RETRYABLE_ERROR_CODES:
                    raise

                if attempt >= self.max_retries:
                    raise

                delay = min((2**attempt) * self.base_delay, self.max_delay)
                time.sleep(delay)
                attempt += 1


class S3TransferManager:
    """Manage concurrent S3 backup and restore transfers."""

    def __init__(
        self,
        session: boto3.Session,
        region: str,
        concurrency: int = 10,
        multipart_threshold: int = 100 * 1024 * 1024,
    ) -> None:
        self.s3_client = session.client("s3", region_name=region)
        self.transfer_config = TransferConfig(
            multipart_threshold=multipart_threshold,
            max_concurrency=concurrency,
            use_threads=True,
        )
        self.concurrency = concurrency

    def download_bucket(
        self,
        bucket: str,
        dest_dir: Path,
        checkpoint: CheckpointManager,
        progress: ProgressReporter,
    ) -> TransferResult:
        """Download all objects from an S3 bucket into a local directory."""
        objects: list[tuple[str, int]] = []

        paginator = self.s3_client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket):
            for item in page.get("Contents", []):
                key = item["Key"]
                size = int(item.get("Size", 0))
                objects.append((key, size))

        total_objects = len(objects)
        total_bytes = sum(size for _, size in objects)

        objects_done = 0
        bytes_done = 0
        errors: list[dict[str, Any]] = []
        progress_lock = Lock()

        def report_progress() -> None:
            with progress_lock:
                progress.s3_progress(
                    objects_done,
                    total_objects,
                    bytes_done,
                    total_bytes,
                )

        pending_objects: list[tuple[str, int]] = []

        for key, size in objects:
            if checkpoint.is_object_complete("backup", key):
                objects_done += 1
                bytes_done += size
            else:
                pending_objects.append((key, size))

        # Report initial progress (skipped objects from checkpoint)
        if objects_done > 0:
            report_progress()

        with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            future_to_object = {
                executor.submit(
                    self._download_single_object,
                    bucket,
                    key,
                    size,
                    dest_dir,
                ): (key, size)
                for key, size in pending_objects
            }

            for future in as_completed(future_to_object):
                key, size = future_to_object[future]

                try:
                    error = future.result()
                except Exception as exc:
                    error = {
                        "key": key,
                        "error": str(exc),
                        "attempts": 3,
                    }

                if error is None:
                    checkpoint.mark_object_complete("backup", key, {"size": size})
                    bytes_done += size
                else:
                    errors.append(error)

                objects_done += 1
                report_progress()

        return TransferResult(
            bucket=bucket,
            object_count=total_objects,
            total_bytes=total_bytes,
            errors=errors,
        )

    def upload_directory(
        self,
        source_dir: Path,
        bucket: str,
        checkpoint: CheckpointManager,
        progress: ProgressReporter,
    ) -> TransferResult:
        """Upload all files from a local directory to an S3 bucket."""
        files: list[tuple[Path, str, int]] = []

        for file_path in source_dir.rglob("*"):
            if not file_path.is_file():
                continue

            relative_key = file_path.relative_to(source_dir).as_posix()
            file_size = file_path.stat().st_size
            files.append((file_path, relative_key, file_size))

        total_objects = len(files)
        total_bytes = sum(size for _, _, size in files)

        objects_done = 0
        bytes_done = 0
        errors: list[dict[str, Any]] = []
        progress_lock = Lock()

        def report_progress() -> None:
            with progress_lock:
                progress.s3_progress(
                    objects_done,
                    total_objects,
                    bytes_done,
                    total_bytes,
                )

        pending_files: list[tuple[Path, str, int]] = []

        for file_path, relative_key, file_size in files:
            if checkpoint.is_object_complete("restore", relative_key):
                objects_done += 1
                bytes_done += file_size
            else:
                pending_files.append((file_path, relative_key, file_size))

        # Report initial progress (skipped objects from checkpoint)
        if objects_done > 0:
            report_progress()

        with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            future_to_file = {
                executor.submit(
                    self._upload_single_file,
                    file_path,
                    bucket,
                    relative_key,
                ): (file_path, relative_key, file_size)
                for file_path, relative_key, file_size in pending_files
            }

            for future in as_completed(future_to_file):
                _, relative_key, file_size = future_to_file[future]

                try:
                    error = future.result()
                except Exception as exc:
                    error = {
                        "key": relative_key,
                        "error": str(exc),
                        "attempts": 3,
                    }

                if error is None:
                    checkpoint.mark_object_complete(
                        "restore",
                        relative_key,
                        {"size": file_size},
                    )
                    bytes_done += file_size
                else:
                    errors.append(error)

                objects_done += 1
                report_progress()

        return TransferResult(
            bucket=bucket,
            object_count=total_objects,
            total_bytes=total_bytes,
            errors=errors,
        )

    def empty_bucket(self, bucket: str) -> None:
        """Delete all objects from an S3 bucket in batches of 1,000."""
        paginator = self.s3_client.get_paginator("list_objects_v2")
        batch: list[str] = []

        for page in paginator.paginate(Bucket=bucket):
            for item in page.get("Contents", []):
                batch.append(item["Key"])

                if len(batch) == 1000:
                    self.s3_client.delete_objects(
                        Bucket=bucket,
                        Delete={
                            "Objects": [{"Key": key} for key in batch],
                        },
                    )
                    batch.clear()

        if batch:
            self.s3_client.delete_objects(
                Bucket=bucket,
                Delete={
                    "Objects": [{"Key": key} for key in batch],
                },
            )

    def _download_single_object(
        self,
        bucket: str,
        key: str,
        size: int,
        dest_dir: Path,
    ) -> dict[str, Any] | None:
        """Download a single S3 object with retry handling.

        Returns None on success, or an error dict on exhaustion.
        """
        local_path = dest_dir / key
        local_path.parent.mkdir(parents=True, exist_ok=True)

        last_error: Exception | None = None

        for attempt in range(1, 4):
            try:
                self.s3_client.download_file(
                    bucket,
                    key,
                    str(local_path),
                    Config=self.transfer_config,
                )
                return None
            except (ClientError, Exception) as exc:
                last_error = exc
                if attempt < 3:
                    time.sleep(attempt)

        return {
            "key": key,
            "error": str(last_error),
            "attempts": 3,
        }

    def _upload_single_file(
        self,
        file_path: Path,
        bucket: str,
        relative_key: str,
    ) -> dict[str, Any] | None:
        """Upload a single local file to S3 with retry handling.

        Returns None on success, or an error dict on exhaustion.
        """
        last_error: Exception | None = None

        for attempt in range(1, 4):
            try:
                self.s3_client.upload_file(
                    str(file_path),
                    bucket,
                    relative_key,
                    Config=self.transfer_config,
                )
                return None
            except (ClientError, Exception) as exc:
                last_error = exc
                if attempt < 3:
                    time.sleep(attempt)

        return {
            "key": relative_key,
            "error": str(last_error),
            "attempts": 3,
        }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse backup CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Backup Serverless CMS stage data (DynamoDB + S3 media)"
    )
    parser.add_argument(
        "--stage",
        required=True,
        choices=["dev", "staging", "prod"],
        help="Stage to back up",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Parent directory for the backup archive (default: ./backups/)",
    )
    parser.add_argument(
        "--output-s3",
        type=str,
        default=None,
        help="S3 URI to upload the backup archive to after completion",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report table/bucket info without transferring data",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume a previous incomplete backup using checkpoint",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=10,
        help="Number of parallel S3 transfers (default: 10)",
    )
    parser.add_argument(
        "--region",
        type=str,
        default="us-west-2",
        help="AWS region (default: us-west-2)",
    )
    return parser.parse_args(argv)


def dry_run_report(session: boto3.Session, stage: str, region: str) -> int:
    """Print a report of what would be backed up without transferring data.

    Returns exit code 0.
    """
    dynamodb = session.client("dynamodb", region_name=region)
    s3 = session.client("s3", region_name=region)

    table_names = [t.replace("{env}", stage) for t in TABLE_TEMPLATES]
    media_bucket = f"serverless-cms-media-{stage}-{ACCOUNT_ID}"

    print("=== Dry Run Report ===", file=sys.stderr)
    print(f"Stage: {stage}", file=sys.stderr)
    print(f"Region: {region}", file=sys.stderr)
    print("", file=sys.stderr)

    print("DynamoDB Tables:", file=sys.stderr)
    total_items = 0
    for table_name in table_names:
        try:
            resp = dynamodb.describe_table(TableName=table_name)
            item_count = resp["Table"].get("ItemCount", 0)
            total_items += item_count
            print(f"  {table_name}: {item_count} items", file=sys.stderr)
        except ClientError as exc:
            print(f"  {table_name}: ERROR - {exc}", file=sys.stderr)

    print(f"  Total items: {total_items}", file=sys.stderr)
    print("", file=sys.stderr)

    print(f"S3 Bucket: {media_bucket}", file=sys.stderr)
    object_count = 0
    total_size = 0
    try:
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=media_bucket):
            for obj in page.get("Contents", []):
                object_count += 1
                total_size += obj.get("Size", 0)
        print(f"  Objects: {object_count}", file=sys.stderr)
        print(f"  Total size: {total_size} bytes", file=sys.stderr)
    except ClientError as exc:
        print(f"  ERROR - {exc}", file=sys.stderr)

    print("", file=sys.stderr)
    print("No data was transferred (dry run).", file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    """Run the backup orchestration and return an exit code."""
    args = parse_args(argv)

    stage = args.stage
    region = args.region

    # Determine output directory
    output_parent = Path(args.output_dir) if args.output_dir else Path("./backups")
    output_parent.mkdir(parents=True, exist_ok=True)

    # Create archive directory with timestamp
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    archive_name = f"backup-{stage}-{timestamp}"
    archive_dir = output_parent / archive_name
    archive_dir.mkdir(parents=True, exist_ok=True)

    # Create boto3 session
    session = boto3.Session(region_name=region)

    # Handle dry-run
    if args.dry_run:
        return dry_run_report(session, stage, region)

    # Initialize utilities
    checkpoint = CheckpointManager(archive_dir)
    progress = ProgressReporter()

    if args.resume:
        checkpoint.load()

    start_time = time.time()
    all_errors: list[dict[str, Any]] = []

    # Phase 1: Export DynamoDB tables
    exporter = DynamoDBExporter(session, region)
    dynamo_results = exporter.export_all(stage, archive_dir, checkpoint, progress)

    total_items = sum(r.item_count for r in dynamo_results)

    # Phase 2: Download S3 media
    media_bucket = f"serverless-cms-media-{stage}-{ACCOUNT_ID}"
    media_dir = archive_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    progress.start_phase("S3 Download")
    transfer_mgr = S3TransferManager(session, region, concurrency=args.concurrency)
    s3_result = transfer_mgr.download_bucket(media_bucket, media_dir, checkpoint, progress)

    if s3_result.errors:
        all_errors.extend(s3_result.errors)

    # Phase 3: Generate manifest
    manifest_mgr = ManifestManager()
    manifest = manifest_mgr.create(
        archive_dir=archive_dir,
        source_stage=stage,
        region=region,
        account_id=ACCOUNT_ID,
        dynamodb_results=dynamo_results,
        s3_result=s3_result,
    )
    manifest_mgr.write(archive_dir, manifest)

    # Phase 4: Write errors.json if any errors occurred
    if all_errors:
        errors_payload = {"schema_version": "1.0", "errors": all_errors}
        errors_path = archive_dir / "errors.json"
        errors_path.write_text(json.dumps(errors_payload, indent=2), encoding="utf-8")

    # Print summary
    elapsed = time.time() - start_time
    progress.summary(
        elapsed=elapsed,
        items=total_items,
        objects=s3_result.object_count,
        total_bytes=s3_result.total_bytes,
        errors=len(all_errors),
    )

    print(f"\nArchive written to: {archive_dir}", file=sys.stderr)

    # Exit code
    if all_errors:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
