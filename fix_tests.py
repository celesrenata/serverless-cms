#!/usr/bin/env python3
import re
import sys

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix get_by_id calls - remove second parameter
    content = re.sub(
        r'content_repo\.get_by_id\([^,]+,\s*f"[^"]+"\)',
        lambda m: m.group(0).split(',')[0] + ')',
        content
    )
    
    # Fix update calls - convert string created_at to int
    content = re.sub(
        r'content_repo\.update\(([^,]+),\s*f"([^"]+)#(\d+)"',
        r'content_repo.update(\1, \3',
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
