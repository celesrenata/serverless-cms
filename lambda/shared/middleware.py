"""
Middleware utilities for Lambda functions.

Provides settings caching and feature gating functionality.
"""

import time
import logging
import os
from typing import Optional, Dict, Any
from .db import SettingsRepository

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Settings cache with TTL
_settings_cache: Dict[str, Any] = {}
_cache_timestamp: float = 0
CACHE_TTL = 300  # 5 minutes


def get_cached_settings() -> Dict[str, Any]:
    """
    Get site settings with caching.
    
    Returns:
        Dictionary of all site settings
    """
    global _settings_cache, _cache_timestamp
    
    current_time = time.time()
    
    # Check if cache is valid
    if _settings_cache and (current_time - _cache_timestamp) < CACHE_TTL:
        logger.debug("Returning cached settings")
        return _settings_cache
    
    # Fetch fresh settings from DynamoDB
    logger.debug("Fetching fresh settings from DynamoDB")
    try:
        settings_repo = SettingsRepository()
        items = settings_repo.get_all()
        
        # Convert list of items to dictionary
        settings = {}
        for item in items:
            settings[item['key']] = item.get('value')
        
        # Update cache
        _settings_cache = settings
        _cache_timestamp = current_time
        
        logger.info(f"Cached {len(settings)} settings")
        return settings
        
    except Exception as e:
        logger.error(f"Error fetching settings: {str(e)}")
        # Return cached settings if available, even if expired
        if _settings_cache:
            logger.warning("Returning expired cache due to error")
            return _settings_cache
        return {}


def check_setting(setting_key: str, default: bool = False) -> bool:
    """
    Check if a feature is enabled via settings.
    
    Args:
        setting_key: The setting key to check (e.g., 'registration_enabled')
        default: Default value if setting not found
        
    Returns:
        Boolean indicating if the feature is enabled
    """
    settings = get_cached_settings()
    value = settings.get(setting_key, default)
    
    # Handle various truthy values
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'enabled')
    if isinstance(value, (int, float)):
        return bool(value)
    
    return default


def require_setting(setting_key: str, feature_name: str = None) -> None:
    """
    Raise an error if a required setting is not enabled.
    
    Args:
        setting_key: The setting key to check
        feature_name: Human-readable feature name for error message
        
    Raises:
        ValueError: If the setting is not enabled
    """
    if not check_setting(setting_key):
        feature = feature_name or setting_key.replace('_', ' ')
        raise ValueError(f"{feature} is currently disabled")


def clear_settings_cache() -> None:
    """
    Clear the settings cache.
    Useful for testing or when settings are updated.
    """
    global _settings_cache, _cache_timestamp
    _settings_cache = {}
    _cache_timestamp = 0
    logger.info("Settings cache cleared")
