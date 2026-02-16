#!/usr/bin/env bash

# Reset user password in Cognito User Pool
# Usage: ./scripts/reset-user-password.sh [environment] [email]
# Example: ./scripts/reset-user-password.sh dev admin@example.com

set -e

ENVIRONMENT=${1:-dev}
EMAIL=$2

if [ -z "$EMAIL" ]; then
  echo "❌ Error: Email address is required"
  echo "Usage: $0 [environment] [email]"
  echo "Example: $0 dev admin@example.com"
  exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo "❌ Error: Invalid environment. Must be dev, staging, or prod"
  exit 1
fi

echo "🔐 Resetting password for user in $ENVIRONMENT environment..."
echo ""

# Get User Pool ID from CDK outputs
OUTPUTS_FILE="cdk.out/outputs-${ENVIRONMENT}.json"

if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "❌ Error: CDK outputs file not found at $OUTPUTS_FILE"
  echo "   Please deploy the stack first using ./scripts/deploy.sh"
  exit 1
fi

STACK_NAME=$(jq -r 'keys[0]' "$OUTPUTS_FILE")
USER_POOL_ID=$(jq -r ".\"$STACK_NAME\".UserPoolId" "$OUTPUTS_FILE")

if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" = "null" ]; then
  echo "❌ Error: Could not find UserPoolId in outputs"
  exit 1
fi

echo "📋 User Pool ID: $USER_POOL_ID"
echo "📧 Email: $EMAIL"
echo ""

# Generate a temporary password
TEMP_PASSWORD=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)
# Ensure it meets Cognito requirements (uppercase, lowercase, number, special char)
TEMP_PASSWORD="Temp${TEMP_PASSWORD}!"

echo "🔑 Generated temporary password: $TEMP_PASSWORD"
echo ""

# Check if user exists
echo "🔍 Checking if user exists..."
if aws cognito-idp admin-get-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --output json > /dev/null 2>&1; then
  
  echo "✅ User found"
  echo ""
  
  # Verify user has email attribute
  echo "🔍 Verifying user attributes..."
  USER_ATTRS=$(aws cognito-idp admin-get-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --query 'UserAttributes[?Name==`email`].Value' \
    --output text)
  
  if [ -z "$USER_ATTRS" ]; then
    echo "⚠️  User missing email attribute, adding it..."
    aws cognito-idp admin-update-user-attributes \
      --user-pool-id "$USER_POOL_ID" \
      --username "$EMAIL" \
      --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true
    echo "✅ Email attribute added"
  fi
  echo ""
  
  # Reset password
  echo "🔄 Setting temporary password..."
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --password "$TEMP_PASSWORD" \
    --no-permanent
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Password reset successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📧 Email: $EMAIL"
  echo "🔑 Temporary Password: $TEMP_PASSWORD"
  echo ""
  echo "⚠️  The user will be required to change this password on next login."
  echo ""
  echo "🌐 Admin URL: $(jq -r ".\"$STACK_NAME\".AdminUrl" "$OUTPUTS_FILE")"
  echo ""
  
else
  echo "❌ Error: User not found with email: $EMAIL"
  echo ""
  echo "💡 To create a new user, use: ./scripts/create-admin-user.sh $ENVIRONMENT"
  exit 1
fi
