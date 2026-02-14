# Syntax Highlighter Plugin

A plugin for the Serverless CMS that adds syntax highlighting to code blocks in blog posts using Pygments.

## Features

- Automatic syntax highlighting for code blocks
- Support for 100+ programming languages
- Multiple color themes (monokai, github, solarized-dark, solarized-light, dracula, nord)
- Optional line numbers
- Configurable starting line number
- Ability to highlight specific lines

## Installation

1. Package the plugin:
```bash
cd plugins/syntax-highlighter
zip -r syntax-highlighter.zip .
```

2. Upload via Admin Panel:
   - Navigate to Plugins page
   - Click "Install Plugin"
   - Upload the `syntax-highlighter.zip` file

3. Activate the plugin from the Plugins page

## Configuration

The plugin can be configured with the following options:

- **theme**: Color theme for syntax highlighting
  - Options: `monokai`, `github`, `solarized-dark`, `solarized-light`, `dracula`, `nord`
  - Default: `monokai`

- **line_numbers**: Show line numbers in code blocks
  - Type: boolean
  - Default: `true`

- **line_number_start**: Starting line number
  - Type: integer
  - Default: `1`

- **highlight_lines**: Array of line numbers to highlight
  - Type: array of integers
  - Default: `[]`
  - Example: `[1, 3, 5]` to highlight lines 1, 3, and 5

## Usage

The plugin automatically processes all code blocks in blog posts. Code blocks should be formatted as:

```html
<pre><code class="language-python">
def hello_world():
    print("Hello, World!")
</code></pre>
```

Or in Markdown:

````markdown
```python
def hello_world():
    print("Hello, World!")
```
````

## Supported Languages

The plugin supports all languages supported by Pygments, including:

- Python
- JavaScript/TypeScript
- Java
- C/C++
- Go
- Rust
- Ruby
- PHP
- HTML/CSS
- SQL
- Bash/Shell
- And many more...

## How It Works

1. The plugin registers a hook for `content_render_post`
2. When content is rendered, the plugin extracts all code blocks
3. Each code block is processed with Pygments
4. The highlighted HTML is injected back into the content
5. CSS styles are added to the content for proper rendering

## Development

To modify the plugin:

1. Edit `handler.py` for the main logic
2. Update `plugin.json` for metadata or configuration schema
3. Test locally before packaging
4. Increment version number in `plugin.json`

## License

MIT License
