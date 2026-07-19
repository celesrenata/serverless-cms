"""
Backup API handler Lambda.
Routes all backup/restore API requests based on HTTP method and path.

Routes:
  POST   /backup                    -> create backup job
  POST   /backup/{id}/restore       -> restore from archive
  GET    /backup/jobs               -> list all jobs
  GET    /backup/jobs/{id}          -> get job details
  DELETE /backup/{id}               -> delete archive
  GET    /backup/{id}/download/{file} -> get download URL
  PUT    /backup/schedule           -> update schedule config
  GET    /backup/schedule           -> get schedule config
"""
import json
import os
import sys
import re
import traceback
import time

# Add parent directory to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import boto3
from shared.auth import require_auth

from utils import (
    create_job,
    get_job,
    update_job_status,
    check_concurrent_jobs,
    COMPONENT_TABLE_MAP,
    ALL_COMPONENTS,
    BACKUP_BUCKET,
    BACKUP_JOBS_TABLE,
    jobs_table,
    s3_client,
    dynamodb,
    ENVIRONMENT,
)

HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

SETTINGS_TABLE = os.environ.get('SETTINGS_TABLE', 'cms-settings-dev')
BACKUP_LAMBDA_NAME = os.environ.get('BACKUP_LAMBDA_NAME', '')
RESTORE_LAMBDA_NAME = os.environ.get('RESTORE_LAMBDA_NAME', '')

lambda_client = boto3.client('lambda')
settings_table = dynamodb.Table(SETTINGS_TABLE)


def handler(event, context):
    """Main entry point - route to appropriate handler based on path/method."""
    try:
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '') or event.get('rawPath', '')

        # Route: GET /backup/schedule
        if http_method == 'GET' and path.endswith('/backup/schedule'):
            return _get_schedule(event, context)

        # Route: PUT /backup/schedule
        if http_method == 'PUT' and path.endswith('/backup/schedule'):
            return _put_schedule(event, context)

        # Route: GET /backup/jobs
        if http_method == 'GET' and path.endswith('/backup/jobs'):
            return _list_jobs(event, context)

        # Route: GET /backup/jobs/{id}
        jobs_match = re.search(r'/backup/jobs/([^/]+)$', path)
        if http_method == 'GET' and jobs_match:
            event['_job_id'] = jobs_match.group(1)
            return _get_job(event, context)

        # Route: GET /backup/{id}/download/{file}
        download_match = re.search(r'/backup/([^/]+)/download/(.+)$', path)
        if http_method == 'GET' and download_match:
            event['_archive_id'] = download_match.group(1)
            event['_file_name'] = download_match.group(2)
            return _download_file(event, context)

        # Route: POST /backup/{id}/restore
        restore_match = re.search(r'/backup/([^/]+)/restore$', path)
        if http_method == 'POST' and restore_match:
            event['_archive_id'] = restore_match.group(1)
            return _restore_backup(event, context)

        # Route: DELETE /backup/{id}
        delete_match = re.search(r'/backup/([^/]+)$', path)
        if http_method == 'DELETE' and delete_match:
            event['_archive_id'] = delete_match.group(1)
            return _delete_backup(event, context)

        # Route: POST /backup
        if http_method == 'POST' and (path.endswith('/backup') or path.endswith('/backup/')):
            return _create_backup(event, context)

        return {
            'statusCode': 404,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Not found', 'message': f'No route for {http_method} {path}'}),
        }

    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"BACKUP API HANDLER ERROR: {error_detail}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }


