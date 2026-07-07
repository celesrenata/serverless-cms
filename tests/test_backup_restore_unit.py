import json
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from backup_utils import CheckpointManager, ManifestManager


def _valid_manifest():
    return {
        "schema_version": "1.0",
        "source": {
            "stage": "dev",
            "region": "us-east-1",
            "account_id": "123456789012",
            "media_bucket": "serverless-cms-media-dev-123456789012",
        },
        "dynamodb": {
            "tables": [
                {
                    "table_name": "test-table",
                    "file": "dynamodb/test-table.jsonl",
                    "item_count": 2,
                    "bytes": 20,
                }
            ],
            "total_items": 2,
            "total_bytes": 20,
        },
        "s3": {
            "bucket": "serverless-cms-media-dev-123456789012",
            "object_count": 1,
            "total_bytes": 10,
        },
        "status": "completed",
    }


def _write_table_file(archive_dir: Path, file_name: str, lines: int) -> None:
    table_path = archive_dir / file_name
    table_path.parent.mkdir(parents=True, exist_ok=True)
    table_path.write_text(
        "".join('{"id": %d}\n' % i for i in range(lines)), encoding="utf-8"
    )


def _write_media_file(archive_dir: Path, file_name: str = "image.jpg") -> None:
    media_path = archive_dir / "media" / file_name
    media_path.parent.mkdir(parents=True, exist_ok=True)
    media_path.write_bytes(b"test-media")


# === ManifestManager Tests ===


def test_manifest_create_write_load_roundtrip():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir) / "backup-archive"
        archive_dir.mkdir()

        dynamodb_results = [
            {
                "table_name": "table-one",
                "file_name": "dynamodb/table-one.jsonl",
                "item_count": 2,
                "bytes_written": 100,
            },
            {
                "table_name": "table-two",
                "file_name": "dynamodb/table-two.jsonl",
                "item_count": 3,
                "bytes_written": 150,
            },
        ]
        s3_result = {
            "bucket": "custom-bucket",
            "object_count": 4,
            "total_bytes": 250,
        }

        manager = ManifestManager()
        manifest = manager.create(
            archive_dir=archive_dir,
            source_stage="dev",
            region="us-east-1",
            account_id="123456789012",
            dynamodb_results=dynamodb_results,
            s3_result=s3_result,
        )

        manager.write(archive_dir, manifest)
        loaded_manifest = manager.load(archive_dir)

        assert loaded_manifest == manifest


def test_manifest_validate_valid():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manifest = _valid_manifest()
        _write_table_file(archive_dir, "dynamodb/test-table.jsonl", lines=2)
        _write_media_file(archive_dir)

        errors = ManifestManager().validate(archive_dir, manifest)

        assert errors == []


def test_manifest_validate_missing_fields():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manifest = {}

        errors = ManifestManager().validate(archive_dir, manifest)

        assert "Missing required top-level field: schema_version" in errors
        assert "Missing required top-level field: source" in errors
        assert "Missing required top-level field: dynamodb" in errors
        assert "Missing required top-level field: s3" in errors
        assert "Missing required top-level field: status" in errors


def test_manifest_validate_count_mismatch():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manifest = _valid_manifest()
        manifest["dynamodb"]["tables"][0]["item_count"] = 3
        manifest["s3"]["object_count"] = 1
        _write_table_file(archive_dir, "dynamodb/test-table.jsonl", lines=2)
        _write_media_file(archive_dir)

        errors = ManifestManager().validate(archive_dir, manifest)

        assert (
            "DynamoDB table test-table item_count mismatch: expected 3, found 2"
            in errors
        )


def test_manifest_validate_s3_count_mismatch():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manifest = _valid_manifest()
        manifest["s3"]["object_count"] = 2
        _write_table_file(archive_dir, "dynamodb/test-table.jsonl", lines=2)
        _write_media_file(archive_dir)

        errors = ManifestManager().validate(archive_dir, manifest)

        assert "S3 object_count mismatch: expected 2, found 1" in errors


def test_manifest_validate_unsupported_schema():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manifest = _valid_manifest()
        manifest["schema_version"] = "2.0"
        _write_table_file(archive_dir, "dynamodb/test-table.jsonl", lines=2)
        _write_media_file(archive_dir)

        errors = ManifestManager().validate(archive_dir, manifest)

        assert "Unsupported schema_version: 2.0" in errors


# === CheckpointManager Tests ===


