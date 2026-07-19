"""
Backup executor Lambda.
Invoked asynchronously to perform the actual backup operation.

Event format:
{
    "job_id": "uuid",
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
    ENVIRONMENT,
    dynamodb,
    s3_client,
)


def handler(event, context):
    """Execute a backup operation."""
    job_id = event.get('job_id')
    components = event.get('components', [])

    if not job_id:
        print("ERROR: No job_id in event")
        return

    start_time = time.time()

    # Set status to running
    update_job_status(
        job_id,
        'running',
        started_at=int(time.time()),
        phase='Starting backup...',
        progress=0,
    )

    try:
        total_components = len(components)
        done = 0
        result = {
            'tables': {},
            's3_objects': 0,
            's3_bytes': 0,
            'total_duration_ms': 0,
            'archive_size_bytes': 0,
        }
        total_archive_bytes = 0

        for component in components:
            # Check for cancellation before each phase
            if is_job_cancelled(job_id):
                update_job_status(job_id, 'cancelled', phase='Cancelled by user')
                return

            if component == 's3_media':
                # Handle S3 media copy
                phase_text = 'Copying media files...'
                update_job_status(
                    job_id, 'running',
                    phase=phase_text,
                    progress=int((done / total_components) * 100),
                )
                objects_copied, bytes_copied = _backup_s3_media(job_id)
                result['s3_objects'] = objects_copied
                result['s3_bytes'] = bytes_copied
                total_archive_bytes += bytes_copied
            else:
                # Handle DynamoDB table backup
                table_name = COMPONENT_TABLE_MAP.get(component)
                if not table_name:
                    print(f"WARNING: Unknown component {component}, skipping")
                    done += 1
                    continue

                phase_text = f'Exporting {table_name}...'
                update_job_status(
                    job_id, 'running',
                    phase=phase_text,
                    progress=int((done / total_components) * 100),
                )

                items_count, compressed_size = _backup_table(job_id, table_name)
                result['tables'][table_name] = {
                    'items': items_count,
                    'bytes': compressed_size,
                }
                total_archive_bytes += compressed_size

            done += 1

        # Write manifest
        result['total_duration_ms'] = int((time.time() - start_time) * 1000)
        result['archive_size_bytes'] = total_archive_bytes

        manifest = {
            'job_id': job_id,
            'type': 'backup',
            'components': components,
            'environment': ENVIRONMENT,
            'created_at': int(time.time()),
            'result': result,
        }

        s3_client.put_object(
            Bucket=BACKUP_BUCKET,
            Key=f'backups/{job_id}/manifest.json',
            Body=json.dumps(manifest, default=str),
            ContentType='application/json',
        )

        # Mark completed
        update_job_status(
            job_id,
            'completed',
            completed_at=int(time.time()),
            progress=100,
            phase='Backup complete',
            result=result,
        )

        print(f"Backup {job_id} completed successfully in {result['total_duration_ms']}ms")

    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"BACKUP ERROR for job {job_id}: {error_detail}")
        update_job_status(
            job_id,
            'failed',
            error=str(e),
            phase='Failed',
            completed_at=int(time.time()),
        )


def _backup_table(job_id: str, table_name: str) -> tuple:
    """
    Backup a DynamoDB table to S3 as gzipped NDJSON.

    Returns:
        Tuple of (item_count, compressed_size_bytes)
    """
    table = dynamodb.Table(table_name)
    buffer = io.BytesIO()
    items_count = 0

    # Paginated scan of the entire table
    with gzip.GzipFile(fileobj=buffer, mode='wb') as gz:
        scan_kwargs = {}
        while True:
            response = table.scan(**scan_kwargs)
            items = response.get('Items', [])

            for item in items:
                line = json.dumps(item, default=str) + '\n'
                gz.write(line.encode('utf-8'))
                items_count += 1

            # Check for pagination
            last_key = response.get('LastEvaluatedKey')
            if not last_key:
                break
            scan_kwargs['ExclusiveStartKey'] = last_key

    # Upload compressed file to S3
    compressed_data = buffer.getvalue()
    compressed_size = len(compressed_data)

    s3_key = f'backups/{job_id}/{table_name}.ndjson.gz'
    s3_client.put_object(
        Bucket=BACKUP_BUCKET,
        Key=s3_key,
        Body=compressed_data,
        ContentType='application/gzip',
    )

    print(f"Backed up {table_name}: {items_count} items, {compressed_size} bytes compressed")
    return items_count, compressed_size


def _backup_s3_media(job_id: str) -> tuple:
    """
    Copy all media objects from the media bucket to the backup bucket.

    Returns:
        Tuple of (objects_copied, total_bytes)
    """
    if not MEDIA_BUCKET:
        print("WARNING: MEDIA_BUCKET not configured, skipping S3 media backup")
        return 0, 0

    paginator = s3_client.get_paginator('list_objects_v2')
    objects_copied = 0
    total_bytes = 0

    for page in paginator.paginate(Bucket=MEDIA_BUCKET):
        for obj in page.get('Contents', []):
            source_key = obj['Key']
            dest_key = f'backups/{job_id}/media/{source_key}'

            s3_client.copy_object(
                CopySource={'Bucket': MEDIA_BUCKET, 'Key': source_key},
                Bucket=BACKUP_BUCKET,
                Key=dest_key,
            )

            objects_copied += 1
            total_bytes += obj.get('Size', 0)

    print(f"Copied {objects_copied} media objects ({total_bytes} bytes)")
    return objects_copied, total_bytes
