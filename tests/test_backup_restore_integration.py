"""Integration tests for backup/restore end-to-end workflows using moto."""

import json
import os
import sys
import tempfile
from pathlib import Path

import boto3
from moto import mock_aws

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from backup import main as backup_main
from backup_utils import CheckpointManager, ManifestManager
from restore import main as restore_main

REGION = "us-west-2"
ACCOUNT_ID = "776053071238"
TABLE_TEMPLATES = [
    "cms-content-{env}",
    "cms-media-{env}",
    "cms-users-{env}",
    "cms-settings-{env}",
    "cms-comments-{env}",
    "cms-plugins-{env}",
]


def bucket_name(stage):
    return f"serverless-cms-media-{stage}-{ACCOUNT_ID}"


def create_tables(dynamodb_client, stage):
    """Create all CMS DynamoDB tables for a stage."""
    table_definitions = {
        f"cms-content-{stage}": {
            "AttributeDefinitions": [
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "type#timestamp", "AttributeType": "S"},
            ],
            "KeySchema": [
                {"AttributeName": "id", "KeyType": "HASH"},
                {"AttributeName": "type#timestamp", "KeyType": "RANGE"},
            ],
        },
        f"cms-media-{stage}": {
            "AttributeDefinitions": [
                {"AttributeName": "id", "AttributeType": "S"},
            ],
            "KeySchema": [
                {"AttributeName": "id", "KeyType": "HASH"},
            ],
        },
        f"cms-users-{stage}": {
            "AttributeDefinitions": [
                {"AttributeName": "id", "AttributeType": "S"},
            ],
            "KeySchema": [
                {"AttributeName": "id", "KeyType": "HASH"},
            ],
        },
        f"cms-settings-{stage}": {
            "AttributeDefinitions": [
                {"AttributeName": "key", "AttributeType": "S"},
            ],
            "KeySchema": [
                {"AttributeName": "key", "KeyType": "HASH"},
            ],
        },
        f"cms-comments-{stage}": {
            "AttributeDefinitions": [
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "N"},
            ],
            "KeySchema": [
                {"AttributeName": "id", "KeyType": "HASH"},
                {"AttributeName": "created_at", "KeyType": "RANGE"},
            ],
        },
        f"cms-plugins-{stage}": {
            "AttributeDefinitions": [
                {"AttributeName": "id", "AttributeType": "S"},
            ],
            "KeySchema": [
                {"AttributeName": "id", "KeyType": "HASH"},
            ],
        },
    }

    for table_name, definition in table_definitions.items():
        dynamodb_client.create_table(
            TableName=table_name,
            AttributeDefinitions=definition["AttributeDefinitions"],
            KeySchema=definition["KeySchema"],
            BillingMode="PAY_PER_REQUEST",
        )


def populate_tables(dynamodb_client, stage, items_per_table):
    """Populate each CMS table with test DynamoDB items."""
    for i in range(items_per_table):
        dynamodb_client.put_item(
            TableName=f"cms-content-{stage}",
            Item={
                "id": {"S": f"content-{i}"},
                "type#timestamp": {"S": f"post#{1700000000 + i}"},
                "title": {"S": f"Content item {i}"},
            },
        )

        dynamodb_client.put_item(
            TableName=f"cms-media-{stage}",
            Item={
                "id": {"S": f"media-{i}"},
                "filename": {"S": f"image-{i}.jpg"},
            },
        )

        dynamodb_client.put_item(
            TableName=f"cms-users-{stage}",
            Item={
                "id": {"S": f"user-{i}"},
                "email": {"S": f"user{i}@example.com"},
            },
        )

        dynamodb_client.put_item(
            TableName=f"cms-settings-{stage}",
            Item={
                "key": {"S": f"setting-{i}"},
                "value": {"S": f"value-{i}"},
            },
        )

        dynamodb_client.put_item(
            TableName=f"cms-comments-{stage}",
            Item={
                "id": {"S": f"comment-{i}"},
                "created_at": {"N": str(1700000000 + i)},
                "body": {"S": f"Comment {i}"},
            },
        )

        dynamodb_client.put_item(
            TableName=f"cms-plugins-{stage}",
            Item={
                "id": {"S": f"plugin-{i}"},
                "name": {"S": f"plugin-{i}"},
            },
        )


