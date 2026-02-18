#!/usr/bin/env python3
import re
import sys

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix get_by_id calls - remove second parameter
    content = re.sub(
        r'content_repo\.get_by_id\(([^,]+),\s*f"[^"]+"\)',
        r'content_repo.get_by_id(\1)',
        content
    )
    
    # Fix update calls - convert f"type#{timestamp}" to just timestamp as int
    # Pattern: content_repo.update(id, f"type#{timestamp}", updates)
    def replace_update(match):
        content_id = match.group(1)
        timestamp_expr = match.group(2)
        updates = match.group(3)
        return f'content_repo.update({content_id}, {timestamp_expr}, {updates})'
    
    content = re.sub(
        r'content_repo\.update\(([^,]+),\s*f"[^"]+#([^"]+)"\s*,\s*(.+?)\)',
        replace_update,
        content
    )
    
    # Also handle item['type#timestamp'] pattern
    content = re.sub(
        r"content_repo\.update\(([^,]+),\s*item\['type#timestamp'\]\s*,",
        r"content_repo.update(\1, item['created_at'],",
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")

if __name__ == '__main__':
    files = [
        'tests/test_content_integration.py',
        'tests/test_e2e_workflows.py',
        'tests/test_scheduler_integration.py'
    ]
    
    for f in files:
        try:
            fix_file(f)
        except Exception as e:
            print(f"Error fixing {f}: {e}")
