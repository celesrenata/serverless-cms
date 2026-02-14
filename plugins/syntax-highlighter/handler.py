"""
Syntax Highlighter Plugin
Adds syntax highlighting to code blocks in blog posts using Pygments
"""
import json
import re
import boto3
from pygments import highlight
from pygments.lexers import get_lexer_by_name, guess_lexer
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound

dynamodb = boto3.resource('dynamodb')

def get_plugin_settings(plugin_id):
    """Retrieve plugin settings from DynamoDB."""
    try:
        settings_table = dynamodb.Table('cms-settings')
        response = settings_table.get_item(Key={'key': f'plugin:{plugin_id}:config'})
        if 'Item' in response:
            return response['Item']['value']
        return {}
    except Exception as e:
        print(f"Error retrieving plugin settings: {e}")
        return {}

def extract_code_blocks(content):
    """
    Extract code blocks from HTML content.
    Supports both <pre><code> and <code> tags with optional language class.
    """
    # Pattern for <pre><code class="language-python">...</code></pre>
    pre_code_pattern = r'<pre><code(?:\s+class="language-(\w+)")?>(.*?)</code></pre>'
    
    # Pattern for standalone <code class="language-python">...</code>
    inline_code_pattern = r'<code(?:\s+class="language-(\w+)")>(.*?)</code>'
    
    blocks = []
    
    # Find all pre+code blocks
    for match in re.finditer(pre_code_pattern, content, re.DOTALL):
        language = match.group(1)
        code = match.group(2)
        blocks.append({
            'full_match': match.group(0),
            'language': language,
            'code': code,
            'start': match.start(),
            'end': match.end(),
            'type': 'block'
        })
    
    return blocks

def unescape_html(text):
    """Unescape HTML entities in code."""
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&amp;', '&')
    text = text.replace('&quot;', '"')
    text = text.replace('&#39;', "'")
    return text

def highlight_code_block(code, language, settings):
    """Apply syntax highlighting to a code block."""
    # Unescape HTML entities
    code = unescape_html(code.strip())
    
    # Get lexer
    try:
        if language:
            lexer = get_lexer_by_name(language, stripall=True)
        else:
            lexer = guess_lexer(code)
    except ClassNotFound:
        # If language not found, return original code in a pre tag
        return f'<pre><code>{code}</code></pre>'
    
    # Configure formatter
    theme = settings.get('theme', 'monokai')
    line_numbers = settings.get('line_numbers', True)
    line_number_start = settings.get('line_number_start', 1)
    highlight_lines = settings.get('highlight_lines', [])
    
    formatter_options = {
        'style': theme,
        'cssclass': 'syntax-highlight',
        'wrapcode': True,
    }
    
    if line_numbers:
        formatter_options['linenos'] = 'table'
        formatter_options['linenostart'] = line_number_start
    
    if highlight_lines:
        formatter_options['hl_lines'] = highlight_lines
    
    formatter = HtmlFormatter(**formatter_options)
    
    # Generate highlighted HTML
    highlighted = highlight(code, lexer, formatter)
    
    # Add CSS if not already present (will be added once per content)
    css = formatter.get_style_defs('.syntax-highlight')
    
    return highlighted, css

def process_content(content, settings):
    """Process content and apply syntax highlighting to all code blocks."""
    code_blocks = extract_code_blocks(content)
    
    if not code_blocks:
        return content
    
    # Sort blocks by position (reverse order to maintain positions during replacement)
    code_blocks.sort(key=lambda x: x['start'], reverse=True)
    
    css_added = False
    css_styles = None
    
    # Replace each code block with highlighted version
    for block in code_blocks:
        highlighted, css = highlight_code_block(
            block['code'],
            block['language'],
            settings
        )
        
        if not css_added:
            css_styles = css
            css_added = True
        
        # Replace in content
        content = content[:block['start']] + highlighted + content[block['end']:]
    
    # Add CSS styles to the beginning of content
    if css_added and css_styles:
        style_tag = f'<style>\n{css_styles}\n</style>\n'
        content = style_tag + content
    
    return content

def handler(event, context):
    """
    Lambda handler for syntax highlighting plugin.
    Receives content via the content_render_post hook.
    """
    try:
        # Parse event
        hook_name = event.get('hook')
        data = event.get('data')
        
        if hook_name != 'content_render_post':
            return {
                'statusCode': 200,
                'body': json.dumps(data)
            }
        
        # Get plugin settings
        settings = get_plugin_settings('syntax-highlighter')
        
        # Process content if it's a string
        if isinstance(data, str):
            processed_content = process_content(data, settings)
            return {
                'statusCode': 200,
                'body': json.dumps(processed_content)
            }
        
        # Process content if it's a dict with content field
        if isinstance(data, dict) and 'content' in data:
            data['content'] = process_content(data['content'], settings)
            return {
                'statusCode': 200,
                'body': json.dumps(data)
            }
        
        # Return unchanged if format not recognized
        return {
            'statusCode': 200,
            'body': json.dumps(data)
        }
    
    except Exception as e:
        print(f"Error in syntax highlighter plugin: {e}")
        # Return original data on error
        return {
            'statusCode': 200,
            'body': json.dumps(event.get('data'))
        }
