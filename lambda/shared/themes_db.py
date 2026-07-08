"""
DynamoDB repository for CMS themes.

Provides ThemeRepository for CRUD operations on custom themes stored in the
cms-themes-{env} table. Follows the existing repository pattern used by
ContentRepository, UserRepository, etc.
"""

import os
import uuid
import time
from decimal import Decimal
from typing import Dict, List, Any, Optional

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError


dynamodb = boto3.resource('dynamodb')


def _convert_floats(obj: Any) -> Any:
    """Recursively convert float values to Decimal for DynamoDB storage."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: _convert_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_floats(item) for item in obj]
    return obj


class ThemeRepository:
    """Repository for theme management operations."""

    def __init__(self, table_name: Optional[str] = None) -> None:
        """
        Initialize the repository.

        Args:
            table_name: Optional DynamoDB table name. If not provided, uses the
                THEMES_TABLE environment variable, falling back to
                cms-themes-dev.
        """
        self.table_name = table_name or os.environ.get(
            'THEMES_TABLE', 'cms-themes-dev'
        )
        self.table = dynamodb.Table(self.table_name)

    def create(self, theme_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new theme.

        Generates a UUID for the id and sets created_at/updated_at timestamps.

        Args:
            theme_data: Theme data containing name, description, tokens,
                custom_css (optional), and created_by.

        Returns:
            The created theme item with generated id and timestamps.

        Raises:
            Exception: If the create operation fails.
        """
        try:
            now = int(time.time())
            item: Dict[str, Any] = {
                'id': str(uuid.uuid4()),
                'name': theme_data.get('name', ''),
                'description': theme_data.get('description', ''),
                'tokens': _convert_floats(theme_data.get('tokens', {})),
                'created_by': theme_data.get('created_by', ''),
                'created_at': now,
                'updated_at': now,
            }

            # Include custom_css only if provided
            if theme_data.get('custom_css'):
                item['custom_css'] = theme_data['custom_css']

            self.table.put_item(Item=item)
            return item
        except ClientError as e:
            raise Exception(f"Failed to create theme: {str(e)}")

    def get_by_id(self, theme_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a theme by ID.

        Args:
            theme_id: The theme's UUID.

        Returns:
            Theme item if found, otherwise None.

        Raises:
            Exception: If the read operation fails.
        """
        try:
            response = self.table.get_item(Key={'id': theme_id})
            return response.get('Item')
        except ClientError as e:
            raise Exception(f"Failed to get theme: {str(e)}")

    def get_all(self) -> List[Dict[str, Any]]:
        """
        Get all custom themes from the table.

        Handles DynamoDB scan pagination to return all items.

        Returns:
            List of all theme items.

        Raises:
            Exception: If the scan operation fails.
        """
        try:
            themes: List[Dict[str, Any]] = []
            exclusive_start_key = None

            while True:
                scan_params: Dict[str, Any] = {}

                if exclusive_start_key:
                    scan_params['ExclusiveStartKey'] = exclusive_start_key

                response = self.table.scan(**scan_params)
                themes.extend(response.get('Items', []))

                exclusive_start_key = response.get('LastEvaluatedKey')
                if not exclusive_start_key:
                    break

            return themes
        except ClientError as e:
            raise Exception(f"Failed to get all themes: {str(e)}")

    def update(self, theme_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Partial update of a theme.

        Sets updated_at timestamp automatically. Only updates the fields
        provided in the updates dict.

        Args:
            theme_id: The theme's UUID.
            updates: Dictionary of fields to update (name, description,
                tokens, custom_css).

        Returns:
            The updated theme item, or None if the theme doesn't exist.

        Raises:
            Exception: If the update operation fails.
        """
        try:
            # Always set updated_at on any update
            updates['updated_at'] = int(time.time())

            # Convert any float values to Decimal for DynamoDB
            updates = _convert_floats(updates)

            update_expr_parts: List[str] = []
            expr_attr_names: Dict[str, str] = {}
            expr_attr_values: Dict[str, Any] = {}

            for idx, (key, value) in enumerate(updates.items()):
                name_alias = f"#attr{idx}"
                value_alias = f":val{idx}"
                update_expr_parts.append(f"{name_alias} = {value_alias}")
                expr_attr_names[name_alias] = key
                expr_attr_values[value_alias] = value

            update_expr = "SET " + ", ".join(update_expr_parts)

            response = self.table.update_item(
                Key={'id': theme_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ConditionExpression=Attr('id').exists(),
                ReturnValues='ALL_NEW'
            )
            return response.get('Attributes')
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == 'ConditionalCheckFailedException':
                return None
            raise Exception(f"Failed to update theme: {str(e)}")

    def delete(self, theme_id: str) -> None:
        """
        Delete a theme by ID.

        Args:
            theme_id: The theme's UUID.

        Raises:
            Exception: If the delete operation fails.
        """
        try:
            self.table.delete_item(Key={'id': theme_id})
        except ClientError as e:
            raise Exception(f"Failed to delete theme: {str(e)}")

    def count(self) -> int:
        """
        Count the total number of custom themes in the table.

        Used for enforcing the 50-theme limit.

        Returns:
            The number of themes stored in the table.

        Raises:
            Exception: If the scan operation fails.
        """
        try:
            total = 0
            exclusive_start_key = None

            while True:
                scan_params: Dict[str, Any] = {
                    'Select': 'COUNT',
                }

                if exclusive_start_key:
                    scan_params['ExclusiveStartKey'] = exclusive_start_key

                response = self.table.scan(**scan_params)
                total += response.get('Count', 0)

                exclusive_start_key = response.get('LastEvaluatedKey')
                if not exclusive_start_key:
                    break

            return total
        except ClientError as e:
            raise Exception(f"Failed to count themes: {str(e)}")