def create_bucket_with_objects(s3_client, stage, num_objects):
    """Create the CMS media bucket for a stage and add test objects."""
    name = bucket_name(stage)
    s3_client.create_bucket(
        Bucket=name,
        CreateBucketConfiguration={"LocationConstraint": REGION},
    )
    for i in range(num_objects):
        s3_client.put_object(
            Bucket=name,
            Key=f"uploads/object-{i}.txt",
            Body=f"test object content {i}".encode("utf-8"),
            ContentType="text/plain",
        )
    return name


def test_end_to_end_backup():
    """Integration test: full backup creates valid archive."""
    session = boto3.Session(region_name=REGION)
    dynamodb_client = session.client("dynamodb", region_name=REGION)
    s3_client = session.client("s3", region_name=REGION)

    items_per_table = 3
    num_media = 3
    stage = "dev"

    create_tables(dynamodb_client, stage)
    populate_tables(dynamodb_client, stage, items_per_table)
    create_bucket_with_objects(s3_client, stage, num_media)

    with tempfile.TemporaryDirectory() as tmpdir:
        exit_code = backup_main([
            "--stage", stage,
            "--output-dir", tmpdir,
            "--region", REGION,
        ])

        assert exit_code == 0

        # Find the archive directory
        archives = [d for d in Path(tmpdir).iterdir() if d.is_dir()]
        assert len(archives) == 1
        archive_dir = archives[0]
        assert archive_dir.name.startswith(f"backup-{stage}-")

        # Verify NDJSON files exist and have correct line counts
        for template in TABLE_TEMPLATES:
            table_name = template.format(env=stage)
            ndjson_file = archive_dir / f"{table_name}.ndjson"
            assert ndjson_file.exists(), f"Missing {ndjson_file.name}"
            lines = ndjson_file.read_text().strip().split("\n")
            assert len(lines) == items_per_table

        # Verify media files downloaded
        media_dir = archive_dir / "media"
        assert media_dir.exists()
        media_files = list(media_dir.rglob("*"))
        media_files = [f for f in media_files if f.is_file()]
        assert len(media_files) == num_media

        # Verify manifest
        manifest_mgr = ManifestManager()
        manifest = manifest_mgr.load(archive_dir)
        assert manifest["source"]["stage"] == stage
        assert manifest["status"] == "completed"
        assert manifest["dynamodb"]["total_items"] == items_per_table * 6
        assert manifest["s3"]["object_count"] == num_media

        # Validate manifest (should have no errors)
        errors = manifest_mgr.validate(archive_dir, manifest)
        assert errors == [], f"Manifest validation errors: {errors}"


@mock_aws
def test_end_to_end_restore():
    """Integration test: restore from archive populates target tables and bucket."""
    session = boto3.Session(region_name=REGION)
    dynamodb_client = session.client("dynamodb", region_name=REGION)
    s3_client = session.client("s3", region_name=REGION)

    # Set up source stage (staging)
    create_tables(dynamodb_client, "staging")
    populate_tables(dynamodb_client, "staging", items_per_table=3)
    create_bucket_with_objects(s3_client, "staging", num_objects=2)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a backup from staging
        exit_code = backup_main(
            ["--stage", "staging", "--output-dir", tmpdir, "--region", REGION]
        )
        assert exit_code == 0, "Backup should succeed"

        # Find the created archive directory
        archive_dirs = [p for p in Path(tmpdir).iterdir() if p.is_dir()]
        assert len(archive_dirs) == 1, "Backup should create exactly one archive directory"
        archive_dir = archive_dirs[0]

        # Set up target stage (dev) - empty tables and bucket
        create_tables(dynamodb_client, "dev")
        target_bucket = bucket_name("dev")
        s3_client.create_bucket(
            Bucket=target_bucket,
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )

        # Restore to dev (--force to skip cross-account check with moto's mock account)
        exit_code = restore_main(
            ["--archive", str(archive_dir), "--target-stage", "dev", "--region", REGION, "--force"]
        )
        assert exit_code == 0, "Restore should succeed"

        # Verify target tables have the expected items
        for template in TABLE_TEMPLATES:
            target_table = template.format(env="dev")
            response = dynamodb_client.scan(TableName=target_table, Select="COUNT")
            assert response["Count"] == 3, (
                f"Table {target_table} should have 3 items, got {response['Count']}"
            )

        # Verify target bucket has the expected objects
        response = s3_client.list_objects_v2(Bucket=target_bucket)
        assert response.get("KeyCount", 0) == 2, (
            f"Target bucket should have 2 objects, got {response.get('KeyCount', 0)}"
        )


