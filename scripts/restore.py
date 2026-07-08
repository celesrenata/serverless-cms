#!/usr/bin/env python3
"""Restore script for the Serverless CMS project.

Imports DynamoDB tables and S3 media from a local archive to a target stage.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import ClientError

from backup_utils import CheckpointManager, ManifestManager, ProgressReporter, URLRewriter

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
class ImportResult:
    """Result metadata for a DynamoDB table import."""

    table_name: str
    item_count: int
    rewritten_urls: int


class DynamoDBImporter:
    """Import DynamoDB tables from NDJSON backup files using BatchWriteItem."""

    def __init__(
        self,
        session: boto3.Session,
        region: str,
        max_retries: int = 5,
        base_delay: float = 0.25,
        max_delay: float = 8.0,
    ):
        self.session = session
        self.region = region
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.client = session.client("dynamodb", region_name=region)

    def _batch_write_with_retry(self, table_name: str, items: list[dict]) -> None:
        """Write a batch of items with exponential backoff on failure."""
        if not items:
            return

        request_items = {
            table_name: [{"PutRequest": {"Item": item}} for item in items]
        }

        for attempt in range(1, self.max_retries + 1):
            try:
                response = self.client.batch_write_item(RequestItems=request_items)
                unprocessed = response.get("UnprocessedItems", {}).get(table_name, [])

                if not unprocessed:
                    return

                # Some items were not processed — retry them
                request_items = {table_name: unprocessed}

                if attempt >= self.max_retries:
                    raise RuntimeError(
                        f"Failed to write all items to {table_name}: "
                        f"{len(unprocessed)} item(s) remained unprocessed after "
                        f"{self.max_retries} attempts."
                    )

                delay = min(2**attempt * self.base_delay, self.max_delay)
                time.sleep(delay)

            except ClientError as e:
                error_code = e.response["Error"]["Code"]
                if error_code not in RETRYABLE_ERROR_CODES:
                    raise

                if attempt >= self.max_retries:
                    raise RuntimeError(
                        f"Retryable DynamoDB error persisted while writing to "
                        f"{table_name} after {self.max_retries} attempts: "
                        f"{error_code}"
                    ) from e

                delay = min(2**attempt * self.base_delay, self.max_delay)
                time.sleep(delay)

    def import_table(
        self,
        ndjson_path: Path,
        target_table: str,
        url_rewriter: URLRewriter,
        checkpoint: CheckpointManager,
        progress: ProgressReporter,
    ) -> ImportResult:
        """Read NDJSON → URL rewrite → BatchWriteItem with retry."""
        if checkpoint.is_table_complete("restore", target_table):
            return ImportResult(
                table_name=target_table,
                item_count=0,
                rewritten_urls=0,
            )

        item_count = 0
        rewritten_urls = 0
        batch: list[dict] = []

        with ndjson_path.open("r", encoding="utf-8") as fh:
            for line in fh:
                stripped = line.strip()
                if not stripped:
                    continue

                item = json.loads(stripped)

                if url_rewriter.source_stage != url_rewriter.target_stage:
                    item, rewrite_count = url_rewriter.rewrite_item(item)
                    rewritten_urls += rewrite_count

                batch.append(item)
                item_count += 1

                if len(batch) == 25:
                    self._batch_write_with_retry(target_table, batch)
                    batch.clear()
                    progress.table_progress(target_table, item_count)

        # Flush remaining items
        if batch:
            self._batch_write_with_retry(target_table, batch)
            batch.clear()

        checkpoint.mark_table_complete(
            "restore",
            target_table,
            {"item_count": item_count, "rewritten_urls": rewritten_urls},
        )

        progress.table_progress(target_table, item_count)

        return ImportResult(
            table_name=target_table,
            item_count=item_count,
            rewritten_urls=rewritten_urls,
        )

    def import_all(
        self,
        archive_dir: Path,
        source_stage: str,
        target_stage: str,
        url_rewriter: URLRewriter,
        checkpoint: CheckpointManager,
        progress: ProgressReporter,
    ) -> list[ImportResult]:
        """Import all tables from the archive directory."""
        results: list[ImportResult] = []

        for template in TABLE_TEMPLATES:
            source_table = template.format(env=source_stage)
            target_table = template.format(env=target_stage)
            ndjson_path = archive_dir / f"{source_table}.ndjson"

            if ndjson_path.exists():
                result = self.import_table(
                    ndjson_path=ndjson_path,
                    target_table=target_table,
                    url_rewriter=url_rewriter,
                    checkpoint=checkpoint,
                    progress=progress,
                )
                results.append(result)

        return results


# ---------------------------------------------------------------------------
# Safety checks and clean mode
# ---------------------------------------------------------------------------


def check_production_confirmation(
    target_stage: str,
    force: bool,
    clean: bool,
) -> tuple[bool, str]:
    """Check safety confirmations for production restores.

    Returns (True, "") on success or (False, reason) on failure.
    """
    if target_stage != "prod":
        return True, ""

    if clean and not force:
        return False, "Production clean restore requires --force flag"

    confirmation = input(
        "You are about to restore to PRODUCTION. "
        "Type 'yes-restore-prod' to confirm: "
    )
    if confirmation != "yes-restore-prod":
        return False, "Production confirmation failed"

    return True, ""


def check_cross_account(manifest: dict, session: boto3.Session, force: bool) -> tuple[bool, str]:
    """Check if restoring across AWS accounts and require --force if so.

    Returns (True, "") on success or (False, reason) on failure.
    """
    source_account = manifest.get("source", {}).get("account_id")
    if not source_account:
        return True, ""  # No account info in manifest, skip check

    try:
        current_account = session.client("sts").get_caller_identity()["Account"]
    except ClientError:
        if not force:
            return False, "Cannot verify AWS account. Use --force to proceed."
        return True, ""

    if str(current_account) == str(source_account):
        return True, ""

    if not force:
        return False, (
            f"Cross-account restore detected (backup: {source_account}, "
            f"current: {current_account}). Use --force to proceed."
        )

    print(
        f"WARNING: Cross-account restore detected (backup: {source_account}, "
        f"current: {current_account}). Proceeding because --force was specified.",
        file=sys.stderr,
    )
    return True, ""


def perform_clean(
    session: boto3.Session,
    region: str,
    target_stage: str,
    progress: ProgressReporter,
) -> None:
    """Delete all items from target DynamoDB tables and empty the target S3 bucket."""
    dynamodb = session.client("dynamodb", region_name=region)

    def flush_batch(table_name: str, requests: list[dict[str, Any]]) -> None:
        """Write a batch of delete requests, retrying unprocessed items."""
        pending = requests
        while pending:
            response = dynamodb.batch_write_item(
                RequestItems={table_name: pending},
            )
            pending = response.get("UnprocessedItems", {}).get(table_name, [])
            if pending:
                time.sleep(1)

    for table_template in TABLE_TEMPLATES:
        table_name = table_template.format(env=target_stage)
        table_desc = dynamodb.describe_table(TableName=table_name)["Table"]
        key_attributes = [
            ks["AttributeName"] for ks in table_desc["KeySchema"]
        ]
        total_items = int(table_desc.get("ItemCount", 0))
        deleted_count = 0
        batch: list[dict[str, Any]] = []

        progress.start_phase(f"Cleaning DynamoDB table {table_name}")

        # Use expression attribute names to avoid reserved-word conflicts
        expression_attribute_names = {
            f"#k{i}": attr for i, attr in enumerate(key_attributes)
        }

        paginator = dynamodb.get_paginator("scan")
        pages = paginator.paginate(
            TableName=table_name,
            ProjectionExpression=", ".join(expression_attribute_names),
            ExpressionAttributeNames=expression_attribute_names,
        )

        for page in pages:
            for item in page.get("Items", []):
                key = {attr: item[attr] for attr in key_attributes}
                batch.append({"DeleteRequest": {"Key": key}})

                if len(batch) == 25:
                    flush_batch(table_name, batch)
                    deleted_count += len(batch)
                    progress.table_progress(
                        table_name,
                        deleted_count,
                        max(total_items, deleted_count),
                    )
                    batch = []

        if batch:
            flush_batch(table_name, batch)
            deleted_count += len(batch)

        progress.table_progress(
            table_name,
            deleted_count,
            max(total_items, deleted_count),
        )

    # Empty the target S3 bucket
    from backup import S3TransferManager as _S3TransferManager

    bucket_name = f"serverless-cms-media-{target_stage}-{ACCOUNT_ID}"
    progress.start_phase(f"Cleaning S3 bucket {bucket_name}")
    s3_manager = _S3TransferManager(session, region)
    s3_manager.empty_bucket(bucket_name)


# ---------------------------------------------------------------------------
# CLI and main orchestration
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse restore CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Restore Serverless CMS from backup archive"
    )
    parser.add_argument(
        "--archive",
        required=True,
        help="Path to backup archive directory",
    )
    parser.add_argument(
        "--target-stage",
        required=True,
        choices=["dev", "staging", "prod"],
        help="Target stage to restore into",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete target data before restoring",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force restore (skip safety checks)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report without transferring",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume previous restore",
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


def dry_run_report(archive_path: Path, manifest: dict, target_stage: str) -> int:
    """Print what would be restored without performing any writes."""
    print("=== Dry Run Restore Report ===", file=sys.stderr)
    print(f"Archive: {archive_path}", file=sys.stderr)
    print(f"Target stage: {target_stage}", file=sys.stderr)
    print("", file=sys.stderr)

    print("Target DynamoDB Tables:", file=sys.stderr)
    dynamodb_info = manifest.get("dynamodb", {})
    tables = dynamodb_info.get("tables", [])
    for table_entry in tables:
        source_table = table_entry.get("table_name", "")
        item_count = table_entry.get("item_count", 0)
        # Determine target table name by replacing source stage with target
        source_stage = manifest.get("source", {}).get("stage", "")
        target_table = source_table.replace(source_stage, target_stage)
        print(f"  {target_table}: {item_count} items", file=sys.stderr)

    total_items = dynamodb_info.get("total_items", 0)
    print(f"  Total items: {total_items}", file=sys.stderr)
    print("", file=sys.stderr)

    target_bucket = f"serverless-cms-media-{target_stage}-{ACCOUNT_ID}"
    s3_info = manifest.get("s3", {})
    object_count = s3_info.get("object_count", 0)
    print(f"Target S3 Bucket: {target_bucket}", file=sys.stderr)
    print(f"  Objects: {object_count}", file=sys.stderr)
    print("", file=sys.stderr)
    print("No data was transferred (dry run).", file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    """Run the restore orchestration and return an exit code."""
    from backup import S3TransferManager, TransferResult

    args = parse_args(argv)

    archive_path = Path(args.archive)
    if not archive_path.exists():
        print(f"Error: Archive path does not exist: {archive_path}", file=sys.stderr)
        return 2

    # Load and validate manifest
    manifest_mgr = ManifestManager()
    try:
        manifest = manifest_mgr.load(archive_path)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error: Failed to load manifest: {e}", file=sys.stderr)
        return 2

    validation_errors = manifest_mgr.validate(archive_path, manifest)
    if validation_errors:
        print("Manifest validation errors:", file=sys.stderr)
        for err in validation_errors:
            print(f"  - {err}", file=sys.stderr)
        return 2

    source_stage = manifest["source"]["stage"]
    target_stage = args.target_stage
    region = args.region

    # Create session
    session = boto3.Session(region_name=region)

    # Safety checks
    if target_stage == "prod":
        ok, reason = check_production_confirmation(target_stage, args.force, args.clean)
        if not ok:
            print(f"Safety check failed: {reason}", file=sys.stderr)
            return 3

    if not args.force:
        ok, reason = check_cross_account(manifest, session, args.force)
        if not ok:
            print(f"Safety check failed: {reason}", file=sys.stderr)
            return 3

    # Dry run
    if args.dry_run:
        return dry_run_report(archive_path, manifest, target_stage)

    # Initialize utilities
    checkpoint = CheckpointManager(archive_path)
    progress = ProgressReporter()
    url_rewriter = URLRewriter(source_stage, target_stage)

    if args.resume:
        checkpoint.load()

    start_time = time.time()
    all_errors: list[dict[str, Any]] = []

    # Clean target if requested
    if args.clean:
        perform_clean(session, region, target_stage, progress)

    # Phase 1: Import DynamoDB tables
    progress.start_phase("DynamoDB Import")
    importer = DynamoDBImporter(session, region)
    import_results = importer.import_all(
        archive_dir=archive_path,
        source_stage=source_stage,
        target_stage=target_stage,
        url_rewriter=url_rewriter,
        checkpoint=checkpoint,
        progress=progress,
    )
    total_items = sum(r.item_count for r in import_results)

    # Phase 2: Upload S3 media
    target_bucket = f"serverless-cms-media-{target_stage}-{ACCOUNT_ID}"
    media_dir = archive_path / "media"

    progress.start_phase("S3 Upload")
    transfer_mgr = S3TransferManager(session, region, concurrency=args.concurrency)

    if media_dir.exists():
        s3_result = transfer_mgr.upload_directory(
            media_dir, target_bucket, checkpoint, progress
        )
        if s3_result.errors:
            all_errors.extend(s3_result.errors)
        s3_objects = s3_result.object_count
        s3_bytes = s3_result.total_bytes
    else:
        s3_objects = 0
        s3_bytes = 0

    # Write errors.json if any errors occurred
    if all_errors:
        errors_payload = {"schema_version": "1.0", "errors": all_errors}
        errors_path = archive_path / "errors.json"
        errors_path.write_text(
            json.dumps(errors_payload, indent=2), encoding="utf-8"
        )

    # Print summary
    elapsed = time.time() - start_time
    progress.summary(
        elapsed=elapsed,
        items=total_items,
        objects=s3_objects,
        total_bytes=s3_bytes,
        errors=len(all_errors),
    )

    print(f"\nRestore to stage '{target_stage}' complete.", file=sys.stderr)

    # Exit code
    if all_errors:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
