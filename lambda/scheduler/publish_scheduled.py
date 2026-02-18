"""
Scheduler Lambda function to publish scheduled content.
Triggered by EventBridge rule every 5 minutes.
"""
import json
import os
import sys
from datetime import datetime
import time

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.db import ContentRepository
from shared.logger import create_logger


content_repo = ContentRepository()


def handler(event, context):
    """
    Publish scheduled content that has reached its scheduled time.
    
    Requirements:
    - 15.1: Check for scheduled content
    - 15.2: Update content status to published when time is reached
    - 15.3: Triggered every 5 minutes
    - 15.4: Set published_at timestamp
    """
    # Initialize structured logger
    log = create_logger(event, context)
    start_time = time.time()
    
    log.info('Scheduler execution started')
    
    try:
        current_time = int(datetime.now().timestamp())
        
        log.debug('Querying for scheduled content', current_time=current_time)
        
        # Get content scheduled for publication
        query_start = time.time()
        scheduled_items = content_repo.get_scheduled_content(current_time)
        query_duration = (time.time() - query_start) * 1000
        
        log.metric('scheduled_content_query_duration', query_duration, 'Milliseconds')
        log.info('Scheduled content retrieved',
                item_count=len(scheduled_items),
                query_duration_ms=query_duration)
        
        published_count = 0
        failed_items = []
        
        for item in scheduled_items:
            item_start = time.time()
            try:
                content_id = item['id']
                created_at = item['created_at']
                
                log.debug('Publishing scheduled content',
                         content_id=content_id,
                         content_type=item.get('type'),
                         scheduled_at=item.get('scheduled_at'))
                
                # Update status to published and set published_at timestamp
                content_repo.update(
                    content_id=content_id,
                    created_at=created_at,
                    updates={
                        'status': 'published',
                        'published_at': current_time,
                        'updated_at': current_time
                    }
                )
                
                item_duration = (time.time() - item_start) * 1000
                log.metric('content_publish_duration', item_duration, 'Milliseconds')
                
                log.info('Content published successfully',
                        content_id=content_id,
                        content_type=item.get('type'),
                        slug=item.get('slug'),
                        duration_ms=item_duration)
                
                published_count += 1
                
            except Exception as item_error:
                failed_items.append({
                    'id': item.get('id', 'unknown'),
                    'error': str(item_error)
                })
                log.error('Failed to publish scheduled content',
                         content_id=item.get('id'),
                         error=str(item_error),
                         error_type=type(item_error).__name__)
        
        total_duration = (time.time() - start_time) * 1000
        
        log.metric('scheduler_total_duration', total_duration, 'Milliseconds')
        log.metric('content_published_count', published_count, 'Count')
        log.metric('content_publish_failed_count', len(failed_items), 'Count')
        
        log.info('Scheduler execution completed',
                published_count=published_count,
                failed_count=len(failed_items),
                total_scheduled=len(scheduled_items),
                total_duration_ms=total_duration)
        
        result = {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Published {published_count} scheduled items',
                'published_count': published_count,
                'total_scheduled': len(scheduled_items),
                'failed_count': len(failed_items),
                'failed_items': failed_items,
                'timestamp': current_time
            })
        }
        
        return result
    
    except Exception as e:
        total_duration = (time.time() - start_time) * 1000
        log.error('Scheduler execution failed',
                 error=str(e),
                 error_type=type(e).__name__,
                 duration_ms=total_duration)
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'timestamp': int(datetime.now().timestamp())
            })
        }