@mock_aws
def test_cross_stage_restore_url_rewriting():
    """Integration test: cross-stage restore rewrites S3 URLs in DynamoDB items."""
    session = boto3.Session(region_name=REGION)
    dynamodb = session.client("dynamodb", region_name=REGION)
    s3 = session.client("s3", region_name=REGION)

    # Create staging tables
    create_tables(dynamodb, "staging")

    # Put items with S3 URLs pointing to staging bucket
    staging_bucket = f"serverless-cms-media-staging-{ACCOUNT_ID}"
    content_table = "cms-content-staging"
    dynamodb.put_item(
        TableName=content_table,
        Item={
            "id": {"S": "post-1"},
            "type#timestamp": {"S": "post#1000"},
            "title": {"S": "Test Post"},
            "s3_url": {"S": f"https://{staging_bucket}.s3.{REGION}.amazonaws.com/uploads/hero.jpg"},
            "featured_image": {"S": f"s3://{staging_bucket}/uploads/featured.jpg"},
        },
    )

    # Create staging S3 bucket with media
    s3.create_bucket(
        Bucket=staging_bucket,
        CreateBucketConfiguration={"LocationConstraint": REGION},
    )
    s3.put_object(Bucket=staging_bucket, Key="uploads/hero.jpg", Body=b"image-data")
    s3.put_object(Bucket=staging_bucket, Key="uploads/featured.jpg", Body=b"featured-data")

    with tempfile.TemporaryDirectory() as tmpdir:
        # Backup staging
        exit_code = backup_main(["--stage", "staging", "--output-dir", tmpdir, "--region", REGION])
        assert exit_code == 0

        archives = [d for d in Path(tmpdir).iterdir() if d.is_dir()]
        assert len(archives) == 1
        archive_dir = archives[0]

        # Create target dev tables and bucket
        create_tables(dynamodb, "dev")
        dev_bucket = f"serverless-cms-media-dev-{ACCOUNT_ID}"
        s3.create_bucket(
            Bucket=dev_bucket,
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )

        # Restore to dev (--force needed because moto STS returns a different account ID)
        exit_code = restore_main(["--archive", str(archive_dir), "--target-stage", "dev", "--region", REGION, "--force"])
        assert exit_code == 0

        # Verify URLs rewritten in dev content table
        response = dynamodb.scan(TableName="cms-content-dev")
        items = response["Items"]
        assert len(items) == 1

        item = items[0]
        assert dev_bucket in item["s3_url"]["S"]
        assert staging_bucket not in item["s3_url"]["S"]
        assert dev_bucket in item["featured_image"]["S"]
        assert staging_bucket not in item["featured_image"]["S"]

        # Verify S3 media was uploaded to dev bucket
        dev_objects = s3.list_objects_v2(Bucket=dev_bucket)
        assert dev_objects.get("KeyCount", 0) == 2


