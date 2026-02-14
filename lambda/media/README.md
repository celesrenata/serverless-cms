# Media Management Lambda Functions

This module contains Lambda functions for handling media file uploads, retrieval, and deletion in the Serverless CMS.

## Functions

### upload.py
**POST /api/v1/media/upload**

Handles multipart file uploads with the following features:
- Parses multipart/form-data from API Gateway
- Validates file size (max 10MB)
- Uploads files to S3 media bucket
- Generates thumbnails for images (small: 300x300, medium: 600x600, large: 1200x1200)
- Extracts image dimensions
- Stores metadata in DynamoDB
- Executes plugin hooks for media_upload
- Returns S3 URLs within 5 seconds

**Authentication:** Requires author, editor, or admin role

**Response:**
```json
{
  "id": "uuid",
  "filename": "example.jpg",
  "s3_key": "uploads/uuid.jpg",
  "s3_url": "https://bucket.s3.amazonaws.com/uploads/uuid.jpg",
  "mime_type": "image/jpeg",
  "size": 123456,
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "thumbnails": {
    "small": "https://...",
    "medium": "https://...",
    "large": "https://..."
  },
  "uploaded_by": "user-id",
  "uploaded_at": 1234567890,
  "metadata": {
    "alt_text": "",
    "caption": ""
  }
}
```

### get.py
**GET /api/v1/media/{id}**

Retrieves media metadata by ID.

**Authentication:** None required (public endpoint)

**Response:** Same as upload response

### list.py
**GET /api/v1/media**

Lists media items with pagination.

**Query Parameters:**
- `limit`: Number of items to return (default: 20, max: 100)
- `last_key`: Pagination token from previous response

**Authentication:** None required (public endpoint)

**Response:**
```json
{
  "items": [...],
  "last_key": {...}
}
```

### delete.py
**DELETE /api/v1/media/{id}**

Deletes media file and metadata.

**Features:**
- Removes file from S3 (including all thumbnails)
- Deletes metadata from DynamoDB
- Executes plugin hooks for media_delete

**Authentication:** Requires editor or admin role

**Response:**
```json
{
  "message": "Media deleted successfully",
  "id": "uuid"
}
```

## Requirements Implemented

- **2.1**: Upload media files to S3 and store metadata in DynamoDB
- **2.2**: Generate thumbnails in small, medium, and large sizes
- **2.3**: Delete media files and metadata
- **2.4**: Return S3 URLs within 5 seconds
- **2.5**: Handle CORS and public access for media files
- **19.3**: Execute plugin hooks for media operations

## Dependencies

- `shared.auth`: Authentication and authorization
- `shared.db`: MediaRepository for DynamoDB operations
- `shared.s3`: S3 utilities for file operations and thumbnail generation
- `shared.plugins`: PluginManager for hook execution

## Environment Variables

- `MEDIA_TABLE`: DynamoDB table name for media metadata
- `MEDIA_BUCKET`: S3 bucket name for media files
- `PLUGINS_TABLE`: DynamoDB table name for plugins
- `COGNITO_REGION`: AWS region for Cognito
- `USER_POOL_ID`: Cognito User Pool ID

## Notes

- File uploads are limited to 10MB
- Thumbnails are only generated for image files
- Thumbnail generation failures don't block the upload
- S3 deletion failures don't block metadata deletion
- All responses include CORS headers for cross-origin access