@require_auth(roles=['admin'])
def _create_backup(event, context, user_id, role):
    """POST /backup - Create a new backup job."""
    try:
        body = json.loads(event.get('body', '{}') or '{}')
        components = body.get('components', ALL_COMPONENTS)

        # Validate components
        invalid = [c for c in components if c not in ALL_COMPONENTS]
        if invalid:
            return {
                'statusCode': 400,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Invalid components',
                    'message': f'Unknown components: {invalid}. Valid: {ALL_COMPONENTS}',
                }),
            }

        # Check for concurrent jobs
        running_id = check_concurrent_jobs()
        if running_id:
            return {
                'statusCode': 409,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Conflict',
                    'message': f'A backup/restore job is already running: {running_id}',
                }),
            }

        # Create job record
        job = create_job('backup', components, user_id)

        # Invoke backup Lambda asynchronously
        lambda_client.invoke(
            FunctionName=BACKUP_LAMBDA_NAME,
            InvocationType='Event',
            Payload=json.dumps({
                'job_id': job['id'],
                'components': components,
            }),
        )

        return {
            'statusCode': 201,
            'headers': HEADERS,
            'body': json.dumps(job, default=str),
        }

    except Exception as e:
        print(f"Error creating backup: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }


@require_auth(roles=['admin'])
def _restore_backup(event, context, user_id, role):
    """POST /backup/{id}/restore - Restore from an archive."""
    try:
        archive_id = event.get('_archive_id')
        body = json.loads(event.get('body', '{}') or '{}')
        components = body.get('components', ALL_COMPONENTS)

        # Validate components
        invalid = [c for c in components if c not in ALL_COMPONENTS]
        if invalid:
            return {
                'statusCode': 400,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Invalid components',
                    'message': f'Unknown components: {invalid}',
                }),
            }

        # Verify archive exists by checking manifest
        try:
            s3_client.head_object(
                Bucket=BACKUP_BUCKET,
                Key=f'backups/{archive_id}/manifest.json',
            )
        except s3_client.exceptions.ClientError:
            return {
                'statusCode': 404,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Not found',
                    'message': f'Archive {archive_id} not found or has no manifest',
                }),
            }

        # Check for concurrent jobs
        running_id = check_concurrent_jobs()
        if running_id:
            return {
                'statusCode': 409,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Conflict',
                    'message': f'A backup/restore job is already running: {running_id}',
                }),
            }

        # Create restore job record
        job = create_job('restore', components, user_id)

        # Update job with source archive reference
        jobs_table.update_item(
            Key={'id': job['id']},
            UpdateExpression='SET source_archive_id = :src',
            ExpressionAttributeValues={':src': archive_id},
        )
        job['source_archive_id'] = archive_id

        # Invoke restore Lambda asynchronously
        lambda_client.invoke(
            FunctionName=RESTORE_LAMBDA_NAME,
            InvocationType='Event',
            Payload=json.dumps({
                'job_id': job['id'],
                'source_archive_id': archive_id,
                'components': components,
            }),
        )

        return {
            'statusCode': 201,
            'headers': HEADERS,
            'body': json.dumps(job, default=str),
        }

    except Exception as e:
        print(f"Error restoring backup: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }


@require_auth(roles=['admin'])
def _list_jobs(event, context, user_id, role):
    """GET /backup/jobs - List all backup/restore jobs."""
    try:
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', '50'))
        next_token = query_params.get('nextToken')
        job_type = query_params.get('type')  # Optional filter: 'backup' or 'restore'

        scan_kwargs = {
            'Limit': limit,
        }

        if job_type:
            from boto3.dynamodb.conditions import Attr
            scan_kwargs['FilterExpression'] = Attr('type').eq(job_type)

        if next_token:
            scan_kwargs['ExclusiveStartKey'] = json.loads(next_token)

        resp = jobs_table.scan(**scan_kwargs)
        items = resp.get('Items', [])

        # Sort by created_at descending
        items.sort(key=lambda x: x.get('created_at', 0), reverse=True)

        result = {'jobs': items}
        if 'LastEvaluatedKey' in resp:
            result['nextToken'] = json.dumps(resp['LastEvaluatedKey'], default=str)

        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps(result, default=str),
        }

    except Exception as e:
        print(f"Error listing jobs: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }


@require_auth(roles=['admin'])
def _get_job(event, context, user_id, role):
    """GET /backup/jobs/{id} - Get job details."""
    try:
        job_id = event.get('_job_id')
        job = get_job(job_id)

        if not job:
            return {
                'statusCode': 404,
                'headers': HEADERS,
                'body': json.dumps({'error': 'Not found', 'message': f'Job {job_id} not found'}),
            }

        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps(job, default=str),
        }

    except Exception as e:
        print(f"Error getting job: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }


@require_auth(roles=['admin'])
def _delete_backup(event, context, user_id, role):
    """DELETE /backup/{id} - Delete a backup archive and its job record."""
    try:
        archive_id = event.get('_archive_id')

        # Delete all S3 objects under the archive prefix
        prefix = f'backups/{archive_id}/'
        paginator = s3_client.get_paginator('list_objects_v2')

        objects_to_delete = []
        for page in paginator.paginate(Bucket=BACKUP_BUCKET, Prefix=prefix):
            for obj in page.get('Contents', []):
                objects_to_delete.append({'Key': obj['Key']})

        # Delete in batches of 1000 (S3 limit)
        for i in range(0, len(objects_to_delete), 1000):
            batch = objects_to_delete[i:i + 1000]
            s3_client.delete_objects(
                Bucket=BACKUP_BUCKET,
                Delete={'Objects': batch},
            )

        # Delete job record from DynamoDB
        jobs_table.delete_item(Key={'id': archive_id})

        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'message': f'Archive {archive_id} deleted', 'objects_deleted': len(objects_to_delete)}),
        }

    except Exception as e:
        print(f"Error deleting backup: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }


@require_auth(roles=['admin'])
def _download_file(event, context, user_id, role):
    """GET /backup/{id}/download/{file} - Generate presigned download URL."""
    try:
        archive_id = event.get('_archive_id')
        file_name = event.get('_file_name')

        s3_key = f'backups/{archive_id}/{file_name}'

        # Verify file exists
        try:
            s3_client.head_object(Bucket=BACKUP_BUCKET, Key=s3_key)
        except s3_client.exceptions.ClientError:
            return {
                'statusCode': 404,
                'headers': HEADERS,
                'body': json.dumps({'error': 'Not found', 'message': f'File {file_name} not found in archive {archive_id}'}),
            }

        # Generate presigned URL (5 minute expiry)
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BACKUP_BUCKET, 'Key': s3_key},
            ExpiresIn=300,
        )

        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'url': url, 'expires_in': 300}),
        }

    except Exception as e:
        print(f"Error generating download URL: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }


@require_auth(roles=['admin'])
def _put_schedule(event, context, user_id, role):
    """PUT /backup/schedule - Update backup schedule configuration."""
    try:
        body = json.loads(event.get('body', '{}') or '{}')

        # Validate schedule config
        enabled = body.get('enabled', False)
        frequency = body.get('frequency', 'daily')
        components = body.get('components', ALL_COMPONENTS)
        retention = body.get('retention', 7)

        if frequency not in ('daily', 'weekly', 'monthly'):
            return {
                'statusCode': 400,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Invalid frequency',
                    'message': 'Frequency must be daily, weekly, or monthly',
                }),
            }

        if not isinstance(retention, int) or retention < 1 or retention > 365:
            return {
                'statusCode': 400,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Invalid retention',
                    'message': 'Retention must be an integer between 1 and 365',
                }),
            }

        invalid = [c for c in components if c not in ALL_COMPONENTS]
        if invalid:
            return {
                'statusCode': 400,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Invalid components',
                    'message': f'Unknown components: {invalid}',
                }),
            }

        schedule_config = {
            'enabled': enabled,
            'frequency': frequency,
            'components': components,
            'retention': retention,
            'last_run': body.get('last_run', 0),
        }

        # Save to settings table
        settings_table.put_item(Item={
            'key': 'backup_schedule',
            'value': schedule_config,
            'updated_by': user_id,
            'updated_at': int(time.time()),
        })

        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'schedule': schedule_config}, default=str),
        }

    except Exception as e:
        print(f"Error updating schedule: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }


@require_auth(roles=['admin'])
def _get_schedule(event, context, user_id, role):
    """GET /backup/schedule - Get backup schedule configuration."""
    try:
        resp = settings_table.get_item(Key={'key': 'backup_schedule'})
        item = resp.get('Item')

        if not item:
            # Return default schedule
            default_schedule = {
                'enabled': False,
                'frequency': 'daily',
                'components': ALL_COMPONENTS,
                'retention': 7,
                'last_run': 0,
            }
            return {
                'statusCode': 200,
                'headers': HEADERS,
                'body': json.dumps({'schedule': default_schedule}),
            }

        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'schedule': item.get('value', {})}, default=str),
        }

    except Exception as e:
        print(f"Error getting schedule: {e}")
        return {
            'statusCode': 500,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }
