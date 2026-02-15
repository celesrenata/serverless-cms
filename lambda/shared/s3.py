"""
S3 utilities for media file operations.
Handles file uploads, thumbnail generation, and file deletion.
"""

import boto3
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = None
import io
import os
from typing import Dict, Tuple, Optional
from botocore.exceptions import ClientError
import uuid
import mimetypes

s3_client = boto3.client('s3')
MEDIA_BUCKET = os.environ.get('MEDIA_BUCKET', '')


def upload_file(file_data: bytes, filename: str, content_type: str) -> str:
    """
    Upload file to S3 and return CloudFront URL.
    
    Args:
        file_data: Binary file content
        filename: Original filename
        content_type: MIME type of the file
        
    Returns:
        CloudFront URL of the uploaded file
        
    Raises:
        Exception: If upload fails
    """
    try:
        # Generate unique filename to avoid collisions
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        key = f"uploads/{unique_filename}"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=MEDIA_BUCKET,
            Key=key,
            Body=file_data,
            ContentType=content_type,
            CacheControl='public, max-age=31536000',  # Cache for 1 year
        )
        
        # Return CloudFront URL if available, otherwise S3 URL
        media_cdn_url = os.environ.get('MEDIA_CDN_URL', '')
        if media_cdn_url:
            url = f"{media_cdn_url}/{key}"
        else:
            url = f"https://{MEDIA_BUCKET}.s3.amazonaws.com/{key}"
        return url
        
    except ClientError as e:
        raise Exception(f"Failed to upload file to S3: {str(e)}")
    except Exception as e:
        raise Exception(f"Error uploading file: {str(e)}")


def generate_thumbnails(s3_key: str, mime_type: str) -> Dict[str, str]:
    """
    Generate thumbnails for an image in multiple sizes.
    
    Args:
        s3_key: S3 key of the original image
        mime_type: MIME type of the image
        
    Returns:
        Dictionary with thumbnail URLs for each size (small, medium, large)
        
    Raises:
        Exception: If thumbnail generation fails
    """
    # Only generate thumbnails for images
    if not mime_type.startswith('image/'):
        return {}
    
    try:
        # Get original image from S3
        response = s3_client.get_object(Bucket=MEDIA_BUCKET, Key=s3_key)
        image_data = response['Body'].read()
        
        # Open image with Pillow
        img = Image.open(io.BytesIO(image_data))
        
        # Convert RGBA to RGB if necessary (for JPEG)
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background
        
        # Define thumbnail sizes
        sizes = {
            'small': (300, 300),
            'medium': (600, 600),
            'large': (1200, 1200)
        }
        
        thumbnails = {}
        
        for size_name, dimensions in sizes.items():
            # Create thumbnail (maintains aspect ratio)
            thumb = img.copy()
            thumb.thumbnail(dimensions, Image.Resampling.LANCZOS)
            
            # Save to buffer
            buffer = io.BytesIO()
            
            # Determine format based on original mime type
            if mime_type == 'image/png':
                thumb.save(buffer, format='PNG', optimize=True)
                thumb_content_type = 'image/png'
                extension = '.png'
            else:
                thumb.save(buffer, format='JPEG', quality=85, optimize=True)
                thumb_content_type = 'image/jpeg'
                extension = '.jpg'
            
            buffer.seek(0)
            
            # Generate thumbnail key
            original_filename = os.path.basename(s3_key)
            name_without_ext = os.path.splitext(original_filename)[0]
            thumb_key = f"thumbnails/{size_name}/{name_without_ext}{extension}"
            
            # Upload thumbnail to S3
            s3_client.put_object(
                Bucket=MEDIA_BUCKET,
                Key=thumb_key,
                Body=buffer.getvalue(),
                ContentType=thumb_content_type,
                CacheControl='public, max-age=31536000',
            )
            
            # Store thumbnail URL (use CloudFront if available)
            media_cdn_url = os.environ.get('MEDIA_CDN_URL', '')
            if media_cdn_url:
                thumbnails[size_name] = f"{media_cdn_url}/{thumb_key}"
            else:
                thumbnails[size_name] = f"https://{MEDIA_BUCKET}.s3.amazonaws.com/{thumb_key}"
        
        return thumbnails
        
    except ClientError as e:
        raise Exception(f"Failed to generate thumbnails: {str(e)}")
    except Exception as e:
        raise Exception(f"Error generating thumbnails: {str(e)}")


def delete_file(s3_key: str) -> None:
    """
    Delete file and all associated thumbnails from S3.
    
    Args:
        s3_key: S3 key of the file to delete
        
    Raises:
        Exception: If deletion fails
    """
    try:
        # Delete original file
        s3_client.delete_object(Bucket=MEDIA_BUCKET, Key=s3_key)
        
        # Delete thumbnails if they exist
        original_filename = os.path.basename(s3_key)
        name_without_ext = os.path.splitext(original_filename)[0]
        
        for size in ['small', 'medium', 'large']:
            # Try both jpg and png extensions
            for ext in ['.jpg', '.png']:
                thumb_key = f"thumbnails/{size}/{name_without_ext}{ext}"
                try:
                    s3_client.delete_object(Bucket=MEDIA_BUCKET, Key=thumb_key)
                except ClientError:
                    # Thumbnail might not exist, continue
                    pass
                    
    except ClientError as e:
        raise Exception(f"Failed to delete file from S3: {str(e)}")
    except Exception as e:
        raise Exception(f"Error deleting file: {str(e)}")


def get_file_dimensions(file_data: bytes, mime_type: str) -> Optional[Tuple[int, int]]:
    """
    Get dimensions of an image file.
    
    Args:
        file_data: Binary image content
        mime_type: MIME type of the file
        
    Returns:
        Tuple of (width, height) or None if not an image
    """
    if not mime_type.startswith('image/'):
        return None
    
    try:
        img = Image.open(io.BytesIO(file_data))
        return img.size
    except Exception:
        return None


def extract_s3_key_from_url(url: str) -> str:
    """
    Extract S3 key from a full S3 URL.
    
    Args:
        url: Full S3 URL
        
    Returns:
        S3 key (path within bucket)
    """
    # Handle both formats:
    # https://bucket.s3.amazonaws.com/key
    # https://s3.amazonaws.com/bucket/key
    
    if '.s3.amazonaws.com/' in url:
        return url.split('.s3.amazonaws.com/')[-1]
    elif 's3.amazonaws.com/' in url:
        parts = url.split('s3.amazonaws.com/')[-1].split('/', 1)
        return parts[1] if len(parts) > 1 else parts[0]
    
    return url


def convert_s3_url_to_cdn(url: str) -> str:
    """
    Convert S3 URL to CloudFront CDN URL.
    
    Args:
        url: S3 URL (e.g., https://bucket.s3.amazonaws.com/key)
        
    Returns:
        CloudFront URL if MEDIA_CDN_URL is set, otherwise original URL
    """
    if not url:
        return url
    
    media_cdn_url = os.environ.get('MEDIA_CDN_URL', '')
    if not media_cdn_url:
        return url
    
    # Only convert S3 URLs
    if '.s3.amazonaws.com/' not in url and 's3.amazonaws.com/' not in url:
        return url
    
    # Extract the S3 key
    key = extract_s3_key_from_url(url)
    
    # Return CloudFront URL
    return f"{media_cdn_url}/{key}"
