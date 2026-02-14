# Plugin management Lambda functions

"""
Plugin system Lambda functions for the Serverless CMS.

This module provides handlers for:
- Installing plugins
- Activating/deactivating plugins
- Listing installed plugins
- Managing plugin settings
"""

__all__ = [
    'install',
    'activate',
    'deactivate',
    'list',
    'get_settings',
    'update_settings'
]