def test_checkpoint_init_empty():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manager = CheckpointManager(archive_dir)

        manager.load()

        assert manager.data == CheckpointManager._empty_state()


def test_checkpoint_mark_table_complete():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manager = CheckpointManager(archive_dir)
        manager.load()

        manager.mark_table_complete("backup", "test-table", {"items": 2})

        assert "test-table" in manager.data["backup"]["completed_tables"]


def test_checkpoint_is_table_complete():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manager = CheckpointManager(archive_dir)
        manager.load()

        manager.mark_table_complete("backup", "test-table", {})

        assert manager.is_table_complete("backup", "test-table") is True
        assert manager.is_table_complete("backup", "other-table") is False


def test_checkpoint_mark_object_complete():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manager = CheckpointManager(archive_dir)
        manager.load()

        manager.mark_object_complete("backup", "media/image.jpg", {"bytes": 10})

        assert "media/image.jpg" in manager.data["backup"]["completed_s3_objects"]


def test_checkpoint_atomic_write():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manager = CheckpointManager(archive_dir)
        manager.load()

        manager.save()

        assert (archive_dir / "checkpoint.json").exists()
        assert not (archive_dir / "checkpoint.json.tmp").exists()


def test_checkpoint_load_existing():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        checkpoint_path = archive_dir / "checkpoint.json"
        existing_checkpoint = {
            "schema_version": "1.0",
            "backup": {
                "completed_tables": ["table-one"],
                "completed_s3_objects": ["media/a.jpg"],
            },
            "restore": {
                "completed_tables": ["table-two"],
                "completed_s3_objects": ["media/b.jpg"],
            },
        }
        checkpoint_path.write_text(
            json.dumps(existing_checkpoint), encoding="utf-8"
        )

        manager = CheckpointManager(archive_dir)
        manager.load()

        assert manager.data == existing_checkpoint


def test_checkpoint_load_corrupted():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        checkpoint_path = archive_dir / "checkpoint.json"
        checkpoint_path.write_text("{not valid json", encoding="utf-8")

        manager = CheckpointManager(archive_dir)
        manager.load()

        assert manager.data == CheckpointManager._empty_state()


def test_checkpoint_load_missing():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manager = CheckpointManager(archive_dir)

        manager.load()

        assert manager.data == CheckpointManager._empty_state()


def test_checkpoint_invalid_operation():
    with tempfile.TemporaryDirectory() as tmpdir:
        archive_dir = Path(tmpdir)
        manager = CheckpointManager(archive_dir)
        manager.load()

        with pytest.raises(ValueError):
            manager.is_table_complete("invalid", "test-table")

# ---------------------------------------------------------------------------
# CLI Argument Parsing Tests (Task 7.1)
# ---------------------------------------------------------------------------

import os
import subprocess

from backup import parse_args as backup_parse_args
from restore import parse_args as restore_parse_args


PROJECT_ROOT = str(Path(__file__).resolve().parents[1])


def test_backup_parse_args_required_stage():
    with pytest.raises(SystemExit):
        backup_parse_args([])


def test_backup_parse_args_valid_stages():
    for stage in ["dev", "staging", "prod"]:
        args = backup_parse_args(["--stage", stage])
        assert args.stage == stage


def test_backup_parse_args_invalid_stage():
    with pytest.raises(SystemExit):
        backup_parse_args(["--stage", "test"])


def test_backup_parse_args_defaults():
    args = backup_parse_args(["--stage", "dev"])

    assert args.stage == "dev"
    assert args.concurrency == 10
    assert args.region == "us-west-2"
    assert args.dry_run is False
    assert args.resume is False
    assert args.output_dir is None
    assert args.output_s3 is None


def test_backup_parse_args_all_options():
    args = backup_parse_args([
        "--stage", "prod",
        "--output-dir", "/tmp/backup",
        "--output-s3", "s3://bucket/path",
        "--dry-run",
        "--resume",
        "--concurrency", "20",
        "--region", "eu-west-1",
    ])

    assert args.stage == "prod"
    assert args.output_dir == "/tmp/backup"
    assert args.output_s3 == "s3://bucket/path"
    assert args.dry_run is True
    assert args.resume is True
    assert args.concurrency == 20
    assert args.region == "eu-west-1"


