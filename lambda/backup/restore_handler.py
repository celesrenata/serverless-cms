"""
Restore executor Lambda.
Invoked asynchronously to perform a restore operation from a backup archive.

Event format:
{
    "job_id": "uuid",
    "source_archive_id": "uuid",
    "components": ["content", "media_metadata", "users", ...]
}
"""
import json
import gzip
import io
import time
import traceback

from utils import (
    update_job_status,
    is_job_cancelled,
    COMPONENT_TABLE_MAP,
    BACKUP_BUCKET,
    MEDIA_BUCKET,
    dynamodb,
    s3_client,
)


def handler(event, context):
    """Execute a restore operation."""
    job_id = event.get('job_id')
    source_archive_id = event.get('source_archive_id')
    components = event.get('components', [])

    if not job_id or not source_archive_id:
        print("ERROR: Missing job_id or source_archive_id in event")
        return

    # Set status to running
    update_job_status(
        job_id,
        'running',
        started_at=int(time.time()),
        phase='Starting restore...',
        progress=0,
    )

    try:
        # Read manifest from source archive
        manifest_resp = s3_client.get_object(
            Bucket=BACKUP_BUCKET,
            Key=f'backups/{source_archive_id}/manifest.json',
        )
        manifest = json.loads(manifest_resp['Body'].read().decode('utf-8'))
        print(f"Restoring from archive {source_archive_id}, manifest: {json.dumps(manifest, default=str)}")

        total_components = len(components)
        done = 0
        result = {
            'tables_restored': {},
            's3_objects_restored': 0,
            'total_duration_ms': 0,
        }
        start_time = time.time()

        for component in components:
            # Check for cancellation before each phase
            if is_job_cancelled(job_id):
                update_job_status(job_id, 'cancelled', phase='Cancelled by user')
                return

            if component == 's3_media':
                # Restore S3 media
                phase_text = 'Restoring media files...'
                update_job_status(
                    job_id, 'running',
                    phase=phase_text,
                    progress=int((done / total_components) * 100),
                )
                objects_restored = _restore_s3_media(source_archive_id)
                result['s3_objects_restored'] = objects_restored
            else:
                # Restore DynamoDB table
                table_name = COMPONENT_TABLE_MAP.get(component)
                if not table_name:
                    print(f"WARNING: Unknown component {component}, skipping")
                    done += 1
                    continue

                phase_text = f'Restoring {table_name}...'
                update_job_status(
                    job_id, 'running',
                    phase=phase_text,
                    progress=int((done / total_components) * 100),
                )

                items_restored = _restore_table(source_archive_id, table_name)
                result['tables_restored'][table_name] = {'items': items_restored}

            done += 1

        # Mark completed
        result['total_duration_ms'] = int((time.time() - start_time) * 1000)

        update_job_status(
            job_id,
            'completed',
            completed_at=int(time.time()),
            progress=100,
            phase='Restore complete',
            result=result,
        )

        print(f"Restore {job_id} completed successfully in {result['total_duration_ms']}ms")

    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"RESTORE ERROR for job {job_id}: {error_detail}")
        update_job_status(
            job_id,
            'failed',
            error=str(e),
            phase='Failed',
            completed_at=int(time.time()),
        )


def _restore_table(source_archive_id: str, table_name: str) -> int:
    """
    Restore a DynamoDB table from a gzipped NDJSON backup in S3.

    Returns:
        Number of items restored.
    """
    s3_key = f'backups/{source_archive_id}/{table_name}.ndjson.gz'

    # Download compressed NDJSON from S3
    try:
        resp = s3_client.get_object(Bucket=BACKUP_BUCKET, Key=s3_key)
    except s3_client.exceptions.NoSuchKey:
        print(f"WARNING: Backup file {s3_key} not found, skipping table {table_name}")
        return 0

    compressed_data = resp['Body'].read()

    # Decompress and parse NDJSON
    with gzip.GzipFile(fileobj=io.BytesIO(compressed_data), mode='rb') as gz:
        ndjson_content = gz.read().decode('utf-8')

    lines = [line for line in ndjson_content.strip().split('\n') if line.strip()]
    items = [json.loads(line) for line in lines]

    if not items:
        print(f"No items to restore for {table_name}")
        return 0

    # Write items using batch_writer (handles batches of 25 automatically)
    table = dynamodb.Table(table_name)
    items_restored = 0

    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
            items_restored += 1

    print(f"Restored {items_restored} items to {table_name}")
    return items_restored


def _restore_s3_media(source_archive_id: str) -> int:
    """
    Restore media objects from backup bucket back to the CMS media bucket.

    Returns:
        Number of objects restored.
    """
    if not MEDIA_BUCKET:
        print("WARNING: MEDIA_BUCKET not configured, skipping S3 media restore")
        return 0

    prefix = f'backups/{source_archive_id}/media/'
    paginator = s3_client.get_paginator('list_objects_v2')
    objects_restored = 0

    for page in paginator.paginate(Bucket=BACKUP_BUCKET, Prefix=prefix):
        for obj in page.get('Contents', []):
            backup_key = obj['Key']
            # Strip the backup prefix to get the original media key
            original_key = backup_key[len(prefix):]

            if not original_key:
                continue

            s3_client.copy_object(
                CopySource={'Bucket': BACKUP_BUCKET, 'Key': backup_key},
                Bucket=MEDIA_BUCKET,
                Key=original_key,
            )
            objects_restored += 1

    print(f"Restored {objects_restored} media objects to {MEDIA_BUCKET}")
    return objects_restored
