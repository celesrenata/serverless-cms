"""
Database repository classes for DynamoDB operations.
Provides CRUD operations and query methods for all CMS tables.
"""
import boto3
from boto3.dynamodb.conditions import Key, Attr
from typing import Dict, List, Any, Optional
import os
from decimal import Decimal


dynamodb = boto3.resource('dynamodb')


class ContentRepository:
    """Repository for content management operations."""
    
    def __init__(self):
        table_name = os.environ.get('CONTENT_TABLE', 'cms-content-dev')
        self.table = dynamodb.Table(table_name)
    
    def create(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new content item."""
        try:
            self.table.put_item(Item=item)
            return item
        except Exception as e:
            raise Exception(f"Failed to create content: {str(e)}")
    
    def get_by_id(self, content_id: str, type_timestamp: str) -> Optional[Dict[str, Any]]:
        """Get content by ID and type#timestamp."""
        try:
            response = self.table.get_item(
                Key={
                    'id': content_id,
                    'type#timestamp': type_timestamp
                }
            )
            return response.get('Item')
        except Exception as e:
            raise Exception(f"Failed to get content: {str(e)}")
    
    def get_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """Get content by slug using GSI."""
        try:
            response = self.table.query(
                IndexName='slug-index',
                KeyConditionExpression=Key('slug').eq(slug),
                Limit=1
            )
            items = response.get('Items', [])
            return items[0] if items else None
        except Exception as e:
            raise Exception(f"Failed to get content by slug: {str(e)}")
    
    def list_by_type(
        self, 
        content_type: str, 
        status: Optional[str] = None,
        limit: int = 20, 
        last_key: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """List content by type with pagination."""
        try:
            # For draft/archived content, use status-scheduled_at-index
            # For published content, use type-published_at-index
            # For all statuses (None), use type-published_at-index without filter
            if status in ['draft', 'archived']:
                query_params = {
                    'IndexName': 'status-scheduled_at-index',
                    'KeyConditionExpression': Key('status').eq(status),
                    'FilterExpression': Attr('type').eq(content_type),
                    'ScanIndexForward': False,  # Descending order
                    'Limit': limit
                }
            else:
                # Use type-published_at-index for published or all statuses
                query_params = {
                    'IndexName': 'type-published_at-index',
                    'KeyConditionExpression': Key('type').eq(content_type),
                    'ScanIndexForward': False,  # Descending order
                    'Limit': limit
                }
                # Only filter by status if a specific status is requested
                if status:
                    query_params['FilterExpression'] = Attr('status').eq(status)
            
            if last_key:
                query_params['ExclusiveStartKey'] = last_key
            
            response = self.table.query(**query_params)
            return {
                'items': response.get('Items', []),
                'last_key': response.get('LastEvaluatedKey')
            }
        except Exception as e:
            raise Exception(f"Failed to list content: {str(e)}")
    
    def update(self, content_id: str, type_timestamp: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update content item."""
        try:
            # Build update expression dynamically
            update_expr_parts = []
            expr_attr_names = {}
            expr_attr_values = {}
            
            for key, value in updates.items():
                # Use attribute names to handle reserved keywords
                attr_name = f"#{key}"
                attr_value = f":{key}"
                update_expr_parts.append(f"{attr_name} = {attr_value}")
                expr_attr_names[attr_name] = key
                expr_attr_values[attr_value] = value
            
            update_expr = "SET " + ", ".join(update_expr_parts)
            
            response = self.table.update_item(
                Key={
                    'id': content_id,
                    'type#timestamp': type_timestamp
                },
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )
            return response.get('Attributes')
        except Exception as e:
            raise Exception(f"Failed to update content: {str(e)}")
    
    def delete(self, content_id: str, type_timestamp: str) -> None:
        """Delete content item."""
        try:
            self.table.delete_item(
                Key={
                    'id': content_id,
                    'type#timestamp': type_timestamp
                }
            )
        except Exception as e:
            raise Exception(f"Failed to delete content: {str(e)}")
    
    def get_scheduled_content(self, current_time: int) -> List[Dict[str, Any]]:
        """Get content scheduled for publication."""
        try:
            response = self.table.query(
                IndexName='status-scheduled_at-index',
                KeyConditionExpression=Key('status').eq('draft') & Key('scheduled_at').lte(current_time)
            )
            return response.get('Items', [])
        except Exception as e:
            raise Exception(f"Failed to get scheduled content: {str(e)}")


class MediaRepository:
    """Repository for media management operations."""
    
    def __init__(self):
        table_name = os.environ.get('MEDIA_TABLE', 'cms-media-dev')
        self.table = dynamodb.Table(table_name)
    
    def create(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new media item."""
        try:
            self.table.put_item(Item=item)
            return item
        except Exception as e:
            raise Exception(f"Failed to create media: {str(e)}")
    
    def get_by_id(self, media_id: str) -> Optional[Dict[str, Any]]:
        """Get media by ID."""
        try:
            response = self.table.get_item(Key={'id': media_id})
            return response.get('Item')
        except Exception as e:
            raise Exception(f"Failed to get media: {str(e)}")
    
    def list_media(
        self, 
        limit: int = 20, 
        last_key: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """List media with pagination."""
        try:
            scan_params = {
                'Limit': limit
            }
            
            if last_key:
                scan_params['ExclusiveStartKey'] = last_key
            
            response = self.table.scan(**scan_params)
            return {
                'items': response.get('Items', []),
                'last_key': response.get('LastEvaluatedKey')
            }
        except Exception as e:
            raise Exception(f"Failed to list media: {str(e)}")
    
    def update(self, media_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update media item."""
        try:
            update_expr_parts = []
            expr_attr_names = {}
            expr_attr_values = {}
            
            for key, value in updates.items():
                attr_name = f"#{key}"
                attr_value = f":{key}"
                update_expr_parts.append(f"{attr_name} = {attr_value}")
                expr_attr_names[attr_name] = key
                expr_attr_values[attr_value] = value
            
            update_expr = "SET " + ", ".join(update_expr_parts)
            
            response = self.table.update_item(
                Key={'id': media_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )
            return response.get('Attributes')
        except Exception as e:
            raise Exception(f"Failed to update media: {str(e)}")
    
    def delete(self, media_id: str) -> None:
        """Delete media item."""
        try:
            self.table.delete_item(Key={'id': media_id})
        except Exception as e:
            raise Exception(f"Failed to delete media: {str(e)}")


class UserRepository:
    """Repository for user management operations."""
    
    def __init__(self):
        table_name = os.environ.get('USERS_TABLE', 'cms-users-dev')
        self.table = dynamodb.Table(table_name)
    
    def create(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user."""
        try:
            self.table.put_item(Item=item)
            return item
        except Exception as e:
            raise Exception(f"Failed to create user: {str(e)}")
    
    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        try:
            response = self.table.get_item(Key={'id': user_id})
            return response.get('Item')
        except Exception as e:
            raise Exception(f"Failed to get user: {str(e)}")
    
    def list_users(
        self, 
        limit: int = 50, 
        last_key: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """List users with pagination."""
        try:
            scan_params = {
                'Limit': limit
            }
            
            if last_key:
                scan_params['ExclusiveStartKey'] = last_key
            
            response = self.table.scan(**scan_params)
            return {
                'items': response.get('Items', []),
                'last_key': response.get('LastEvaluatedKey')
            }
        except Exception as e:
            raise Exception(f"Failed to list users: {str(e)}")
    
    def update(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user."""
        try:
            update_expr_parts = []
            expr_attr_names = {}
            expr_attr_values = {}
            
            for key, value in updates.items():
                attr_name = f"#{key}"
                attr_value = f":{key}"
                update_expr_parts.append(f"{attr_name} = {attr_value}")
                expr_attr_names[attr_name] = key
                expr_attr_values[attr_value] = value
            
            update_expr = "SET " + ", ".join(update_expr_parts)
            
            response = self.table.update_item(
                Key={'id': user_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )
            return response.get('Attributes')
        except Exception as e:
            raise Exception(f"Failed to update user: {str(e)}")
    
    def delete(self, user_id: str) -> None:
        """Delete user."""
        try:
            self.table.delete_item(Key={'id': user_id})
        except Exception as e:
            raise Exception(f"Failed to delete user: {str(e)}")


class SettingsRepository:
    """Repository for settings management operations."""
    
    def __init__(self):
        table_name = os.environ.get('SETTINGS_TABLE', 'cms-settings-dev')
        self.table = dynamodb.Table(table_name)
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get setting by key."""
        try:
            response = self.table.get_item(Key={'key': key})
            return response.get('Item')
        except Exception as e:
            raise Exception(f"Failed to get setting: {str(e)}")
    
    def set(self, key: str, value: Any, updated_by: str, updated_at: int) -> Dict[str, Any]:
        """Set or update a setting."""
        try:
            item = {
                'key': key,
                'value': value,
                'updated_by': updated_by,
                'updated_at': updated_at
            }
            self.table.put_item(Item=item)
            return item
        except Exception as e:
            raise Exception(f"Failed to set setting: {str(e)}")
    
    def get_all(self) -> List[Dict[str, Any]]:
        """Get all settings."""
        try:
            response = self.table.scan()
            return response.get('Items', [])
        except Exception as e:
            raise Exception(f"Failed to get all settings: {str(e)}")
    
    def delete(self, key: str) -> None:
        """Delete a setting."""
        try:
            self.table.delete_item(Key={'key': key})
        except Exception as e:
            raise Exception(f"Failed to delete setting: {str(e)}")


class PluginRepository:
    """Repository for plugin management operations."""
    
    def __init__(self):
        table_name = os.environ.get('PLUGINS_TABLE', 'cms-plugins-dev')
        self.table = dynamodb.Table(table_name)
    
    def create(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new plugin."""
        try:
            self.table.put_item(Item=item)
            return item
        except Exception as e:
            raise Exception(f"Failed to create plugin: {str(e)}")
    
    def get_by_id(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get plugin by ID."""
        try:
            response = self.table.get_item(Key={'id': plugin_id})
            return response.get('Item')
        except Exception as e:
            raise Exception(f"Failed to get plugin: {str(e)}")
    
    def list_plugins(
        self, 
        active_only: bool = False,
        limit: int = 50, 
        last_key: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """List plugins with optional filtering."""
        try:
            scan_params = {
                'Limit': limit
            }
            
            if active_only:
                scan_params['FilterExpression'] = Attr('active').eq(True)
            
            if last_key:
                scan_params['ExclusiveStartKey'] = last_key
            
            response = self.table.scan(**scan_params)
            return {
                'items': response.get('Items', []),
                'last_key': response.get('LastEvaluatedKey')
            }
        except Exception as e:
            raise Exception(f"Failed to list plugins: {str(e)}")
    
    def update(self, plugin_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update plugin."""
        try:
            update_expr_parts = []
            expr_attr_names = {}
            expr_attr_values = {}
            
            for key, value in updates.items():
                attr_name = f"#{key}"
                attr_value = f":{key}"
                update_expr_parts.append(f"{attr_name} = {attr_value}")
                expr_attr_names[attr_name] = key
                expr_attr_values[attr_value] = value
            
            update_expr = "SET " + ", ".join(update_expr_parts)
            
            response = self.table.update_item(
                Key={'id': plugin_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )
            return response.get('Attributes')
        except Exception as e:
            raise Exception(f"Failed to update plugin: {str(e)}")
    
    def delete(self, plugin_id: str) -> None:
        """Delete plugin."""
        try:
            self.table.delete_item(Key={'id': plugin_id})
        except Exception as e:
            raise Exception(f"Failed to delete plugin: {str(e)}")