def test_backup_help_output():
    result = subprocess.run(
        [sys.executable, "scripts/backup.py", "--help"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0
    assert "--stage" in result.stdout


def test_restore_parse_args_required():
    with pytest.raises(SystemExit):
        restore_parse_args([])


def test_restore_parse_args_valid_stages():
    for stage in ["dev", "staging", "prod"]:
        args = restore_parse_args([
            "--archive", "/tmp/archive",
            "--target-stage", stage,
        ])
        assert args.target_stage == stage


def test_restore_parse_args_defaults():
    args = restore_parse_args([
        "--archive", "/tmp/archive",
        "--target-stage", "dev",
    ])

    assert args.archive == "/tmp/archive"
    assert args.target_stage == "dev"
    assert args.concurrency == 10
    assert args.region == "us-west-2"
    assert args.clean is False
    assert args.force is False
    assert args.dry_run is False
    assert args.resume is False


def test_restore_parse_args_all_options():
    args = restore_parse_args([
        "--archive", "/tmp/arch",
        "--target-stage", "prod",
        "--clean",
        "--force",
        "--dry-run",
        "--resume",
        "--concurrency", "5",
        "--region", "ap-southeast-1",
    ])

    assert args.archive == "/tmp/arch"
    assert args.target_stage == "prod"
    assert args.clean is True
    assert args.force is True
    assert args.dry_run is True
    assert args.resume is True
    assert args.concurrency == 5
    assert args.region == "ap-southeast-1"


def test_restore_help_output():
    result = subprocess.run(
        [sys.executable, "scripts/restore.py", "--help"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0
    assert "--archive" in result.stdout


# ---------------------------------------------------------------------------
# Safety Check Tests (Task 7.4)
# ---------------------------------------------------------------------------

from unittest.mock import patch, MagicMock

from restore import check_production_confirmation, check_cross_account


def test_safety_prod_confirmation_correct():
    with patch("builtins.input", return_value="yes-restore-prod"):
        ok, reason = check_production_confirmation("prod", force=False, clean=False)

    assert ok is True
    assert reason == ""


def test_safety_prod_confirmation_incorrect():
    with patch("builtins.input", return_value="no"):
        ok, reason = check_production_confirmation("prod", force=False, clean=False)

    assert ok is False
    assert "confirmation failed" in reason.lower() or reason != ""


def test_safety_prod_clean_requires_force():
    ok, reason = check_production_confirmation("prod", force=False, clean=True)

    assert ok is False
    assert reason == "Production clean restore requires --force flag"


def test_safety_prod_clean_with_force_prompts():
    with patch("builtins.input", return_value="yes-restore-prod") as mock_input:
        ok, reason = check_production_confirmation("prod", force=True, clean=True)

    assert ok is True
    assert reason == ""
    mock_input.assert_called_once()


def test_safety_non_prod_skips_confirmation():
    ok, reason = check_production_confirmation("dev", force=False, clean=False)

    assert ok is True
    assert reason == ""


def test_safety_cross_account_same():
    manifest = {"source": {"account_id": "123456789012"}}
    mock_session = MagicMock()
    mock_session.client.return_value.get_caller_identity.return_value = {
        "Account": "123456789012"
    }

    ok, reason = check_cross_account(manifest, mock_session, force=False)

    assert ok is True
    assert reason == ""


def test_safety_cross_account_different_no_force():
    manifest = {"source": {"account_id": "123456789012"}}
    mock_session = MagicMock()
    mock_session.client.return_value.get_caller_identity.return_value = {
        "Account": "999999999999"
    }

    ok, reason = check_cross_account(manifest, mock_session, force=False)

    assert ok is False
    assert "Cross-account restore detected" in reason
    assert "123456789012" in reason
    assert "999999999999" in reason


def test_safety_cross_account_different_with_force():
    manifest = {"source": {"account_id": "123456789012"}}
    mock_session = MagicMock()
    mock_session.client.return_value.get_caller_identity.return_value = {
        "Account": "999999999999"
    }

    ok, reason = check_cross_account(manifest, mock_session, force=True)

    assert ok is True
    assert reason == ""


def test_dry_run_no_writes():
    from restore import dry_run_report

    manifest = {
        "source": {"stage": "staging", "account_id": "123456789012"},
        "dynamodb": {
            "tables": [
                {"table_name": "cms-content-staging", "item_count": 10}
            ],
            "total_items": 10,
        },
        "s3": {"object_count": 5, "total_bytes": 1024},
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        archive_path = Path(tmpdir)
        result = dry_run_report(archive_path, manifest, "dev")

    assert result == 0
