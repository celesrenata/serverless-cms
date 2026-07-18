"""
Content listing Lambda function.
Handles GET /api/v1/content requests with filtering and pagination.
"""
# Deployment trigger: force Lambda update for CDN URL conversion
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from boto3.dynamodb.conditions import Attr

from shared.db import ContentRepository, UserRepository
from shared.s3 import convert_s3_url_to_cdn


content_repo = ContentRepository()
user_repo = UserRepository()


def handler(event, context):
    """
    List content with filters and pagination.
    
    Requirements:
    - 4.1: Return published content sorted by publication timestamp
    - 6.3: Filter content by category
    - 6.4: Filter content by tag
    - 13.1: Support search query in title or content
    - 13.2: Return search results within 3 seconds
    """
    try:
        # Parse query parameters
        params = event.get('queryStringParameters', {}) or {}
        
        content_type = params.get('type')  # None means all types
        status = params.get('status')  # None means all statuses
        limit = int(params.get('limit', '20'))
        last_key_str = params.get('last_key')
        
        # Additional filter parameters
        category = params.get('category')
        tag = params.get('tag')
        author = params.get('author')
        search = params.get('search')
        
        # Parse last_key if provided
        last_key = None
        if last_key_str:
            try:
                last_key = json.loads(last_key_str)
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Bad request',
                        'message': 'Invalid last_key format'
                    })
                }
        
        # Validate limit
        if limit < 1 or limit > 200:
            limit = 20
        
        # Get total counts for dashboard statistics
        count_response = content_repo.table.scan(Select='COUNT')
        total_count = count_response.get('Count', 0)
        while 'LastEvaluatedKey' in count_response:
            count_response = content_repo.table.scan(
                Select='COUNT',
                ExclusiveStartKey=count_response['LastEvaluatedKey']
            )
            total_count += count_response.get('Count', 0)

        # Published count
        pub_response = content_repo.table.scan(
            Select='COUNT',
            FilterExpression=Attr('status').eq('published')
        )
        published_count = pub_response.get('Count', 0)
        while 'LastEvaluatedKey' in pub_response:
            pub_response = content_repo.table.scan(
                Select='COUNT',
                FilterExpression=Attr('status').eq('published'),
                ExclusiveStartKey=pub_response['LastEvaluatedKey']
            )
            published_count += pub_response.get('Count', 0)

        # Get content from repository
        if content_type:
            result = content_repo.list_by_type(
                content_type=content_type,
                status=status,
                limit=limit,
                last_key=last_key
            )
            # Fetch additional pages if we got less than limit and there's a next key
            while len(result['items']) < limit and result.get('last_key'):
                more = content_repo.list_by_type(
                    content_type=content_type,
                    status=status,
                    limit=limit - len(result['items']),
                    last_key=result['last_key']
                )
                result['items'].extend(more['items'])
                result['last_key'] = more.get('last_key')
        else:
            # All types: scan with optional status filter, fetch all up to limit
            scan_kwargs = {}
            filter_expressions = []
            if status:
                filter_expressions.append(Attr('status').eq(status))
            if filter_expressions:
                combined = filter_expressions[0]
                for expr in filter_expressions[1:]:
                    combined = combined & expr
                scan_kwargs['FilterExpression'] = combined
            if last_key:
                scan_kwargs['ExclusiveStartKey'] = last_key

            all_items = []
            while len(all_items) < limit:
                response = content_repo.table.scan(**scan_kwargs)
                all_items.extend(response.get('Items', []))
                next_key = response.get('LastEvaluatedKey')
                if not next_key:
                    break
                scan_kwargs['ExclusiveStartKey'] = next_key

            # Sort by updated_at descending
            all_items.sort(key=lambda x: int(x.get('updated_at', 0)), reverse=True)

            result = {
                'items': all_items[:limit],
                'last_key': None,
            }
        
        items = result['items']
        
        # Apply additional filters in memory
        # (In production, consider using DynamoDB filter expressions or ElasticSearch)
        
        if category:
            items = [
                item for item in items
                if category in item.get('metadata', {}).get('categories', [])
            ]
        
        if tag:
            items = [
                item for item in items
                if tag in item.get('metadata', {}).get('tags', [])
            ]
        
        if author:
            items = [
                item for item in items
                if item.get('author') == author
            ]
        
        if search:
            search_lower = search.lower()
            items = [
                item for item in items
                if search_lower in item.get('title', '').lower() or
                   search_lower in item.get('content', '').lower() or
                   search_lower in item.get('excerpt', '').lower()
            ]
        
        # Enrich items with author names
        # Cache user lookups to avoid duplicate queries
        user_cache = {}
        for item in items:
            author_id = item.get('author')
            if author_id:
                if author_id not in user_cache:
                    try:
                        user = user_repo.get_by_id(author_id)
                        user_cache[author_id] = user.get('name', user.get('email', 'Unknown Author')) if user else 'Unknown Author'
                    except Exception as e:
                        print(f"Error fetching author {author_id}: {e}")
                        user_cache[author_id] = 'Unknown Author'
                
                item['author_name'] = user_cache[author_id]
            
            # Convert S3 URLs to CloudFront CDN URLs
            _convert_content_urls(item)
        
        # Prepare response
        response_data = {
            'items': items,
            'count': len(items),
            'last_key': result['last_key'],
            'total_count': total_count,
            'published_count': published_count,
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(response_data, default=str)
        }
    
    except ValueError as e:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Bad request',
                'message': f'Invalid parameter: {str(e)}'
            })
        }
    
    except Exception as e:
        print(f"Error listing content: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }


def _convert_content_urls(content: dict) -> None:
    """Convert S3 URLs to CloudFront CDN URLs in content metadata."""
    # Convert featured_image
    if content.get('featured_image'):
        content['featured_image'] = convert_s3_url_to_cdn(content['featured_image'])
    
    # Convert media items in metadata
    metadata = content.get('metadata', {})
    if isinstance(metadata, dict):
        media_items = metadata.get('media', [])
        if isinstance(media_items, list):
            for item in media_items:
                if isinstance(item, dict) and item.get('s3_url'):
                    item['s3_url'] = convert_s3_url_to_cdn(item['s3_url'])
                    # Also convert thumbnails if present
                    thumbnails = item.get('thumbnails', {})
                    if isinstance(thumbnails, dict):
                        for size, url in thumbnails.items():
                            if url:
                                thumbnails[size] = convert_s3_url_to_cdn(url)
