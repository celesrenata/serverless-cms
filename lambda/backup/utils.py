"""Shared backup/restore utilities."""
import os
import time
import json
import uuid
import boto3
from typing import Optional

# Table name mappings
COMPONENT_TABLE_MAP = {
    'content': os.environ.get('CONTENT_TABLE', 'cms-content-dev'),
    'media_metadata': os.environ.get('MEDIA_TABLE', 'cms-media-dev'),
    'users': os.environ.get('USERS_TABLE', 'cms-users-dev'),
    'settings': os.environ.get('SETTINGS_TABLE', 'cms-settings-dev'),
    'comments': os.environ.get('COMMENTS_TABLE', 'cms-comments-dev'),
    'plugins': os.environ.get('PLUGINS_TABLE', 'cms-plugins-dev'),
    'sections': os.environ.get('SECTIONS_TABLE', 'cms-sections-dev'),
    'themes': os.environ.get('THEMES_TABLE', 'cms-themes-dev'),
}

MEDIA_BUCKET = os.environ.get('MEDIA_BUCKET', '')
BACKUP_BUCKET = os.environ.get('BACKUP_BUCKET', '')
BACKUP_JOBS_TABLE = os.environ.get('BACKUP_JOBS_TABLE', 'cms-backup-jobs-dev')
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')

ALL_COMPONENTS = list(COMPONENT_TABLE_MAP.keys()) + ['s3_media']

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
jobs_table = dynamodb.Table(BACKUP_JOBS_TABLE)


def create_job(job_type: str, components: list, created_by: str) -> dict:
    """Create a new backup/restore job record."""
    job_id = str(uuid.uuid4())
    now = int(time.time())

    item = {
        'id': job_id,
        'type': job_type,
        'status': 'queued',
        'components': components,
        'progress': 0,
        'phase': 'Queued',
        'created_at': now,
        'started_at': 0,
        'completed_at': 0,
        'error': None,
        'result': None,
        'created_by': created_by,
    }

    jobs_table.put_item(Item=item)
    return item


def update_job_status(job_id: str, status: str, **kwargs):
    """Update job status and optional fields."""
    update_expr = 'SET #s = :status'
    names = {'#s': 'status'}
    values = {':status': status}

    if 'progress' in kwargs:
        update_expr += ', progress = :progress'
        values[':progress'] = kwargs['progress']

    if 'phase' in kwargs:
        update_expr += ', phase = :phase'
        values[':phase'] = kwargs['phase']

    if 'started_at' in kwargs:
        update_expr += ', started_at = :started_at'
        values[':started_at'] = kwargs['started_at']

    if 'completed_at' in kwargs:
        update_expr += ', completed_at = :completed_at'
        values[':completed_at'] = kwargs['completed_at']

    if 'error' in kwargs:
        update_expr += ', #err = :error'
        names['#err'] = 'error'
        values[':error'] = kwargs['error']

    if 'result' in kwargs:
        update_expr += ', #res = :result'
        names['#res'] = 'result'
        values[':result'] = kwargs['result']

    jobs_table.update_item(
        Key={'id': job_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )


def get_job(job_id: str) -> Optional[dict]:
    """Get a job by ID."""
    resp = jobs_table.get_item(Key={'id': job_id})
    return resp.get('Item')


def is_job_cancelled(job_id: str) -> bool:
    """Check if a job has been cancelled."""
    job = get_job(job_id)
    return job.get('status') == 'cancelled' if job else True


def check_concurrent_jobs() -> Optional[str]:
    """Check if there's already a running job. Returns job_id if one exists."""
    from boto3.dynamodb.conditions import Attr
    resp = jobs_table.scan(
        FilterExpression=Attr('status').eq('running'),
        Limit=1,
    )
    items = resp.get('Items', [])
    return items[0]['id'] if items else None
