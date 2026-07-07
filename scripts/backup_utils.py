#!/usr/bin/env python3
"""Shared utilities for backup/restore scripts in the serverless CMS project."""

from __future__ import annotations

import copy
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def _format_bytes(num_bytes: int) -> str:
    """Convert bytes to a human-readable string using B, KB, MB, or GB."""
    sign = "-" if num_bytes < 0 else ""
    value = abs(float(num_bytes))

    if value < 1024:
        return f"{sign}{int(value)} B"

    for unit in ("KB", "MB"):
        value /= 1024
        if value < 1024:
            return f"{sign}{value:.1f} {unit}"

    value /= 1024
    return f"{sign}{value:.1f} GB"


class ProgressReporter:
    """Human-readable progress reporting to stderr."""

    def start_phase(self, phase: str) -> None:
        """Announce the start of a new operation phase."""
        print(f"\n=== {phase} ===", file=sys.stderr)

    def table_progress(
        self,
        table_name: str,
        items_done: int,
        total: int | None = None,
    ) -> None:
        """Show DynamoDB table export/import progress."""
        if total is None:
            print(f"[TABLE] {table_name}: {items_done} items", file=sys.stderr)
            return

        percentage = (items_done / total * 100) if total > 0 else 100.0
        print(
            f"[TABLE] {table_name}: {items_done}/{total} items ({percentage:.1f}%)",
            file=sys.stderr,
        )

    def s3_progress(
        self,
        objects_done: int,
        total: int,
        bytes_done: int,
        total_bytes: int,
    ) -> None:
        """Show S3 transfer progress with object count and bytes transferred."""
        object_percentage = (objects_done / total * 100) if total > 0 else 100.0
        byte_percentage = (bytes_done / total_bytes * 100) if total_bytes > 0 else 100.0

        print(
            f"[S3] {objects_done}/{total} objects ({object_percentage:.1f}%), "
            f"{_format_bytes(bytes_done)}/{_format_bytes(total_bytes)} "
            f"({byte_percentage:.1f}%)",
            file=sys.stderr,
        )

    def warning(self, msg: str) -> None:
        """Print a warning message."""
        print(f"[WARN] {msg}", file=sys.stderr)

    def error(self, msg: str) -> None:
        """Print an error message."""
        print(f"[ERROR] {msg}", file=sys.stderr)

    def summary(
        self,
        elapsed: float,
        items: int,
        objects: int,
        total_bytes: int,
        errors: int,
    ) -> None:
        """Print final summary."""
        if elapsed >= 60:
            minutes = int(elapsed // 60)
            seconds = elapsed % 60
            elapsed_text = f"{minutes}m {seconds:.1f}s"
        else:
            elapsed_text = f"{elapsed:.1f}s"

        print("\n=== Summary ===", file=sys.stderr)
        print(f"Elapsed time: {elapsed_text}", file=sys.stderr)
        print(f"Items processed: {items}", file=sys.stderr)
        print(f"Objects transferred: {objects}", file=sys.stderr)
        print(f"Total bytes: {_format_bytes(total_bytes)}", file=sys.stderr)
        print(f"Errors: {errors}", file=sys.stderr)


class URLRewriter:
    """Regex-based S3 URL rewriting for cross-stage backup/restore."""

    ACCOUNT_ID = "776053071238"
    BUCKET_PATTERN = re.compile(
        r"serverless-cms-media-(dev|staging|prod)-776053071238"
    )

    # Fields in DynamoDB JSON items that may contain S3 URLs
    _URL_FIELDS = ("s3_url", "featured_image")

    def __init__(self, source_stage: str, target_stage: str):
        self.source_stage = source_stage
        self.target_stage = target_stage
        self.source_bucket = f"serverless-cms-media-{source_stage}-{self.ACCOUNT_ID}"
        self.target_bucket = f"serverless-cms-media-{target_stage}-{self.ACCOUNT_ID}"

    def rewrite_url(self, url: str) -> str:
        """Replace source bucket name with target bucket name in URL string."""
        if self.source_stage == self.target_stage:
            return url
        return url.replace(self.source_bucket, self.target_bucket)

    def rewrite_item(self, item: dict) -> tuple[dict, int]:
        """Rewrite s3_url and featured_image fields in a DynamoDB JSON item.

        Returns (rewritten_item, count_of_rewritten_fields).
        """
        rewritten = copy.deepcopy(item)
        count = 0

        # Rewrite top-level URL fields
        count += self._rewrite_fields(rewritten)

        # Rewrite URL fields inside metadata map if present
        if "metadata" in rewritten and "M" in rewritten["metadata"]:
            count += self._rewrite_fields(rewritten["metadata"]["M"])

        return rewritten, count

    def _rewrite_fields(self, obj: dict) -> int:
        """Rewrite known URL fields in a dict of DynamoDB-typed attributes."""
        count = 0
        for field in self._URL_FIELDS:
            if field in obj and "S" in obj[field]:
                original = obj[field]["S"]
                rewritten = self.rewrite_url(original)
                if rewritten != original:
                    obj[field]["S"] = rewritten
                    count += 1
        return count


class CheckpointManager:
    """Track completed tables/objects for resume support with atomic writes."""

    def __init__(self, archive_dir: Path) -> None:
        self.path = archive_dir / "checkpoint.json"
        self.data: dict = {}

    def load(self) -> None:
        """Load existing checkpoint or initialize empty state."""
        if not self.path.exists():
            self.data = self._empty_state()
            return

        try:
            with self.path.open("r", encoding="utf-8") as checkpoint_file:
                loaded_data = json.load(checkpoint_file)

            if not isinstance(loaded_data, dict):
                raise ValueError("checkpoint root is not a JSON object")

            self.data = loaded_data
            self._ensure_structure()
        except (json.JSONDecodeError, OSError, ValueError) as exc:
            print(
                f"[WARN] Failed to load checkpoint file {self.path}: {exc}. "
                "Starting with an empty checkpoint.",
                file=sys.stderr,
            )
            self.data = self._empty_state()

    def save(self) -> None:
        """Atomic write: checkpoint.json.tmp -> checkpoint.json."""
        self._ensure_structure()
        self.data["updated_at"] = datetime.now(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        tmp_path = self.path.with_name(f"{self.path.name}.tmp")
        self.path.parent.mkdir(parents=True, exist_ok=True)

        with tmp_path.open("w", encoding="utf-8") as checkpoint_file:
            json.dump(self.data, checkpoint_file, indent=2, sort_keys=True)
            checkpoint_file.write("\n")

        os.replace(tmp_path, self.path)

    def is_table_complete(self, operation: str, table_name: str) -> bool:
        """Check if table is in completed_tables for the given operation."""
        section = self._operation_section(operation)
        return table_name in section["completed_tables"]

    def mark_table_complete(
        self, operation: str, table_name: str, metadata: dict
    ) -> None:
        """Add table to completed_tables, then save checkpoint."""
        section = self._operation_section(operation)
        if table_name not in section["completed_tables"]:
            section["completed_tables"].append(table_name)
        self.save()

    def is_object_complete(self, operation: str, key: str) -> bool:
        """Check if S3 object key is in completed_s3_objects for the operation."""
        section = self._operation_section(operation)
        return key in section["completed_s3_objects"]

    def mark_object_complete(
        self, operation: str, key: str, metadata: dict
    ) -> None:
        """Add key to completed_s3_objects, then save checkpoint."""
        section = self._operation_section(operation)
        if key not in section["completed_s3_objects"]:
            section["completed_s3_objects"].append(key)
        self.save()

    @staticmethod
    def _empty_state() -> dict:
        """Return a fresh empty checkpoint structure."""
        return {
            "schema_version": "1.0",
            "backup": {
                "completed_tables": [],
                "completed_s3_objects": [],
            },
            "restore": {
                "completed_tables": [],
                "completed_s3_objects": [],
            },
        }

    def _ensure_structure(self) -> None:
        """Ensure data dict has all required keys with correct types."""
        if not isinstance(self.data, dict):
            self.data = self._empty_state()
            return

        self.data.setdefault("schema_version", "1.0")

        for operation in ("backup", "restore"):
            section = self.data.setdefault(operation, {})
            if not isinstance(section, dict):
                section = {}
                self.data[operation] = section

            completed_tables = section.setdefault("completed_tables", [])
            if not isinstance(completed_tables, list):
                section["completed_tables"] = []

            completed_s3_objects = section.setdefault("completed_s3_objects", [])
            if not isinstance(completed_s3_objects, list):
                section["completed_s3_objects"] = []

    def _operation_section(self, operation: str) -> dict:
        """Get the section dict for the given operation, validating the name."""
        if operation not in {"backup", "restore"}:
            raise ValueError(
                f"operation must be 'backup' or 'restore', got {operation!r}"
            )
        self._ensure_structure()
        return self.data[operation]


class ManifestManager:
    """Create, write, load, and validate backup manifest files."""

    @staticmethod
    def _get(obj, key):
        """Access a field from an object or dict."""
        if hasattr(obj, key):
            return getattr(obj, key)
        if isinstance(obj, dict):
            return obj.get(key)
        return None

    def create(
        self,
        archive_dir: Path,
        source_stage: str,
        region: str,
        account_id: str,
        dynamodb_results: list,
        s3_result,
    ) -> dict:
        """Build a manifest dict from export results."""
        media_bucket = f"serverless-cms-media-{source_stage}-{account_id}"

        tables = []
        total_items = 0
        total_bytes = 0

        for result in dynamodb_results:
            item_count = self._get(result, "item_count") or 0
            bytes_written = self._get(result, "bytes_written") or 0

            tables.append(
                {
                    "table_name": self._get(result, "table_name"),
                    "file": self._get(result, "file_name"),
                    "item_count": item_count,
                    "bytes": bytes_written,
                }
            )

            total_items += item_count
            total_bytes += bytes_written

        created_at = (
            datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z")
        )

        return {
            "schema_version": "1.0",
            "tool": {
                "name": "serverless-cms-backup",
                "version": "1.0.0",
            },
            "source": {
                "stage": source_stage,
                "region": region,
                "account_id": account_id,
                "media_bucket": media_bucket,
            },
            "created_at": created_at,
            "archive_name": archive_dir.name,
            "dynamodb": {
                "tables": tables,
                "total_items": total_items,
                "total_bytes": total_bytes,
            },
            "s3": {
                "bucket": self._get(s3_result, "bucket") or media_bucket,
                "object_count": self._get(s3_result, "object_count") or 0,
                "total_bytes": self._get(s3_result, "total_bytes") or 0,
            },
            "status": "completed",
        }

    def write(self, archive_dir: Path, manifest: dict) -> None:
        """Write manifest.json to the archive directory."""
        manifest_path = archive_dir / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    def load(self, archive_path: Path) -> dict:
        """Read and return manifest dict from archive_path/manifest.json."""
        manifest_path = archive_path / "manifest.json"
        return json.loads(manifest_path.read_text(encoding="utf-8"))

    def validate(self, archive_path: Path, manifest: dict) -> list[str]:
        """Validate manifest against actual archive contents.

        Returns a list of validation error strings. Empty list means valid.
        """
        errors: list[str] = []

        # Check required top-level fields
        required_fields = ["schema_version", "source", "dynamodb", "s3", "status"]
        for field in required_fields:
            if field not in manifest:
                errors.append(f"Missing required top-level field: {field}")

        # Check schema version is supported
        schema_version = manifest.get("schema_version")
        if schema_version is not None and schema_version != "1.0":
            errors.append(
                f"Unsupported schema_version: {schema_version}"
            )

        # Validate DynamoDB table item counts against actual NDJSON line counts
        dynamodb = manifest.get("dynamodb") or {}
        tables = dynamodb.get("tables") or []

        for table in tables:
            table_name = table.get("table_name")
            file_name = table.get("file")
            expected_count = table.get("item_count")

            if not file_name:
                errors.append(
                    f"DynamoDB table {table_name} is missing file path"
                )
                continue

            table_path = archive_path / file_name

            if not table_path.exists():
                errors.append(f"DynamoDB table file not found: {file_name}")
                continue

            actual_count = 0
            with table_path.open("r", encoding="utf-8") as f:
                for _ in f:
                    actual_count += 1

            if expected_count != actual_count:
                errors.append(
                    f"DynamoDB table {table_name} item_count mismatch: "
                    f"expected {expected_count}, found {actual_count}"
                )

        # Validate S3 object count against actual files in media/ directory
        s3 = manifest.get("s3") or {}
        expected_object_count = s3.get("object_count")
        media_dir = archive_path / "media"

        actual_object_count = 0
        if media_dir.exists():
            actual_object_count = sum(
                1 for path in media_dir.rglob("*") if path.is_file()
            )

        if expected_object_count != actual_object_count:
            errors.append(
                f"S3 object_count mismatch: "
                f"expected {expected_object_count}, found {actual_object_count}"
            )

        return errors
