"""
Get public site settings (no authentication required).
Returns only settings that should be visible to public users.
"""
import json
import logging
import os
from typing import Any, Dict
from shared.middleware import get_cached_settings

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Settings that are safe to expose publicly
PUBLIC_SETTINGS = [
    'site_title',
    'site_description',
    'registration_enabled',
    'comments_enabled',
    'captcha_enabled',
]


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Get public site settings
    
    Returns only settings that should be visible to public users.
    """
    try:
        # Get all settings from cache
        all_settings = get_cached_settings()
        
        # Filter to only public settings
        public_settings = {
            key: all_settings.get(key, False)
            for key in PUBLIC_SETTINGS
        }
        
        logger.info("Retrieved public settings")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(public_settings)
        }
        
    except Exception as e:
        logger.error(f"Error getting public settings: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'error': 'Failed to get settings'})
        }
