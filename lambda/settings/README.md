# Settings Lambda Functions

This directory contains Lambda functions for managing site settings.

## Endpoints

- `GET /api/v1/settings` - Get all settings
- `PUT /api/v1/settings` - Update settings (admin only)

## Requirements

- 9.1: Store settings in DynamoDB settings table
- 9.2: Admin-only access for updates
- 9.4: Support settings for site title, site description, and theme selection
- 9.5: Record timestamp and user for updates
