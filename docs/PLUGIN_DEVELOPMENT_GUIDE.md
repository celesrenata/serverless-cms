# Plugin Development Guide

## Overview

The Serverless CMS plugin system allows you to extend the functionality of the CMS through a hook-based architecture. Plugins are Lambda functions that respond to specific events in the content lifecycle, enabling you to:

- Transform content before it's displayed
- Add custom fields to content types
- Process media files
- Integrate with external services
- Add custom business logic

This guide will walk you through creating, testing, and deploying plugins for the Serverless CMS.

## Table of Contents

- [Plugin Architecture](#plugin-architecture)
- [Plugin Structure](#plugin-structure)
- [Available Hooks](#available-hooks)
- [Creating Your First Plugin](#creating-your-first-plugin)
- [Configuration Schema](#configuration-schema)
- [Testing Plugins](#testing-plugins)
- [Deploying Plugins](#deploying-plugins)
- [Best Practices](#best-practices)
- [Example Plugins](#example-plugins)

---

## Plugin Architecture

### How Plugins Work

Plugins in the Serverless CMS are AWS Lambda functions that are invoked at specific points in the content lifecycle. When a hook is triggered:

1. The CMS identifies all active plugins registered for that hook
2. Plugins are executed in priority order (lower numbers first)
3. Each plugin receives event data and can transform it
4. The transformed data is passed to the next plugin
5. The final result is returned to the caller

### Plugin Isolation

Each plugin runs in its own Lambda function, providing:
- **Security isolation** - Plugins cannot access each other's code or data
- **Independent scaling** - Each plugin scales based on its own usage
- **Fault tolerance** - A failing plugin doesn't crash the entire system
- **Resource control** - Each plugin has its own memory and timeout limits

### Hook Priority System

When multiple plugins register for the same hook, they execute in priority order:

```
Priority 1 → Priority 5 → Priority 10 → Priority 20
```

Lower priority numbers execute first. Use this to control the order of transformations.

---

## Plugin Structure

A plugin consists of the following components:

```
my-plugin/
├── plugin.json              # Plugin metadata and configuration
├── handler.py               # Lambda function handler
├── requirements.txt         # Python dependencies (optional)
└── README.md               # Plugin documentation
```

### plugin.json

The `plugin.json` file contains metadata about your plugin:

```json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "A plugin that does awesome things",
  "author": "Your Name",
  "hooks": [
    {
      "hook_name": "content_render_post",
      "handler": "handler.transform_content",
      "priority": 10
    }
  ],
  "config_schema": {
    "type": "object",
    "properties": {
      "enabled_feature": {
        "type": "boolean",
        "default": true,
        "description": "Enable the awesome feature"
      }
    }
  }
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique plugin identifier (kebab-case) |
| name | string | Yes | Human-readable plugin name |
| version | string | Yes | Semantic version (e.g., "1.0.0") |
| description | string | Yes | Brief description of plugin functionality |
| author | string | Yes | Plugin author name or organization |
| hooks | array | Yes | List of hooks this plugin registers |
| config_schema | object | No | JSON Schema for plugin configuration |

### handler.py

The Lambda function handler that processes hook events:

```python
import json
import os

def transform_content(event, context):
    """
    Transform content when rendering a post.
    
    Args:
        event: Hook event data
        context: Lambda context
        
    Returns:
        Transformed content or error response
    """
    try:
        # Extract hook data
        hook_name = event['hook']
        content = event['data']
        content_id = event.get('content_id')
        
        # Get plugin settings
        settings = event.get('settings', {})
        
        # Transform the content
        transformed = content.upper()  # Example transformation
        
        return {
            'statusCode': 200,
            'body': json.dumps(transformed)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

---

## Available Hooks

### Content Hooks

#### content_create

Triggered before content is saved to the database.

**Event Data:**
```python
{
    'hook': 'content_create',
    'data': {
        'title': 'Post Title',
        'content': '<p>Content HTML</p>',
        'type': 'post',
        'status': 'draft',
        'metadata': {}
    },
    'user_id': 'user-123',
    'settings': {}  # Plugin settings
}
```

**Use Cases:**
- Validate content before saving
- Add default metadata
- Generate excerpts automatically
- Sanitize HTML

---

#### content_update

Triggered before content is updated in the database.

**Event Data:**
```python
{
    'hook': 'content_update',
    'content_id': 'content-123',
    'data': {
        'title': 'Updated Title',
        'content': '<p>Updated content</p>'
    },
    'user_id': 'user-123',
    'settings': {}
}
```

**Use Cases:**
- Track content changes
- Validate updates
- Trigger notifications

---

#### content_delete

Triggered before content is deleted from the database.

**Event Data:**
```python
{
    'hook': 'content_delete',
    'content_id': 'content-123',
    'user_id': 'user-123',
    'settings': {}
}
```

**Use Cases:**
- Clean up related resources
- Archive content before deletion
- Send notifications

---

#### content_render_post

Transform post content before it's displayed on the public website.

**Event Data:**
```python
{
    'hook': 'content_render_post',
    'content_id': 'content-123',
    'data': '<p>Post content with <code>code blocks</code></p>',
    'settings': {}
}
```

**Expected Return:**
```python
{
    'statusCode': 200,
    'body': json.dumps('<p>Transformed content</p>')
}
```

**Use Cases:**
- Syntax highlighting for code blocks
- Add table of contents
- Process shortcodes
- Lazy load images

---

#### content_render_page

Transform page content before display.

**Event Data:** Same as `content_render_post`

**Use Cases:**
- Add page-specific features
- Process custom page templates

---

#### content_render_gallery

Transform gallery content before display.

**Event Data:**
```python
{
    'hook': 'content_render_gallery',
    'content_id': 'content-123',
    'data': {
        'title': 'Gallery Title',
        'content': '<p>Gallery description</p>',
        'metadata': {
            'images': [
                {
                    'url': 'https://...',
                    'caption': 'Image 1'
                }
            ]
        }
    },
    'settings': {}
}
```

**Use Cases:**
- Add lightbox functionality
- Generate image grids
- Add EXIF data display
- Create slideshows

---

#### content_render_project

Transform project content before display.

**Event Data:** Same structure as `content_render_gallery`

**Use Cases:**
- Add project-specific layouts
- Generate project timelines
- Add technology badges

---

### Media Hooks

#### media_upload

Triggered after a media file is uploaded to S3.

**Event Data:**
```python
{
    'hook': 'media_upload',
    'data': {
        'id': 'media-123',
        'filename': 'image.jpg',
        's3_key': 'uploads/2024/01/image.jpg',
        's3_url': 'https://...',
        'mime_type': 'image/jpeg',
        'size': 1048576
    },
    'user_id': 'user-123',
    'settings': {}
}
```

**Use Cases:**
- Generate additional thumbnail sizes
- Extract EXIF data
- Run image optimization
- Scan for inappropriate content

---

#### media_delete

Triggered before a media file is deleted.

**Event Data:**
```python
{
    'hook': 'media_delete',
    'media_id': 'media-123',
    'user_id': 'user-123',
    'settings': {}
}
```

**Use Cases:**
- Clean up related files
- Update content references
- Archive media

---

#### thumbnail_generate

Customize thumbnail generation for uploaded images.

**Event Data:**
```python
{
    'hook': 'thumbnail_generate',
    'data': {
        's3_key': 'uploads/2024/01/image.jpg',
        'sizes': ['small', 'medium', 'large']
    },
    'settings': {}
}
```

**Use Cases:**
- Add custom thumbnail sizes
- Apply watermarks
- Use different compression algorithms

---

## Creating Your First Plugin

Let's create a simple plugin that adds reading time estimates to blog posts.

### Step 1: Create Plugin Directory

```bash
mkdir -p plugins/reading-time
cd plugins/reading-time
```

### Step 2: Create plugin.json

```json
{
  "id": "reading-time",
  "name": "Reading Time Estimator",
  "version": "1.0.0",
  "description": "Automatically calculates and adds reading time to blog posts",
  "author": "Your Name",
  "hooks": [
    {
      "hook_name": "content_create",
      "handler": "handler.add_reading_time",
      "priority": 10
    },
    {
      "hook_name": "content_update",
      "handler": "handler.add_reading_time",
      "priority": 10
    }
  ],
  "config_schema": {
    "type": "object",
    "properties": {
      "words_per_minute": {
        "type": "number",
        "default": 200,
        "description": "Average reading speed in words per minute"
      }
    }
  }
}
```

### Step 3: Create handler.py

```python
import json
import re
from html.parser import HTMLParser

class HTMLTextExtractor(HTMLParser):
    """Extract text content from HTML."""
    def __init__(self):
        super().__init__()
        self.text = []
    
    def handle_data(self, data):
        self.text.append(data)
    
    def get_text(self):
        return ' '.join(self.text)

def calculate_reading_time(html_content, words_per_minute=200):
    """
    Calculate reading time for HTML content.
    
    Args:
        html_content: HTML string
        words_per_minute: Reading speed
        
    Returns:
        Reading time in minutes
    """
    # Extract text from HTML
    parser = HTMLTextExtractor()
    parser.feed(html_content)
    text = parser.get_text()
    
    # Count words
    words = len(re.findall(r'\w+', text))
    
    # Calculate reading time
    minutes = max(1, round(words / words_per_minute))
    
    return minutes

def add_reading_time(event, context):
    """
    Add reading time to content metadata.
    
    Args:
        event: Hook event data
        context: Lambda context
        
    Returns:
        Modified content data
    """
    try:
        # Extract data
        hook_name = event['hook']
        content_data = event['data']
        settings = event.get('settings', {})
        
        # Get configuration
        words_per_minute = settings.get('words_per_minute', 200)
        
        # Only process posts
        if content_data.get('type') != 'post':
            return {
                'statusCode': 200,
                'body': json.dumps(content_data)
            }
        
        # Calculate reading time
        html_content = content_data.get('content', '')
        reading_time = calculate_reading_time(html_content, words_per_minute)
        
        # Add to metadata
        if 'metadata' not in content_data:
            content_data['metadata'] = {}
        
        if 'custom_fields' not in content_data['metadata']:
            content_data['metadata']['custom_fields'] = {}
        
        content_data['metadata']['custom_fields']['reading_time'] = f"{reading_time} min read"
        
        return {
            'statusCode': 200,
            'body': json.dumps(content_data)
        }
    
    except Exception as e:
        print(f"Error in reading-time plugin: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

### Step 4: Create README.md

```markdown
# Reading Time Estimator Plugin

Automatically calculates and adds reading time estimates to blog posts.

## Features

- Calculates reading time based on word count
- Configurable reading speed (words per minute)
- Automatically updates on content creation and updates
- Only processes blog posts

## Configuration

- `words_per_minute` (number, default: 200): Average reading speed

## Usage

Once installed and activated, the plugin automatically adds a `reading_time` field to the `custom_fields` metadata of all blog posts.

Access it in your templates:
```javascript
const readingTime = post.metadata.custom_fields.reading_time;
// "5 min read"
```
```

### Step 5: Package the Plugin

```bash
# Create a zip file
zip -r reading-time.zip plugin.json handler.py README.md
```

---


## Configuration Schema

The `config_schema` field in `plugin.json` defines the settings your plugin accepts. It uses JSON Schema format.

### Basic Schema Example

```json
{
  "config_schema": {
    "type": "object",
    "properties": {
      "api_key": {
        "type": "string",
        "description": "API key for external service"
      },
      "enabled": {
        "type": "boolean",
        "default": true,
        "description": "Enable or disable this feature"
      },
      "max_items": {
        "type": "number",
        "default": 10,
        "minimum": 1,
        "maximum": 100,
        "description": "Maximum number of items to process"
      }
    },
    "required": ["api_key"]
  }
}
```

### Supported Types

#### String

```json
{
  "theme": {
    "type": "string",
    "default": "light",
    "description": "Color theme"
  }
}
```

#### String with Enum

```json
{
  "mode": {
    "type": "string",
    "enum": ["development", "production"],
    "default": "production",
    "description": "Operating mode"
  }
}
```

#### Number

```json
{
  "timeout": {
    "type": "number",
    "default": 30,
    "minimum": 1,
    "maximum": 300,
    "description": "Timeout in seconds"
  }
}
```

#### Boolean

```json
{
  "debug_mode": {
    "type": "boolean",
    "default": false,
    "description": "Enable debug logging"
  }
}
```

#### Array

```json
{
  "allowed_domains": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "default": [],
    "description": "List of allowed domains"
  }
}
```

#### Object

```json
{
  "api_config": {
    "type": "object",
    "properties": {
      "endpoint": {
        "type": "string"
      },
      "timeout": {
        "type": "number",
        "default": 30
      }
    },
    "description": "API configuration"
  }
}
```

### Accessing Settings in Your Plugin

Settings are passed to your plugin in the event data:

```python
def handler(event, context):
    settings = event.get('settings', {})
    
    # Access individual settings
    api_key = settings.get('api_key')
    enabled = settings.get('enabled', True)
    max_items = settings.get('max_items', 10)
    
    # Use settings in your logic
    if not enabled:
        return {
            'statusCode': 200,
            'body': json.dumps(event['data'])
        }
    
    # ... rest of your code
```

---

## Testing Plugins

### Local Testing

Create a test script to simulate hook events:

```python
# test_plugin.py
import json
from handler import add_reading_time

def test_reading_time():
    """Test the reading time plugin."""
    event = {
        'hook': 'content_create',
        'data': {
            'type': 'post',
            'title': 'Test Post',
            'content': '<p>This is a test post with some content. ' * 50 + '</p>',
            'metadata': {}
        },
        'settings': {
            'words_per_minute': 200
        }
    }
    
    context = {}
    
    response = add_reading_time(event, context)
    
    assert response['statusCode'] == 200
    
    result = json.loads(response['body'])
    assert 'reading_time' in result['metadata']['custom_fields']
    
    print(f"✓ Reading time: {result['metadata']['custom_fields']['reading_time']}")

if __name__ == '__main__':
    test_reading_time()
    print("All tests passed!")
```

Run the test:

```bash
python test_plugin.py
```

### Integration Testing

Test your plugin with the actual CMS:

1. Install the plugin through the admin panel
2. Activate the plugin
3. Configure settings if needed
4. Create test content to trigger the hook
5. Verify the plugin behavior

### Unit Testing with pytest

```python
# test_handler.py
import pytest
import json
from handler import add_reading_time, calculate_reading_time

def test_calculate_reading_time():
    """Test reading time calculation."""
    html = '<p>' + ('word ' * 200) + '</p>'
    time = calculate_reading_time(html, words_per_minute=200)
    assert time == 1

def test_add_reading_time_to_post():
    """Test adding reading time to post."""
    event = {
        'hook': 'content_create',
        'data': {
            'type': 'post',
            'content': '<p>' + ('word ' * 400) + '</p>',
            'metadata': {}
        },
        'settings': {'words_per_minute': 200}
    }
    
    response = add_reading_time(event, {})
    result = json.loads(response['body'])
    
    assert result['metadata']['custom_fields']['reading_time'] == '2 min read'

def test_skip_non_post_content():
    """Test that non-post content is not processed."""
    event = {
        'hook': 'content_create',
        'data': {
            'type': 'page',
            'content': '<p>Page content</p>',
            'metadata': {}
        },
        'settings': {}
    }
    
    response = add_reading_time(event, {})
    result = json.loads(response['body'])
    
    assert 'custom_fields' not in result.get('metadata', {})
```

Run tests:

```bash
pytest test_handler.py -v
```

---

## Deploying Plugins

### Method 1: Upload via Admin Panel

1. Package your plugin as a ZIP file
2. Log in to the admin panel
3. Navigate to Plugins → Install Plugin
4. Upload the ZIP file
5. Configure settings
6. Activate the plugin

### Method 2: Deploy via CDK

Add your plugin to the CDK stack:

```typescript
// lib/serverless-cms-stack.ts
import * as lambda from 'aws-cdk-lib/aws-lambda';

// Create plugin Lambda function
const readingTimePlugin = new lambda.Function(this, 'ReadingTimePlugin', {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: 'handler.add_reading_time',
  code: lambda.Code.fromAsset('plugins/reading-time'),
  environment: {
    CONTENT_TABLE: contentTable.tableName,
  },
});

// Grant permissions
contentTable.grantReadWriteData(readingTimePlugin);
```

Deploy:

```bash
cdk deploy
```

### Method 3: Manual Installation via API

```bash
# Install plugin
curl -X POST https://api.your-domain.com/api/v1/plugins/install \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "reading-time",
    "name": "Reading Time Estimator",
    "version": "1.0.0",
    "description": "Calculates reading time for posts",
    "author": "Your Name",
    "hooks": [
      {
        "hook_name": "content_create",
        "function_arn": "arn:aws:lambda:us-east-1:123456789:function:reading-time",
        "priority": 10
      }
    ],
    "config_schema": {
      "type": "object",
      "properties": {
        "words_per_minute": {
          "type": "number",
          "default": 200
        }
      }
    }
  }'

# Activate plugin
curl -X POST https://api.your-domain.com/api/v1/plugins/reading-time/activate \
  -H "Authorization: Bearer $TOKEN"

# Configure plugin
curl -X PUT https://api.your-domain.com/api/v1/plugins/reading-time/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "words_per_minute": 250
  }'
```

---

## Best Practices

### Performance

1. **Keep plugins lightweight** - Minimize dependencies and execution time
2. **Use caching** - Cache external API calls or expensive computations
3. **Set appropriate timeouts** - Configure Lambda timeout based on your needs
4. **Optimize cold starts** - Initialize clients outside the handler function

```python
import boto3

# Initialize outside handler for reuse
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def handler(event, context):
    # Handler uses pre-initialized clients
    pass
```

### Error Handling

1. **Always return proper status codes** - Use 200 for success, 500 for errors
2. **Log errors for debugging** - Use print() or logging module
3. **Fail gracefully** - Don't crash the entire content pipeline
4. **Provide meaningful error messages**

```python
def handler(event, context):
    try:
        # Plugin logic
        result = process_content(event['data'])
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    
    except KeyError as e:
        print(f"Missing required field: {e}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Missing field: {e}'})
        }
    
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        # Return original data on error to avoid breaking the pipeline
        return {
            'statusCode': 200,
            'body': json.dumps(event['data'])
        }
```

### Security

1. **Validate input data** - Never trust hook data without validation
2. **Sanitize HTML** - Use libraries like bleach for HTML sanitization
3. **Protect sensitive data** - Store API keys in environment variables
4. **Use IAM roles** - Grant minimal required permissions

```python
import os
import bleach

def handler(event, context):
    # Get secrets from environment
    api_key = os.environ.get('API_KEY')
    
    # Validate input
    content = event.get('data', {}).get('content', '')
    if not content:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Content is required'})
        }
    
    # Sanitize HTML
    clean_content = bleach.clean(content, tags=['p', 'br', 'strong'])
    
    # Process...
```

### Documentation

1. **Write clear README files** - Explain what your plugin does
2. **Document configuration options** - Describe each setting
3. **Provide examples** - Show how to use the plugin
4. **Include troubleshooting tips** - Help users debug issues

### Versioning

1. **Use semantic versioning** - MAJOR.MINOR.PATCH (e.g., 1.2.3)
2. **Document breaking changes** - Clearly mark incompatible updates
3. **Maintain backwards compatibility** - When possible, don't break existing installations

---

## Example Plugins

### Example 1: Syntax Highlighter

Adds syntax highlighting to code blocks in blog posts.

```python
# plugins/syntax-highlighter/handler.py
import json
import re
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter

def transform_content(event, context):
    """Add syntax highlighting to code blocks."""
    try:
        content = event['data']
        settings = event.get('settings', {})
        
        theme = settings.get('theme', 'monokai')
        line_numbers = settings.get('line_numbers', True)
        
        # Find code blocks: <pre><code class="language-python">...</code></pre>
        pattern = r'<pre><code class="language-(\w+)">(.*?)</code></pre>'
        
        def highlight_code(match):
            language = match.group(1)
            code = match.group(2)
            
            try:
                lexer = get_lexer_by_name(language)
                formatter = HtmlFormatter(
                    style=theme,
                    linenos='table' if line_numbers else False,
                    cssclass='highlight'
                )
                return highlight(code, lexer, formatter)
            except:
                return match.group(0)
        
        highlighted = re.sub(pattern, highlight_code, content, flags=re.DOTALL)
        
        return {
            'statusCode': 200,
            'body': json.dumps(highlighted)
        }
    
    except Exception as e:
        print(f"Syntax highlighter error: {str(e)}")
        return {
            'statusCode': 200,
            'body': json.dumps(event['data'])
        }
```

**plugin.json:**
```json
{
  "id": "syntax-highlighter",
  "name": "Syntax Highlighter",
  "version": "1.0.0",
  "description": "Adds syntax highlighting to code blocks",
  "author": "Your Name",
  "hooks": [
    {
      "hook_name": "content_render_post",
      "handler": "handler.transform_content",
      "priority": 5
    }
  ],
  "config_schema": {
    "type": "object",
    "properties": {
      "theme": {
        "type": "string",
        "enum": ["monokai", "github", "dracula", "solarized"],
        "default": "monokai",
        "description": "Color theme for syntax highlighting"
      },
      "line_numbers": {
        "type": "boolean",
        "default": true,
        "description": "Show line numbers"
      }
    }
  }
}
```

**requirements.txt:**
```
Pygments==2.17.2
```

---

### Example 2: Image Optimizer

Optimizes images on upload and generates WebP versions.

```python
# plugins/image-optimizer/handler.py
import json
import os
import boto3
from PIL import Image
from io import BytesIO

s3 = boto3.client('s3')

def optimize_image(event, context):
    """Optimize uploaded images and create WebP versions."""
    try:
        media_data = event['data']
        settings = event.get('settings', {})
        
        # Only process images
        if not media_data['mime_type'].startswith('image/'):
            return {
                'statusCode': 200,
                'body': json.dumps(media_data)
            }
        
        bucket = os.environ['MEDIA_BUCKET']
        s3_key = media_data['s3_key']
        
        # Download image
        response = s3.get_object(Bucket=bucket, Key=s3_key)
        image_data = response['Body'].read()
        
        # Open with PIL
        img = Image.open(BytesIO(image_data))
        
        # Get settings
        quality = settings.get('quality', 85)
        create_webp = settings.get('create_webp', True)
        
        # Optimize original
        output = BytesIO()
        img.save(output, format=img.format, quality=quality, optimize=True)
        output.seek(0)
        
        # Upload optimized version
        s3.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=output,
            ContentType=media_data['mime_type']
        )
        
        # Create WebP version
        if create_webp:
            webp_key = s3_key.rsplit('.', 1)[0] + '.webp'
            webp_output = BytesIO()
            img.save(webp_output, format='WEBP', quality=quality)
            webp_output.seek(0)
            
            s3.put_object(
                Bucket=bucket,
                Key=webp_key,
                Body=webp_output,
                ContentType='image/webp'
            )
            
            # Add WebP URL to metadata
            media_data['webp_url'] = f"https://{bucket}.s3.amazonaws.com/{webp_key}"
        
        return {
            'statusCode': 200,
            'body': json.dumps(media_data)
        }
    
    except Exception as e:
        print(f"Image optimizer error: {str(e)}")
        return {
            'statusCode': 200,
            'body': json.dumps(event['data'])
        }
```

---

### Example 3: SEO Analyzer

Analyzes content and provides SEO recommendations.

```python
# plugins/seo-analyzer/handler.py
import json
import re
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
    
    def handle_data(self, data):
        self.text.append(data)
    
    def get_text(self):
        return ' '.join(self.text)

def analyze_seo(event, context):
    """Analyze content and add SEO recommendations."""
    try:
        content_data = event['data']
        
        title = content_data.get('title', '')
        content = content_data.get('content', '')
        excerpt = content_data.get('excerpt', '')
        
        # Extract text
        parser = TextExtractor()
        parser.feed(content)
        text = parser.get_text()
        
        # Analyze
        word_count = len(re.findall(r'\w+', text))
        
        recommendations = []
        
        # Check title length
        if len(title) < 30:
            recommendations.append('Title is too short (< 30 characters)')
        elif len(title) > 60:
            recommendations.append('Title is too long (> 60 characters)')
        
        # Check excerpt
        if not excerpt:
            recommendations.append('Missing meta description (excerpt)')
        elif len(excerpt) < 120:
            recommendations.append('Meta description is too short (< 120 characters)')
        
        # Check content length
        if word_count < 300:
            recommendations.append(f'Content is short ({word_count} words). Aim for 300+ words.')
        
        # Check headings
        h1_count = len(re.findall(r'<h1[^>]*>', content))
        if h1_count == 0:
            recommendations.append('No H1 heading found')
        elif h1_count > 1:
            recommendations.append('Multiple H1 headings found (should be only one)')
        
        # Check images
        img_count = len(re.findall(r'<img[^>]*>', content))
        img_with_alt = len(re.findall(r'<img[^>]*alt=["\'][^"\']+["\'][^>]*>', content))
        
        if img_count > 0 and img_with_alt < img_count:
            recommendations.append(f'{img_count - img_with_alt} images missing alt text')
        
        # Add to metadata
        if 'metadata' not in content_data:
            content_data['metadata'] = {}
        
        if 'custom_fields' not in content_data['metadata']:
            content_data['metadata']['custom_fields'] = {}
        
        content_data['metadata']['custom_fields']['seo_score'] = max(0, 100 - (len(recommendations) * 10))
        content_data['metadata']['custom_fields']['seo_recommendations'] = recommendations
        
        return {
            'statusCode': 200,
            'body': json.dumps(content_data)
        }
    
    except Exception as e:
        print(f"SEO analyzer error: {str(e)}")
        return {
            'statusCode': 200,
            'body': json.dumps(event['data'])
        }
```

---

## Troubleshooting

### Plugin Not Executing

1. **Check if plugin is activated** - Verify in admin panel
2. **Verify hook name** - Ensure hook name matches exactly
3. **Check Lambda permissions** - Ensure Lambda has required IAM permissions
4. **Review CloudWatch logs** - Check for execution errors

### Configuration Not Working

1. **Validate schema** - Ensure config_schema is valid JSON Schema
2. **Check default values** - Verify defaults are set correctly
3. **Test settings API** - Use API to get/update settings

### Performance Issues

1. **Check Lambda timeout** - Increase if needed
2. **Monitor memory usage** - Increase Lambda memory allocation
3. **Review CloudWatch metrics** - Check duration and errors
4. **Optimize code** - Profile and optimize slow operations

### Debugging Tips

```python
import json

def handler(event, context):
    # Log event data for debugging
    print(f"Event: {json.dumps(event)}")
    print(f"Context: {context}")
    
    try:
        # Your code
        result = process(event['data'])
        
        print(f"Result: {json.dumps(result)}")
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise
```

---

## Resources

- [AWS Lambda Python Documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [JSON Schema Documentation](https://json-schema.org/)
- [Pygments Documentation](https://pygments.org/)
- [Pillow (PIL) Documentation](https://pillow.readthedocs.io/)

## Support

For plugin development support:
- GitHub Issues: https://github.com/your-org/serverless-cms/issues
- Documentation: https://docs.your-domain.com
- Community Forum: https://community.your-domain.com

---

**Happy Plugin Development!** 🚀
