#!/usr/bin/env python3
"""
Migration script to update all content authors in DynamoDB to the Celes user.

Usage:
    python scripts/update_content_authors.py staging prod
    python scripts/update_content_authors.py staging prod --dry-run
"""

import argparse
import sys

import boto3
from botocore.exceptions import ClientError


REGION = "us-west-2"
TARGET_EMAIL = "celes@celestium.life"
STACK_NAME_TEMPLATE = "ServerlessCmsStack-{env}"
CONTENT_TABLE_TEMPLATE = "cms-content-{env}"
USER_POOL_OUTPUT_KEY = "UserPoolId"
PARTITION_KEY = "id"
SORT_KEY = "created_at"


class Colors:
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def green(message):
    return f"{Colors.GREEN}{message}{Colors.RESET}"


def yellow(message):
    return f"{Colors.YELLOW}{message}{Colors.RESET}"


def red(message):
    return f"{Colors.RED}{message}{Colors.RESET}"


def bold(message):
    return f"{Colors.BOLD}{message}{Colors.RESET}"


def print_success(message):
    print(green(message))


def print_warning(message):
    print(yellow(message))


def print_error(message):
    print(red(message))


def format_client_error(error):
    response = getattr(error, "response", {}) or {}
    err = response.get("Error", {}) or {}
    code = err.get("Code", "UnknownError")
    message = err.get("Message", str(error))
    return f"{code}: {message}"


def get_stack_output(cfn_client, stack_name, output_key):
    response = cfn_client.describe_stacks(StackName=stack_name)
    stacks = response.get("Stacks", [])

    if not stacks:
        raise RuntimeError(f"CloudFormation stack not found: {stack_name}")

    outputs = stacks[0].get("Outputs", [])
    for output in outputs:
        if output.get("OutputKey") == output_key:
            return output.get("OutputValue")

    raise RuntimeError(
        f"Output '{output_key}' not found in CloudFormation stack: {stack_name}"
    )


def get_user_attributes(user):
    return {
        attribute.get("Name"): attribute.get("Value")
        for attribute in user.get("Attributes", [])
    }


def find_cognito_user_by_email(cognito_client, user_pool_id, email):
    paginator = cognito_client.get_paginator("list_users")

    pages_checked = 0
    users_checked = 0
    target_email = email.lower()

    for page in paginator.paginate(UserPoolId=user_pool_id):
        pages_checked += 1
        users = page.get("Users", [])
        print(f"  Checking Cognito users page {pages_checked} ({len(users)} users)...")

        for user in users:
            users_checked += 1
            attributes = get_user_attributes(user)
            user_email = (attributes.get("email") or "").lower()

            if user_email == target_email:
                return {
                    "username": user.get("Username"),
                    "attributes": attributes,
                    "pages_checked": pages_checked,
                    "users_checked": users_checked,
                }

    return {
        "username": None,
        "attributes": {},
        "pages_checked": pages_checked,
        "users_checked": users_checked,
    }


def scan_table_pages(table):
    page_number = 0
    exclusive_start_key = None

    while True:
        scan_kwargs = {}
        if exclusive_start_key:
            scan_kwargs["ExclusiveStartKey"] = exclusive_start_key

        response = table.scan(**scan_kwargs)
        page_number += 1

        yield {
            "page_number": page_number,
            "items": response.get("Items", []),
            "count": response.get("Count", 0),
            "scanned_count": response.get("ScannedCount", 0),
        }

        exclusive_start_key = response.get("LastEvaluatedKey")
        if not exclusive_start_key:
            break


def display_value(value):
    if value is None:
        return "<missing>"
    return str(value)


def update_content_authors(table, table_name, author_id, dry_run):
    summary = {
        "pages_scanned": 0,
        "items_scanned": 0,
        "items_updated": 0,
        "items_would_update": 0,
        "items_skipped": 0,
        "errors": 0,
    }

    print(f"  Scanning DynamoDB table: {table_name}")

    for page in scan_table_pages(table):
        summary["pages_scanned"] += 1
        items = page["items"]

        print(
            f"  DynamoDB scan page {page['page_number']}: "
            f"{page['count']} items returned, {page['scanned_count']} items scanned"
        )

        for item in items:
            summary["items_scanned"] += 1

            item_id = item.get(PARTITION_KEY)
            sort_key_value = item.get(SORT_KEY)
            old_author = item.get("author")

            if item_id is None or sort_key_value is None:
                summary["items_skipped"] += 1
                print_warning(
                    "    WARNING: Skipping item missing primary key "
                    f"({PARTITION_KEY}={display_value(item_id)}, "
                    f"{SORT_KEY}={display_value(sort_key_value)})"
                )
                continue

            key = {
                PARTITION_KEY: item_id,
                SORT_KEY: sort_key_value,
            }

            if dry_run:
                summary["items_would_update"] += 1
                print_warning(
                    "    [DRY RUN] Would update "
                    f"{PARTITION_KEY}={item_id}, {SORT_KEY}={sort_key_value}: "
                    f"author {display_value(old_author)} -> {author_id}"
                )
                continue

            try:
                table.update_item(
                    Key=key,
                    UpdateExpression="SET #author = :author",
                    ExpressionAttributeNames={
                        "#author": "author",
                    },
                    ExpressionAttributeValues={
                        ":author": author_id,
                    },
                )
                summary["items_updated"] += 1
                print_success(
                    "    Updated "
                    f"{PARTITION_KEY}={item_id}, {SORT_KEY}={sort_key_value}: "
                    f"author {display_value(old_author)} -> {author_id}"
                )
            except ClientError as error:
                summary["errors"] += 1
                print_error(
                    "    ERROR: Failed to update "
                    f"{PARTITION_KEY}={item_id}, {SORT_KEY}={sort_key_value}: "
                    f"{format_client_error(error)}"
                )

    return summary


