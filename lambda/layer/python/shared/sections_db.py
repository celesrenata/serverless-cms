"""
DynamoDB repository for CMS sections.

This module provides SectionRepository, which uses a DynamoDB table containing
both section items and slug-lock items. Slug locks are stored in the same table
with id="SLUG#{slug}" and entity_type="slug_lock" so slug uniqueness can be
enforced with DynamoDB transactions.
"""

from typing import Dict, List, Any, Optional
import os

import boto3
from boto3.dynamodb.conditions import Key, Attr
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError


dynamodb = boto3.resource("dynamodb")


class SectionRepository:
    """Repository for CMS section persistence in DynamoDB."""

    DEFAULT_TABLE_NAME = "cms-sections-dev"
    SLUG_INDEX = "slug-index"
    CHILDREN_INDEX = "parent_id-sort_order-index"

    def __init__(self, table_name: Optional[str] = None) -> None:
        """
        Initialize the repository.

        Args:
            table_name: Optional DynamoDB table name. If not provided, uses the
                SECTIONS_TABLE environment variable, falling back to
                cms-sections-dev.
        """
        self.table_name = table_name or os.environ.get(
            "SECTIONS_TABLE",
            self.DEFAULT_TABLE_NAME,
        )
        self.table = dynamodb.Table(self.table_name)
        self.client = boto3.client("dynamodb")
        self.serializer = TypeSerializer()

    def create(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a section and its slug lock atomically.

        Args:
            item: Section item to create. Must contain 'id' and 'slug'.

        Returns:
            The created section item.

        Raises:
            Exception: If the slug is already in use or the create fails.
        """
        section_id = item.get("id")
        slug = item.get("slug")
        self._validate_id(section_id)
        self._validate_slug(slug)

        slug_lock = self._slug_lock_item(slug)

        try:
            self.client.transact_write_items(
                TransactItems=[
                    {
                        "Put": {
                            "TableName": self.table_name,
                            "Item": self._serialize_item(item),
                        }
                    },
                    {
                        "Put": {
                            "TableName": self.table_name,
                            "Item": self._serialize_item(slug_lock),
                            "ConditionExpression": "attribute_not_exists(id)",
                        }
                    },
                ]
            )
            return item
        except ClientError as exc:
            if self._is_transaction_cancelled(exc):
                raise Exception(f"Slug '{slug}' is already in use") from exc
            raise Exception(f"Failed to create section '{section_id}': {exc}") from exc

    def get_by_id(self, section_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a section by primary key id.

        Args:
            section_id: Section id.

        Returns:
            Section item if found, otherwise None.

        Raises:
            Exception: If the read fails.
        """
        self._validate_id(section_id)

        try:
            response = self.table.get_item(Key={"id": section_id})
            return response.get("Item")
        except ClientError as exc:
            raise Exception(f"Failed to get section by id '{section_id}': {exc}") from exc

    def get_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a section by slug using the slug-index GSI.

        Slug-lock items are filtered out.

        Args:
            slug: Section slug.

        Returns:
            First matching section item if found, otherwise None.

        Raises:
            Exception: If the query fails.
        """
        self._validate_slug(slug)

        try:
            exclusive_start_key = None

            while True:
                query_args: Dict[str, Any] = {
                    "IndexName": self.SLUG_INDEX,
                    "KeyConditionExpression": Key("slug").eq(slug),
                    "FilterExpression": (
                        Attr("entity_type").not_exists()
                        | Attr("entity_type").ne("slug_lock")
                    ),
                }

                if exclusive_start_key:
                    query_args["ExclusiveStartKey"] = exclusive_start_key

                response = self.table.query(**query_args)
                items = response.get("Items", [])

                if items:
                    return items[0]

                exclusive_start_key = response.get("LastEvaluatedKey")
                if not exclusive_start_key:
                    return None
        except ClientError as exc:
            raise Exception(f"Failed to get section by slug '{slug}': {exc}") from exc

    def get_children(self, parent_id: str) -> List[Dict[str, Any]]:
        """
        Fetch direct child sections ordered by sort_order ascending.

        Args:
            parent_id: Parent section id.

        Returns:
            List of child section items.

        Raises:
            Exception: If the query fails.
        """
        self._validate_id(parent_id)

        try:
            children: List[Dict[str, Any]] = []
            exclusive_start_key = None

            while True:
                query_args: Dict[str, Any] = {
                    "IndexName": self.CHILDREN_INDEX,
                    "KeyConditionExpression": Key("parent_id").eq(parent_id),
                    "ScanIndexForward": True,
                }

                if exclusive_start_key:
                    query_args["ExclusiveStartKey"] = exclusive_start_key

                response = self.table.query(**query_args)
                children.extend(response.get("Items", []))

                exclusive_start_key = response.get("LastEvaluatedKey")
                if not exclusive_start_key:
                    break

            return children
        except ClientError as exc:
            raise Exception(f"Failed to get children for section '{parent_id}': {exc}") from exc

    def get_all_sections(self) -> List[Dict[str, Any]]:
        """
        Scan all section items.

        Slug-lock items are filtered out. Handles scan pagination.

        Returns:
            List of section items.

        Raises:
            Exception: If the scan fails.
        """
        try:
            sections: List[Dict[str, Any]] = []
            exclusive_start_key = None

            while True:
                scan_args: Dict[str, Any] = {
                    "FilterExpression": (
                        Attr("entity_type").not_exists()
                        | Attr("entity_type").ne("slug_lock")
                    )
                }

                if exclusive_start_key:
                    scan_args["ExclusiveStartKey"] = exclusive_start_key

                response = self.table.scan(**scan_args)
                sections.extend(response.get("Items", []))

                exclusive_start_key = response.get("LastEvaluatedKey")
                if not exclusive_start_key:
                    break

            return sections
        except ClientError as exc:
            raise Exception(f"Failed to scan sections table '{self.table_name}': {exc}") from exc

    def update(self, section_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update a section.

        If slug changes, the old slug lock is deleted, the new slug lock is
        created conditionally, and the section item is updated in a single
        transaction.

        Args:
            section_id: Section id.
            updates: Attributes to update.

        Returns:
            Updated section item.

        Raises:
            Exception: If the section does not exist, the slug is already in use,
                or the update fails.
        """
        self._validate_id(section_id)

        if not updates:
            existing = self.get_by_id(section_id)
            if not existing:
                raise Exception(f"Section '{section_id}' not found")
            return existing

        if "id" in updates:
            raise Exception("Cannot update section primary key 'id'")

        existing = self.get_by_id(section_id)
        if not existing:
            raise Exception(f"Section '{section_id}' not found")

        slug_changed = "slug" in updates and updates.get("slug") != existing.get("slug")

        if slug_changed:
            new_slug = updates.get("slug")
            old_slug = existing.get("slug")
            self._validate_slug(new_slug)

            update_expression, names, values = self._build_update_expression(
                updates,
                serialize_values=True,
            )

            transact_items: List[Dict[str, Any]] = []

            if old_slug:
                transact_items.append(
                    {
                        "Delete": {
                            "TableName": self.table_name,
                            "Key": {
                                "id": self.serializer.serialize(
                                    self._slug_lock_id(old_slug)
                                )
                            },
                        }
                    }
                )

            transact_items.extend(
                [
                    {
                        "Put": {
                            "TableName": self.table_name,
                            "Item": self._serialize_item(
                                self._slug_lock_item(new_slug)
                            ),
                            "ConditionExpression": "attribute_not_exists(id)",
                        }
                    },
                    {
                        "Update": {
                            "TableName": self.table_name,
                            "Key": {
                                "id": self.serializer.serialize(section_id),
                            },
                            "UpdateExpression": update_expression,
                            "ExpressionAttributeNames": names,
                            "ExpressionAttributeValues": values,
                            "ConditionExpression": "attribute_exists(id)",
                        }
                    },
                ]
            )

            try:
                self.client.transact_write_items(TransactItems=transact_items)
                updated = self.get_by_id(section_id)
                if not updated:
                    raise Exception(
                        f"Section '{section_id}' was updated but could not be retrieved"
                    )
                return updated
            except ClientError as exc:
                if self._is_transaction_cancelled(exc):
                    raise Exception(f"Slug '{new_slug}' is already in use") from exc
                raise Exception(f"Failed to update section '{section_id}': {exc}") from exc

        # No slug change — simple update_item
        update_expression, names, values = self._build_update_expression(
            updates,
            serialize_values=False,
        )

        try:
            response = self.table.update_item(
                Key={"id": section_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=names,
                ExpressionAttributeValues=values,
                ConditionExpression=Attr("id").exists(),
                ReturnValues="ALL_NEW",
            )
            return response["Attributes"]
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            if error_code == "ConditionalCheckFailedException":
                raise Exception(f"Section '{section_id}' not found") from exc
            raise Exception(f"Failed to update section '{section_id}': {exc}") from exc

    def delete(self, section_id: str, slug: str) -> None:
        """
        Delete a section and its slug lock atomically.

        Args:
            section_id: Section id.
            slug: Section slug.

        Raises:
            Exception: If the delete fails.
        """
        self._validate_id(section_id)
        self._validate_slug(slug)

        try:
            self.client.transact_write_items(
                TransactItems=[
                    {
                        "Delete": {
                            "TableName": self.table_name,
                            "Key": {
                                "id": self.serializer.serialize(section_id),
                            },
                        }
                    },
                    {
                        "Delete": {
                            "TableName": self.table_name,
                            "Key": {
                                "id": self.serializer.serialize(
                                    self._slug_lock_id(slug)
                                ),
                            },
                        }
                    },
                ]
            )
        except ClientError as exc:
            raise Exception(f"Failed to delete section '{section_id}': {exc}") from exc

    def get_descendant_ids(self, section_id: str) -> List[str]:
        """
        Return all descendant section ids using breadth-first traversal.

        Args:
            section_id: Root section id.

        Returns:
            List of descendant section ids.
        """
        self._validate_id(section_id)

        descendant_ids: List[str] = []
        visited = {section_id}
        queue: List[str] = []

        for child in self.get_children(section_id):
            child_id = child.get("id")
            if child_id and child_id not in visited:
                visited.add(child_id)
                descendant_ids.append(child_id)
                queue.append(child_id)

        index = 0
        while index < len(queue):
            current_id = queue[index]
            index += 1

            for child in self.get_children(current_id):
                child_id = child.get("id")
                if child_id and child_id not in visited:
                    visited.add(child_id)
                    descendant_ids.append(child_id)
                    queue.append(child_id)

        return descendant_ids

    def count_children(self, section_id: str) -> int:
        """
        Count direct children for a section.

        Args:
            section_id: Parent section id.

        Returns:
            Number of direct child sections.

        Raises:
            Exception: If the query fails.
        """
        self._validate_id(section_id)

        try:
            count = 0
            exclusive_start_key = None

            while True:
                query_args: Dict[str, Any] = {
                    "IndexName": self.CHILDREN_INDEX,
                    "KeyConditionExpression": Key("parent_id").eq(section_id),
                    "Select": "COUNT",
                }

                if exclusive_start_key:
                    query_args["ExclusiveStartKey"] = exclusive_start_key

                response = self.table.query(**query_args)
                count += response.get("Count", 0)

                exclusive_start_key = response.get("LastEvaluatedKey")
                if not exclusive_start_key:
                    break

            return count
        except ClientError as exc:
            raise Exception(f"Failed to count children for section '{section_id}': {exc}") from exc

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _serialize_item(self, item: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Serialize a Python dict to low-level DynamoDB attribute values."""
        return {
            key: self.serializer.serialize(value)
            for key, value in item.items()
        }

    def _build_update_expression(
        self,
        updates: Dict[str, Any],
        serialize_values: bool = False,
    ):
        """
        Build a DynamoDB SET update expression using sanitized aliases.

        Uses #attr0, #attr1 and :val0, :val1 style aliases.
        """
        assignments: List[str] = []
        names: Dict[str, str] = {}
        values: Dict[str, Any] = {}

        for index, attr_name in enumerate(updates.keys()):
            if attr_name == "id":
                raise Exception("Cannot update section primary key 'id'")

            name_alias = f"#attr{index}"
            value_alias = f":val{index}"

            names[name_alias] = attr_name
            values[value_alias] = (
                self.serializer.serialize(updates[attr_name])
                if serialize_values
                else updates[attr_name]
            )
            assignments.append(f"{name_alias} = {value_alias}")

        if not assignments:
            raise Exception("No valid updates provided")

        return "SET " + ", ".join(assignments), names, values

    def _slug_lock_id(self, slug: str) -> str:
        """Return the primary key id for a slug-lock item."""
        return f"SLUG#{slug}"

    def _slug_lock_item(self, slug: str) -> Dict[str, Any]:
        """Return a slug-lock item for the given slug."""
        return {
            "id": self._slug_lock_id(slug),
            "entity_type": "slug_lock",
            "slug": slug,
        }

    def _is_transaction_cancelled(self, exc: ClientError) -> bool:
        """Return True if the ClientError is a TransactionCanceledException."""
        return exc.response.get("Error", {}).get("Code") == "TransactionCanceledException"

    def _validate_id(self, section_id: Any) -> None:
        """Validate a DynamoDB section id."""
        if not isinstance(section_id, str) or not section_id:
            raise Exception("Section id must be a non-empty string")

    def _validate_slug(self, slug: Any) -> None:
        """Validate a DynamoDB section slug."""
        if not isinstance(slug, str) or not slug:
            raise Exception("Section slug must be a non-empty string")
