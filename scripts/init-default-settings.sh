#!/bin/bash

# Initialize default settings in DynamoDB
# This script sets up default values for site configuration

set -e

# Get environment from argument or default to dev
ENVIRONMENT=${1:-dev}

echo "Initializing default settings for environment: $ENVIRONMENT"

# Get AWS region from CDK context or default
REGION=${AWS_REGION:-us-east-1}

# Table name
TABLE_NAME="cms-settings-${ENVIRONMENT}"

echo "Using table: $TABLE_NAME in region: $REGION"

# Function to put a setting item
put_setting() {
  local key=$1
  local value=$2
  local value_type=$3
  
  echo "Setting $key = $value"
  
  if [ "$value_type" = "boolean" ]; then
    aws dynamodb put-item \
      --table-name "$TABLE_NAME" \
      --region "$REGION" \
      --item "{
        \"key\": {\"S\": \"$key\"},
        \"value\": {\"BOOL\": $value},
        \"updated_by\": {\"S\": \"system\"},
        \"updated_at\": {\"N\": \"$(date +%s)\"}
      }" \
      --no-cli-pager
  else
    aws dynamodb put-item \
      --table-name "$TABLE_NAME" \
      --region "$REGION" \
      --item "{
        \"key\": {\"S\": \"$key\"},
        \"value\": {\"S\": \"$value\"},
        \"updated_by\": {\"S\": \"system\"},
        \"updated_at\": {\"N\": \"$(date +%s)\"}
      }" \
      --no-cli-pager
  fi
}

# Initialize default settings
put_setting "site_title" "My Serverless CMS" "string"
put_setting "site_description" "A modern serverless content management system" "string"
put_setting "theme" "default" "string"
put_setting "registration_enabled" "false" "boolean"
put_setting "comments_enabled" "false" "boolean"
put_setting "captcha_enabled" "false" "boolean"

echo ""
echo "✅ Default settings initialized successfully!"
echo ""
echo "You can now update these settings through the admin panel at:"
echo "https://your-domain.com/admin/settings"
