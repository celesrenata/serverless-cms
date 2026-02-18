#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get environment (default to dev)
ENVIRONMENT=${1:-dev}
STACK_NAME="ServerlessCmsStack-${ENVIRONMENT}"

echo "🔐 Creating admin user for ${ENVIRONMENT} environment..."
echo ""

# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text \
  --region us-west-2)

if [ -z "$USER_POOL_ID" ]; then
  echo -e "${RED}❌ Error: Could not find User Pool ID for stack ${STACK_NAME}${NC}"
  exit 1
fi

echo "User Pool ID: $USER_POOL_ID"
echo ""

# Prompt for email
read -p "Enter admin email address: " ADMIN_EMAIL

# Prompt for temporary password
read -sp "Enter temporary password (min 8 chars, must include uppercase, lowercase, number, special char): " TEMP_PASSWORD
echo ""

# Create user
echo ""
echo "Creating user..."
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true \
  --temporary-password "$TEMP_PASSWORD" \
  --message-action SUPPRESS \
  --region us-west-2

# Set role to admin
echo "Setting admin role..."
aws cognito-idp admin-update-user-attributes \
  --user-pool-id "$USER_POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --user-attributes Name=custom:role,Value=admin \
  --region us-west-2

# Get the Cognito user's sub (UUID)
echo "Getting user ID..."
USER_ID=$(aws cognito-idp admin-get-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --query 'Username' \
  --output text \
  --region us-west-2)

# Add user to DynamoDB users table
echo "Adding user to database..."
CURRENT_TIMESTAMP=$(date +%s)

aws dynamodb put-item \
  --table-name "cms-users-${ENVIRONMENT}" \
  --item "{
    \"id\": {\"S\": \"$USER_ID\"},
    \"email\": {\"S\": \"$ADMIN_EMAIL\"},
    \"role\": {\"S\": \"admin\"},
    \"created_at\": {\"N\": \"$CURRENT_TIMESTAMP\"},
    \"updated_at\": {\"N\": \"$CURRENT_TIMESTAMP\"}
  }" \
  --region us-west-2

echo ""
echo -e "${GREEN}✅ Admin user created successfully!${NC}"
echo ""
echo "📧 Email: $ADMIN_EMAIL"
echo "🔑 Temporary Password: $TEMP_PASSWORD"
echo ""
echo "🌐 Admin Panel URL:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`AdminPanelUrl`].OutputValue' \
  --output text \
  --region us-west-2
echo ""
echo -e "${YELLOW}⚠️  You will be prompted to change your password on first login${NC}"
echo ""