@mock_aws
def test_clean_restore():
    """Integration test: --clean removes existing data before restoring."""
    session = boto3.Session(region_name=REGION)
    dynamodb = session.client("dynamodb", region_name=REGION)
    s3 = session.client("s3", region_name=REGION)

    # Create staging tables and backup
    create_tables(dynamodb, "staging")
    populate_tables(dynamodb, "staging", items_per_table=2)

    staging_bucket = f"serverless-cms-media-staging-{ACCOUNT_ID}"
    s3.create_bucket(
        Bucket=staging_bucket,
        CreateBucketConfiguration={"LocationConstraint": REGION},
    )
    s3.put_object(Bucket=staging_bucket, Key="uploads/new.jpg", Body=b"new-data")

    with tempfile.TemporaryDirectory() as tmpdir:
        exit_code = backup_main(["--stage", "staging", "--output-dir", tmpdir, "--region", REGION])
        assert exit_code == 0

        archives = [d for d in Path(tmpdir).iterdir() if d.is_dir()]
        assert len(archives) == 1
        archive_dir = archives[0]

        # Create target dev tables pre-populated with OLD data
        create_tables(dynamodb, "dev")
        for template in TABLE_TEMPLATES:
            table_name = template.format(env="dev")
            if template == "cms-content-{env}":
                dynamodb.put_item(
                    TableName=table_name,
                    Item={"id": {"S": "old-item"}, "type#timestamp": {"S": "post#999"}, "data": {"S": "old"}},
                )
            elif template == "cms-comments-{env}":
                dynamodb.put_item(
                    TableName=table_name,
                    Item={"id": {"S": "old-item"}, "created_at": {"N": "999"}, "data": {"S": "old"}},
                )
            elif template == "cms-settings-{env}":
                dynamodb.put_item(
                    TableName=table_name,
                    Item={"key": {"S": "old-item"}, "data": {"S": "old"}},
                )
            else:
                dynamodb.put_item(
                    TableName=table_name,
                    Item={"id": {"S": "old-item"}, "data": {"S": "old"}},
                )

        dev_bucket = f"serverless-cms-media-dev-{ACCOUNT_ID}"
        s3.create_bucket(
            Bucket=dev_bucket,
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )
        s3.put_object(Bucket=dev_bucket, Key="old-file.jpg", Body=b"old-data")

        # Restore with --clean (--force needed because moto STS returns different account)
        exit_code = restore_main([
            "--archive", str(archive_dir),
            "--target-stage", "dev",
            "--clean",
            "--force",
            "--region", REGION,
        ])
        assert exit_code == 0

        # Verify old data is gone from all tables
        for template in TABLE_TEMPLATES:
            table_name = template.format(env="dev")
            response = dynamodb.scan(TableName=table_name)
            ids = [item.get("id", item.get("key", {})).get("S", "") for item in response["Items"]]
            assert "old-item" not in ids, f"Old item still in {table_name}"
            # Verify restored data is there (2 items per table from staging backup)
            assert response["Count"] == 2, (
                f"Expected 2 items in {table_name}, got {response['Count']}"
            )

        # Verify old S3 object is gone, new one is there
        response = s3.list_objects_v2(Bucket=dev_bucket)
        keys = [obj["Key"] for obj in response.get("Contents", [])]
        assert "old-file.jpg" not in keys
        assert "uploads/new.jpg" in keys


@mock_aws
def test_resume_backup():
    """Integration test: --resume skips already-exported tables and produces no duplicates."""
    session = boto3.Session(region_name=REGION)
    dynamodb = session.client("dynamodb", region_name=REGION)
    s3 = session.client("s3", region_name=REGION)

    stage = "dev"
    create_tables(dynamodb, stage)
    populate_tables(dynamodb, stage, items_per_table=3)
    create_bucket_with_objects(s3, stage, num_objects=3)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Run a full backup
        exit_code = backup_main(["--stage", stage, "--output-dir", tmpdir, "--region", REGION])
        assert exit_code == 0, "Initial backup should succeed"

        # Find archive directory
        archives = [d for d in Path(tmpdir).iterdir() if d.is_dir()]
        assert len(archives) == 1
        archive_dir = archives[0]

        # Verify checkpoint was written and all tables marked complete
        checkpoint = CheckpointManager(archive_dir)
        checkpoint.load()

        table_names = [template.format(env=stage) for template in TABLE_TEMPLATES]
        for table_name in table_names:
            assert checkpoint.is_table_complete("backup", table_name), (
                f"Checkpoint should mark {table_name} as complete after full backup"
            )

        # Verify no duplicates in any NDJSON file
        for template in TABLE_TEMPLATES:
            table_name = template.format(env=stage)
            ndjson_file = archive_dir / f"{table_name}.ndjson"
            assert ndjson_file.exists(), f"Missing NDJSON file for {table_name}"

            lines = [ln for ln in ndjson_file.read_text().strip().split("\n") if ln.strip()]
            assert len(lines) == 3, (
                f"Expected 3 items in {table_name}.ndjson, got {len(lines)}"
            )

            # Check uniqueness by serialized content
            items_serialized = [json.dumps(json.loads(ln), sort_keys=True) for ln in lines]
            assert len(items_serialized) == len(set(items_serialized)), (
                f"Duplicate items found in {table_name}.ndjson"
            )

        # Now simulate a partial backup scenario:
        # Remove one table from checkpoint's completed list and delete its NDJSON file.
        # Then create a NEW backup with --resume pointing at same output dir.
        # Since backup always creates a new archive dir, we instead test
        # that the checkpoint mechanism correctly prevents re-export by directly
        # invoking the exporter with a pre-populated checkpoint.
        from backup import DynamoDBExporter

        # Create a second archive dir to simulate a resumed backup
        resume_archive = Path(tmpdir) / "resume-test-archive"
        resume_archive.mkdir()

        # Pre-populate checkpoint marking some tables as complete
        resume_checkpoint = CheckpointManager(resume_archive)
        resume_checkpoint.load()

        # Mark first 3 tables as already exported
        completed_tables = table_names[:3]
        for tbl in completed_tables:
            resume_checkpoint.mark_table_complete("backup", tbl, {"item_count": 3})
            # Write a fake NDJSON file for these (simulating prior partial backup)
            ndjson_path = resume_archive / f"{tbl}.ndjson"
            ndjson_path.write_text("", encoding="utf-8")  # empty - already done

        # Now export remaining tables using the exporter with resume checkpoint
        from backup_utils import ProgressReporter

        exporter = DynamoDBExporter(session, REGION)
        progress = ProgressReporter()
        results = exporter.export_all(stage, resume_archive, resume_checkpoint, progress)

        # Tables that were marked complete should have 0 items exported
        for result in results:
            if result.table_name in completed_tables:
                assert result.item_count == 0, (
                    f"Table {result.table_name} was already complete, "
                    f"should not have exported items but got {result.item_count}"
                )
            else:
                assert result.item_count == 3, (
                    f"Table {result.table_name} should have exported 3 items, "
                    f"got {result.item_count}"
                )

        # Verify remaining tables have no duplicates
        remaining_tables = table_names[3:]
        for tbl in remaining_tables:
            ndjson_file = resume_archive / f"{tbl}.ndjson"
            assert ndjson_file.exists()
            lines = [ln for ln in ndjson_file.read_text().strip().split("\n") if ln.strip()]
            assert len(lines) == 3, f"Expected 3 items in {tbl}, got {len(lines)}"
            items_serialized = [json.dumps(json.loads(ln), sort_keys=True) for ln in lines]
            assert len(items_serialized) == len(set(items_serialized)), (
                f"Duplicate items found in resumed {tbl}.ndjson"
            )


