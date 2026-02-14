# Serverless CMS Plugins

This directory contains example plugins for the Serverless CMS system. Plugins extend the functionality of the CMS without modifying core code.

## Available Plugins

### 1. Syntax Highlighter
Adds syntax highlighting to code blocks in blog posts using Pygments.

**Features:**
- Support for 100+ programming languages
- Multiple color themes
- Optional line numbers
- Configurable highlighting

**Location:** `plugins/syntax-highlighter/`

### 2. Gallery Enhancer
Enhances photo galleries with custom layouts, animations, and interactive features.

**Features:**
- Multiple layout options (grid, masonry, carousel, justified)
- Hover animations
- Lazy loading
- Built-in lightbox
- Responsive design

**Location:** `plugins/gallery-enhancer/`

## Plugin Architecture

### Plugin Structure

Each plugin consists of:

```
plugin-name/
├── plugin.json          # Plugin metadata and configuration
├── handler.py           # Lambda function handler
├── requirements.txt     # Python dependencies
├── README.md           # Plugin documentation
└── package.sh          # Packaging script
```

### plugin.json Format

```json
{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Author Name",
  "hooks": [
    {
      "hook_name": "hook_name",
      "function_name": "lambda-function-name",
      "priority": 10
    }
  ],
  "config_schema": {
    "type": "object",
    "properties": {
      "setting_name": {
        "type": "string",
        "default": "value"
      }
    }
  }
}
```

## Available Hooks

Plugins can register functions for the following hooks:

### Content Hooks
- `content_create`: Triggered when content is created
- `content_update`: Triggered when content is updated
- `content_delete`: Triggered when content is deleted
- `content_render_post`: Triggered when rendering a blog post
- `content_render_page`: Triggered when rendering a page
- `content_render_gallery`: Triggered when rendering a gallery
- `content_render_project`: Triggered when rendering a project

### Media Hooks
- `media_upload`: Triggered when media is uploaded
- `media_delete`: Triggered when media is deleted

### User Hooks
- `user_create`: Triggered when a user is created
- `user_update`: Triggered when a user is updated

## Creating a Plugin

### 1. Create Plugin Directory

```bash
mkdir plugins/my-plugin
cd plugins/my-plugin
```

### 2. Create plugin.json

Define your plugin metadata, hooks, and configuration schema.

### 3. Create handler.py

Implement your Lambda function handler:

```python
import json
import boto3

def handler(event, context):
    """Plugin Lambda handler."""
    try:
        hook_name = event.get('hook')
        data = event.get('data')
        
        # Process data based on hook
        processed_data = process_data(data)
        
        return {
            'statusCode': 200,
            'body': json.dumps(processed_data)
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 200,
            'body': json.dumps(event.get('data'))
        }
```

### 4. Add Dependencies

Create `requirements.txt` with your Python dependencies.

### 5. Create Documentation

Write a README.md explaining how to use your plugin.

### 6. Package Plugin

Create a packaging script or use the example:

```bash
#!/bin/bash
zip -r my-plugin.zip plugin.json handler.py requirements.txt README.md
```

## Installing Plugins

### Via Admin Panel

1. Navigate to the Plugins page
2. Click "Install Plugin"
3. Upload the plugin ZIP file
4. Activate the plugin

### Via API

```bash
# Install plugin
curl -X POST https://api.example.com/api/v1/plugins/install \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@my-plugin.zip"

# Activate plugin
curl -X POST https://api.example.com/api/v1/plugins/{plugin-id}/activate \
  -H "Authorization: Bearer $TOKEN"
```

## Plugin Configuration

Plugins can be configured through the Admin Panel:

1. Navigate to Plugins page
2. Click on the plugin
3. Click "Settings"
4. Update configuration values
5. Save changes

Configuration is stored in DynamoDB and accessible to the plugin Lambda function.

## Hook Execution Order

When multiple plugins register the same hook:

1. Plugins are executed in priority order (lower number = higher priority)
2. Each plugin receives the output of the previous plugin
3. If a plugin fails, the error is logged but execution continues
4. The final result is returned to the caller

## Best Practices

### Error Handling
Always return the original data if your plugin encounters an error:

```python
except Exception as e:
    print(f"Error: {e}")
    return {
        'statusCode': 200,
        'body': json.dumps(event.get('data'))
    }
```

### Performance
- Keep plugin execution time under 3 seconds
- Use caching when possible
- Minimize external API calls

### Security
- Validate all input data
- Sanitize HTML output
- Don't expose sensitive information in logs
- Use IAM roles for AWS service access

### Configuration
- Provide sensible defaults
- Validate configuration against schema
- Document all configuration options

## Testing Plugins

### Local Testing

```python
# test_plugin.py
from handler import handler

event = {
    'hook': 'content_render_post',
    'data': '<p>Test content</p>'
}

result = handler(event, None)
print(result)
```

### Integration Testing

Deploy the plugin to a test environment and verify:
- Hook registration works correctly
- Configuration is applied properly
- Output is as expected
- Error handling works

## Troubleshooting

### Plugin Not Executing

1. Check plugin is activated in Admin Panel
2. Verify hook name matches exactly
3. Check CloudWatch logs for errors
4. Ensure Lambda function has correct permissions

### Configuration Not Applied

1. Verify configuration is saved in DynamoDB
2. Check plugin reads from correct settings key
3. Validate configuration against schema

### Performance Issues

1. Check Lambda execution time in CloudWatch
2. Optimize code for performance
3. Consider caching frequently accessed data
4. Reduce external API calls

## Contributing

To contribute a plugin:

1. Create your plugin following the structure above
2. Test thoroughly
3. Document all features and configuration options
4. Submit a pull request with your plugin

## License

All example plugins are provided under the MIT License.
