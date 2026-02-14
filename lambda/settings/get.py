"""
Get all settings Lambda function.
Handles GET /api/v1/settings requests.
"""
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.db import SettingsRepository


settings_repo = SettingsRepository()


def handler(event, context):
    """
    Get all settings.
    
    Requirements:
    - 9.1: Retrieve settings from DynamoDB settings table
    - 9.3: Public website loads settings to apply to display
    - 9.4: Support settings for site title, site description, and theme selection
    
    Note: This endpoint is public to allow the public website to fetch settings.
    """
    try:
        # Get all settings from DynamoDB
        settings_list = settings_repo.get_all()
        
        # Convert list of settings to a dictionary for easier consumption
        settings_dict = {}
        for setting in settings_list:
            key = setting.get('key', '')
            value = setting.get('value')
            settings_dict[key] = value
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(settings_dict, default=str)
        }
    
    except Exception as e:
        print(f"Error getting settings: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
