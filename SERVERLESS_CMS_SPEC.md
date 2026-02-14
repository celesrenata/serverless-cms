# Serverless CMS - WordPress Equivalent
## Project Specification for KIRO IDE

### Overview
A 100% serverless, WordPress-equivalent CMS system built on AWS serverless infrastructure with React frontend and Python backend.

### Core Requirements
- **Frontend**: React-based admin panel and public website
- **Backend**: Python Lambda functions via API Gateway
- **Database**: DynamoDB for all content and metadata
- **Storage**: S3 for media files (images, videos, documents)
- **Authentication**: AWS Cognito for user management
- **Hosting**: S3 + CloudFront for static site delivery
- **Domain**: Custom domain via Route53 + ACM certificates

---

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                        │
│                  (serverless.celestium.life)                 │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
   ┌────▼─────┐    ┌─────▼──────┐
   │ S3 Admin │    │ S3 Public  │
   │  Panel   │    │  Website   │
   └────┬─────┘    └─────┬──────┘
        │                │
        └────────┬────────┘
                 │
        ┌────────▼─────────┐
        │   API Gateway    │
        │  /api/v1/*       │
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  Lambda Functions│
        │    (Python)      │
        └────┬──────┬──────┘
             │      │
    ┌────────▼──┐ ┌▼────────┐
    │ DynamoDB  │ │   S3    │
    │  Tables   │ │  Media  │
    └───────────┘ └─────────┘
```

---

## Database Schema (DynamoDB)

### Table 1: `cms-content`
**Partition Key**: `id` (String)  
**Sort Key**: `type#timestamp` (String)

**Attributes**:
```json
{
  "id": "uuid",
  "type": "post|page|gallery|project",
  "title": "string",
  "slug": "string",
  "content": "string (markdown or HTML)",
  "excerpt": "string",
  "author": "user-id",
  "status": "draft|published|archived",
  "featured_image": "s3-url",
  "metadata": {
    "seo_title": "string",
    "seo_description": "string",
    "tags": ["array"],
    "categories": ["array"]
  },
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "published_at": "timestamp"
}
```

**GSI 1**: `type-published_at-index`
- Partition Key: `type`
- Sort Key: `published_at`
- Purpose: Query all posts/pages by type, sorted by date

**GSI 2**: `slug-index`
- Partition Key: `slug`
- Purpose: Lookup content by URL slug

### Table 2: `cms-media`
**Partition Key**: `id` (String)

**Attributes**:
```json
{
  "id": "uuid",
  "filename": "string",
  "s3_key": "string",
  "s3_url": "string",
  "mime_type": "string",
  "size": "number (bytes)",
  "dimensions": {
    "width": "number",
    "height": "number"
  },
  "thumbnails": {
    "small": "s3-url",
    "medium": "s3-url",
    "large": "s3-url"
  },
  "metadata": {
    "alt_text": "string",
    "caption": "string",
    "exif": "object (for photos)"
  },
  "uploaded_by": "user-id",
  "uploaded_at": "timestamp"
}
```

### Table 3: `cms-users`
**Partition Key**: `id` (String)

**Attributes**:
```json
{
  "id": "cognito-user-id",
  "email": "string",
  "username": "string",
  "display_name": "string",
  "role": "admin|editor|author|viewer",
  "avatar_url": "s3-url",
  "bio": "string",
  "created_at": "timestamp",
  "last_login": "timestamp"
}
```

### Table 4: `cms-settings`
**Partition Key**: `key` (String)

**Attributes**:
```json
{
  "key": "site_title|site_description|theme|etc",
  "value": "string|object",
  "updated_at": "timestamp",
  "updated_by": "user-id"
}
```

---

## API Endpoints (Lambda Functions)

### Content Management

**POST /api/v1/content**
- Create new post/page/gallery/project
- Auth: Required (admin, editor, author)
- Input: Content object
- Output: Created content with ID

**GET /api/v1/content/{id}**
- Get single content item
- Auth: Optional (public for published, required for drafts)
- Output: Content object

**PUT /api/v1/content/{id}**
- Update existing content
- Auth: Required (admin, editor, author)
- Input: Updated content object
- Output: Updated content

**DELETE /api/v1/content/{id}**
- Delete content
- Auth: Required (admin, editor)
- Output: Success message

**GET /api/v1/content**
- List content with filters
- Query params: `type`, `status`, `limit`, `offset`, `sort`
- Auth: Optional
- Output: Array of content items

**GET /api/v1/content/slug/{slug}**
- Get content by URL slug
- Auth: Optional
- Output: Content object

### Media Management

**POST /api/v1/media/upload**
- Upload media file to S3
- Generate thumbnails (Lambda)
- Auth: Required
- Input: Multipart file upload
- Output: Media object with URLs

**GET /api/v1/media/{id}**
- Get media metadata
- Auth: Optional
- Output: Media object

**DELETE /api/v1/media/{id}**
- Delete media from S3 and DynamoDB
- Auth: Required (admin, editor)
- Output: Success message

**GET /api/v1/media**
- List media with pagination
- Query params: `limit`, `offset`, `type`
- Auth: Required
- Output: Array of media objects

### User Management

**GET /api/v1/users/me**
- Get current user profile
- Auth: Required
- Output: User object

**PUT /api/v1/users/me**
- Update current user profile
- Auth: Required
- Input: User profile updates
- Output: Updated user object

**GET /api/v1/users**
- List all users
- Auth: Required (admin)
- Output: Array of user objects

### Settings

**GET /api/v1/settings**
- Get all site settings
- Auth: Required (admin)
- Output: Settings object

**PUT /api/v1/settings**
- Update site settings
- Auth: Required (admin)
- Input: Settings object
- Output: Updated settings

---

## Frontend Components

### Admin Panel (React)

**Pages**:
1. **Dashboard** (`/admin`)
   - Overview stats (total posts, pages, media)
   - Recent activity
   - Quick actions

2. **Content List** (`/admin/content`)
   - Table view of all content
   - Filters: type, status, author, date
   - Bulk actions: delete, publish, archive
   - Search functionality

3. **Content Editor** (`/admin/content/new`, `/admin/content/edit/{id}`)
   - Rich text editor (TinyMCE or Slate.js)
   - Markdown support
   - Media insertion
   - SEO fields
   - Publish/draft/schedule options
   - Preview mode

4. **Media Library** (`/admin/media`)
   - Grid view of uploaded media
   - Upload interface (drag & drop)
   - Search and filter
   - Edit metadata (alt text, caption)

5. **Settings** (`/admin/settings`)
   - Site title, description
   - Theme selection
   - User management
   - API keys

**Key React Components**:
```
src/
├── components/
│   ├── Editor/
│   │   ├── RichTextEditor.tsx
│   │   ├── MarkdownEditor.tsx
│   │   └── MediaPicker.tsx
│   ├── MediaLibrary/
│   │   ├── MediaGrid.tsx
│   │   ├── MediaUpload.tsx
│   │   └── MediaItem.tsx
│   ├── ContentList/
│   │   ├── ContentTable.tsx
│   │   ├── ContentFilters.tsx
│   │   └── ContentActions.tsx
│   └── Layout/
│       ├── AdminLayout.tsx
│       ├── Sidebar.tsx
│       └── Header.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── ContentList.tsx
│   ├── ContentEditor.tsx
│   ├── MediaLibrary.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useContent.ts
│   └── useMedia.ts
└── services/
    ├── api.ts
    ├── auth.ts
    └── storage.ts
```

### Public Website (React)

**Pages**:
1. **Home** (`/`)
   - Featured content
   - Recent posts/projects
   - Photo galleries

2. **Blog** (`/blog`)
   - List of blog posts
   - Pagination
   - Categories/tags filter

3. **Single Post** (`/blog/{slug}`)
   - Full post content
   - Author info
   - Related posts

4. **Gallery** (`/gallery`)
   - Photo gallery grid
   - Lightbox view
   - Categories

5. **Projects** (`/projects`)
   - Code projects showcase
   - Project details with code snippets

6. **About** (`/about`)
   - Bio, contact info

**Key React Components**:
```
src/
├── components/
│   ├── PostCard.tsx
│   ├── Gallery.tsx
│   ├── Lightbox.tsx
│   ├── CodeBlock.tsx
│   └── Navigation.tsx
├── pages/
│   ├── Home.tsx
│   ├── Blog.tsx
│   ├── Post.tsx
│   ├── Gallery.tsx
│   └── Projects.tsx
└── services/
    └── api.ts
```

---

## Lambda Functions (Python)

### Function Structure

```
lambda/
├── content/
│   ├── create.py          # POST /api/v1/content
│   ├── get.py             # GET /api/v1/content/{id}
│   ├── update.py          # PUT /api/v1/content/{id}
│   ├── delete.py          # DELETE /api/v1/content/{id}
│   ├── list.py            # GET /api/v1/content
│   └── get_by_slug.py     # GET /api/v1/content/slug/{slug}
├── media/
│   ├── upload.py          # POST /api/v1/media/upload
│   ├── get.py             # GET /api/v1/media/{id}
│   ├── delete.py          # DELETE /api/v1/media/{id}
│   ├── list.py            # GET /api/v1/media
│   └── generate_thumbnails.py  # S3 trigger for image processing
├── users/
│   ├── get_me.py          # GET /api/v1/users/me
│   ├── update_me.py       # PUT /api/v1/users/me
│   └── list.py            # GET /api/v1/users
├── settings/
│   ├── get.py             # GET /api/v1/settings
│   └── update.py          # PUT /api/v1/settings
└── shared/
    ├── auth.py            # Cognito authentication helpers
    ├── db.py              # DynamoDB helpers
    ├── s3.py              # S3 helpers
    └── utils.py           # Common utilities
```

### Key Lambda Features

**Authentication**:
```python
# shared/auth.py
def verify_token(event):
    """Verify Cognito JWT token from Authorization header"""
    token = event['headers'].get('Authorization', '').replace('Bearer ', '')
    # Verify with Cognito
    return user_id, user_role

def require_auth(roles=[]):
    """Decorator to require authentication"""
    def decorator(func):
        def wrapper(event, context):
            user_id, user_role = verify_token(event)
            if roles and user_role not in roles:
                return {'statusCode': 403, 'body': 'Forbidden'}
            return func(event, context, user_id, user_role)
        return wrapper
    return decorator
```

**DynamoDB Operations**:
```python
# shared/db.py
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')

def get_item(table_name, key):
    """Get single item from DynamoDB"""
    table = dynamodb.Table(table_name)
    response = table.get_item(Key=key)
    return response.get('Item')

def put_item(table_name, item):
    """Put item into DynamoDB"""
    table = dynamodb.Table(table_name)
    table.put_item(Item=item)

def query_by_type(table_name, content_type, limit=20):
    """Query content by type using GSI"""
    table = dynamodb.Table(table_name)
    response = table.query(
        IndexName='type-published_at-index',
        KeyConditionExpression=Key('type').eq(content_type),
        ScanIndexForward=False,
        Limit=limit
    )
    return response['Items']
```

**S3 Operations**:
```python
# shared/s3.py
import boto3
from PIL import Image
import io

s3 = boto3.client('s3')
BUCKET_NAME = 'cms-media-bucket'

def upload_file(file_data, filename, content_type):
    """Upload file to S3"""
    key = f"uploads/{filename}"
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=file_data,
        ContentType=content_type
    )
    return f"https://{BUCKET_NAME}.s3.amazonaws.com/{key}"

def generate_thumbnail(s3_key, size=(300, 300)):
    """Generate thumbnail from image"""
    # Get original image
    obj = s3.get_object(Bucket=BUCKET_NAME, Key=s3_key)
    img = Image.open(io.BytesIO(obj['Body'].read()))
    
    # Resize
    img.thumbnail(size)
    
    # Save thumbnail
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    buffer.seek(0)
    
    thumb_key = s3_key.replace('uploads/', 'thumbnails/')
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=thumb_key,
        Body=buffer,
        ContentType='image/jpeg'
    )
    return f"https://{BUCKET_NAME}.s3.amazonaws.com/{thumb_key}"
```

---

## CDK Infrastructure

### Stack Definition

```typescript
// lib/cms-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

export class ServerlessCmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const contentTable = new dynamodb.Table(this, 'ContentTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'type#timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    contentTable.addGlobalSecondaryIndex({
      indexName: 'type-published_at-index',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.STRING },
    });

    contentTable.addGlobalSecondaryIndex({
      indexName: 'slug-index',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
    });

    const mediaTable = new dynamodb.Table(this, 'MediaTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const settingsTable = new dynamodb.Table(this, 'SettingsTable', {
      partitionKey: { name: 'key', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 Buckets
    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const adminBucket = new s3.Bucket(this, 'AdminBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const publicBucket = new s3.Bucket(this, 'PublicBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
    });

    const userPoolClient = userPool.addClient('UserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Lambda Layer (shared code)
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/shared'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
    });

    // Lambda Functions (example: create content)
    const createContentFn = new lambda.Function(this, 'CreateContentFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('lambda/content'),
      handler: 'create.handler',
      layers: [sharedLayer],
      environment: {
        CONTENT_TABLE: contentTable.tableName,
      },
    });

    contentTable.grantReadWriteData(createContentFn);

    // API Gateway
    const api = new apigw.RestApi(this, 'CmsApi', {
      restApiName: 'Serverless CMS API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    const contentResource = api.root.addResource('content');
    contentResource.addMethod('POST', new apigw.LambdaIntegration(createContentFn));

    // CloudFront Distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [{
        s3OriginSource: { s3BucketSource: publicBucket },
        behaviors: [{ isDefaultBehavior: true }],
      }],
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'DistributionUrl', { value: distribution.distributionDomainName });
  }
}
```

---

## Features to Implement

### Phase 1: Core CMS (MVP)
- [ ] User authentication (Cognito)
- [ ] Create/edit/delete posts
- [ ] Rich text editor
- [ ] Media upload to S3
- [ ] Basic admin dashboard
- [ ] Public blog listing
- [ ] Single post view

### Phase 2: Enhanced Features
- [ ] Pages (static content)
- [ ] Categories and tags
- [ ] Search functionality
- [ ] SEO metadata
- [ ] Draft/publish workflow
- [ ] User roles (admin, editor, author)
- [ ] Comments system

### Phase 3: Advanced Features
- [ ] Photo galleries
- [ ] Code project showcase
- [ ] Syntax highlighting
- [ ] Image optimization (thumbnails)
- [ ] Scheduled publishing
- [ ] Analytics integration
- [ ] Custom themes
- [ ] Plugin system

---

## Cost Estimate (10k page views/month)

**DynamoDB**:
- Storage: ~1GB = $0.25
- Reads: ~50k = $0 (free tier)
- Writes: ~1k = $0 (free tier)

**Lambda**:
- Requests: ~15k = $0 (free tier)
- Compute: $0 (free tier)

**S3**:
- Storage: ~5GB = $0.12
- Requests: ~20k = $0.01

**API Gateway**:
- Requests: ~15k = $0.05

**Cognito**:
- MAU: <50 = $0 (free tier)

**CloudFront**:
- Data transfer: ~50GB = $4.25
- Requests: ~10k = $0.01

**Route53**:
- Hosted zone: $0.50

**Total: ~$5.20/month**

---

## Development Timeline

**Week 1-2**: Infrastructure & Backend
- Set up CDK stack
- Create DynamoDB tables
- Implement Lambda functions
- Set up API Gateway
- Configure Cognito

**Week 3-4**: Admin Panel
- React app setup
- Authentication flow
- Content editor
- Media library
- Dashboard

**Week 5-6**: Public Website
- React app setup
- Blog listing
- Single post view
- Gallery pages
- Project showcase

**Week 7-8**: Polish & Deploy
- Testing
- Bug fixes
- Performance optimization
- Documentation
- Production deployment

**Total: 8 weeks for full implementation**

---

## Next Steps

1. Review and approve this specification
2. Set up development environment
3. Initialize CDK project
4. Create DynamoDB tables
5. Implement first Lambda function (create content)
6. Build basic React admin panel
7. Iterate and add features

---

## Questions to Consider

1. **Content Types**: Do you need additional content types beyond posts, pages, galleries, and projects?
2. **User Roles**: What permission levels do you need? (admin, editor, author, viewer)
3. **Media**: What file types should be supported? (images, videos, PDFs, etc.)
4. **SEO**: Do you need sitemap generation, RSS feeds, or other SEO features?
5. **Themes**: Should the system support multiple themes or custom styling?
6. **Plugins**: Do you want a plugin/extension system for future expandability?

---

This specification provides a complete blueprint for building a WordPress-equivalent CMS on 100% serverless AWS infrastructure. The system is scalable, cost-effective, and fully customizable.
