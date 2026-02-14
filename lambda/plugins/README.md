# Plugin Management Lambda Functions

This module contains Lambda functions for managing the plugin system.

## Functions

### install.py
- **Endpoint**: POST /api/v1/plugins/install
- **Purpose**: Install a new plugin
- **Requirements**: 16.1
- **Validates**: Plugin structure and metadata
- **Stores**: Plugin metadata in DynamoDB

### activate.py
- **Endpoint**: POST /api/v1/plugins/{id}/activate
- **Purpose**: Activate an installed plugin
- **Requirements**: 16.2
- **Action**: Registers plugin hooks and makes functionality available

### deactivate.py
- **Endpoint**: POST /api/v1/plugins/{id}/deactivate
- **Purpose**: Deactivate an active plugin
- **Requirements**: 16.4
- **Action**: Unregisters plugin hooks without removing plugin files

### list.py
- **Endpoint**: GET /api/v1/plugins
- **Purpose**: List all installed plugins
- **Requirements**: 16.5
- **Returns**: Plugin registry with activation status and version information

## Plugin Structure

Plugins must include the following metadata:
- `id`: Unique plugin identifier
- `name`: Human-readable plugin name
- `version`: Semantic version string
- `description`: Plugin description
- `author`: Plugin author name
- `hooks`: Array of hook registrations (optional)
- `config_schema`: JSON schema for plugin settings (optional)

## Example Plugin Installation Request

```json
{
  "id": "syntax-highlighter-pro",
  "name": "Syntax Highlighter Pro",
  "version": "1.0.0",
  "description": "Enhanced syntax highlighting for code blocks",
  "author": "Your Name",
  "hooks": [
    {
      "hook_name": "content_render_post",
      "function_arn": "arn:aws:lambda:us-east-1:123456789:function:syntax-highlighter",
      "priority": 5
    }
  ],
  "config_schema": {
    "type": "object",
    "properties": {
      "theme": {
        "type": "string",
        "enum": ["monokai", "github", "dracula"],
        "default": "monokai"
      }
    }
  }
}
```