def process_environment(env, dry_run):
    stack_name = STACK_NAME_TEMPLATE.format(env=env)
    table_name = CONTENT_TABLE_TEMPLATE.format(env=env)

    cfn_client = boto3.client("cloudformation", region_name=REGION)
    cognito_client = boto3.client("cognito-idp", region_name=REGION)
    dynamodb = boto3.resource("dynamodb", region_name=REGION)

    result = {
        "env": env,
        "status": "success",
        "user_pool_id": None,
        "author_id": None,
        "pages_scanned": 0,
        "items_scanned": 0,
        "items_updated": 0,
        "items_would_update": 0,
        "items_skipped": 0,
        "errors": 0,
    }

    print()
    print(bold(f"=== Environment: {env} ==="))

    try:
        print(f"  Getting UserPoolId from CloudFormation stack: {stack_name}")
        user_pool_id = get_stack_output(cfn_client, stack_name, USER_POOL_OUTPUT_KEY)
        result["user_pool_id"] = user_pool_id
        print_success(f"  Found UserPoolId: {user_pool_id}")
    except ClientError as error:
        result["status"] = "failed"
        result["errors"] += 1
        print_error(
            f"  ERROR: Failed to read CloudFormation stack '{stack_name}': "
            f"{format_client_error(error)}"
        )
        return result
    except RuntimeError as error:
        result["status"] = "failed"
        result["errors"] += 1
        print_error(f"  ERROR: {error}")
        return result

    try:
        print(f"  Looking for Cognito user with email: {TARGET_EMAIL}")
        user_result = find_cognito_user_by_email(
            cognito_client,
            user_pool_id,
            TARGET_EMAIL,
        )
    except ClientError as error:
        result["status"] = "failed"
        result["errors"] += 1
        print_error(
            f"  ERROR: Failed to list Cognito users in pool '{user_pool_id}': "
            f"{format_client_error(error)}"
        )
        return result

    author_id = user_result.get("username")
    if not author_id:
        result["status"] = "skipped"
        print_warning(
            f"  WARNING: User with email '{TARGET_EMAIL}' was not found in "
            f"User Pool '{user_pool_id}'. Skipping environment '{env}'."
        )
        print(
            f"  Cognito users checked: {user_result.get('users_checked', 0)} "
            f"across {user_result.get('pages_checked', 0)} page(s)"
        )
        return result

    result["author_id"] = author_id
    print_success(
        f"  Found Cognito user: email={TARGET_EMAIL}, username={author_id}"
    )
    print(
        f"  Cognito users checked: {user_result.get('users_checked', 0)} "
        f"across {user_result.get('pages_checked', 0)} page(s)"
    )

    table = dynamodb.Table(table_name)

    try:
        update_summary = update_content_authors(
            table=table,
            table_name=table_name,
            author_id=author_id,
            dry_run=dry_run,
        )
    except ClientError as error:
        result["status"] = "failed"
        result["errors"] += 1
        print_error(
            f"  ERROR: Failed while scanning DynamoDB table '{table_name}': "
            f"{format_client_error(error)}"
        )
        return result

    result.update(update_summary)

    if result["errors"] > 0:
        result["status"] = "failed"

    print()
    print(bold(f"--- Summary for {env} ---"))
    print(f"  User Pool ID: {result['user_pool_id']}")
    print(f"  Author ID: {result['author_id']}")
    print(f"  DynamoDB pages scanned: {result['pages_scanned']}")
    print(f"  Items scanned: {result['items_scanned']}")
    print(f"  Items skipped: {result['items_skipped']}")

    if dry_run:
        print_warning(f"  Items that would be updated: {result['items_would_update']}")
    else:
        print_success(f"  Items updated: {result['items_updated']}")

    if result["errors"]:
        print_error(f"  Errors: {result['errors']}")
    else:
        print_success("  Errors: 0")

    return result


def parse_args():
    parser = argparse.ArgumentParser(
        description="Update CMS content author fields to the Celes Cognito user ID."
    )
    parser.add_argument(
        "environments",
        nargs="+",
        metavar="ENV",
        help="Environment(s) to migrate, e.g. staging prod",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be updated without making DynamoDB changes.",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if args.dry_run:
        print_warning("Running in DRY RUN mode. No DynamoDB updates will be made.")

    results = []
    for env in args.environments:
        results.append(process_environment(env, args.dry_run))

    print()
    print(bold("=== Final Summary ==="))

    failed = 0
    skipped = 0
    succeeded = 0

    for result in results:
        env = result["env"]
        status = result["status"]

        if status == "success":
            succeeded += 1
            status_text = green("success")
        elif status == "skipped":
            skipped += 1
            status_text = yellow("skipped")
        else:
            failed += 1
            status_text = red("failed")

        if args.dry_run:
            update_text = f"would_update={result.get('items_would_update', 0)}"
        else:
            update_text = f"updated={result.get('items_updated', 0)}"

        print(
            f"  {env}: {status_text}, "
            f"scanned={result.get('items_scanned', 0)}, "
            f"{update_text}, "
            f"skipped={result.get('items_skipped', 0)}, "
            f"errors={result.get('errors', 0)}"
        )

    print()
    print_success(f"Successful environments: {succeeded}")
    if skipped:
        print_warning(f"Skipped environments: {skipped}")
    else:
        print("Skipped environments: 0")

    if failed:
        print_error(f"Failed environments: {failed}")
    else:
        print_success("Failed environments: 0")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
