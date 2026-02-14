"""
Shared utilities for Lambda functions.
Provides database repositories and common utilities.
"""

from .db import (
    ContentRepository,
    MediaRepository,
    UserRepository,
    SettingsRepository,
    PluginRepository,
)

from .s3 import (
    upload_file,
    generate_thumbnails,
    delete_file,
    get_file_dimensions,
    extract_s3_key_from_url,
)

from .auth import (
    verify_token,
    get_user_role,
    check_permission,
    require_auth,
    extract_user_from_event,
)

__all__ = [
    'ContentRepository',
    'MediaRepository',
    'UserRepository',
    'SettingsRepository',
    'PluginRepository',
    'upload_file',
    'generate_thumbnails',
    'delete_file',
    'get_file_dimensions',
    'extract_s3_key_from_url',
    'verify_token',
    'get_user_role',
    'check_permission',
    'require_auth',
    'extract_user_from_event',
]