@mock_aws
def test_resume_restore():
    """Integration test: --resume skips already-restored tables, no duplicates."""
    session = boto3.Session(region_name=REGION)
    dynamodb = session.client("dynamodb", region_name=REGION)
    s3 = session.client("s3", region_name=REGION)

    # Create source stage (staging) and backup
    create_tables(dynamodb, "staging")
    populate_tables(dynamodb, "staging", items_per_table=2)
    staging_bucket = f"serverless-cms-media-staging-{ACCOUNT_ID}"
    s3.create_bucket(
        Bucket=staging_bucket,
        CreateBucketConfiguration={"LocationConstraint": REGION},
    )
    s3.put_object(Bucket=staging_bucket, Key="uploads/file.jpg", Body=b"data")

    with tempfile.TemporaryDirectory() as tmpdir:
        exit_code = backup_main(["--stage", "staging", "--output-dir", tmpdir, "--region", REGION])
        assert exit_code == 0

        archives = [d for d in Path(tmpdir).iterdir() if d.is_dir()]
        assert len(archives) == 1
        archive_dir = archives[0]

        # Create target dev tables and bucket
        create_tables(dynamodb, "dev")
        dev_bucket = f"serverless-cms-media-dev-{ACCOUNT_ID}"
        s3.create_bucket(
            Bucket=dev_bucket,
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )

        # First restore (no --resume)
        exit_code = restore_main([
            "--archive", str(archive_dir),
            "--target-stage", "dev",
            "--region", REGION,
            "--force",
        ])
        assert exit_code == 0

        # Verify items in dev tables
        for template in TABLE_TEMPLATES:
            table_name = template.format(env="dev")
            response = dynamodb.scan(TableName=table_name, Select="COUNT")
            assert response["Count"] == 2, (
                f"Expected 2 items in {table_name} after first restore, "
                f"got {response['Count']}"
            )

        # Verify checkpoint marks all restore tables complete
        checkpoint = CheckpointManager(archive_dir)
        checkpoint.load()
        for template in TABLE_TEMPLATES:
            target_table = template.format(env="dev")
            assert checkpoint.is_table_complete("restore", target_table), (
                f"Checkpoint should mark {target_table} as complete after restore"
            )

        # Run restore again with --resume (should skip everything)
        exit_code = restore_main([
            "--archive", str(archive_dir),
            "--target-stage", "dev",
            "--resume",
            "--region", REGION,
            "--force",
        ])
        assert exit_code == 0

        # Verify no duplicates (still 2 items per table, not 4)
        for template in TABLE_TEMPLATES:
            table_name = template.format(env="dev")
            response = dynamodb.scan(TableName=table_name, Select="COUNT")
            assert response["Count"] == 2, (
                f"Expected 2 items in {table_name} after resume restore, "
                f"got {response['Count']} (duplicates detected!)"
            )
