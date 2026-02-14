"""
Media upload Lambda function.
Handles multipart file uploads, generates thumbnails, and stores metadata.
"""
import json
import uuid
import base64
from datetime import datetime
from typing import Dict, Any, Optional
import mimetypes
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.auth import require_auth
from shared.db import MediaRepository
from shared.s3 import upload_file, generate_thumbnails, get_file_dimensions
from shared.plugins import PluginManager


media_repo = MediaRepository()
plugin_manager = PluginManager()


def parse_multipart_form_data(body: str, content_type: str) -> Optional[Dict[str, Any]]:
    """
    Parse multipart/form-data from API Gateway.
    
    Args:
        body: Base64 encoded body from API Gateway
        content_type: Content-Type header value
        
    Returns:
        Dictionary with file data and metadata
    """
    try:
        # Extract boundary from content type
        if 'boundary=' not in content_type:
            return None
        
        boundary = content_type.split('boundary=')[1].strip()
        
        # Decode base64 body
        decoded_body = base64.b64decode(body)
        
        # Split by boundary
        parts = decoded_body.split(f'--{boundary}'.encode())
        
        file_data = None
        filename = None
        file_content_type = 'application/octet-stream'
        
        for part in parts:
            if not part or part == b'--\r\n' or part == b'--':
                continue
            
            # Split headers and content
            if b'\r\n\r\n' in part:
                headers_section, content = part.split(b'\r\n\r\n', 1)
                headers = headers_section.decode('utf-8', errors='ignore')
                
                # Check if this is the file part
                if 'Content-Disposition' in headers and 'filename=' in headers:
                    # Extract filename
                    for line in headers.split('\r\n'):
                        if 'filename=' in line:
                            filename_part = line.split('filename=')[1]
                            filename = filename_part.strip('"').strip("'").split(';')[0]
                        if 'Content-Type:' in line:
                            file_content_type = line.split('Content-Type:')[1].strip()
                    
                    # Remove trailing boundary markers
                    file_data = content.rstrip(b'\r\n--')
        
        if file_data and filename:
            return {
                'file_data': file_data,
                'filename': filename,
                'content_type': file_content_type
            }
        
        return None
        
    except Exception as e:
        print(f"Error parsing multipart data: {e}")
        return None


@require_auth(roles=['admin', 'editor', 'author'])
def handler(event, context, user_id, role):
    """
    Handle media file upload.
    
    POST /api/v1/media/upload
    
    Accepts multipart/form-data with file upload.
    Generates thumbnails for images and stores metadata in DynamoDB.
    """
    try:
        # Get content type
        content_type = event.get('headers', {}).get('content-type', '') or \
                      event.get('headers', {}).get('Content-Type', '')
        
        if not content_type or 'multipart/form-data' not in content_type:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Content-Type must be multipart/form-data'})
            }
        
        # Parse multipart form data
        body = event.get('body', '')
        is_base64 = event.get('isBase64Encoded', False)
        
        if not is_base64:
            # If not base64 encoded, encode it
            body = base64.b64encode(body.encode()).decode()
        
        parsed_data = parse_multipart_form_data(body, content_type)
        
        if not parsed_data:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Failed to parse file upload'})
            }
        
        file_data = parsed_data['file_data']
        filename = parsed_data['filename']
        file_content_type = parsed_data['content_type']
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(file_data) > max_size:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'File size exceeds 10MB limit'})
            }
        
        # Upload file to S3
        s3_url = upload_file(file_data, filename, file_content_type)
        s3_key = s3_url.split('.s3.amazonaws.com/')[-1]
        
        # Get file dimensions if image
        dimensions = get_file_dimensions(file_data, file_content_type)
        
        # Generate thumbnails for images
        thumbnails = {}
        if file_content_type.startswith('image/'):
            try:
                thumbnails = generate_thumbnails(s3_key, file_content_type)
            except Exception as e:
                print(f"Warning: Failed to generate thumbnails: {e}")
                # Continue without thumbnails
        
        # Create media metadata
        now = int(datetime.now().timestamp())
        media_id = str(uuid.uuid4())
        
        media_item = {
            'id': media_id,
            'filename': filename,
            's3_key': s3_key,
            's3_url': s3_url,
            'mime_type': file_content_type,
            'size': len(file_data),
            'uploaded_by': user_id,
            'uploaded_at': now,
            'metadata': {
                'alt_text': '',
                'caption': ''
            }
        }
        
        # Add dimensions if available
        if dimensions:
            media_item['dimensions'] = {
                'width': dimensions[0],
                'height': dimensions[1]
            }
        
        # Add thumbnails if generated
        if thumbnails:
            media_item['thumbnails'] = thumbnails
        
        # Execute plugin hook
        media_item = plugin_manager.execute_hook('media_upload', media_item)
        
        # Save to database
        result = media_repo.create(media_item)
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result, default=str)
        }
    
    except Exception as e:
        print(f"Error uploading media: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Failed to upload media: {str(e)}'})
        }
