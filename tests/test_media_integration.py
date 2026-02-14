"""
Integration tests for media management API endpoints.
Tests media upload, retrieval, and deletion.
"""
import json
import sys
import os
from datetime import datetime
import uuid
import io
from PIL import Image

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

from shared.s3 import upload_file, generate_thumbnails, delete_file
import boto3


class TestMediaManagement:
    """Test media upload and management operations."""
    
    def test_upload_file_to_s3(self, s3_mock, test_user_id):
        """Test uploading a file to S3."""
        # Create test file data
        file_data = b'test file content'
        filename = 'test-file.txt'
        content_type = 'text/plain'
        
        # Upload file
        url = upload_file(file_data, filename, content_type)
        
        assert url is not None
        assert os.environ['MEDIA_BUCKET'] in url
        assert '.txt' in url  # Check file extension is preserved
        assert 'uploads/' in url  # Check it's in the uploads directory
        
        # Extract S3 key from URL
        # URL format: https://bucket.s3.amazonaws.com/uploads/uuid.txt
        s3_key = url.split('.com/')[-1]
        
        # Verify file exists in S3
        s3 = boto3.client('s3', region_name='us-east-1')
        response = s3.get_object(
            Bucket=os.environ['MEDIA_BUCKET'],
            Key=s3_key
        )
        assert response['Body'].read() == file_data
    
    def test_generate_thumbnails(self, s3_mock):
        """Test thumbnail generation for images."""
        # Create a test image
        img = Image.new('RGB', (1920, 1080), color='red')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='JPEG')
        img_data = img_buffer.getvalue()
        
        # Upload original image
        s3 = boto3.client('s3', region_name='us-east-1')
        s3_key = 'uploads/test-image.jpg'
        s3.put_object(
            Bucket=os.environ['MEDIA_BUCKET'],
            Key=s3_key,
            Body=img_data,
            ContentType='image/jpeg'
        )
        
        # Generate thumbnails
        thumbnails = generate_thumbnails(s3_key, 'image/jpeg')
        
        assert 'small' in thumbnails
        assert 'medium' in thumbnails
        assert 'large' in thumbnails
        
        # Verify thumbnails exist in S3
        for size in ['small', 'medium', 'large']:
            thumb_key = s3_key.replace('uploads/', f'thumbnails/{size}/')
            response = s3.get_object(
                Bucket=os.environ['MEDIA_BUCKET'],
                Key=thumb_key
            )
            assert response['ContentLength'] > 0
    
    def test_delete_file_and_thumbnails(self, s3_mock):
        """Test deleting a file and its thumbnails."""
        s3 = boto3.client('s3', region_name='us-east-1')
        
        # Create test files
        s3_key = 'uploads/test-delete.jpg'
        s3.put_object(
            Bucket=os.environ['MEDIA_BUCKET'],
            Key=s3_key,
            Body=b'test image data'
        )
        
        # Create thumbnails
        for size in ['small', 'medium', 'large']:
            thumb_key = s3_key.replace('uploads/', f'thumbnails/{size}/')
            s3.put_object(
                Bucket=os.environ['MEDIA_BUCKET'],
                Key=thumb_key,
                Body=b'thumbnail data'
            )
        
        # Delete file and thumbnails
        delete_file(s3_key)
        
        # Verify original is deleted
        objects = s3.list_objects_v2(
            Bucket=os.environ['MEDIA_BUCKET'],
            Prefix='uploads/test-delete.jpg'
        )
        assert objects.get('KeyCount', 0) == 0
    
    def test_media_metadata_storage(self, dynamodb_mock, s3_mock, test_user_id, test_media_data):
        """Test storing media metadata in DynamoDB."""
        from shared.db import MediaRepository
        
        media_repo = MediaRepository()
        
        # Create media metadata
        now = int(datetime.now().timestamp())
        media_id = str(uuid.uuid4())
        media_item = {
            'id': media_id,
            'filename': test_media_data['filename'],
            's3_key': f'uploads/{test_media_data["filename"]}',
            's3_url': f'https://{os.environ["MEDIA_BUCKET"]}.s3.amazonaws.com/uploads/{test_media_data["filename"]}',
            'mime_type': test_media_data['mime_type'],
            'size': test_media_data['size'],
            'dimensions': test_media_data['dimensions'],
            'thumbnails': {
                'small': 'https://example.com/small.jpg',
                'medium': 'https://example.com/medium.jpg',
                'large': 'https://example.com/large.jpg'
            },
            'metadata': test_media_data['metadata'],
            'uploaded_by': test_user_id,
            'uploaded_at': now
        }
        
        result = media_repo.create(media_item)
        
        assert result['id'] == media_id
        assert result['filename'] == test_media_data['filename']
        assert result['dimensions']['width'] == 1920
    
    def test_list_media(self, dynamodb_mock, test_user_id):
        """Test listing media files."""
        from shared.db import MediaRepository
        
        media_repo = MediaRepository()
        
        # Create multiple media items
        now = int(datetime.now().timestamp())
        for i in range(3):
            media_item = {
                'id': str(uuid.uuid4()),
                'filename': f'test-image-{i}.jpg',
                's3_key': f'uploads/test-image-{i}.jpg',
                's3_url': f'https://example.com/test-image-{i}.jpg',
                'mime_type': 'image/jpeg',
                'size': 1024000,
                'metadata': {},
                'uploaded_by': test_user_id,
                'uploaded_at': now + i
            }
            media_repo.create(media_item)
        
        # List media
        result = media_repo.list_media(limit=10)
        
        assert len(result['items']) == 3
    
    def test_get_media_by_id(self, dynamodb_mock, test_user_id, test_media_data):
        """Test retrieving media by ID."""
        from shared.db import MediaRepository
        
        media_repo = MediaRepository()
        
        # Create media
        now = int(datetime.now().timestamp())
        media_id = str(uuid.uuid4())
        media_item = {
            'id': media_id,
            'filename': test_media_data['filename'],
            's3_key': f'uploads/{test_media_data["filename"]}',
            's3_url': f'https://example.com/{test_media_data["filename"]}',
            'mime_type': test_media_data['mime_type'],
            'size': test_media_data['size'],
            'metadata': test_media_data['metadata'],
            'uploaded_by': test_user_id,
            'uploaded_at': now
        }
        media_repo.create(media_item)
        
        # Retrieve media
        retrieved = media_repo.get_by_id(media_id)
        
        assert retrieved is not None
        assert retrieved['id'] == media_id
        assert retrieved['filename'] == test_media_data['filename']
    
    def test_delete_media(self, dynamodb_mock, test_user_id, test_media_data):
        """Test deleting media metadata."""
        from shared.db import MediaRepository
        
        media_repo = MediaRepository()
        
        # Create media
        now = int(datetime.now().timestamp())
        media_id = str(uuid.uuid4())
        media_item = {
            'id': media_id,
            'filename': test_media_data['filename'],
            's3_key': f'uploads/{test_media_data["filename"]}',
            's3_url': f'https://example.com/{test_media_data["filename"]}',
            'mime_type': test_media_data['mime_type'],
            'size': test_media_data['size'],
            'metadata': test_media_data['metadata'],
            'uploaded_by': test_user_id,
            'uploaded_at': now
        }
        media_repo.create(media_item)
        
        # Delete media
        media_repo.delete(media_id)
        
        # Verify deletion
        retrieved = media_repo.get_by_id(media_id)
        assert retrieved is None
