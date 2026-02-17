#!/usr/bin/env bash

# Generate frontend environment configuration from CDK outputs
# Usage: ./scripts/generate-frontend-config.sh [dev|staging|prod] [outputs-file]

set -e

ENVIRONMENT=${1:-dev}
OUTPUTS_FILE=${2:-"cdk.out/outputs-${ENVIRONMENT}.json"}

if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "❌ Error: Outputs file not found at $OUTPUTS_FILE"
  echo "   Please deploy the CDK stack first using ./scripts/deploy.sh"
  exit 1
fi

echo "🔧 Generating frontend configuration for $ENVIRONMENT environment..."
echo "   Reading from: $OUTPUTS_FILE"

# Extract stack name (first key in the JSON)
STACK_NAME=$(jq -r 'keys[0]' "$OUTPUTS_FILE")

# Extract values from outputs
API_ENDPOINT=$(jq -r ".\"$STACK_NAME\".ApiEndpoint" "$OUTPUTS_FILE")
USER_POOL_ID=$(jq -r ".\"$STACK_NAME\".UserPoolId" "$OUTPUTS_FILE")
USER_POOL_CLIENT_ID=$(jq -r ".\"$STACK_NAME\".UserPoolClientId" "$OUTPUTS_FILE")
# Extract region from User Pool ARN (format: arn:aws:cognito-idp:REGION:...)
USER_POOL_ARN=$(jq -r ".\"$STACK_NAME\".UserPoolArn" "$OUTPUTS_FILE")
REGION=$(echo "$USER_POOL_ARN" | cut -d: -f4)
MEDIA_BUCKET=$(jq -r ".\"$STACK_NAME\".MediaBucketName" "$OUTPUTS_FILE")

# Check if values are null (CDK didn't detect changes and skipped deployment)
if [ "$API_ENDPOINT" == "null" ] || [ -z "$API_ENDPOINT" ]; then
  echo ""
  echo "⚠️  WARNING: CDK outputs contain null values!"
  echo "   This usually means CDK didn't detect infrastructure changes."
  echo "   Attempting to retrieve values from existing stack..."
  echo ""
  
  # Get stack name based on environment
  CDK_STACK_NAME="ServerlessCmsStack-${ENVIRONMENT}"
  
  # Try to get outputs from CloudFormation stack
  if aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" &>/dev/null; then
    echo "   Found existing stack: $CDK_STACK_NAME"
    
    API_ENDPOINT=$(aws cloudformation describe-stacks \
      --stack-name "$CDK_STACK_NAME" \
      --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
      --output text)
    
    USER_POOL_ID=$(aws cloudformation describe-stacks \
      --stack-name "$CDK_STACK_NAME" \
      --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
      --output text)
    
    USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
      --stack-name "$CDK_STACK_NAME" \
      --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
      --output text)
    
    REGION=$(aws cloudformation describe-stacks \
      --stack-name "$CDK_STACK_NAME" \
      --query "Stacks[0].Outputs[?OutputKey=='Region'].OutputValue" \
      --output text)
    
    MEDIA_BUCKET=$(aws cloudformation describe-stacks \
      --stack-name "$CDK_STACK_NAME" \
      --query "Stacks[0].Outputs[?OutputKey=='MediaBucketName'].OutputValue" \
      --output text)
    
    echo "   ✓ Retrieved values from CloudFormation stack"
  else
    echo "   ❌ Error: Could not find CloudFormation stack: $CDK_STACK_NAME"
    echo "   Please deploy the CDK stack first using ./scripts/deploy.sh"
    exit 1
  fi
fi

# Validate required values
if [ "$API_ENDPOINT" == "null" ] || [ -z "$API_ENDPOINT" ]; then
  echo "❌ Error: API_ENDPOINT is still null after fallback attempt"
  exit 1
fi

# Use custom domain URLs if available, otherwise use CloudFront URLs
ADMIN_URL=$(jq -r ".\"$STACK_NAME\".AdminCustomUrl // .\"$STACK_NAME\".AdminUrl" "$OUTPUTS_FILE")
PUBLIC_URL=$(jq -r ".\"$STACK_NAME\".PublicCustomUrl // .\"$STACK_NAME\".PublicUrl" "$OUTPUTS_FILE")

# Generate Admin Panel .env file
ADMIN_ENV_FILE="frontend/admin-panel/.env"
echo "📝 Writing Admin Panel config to $ADMIN_ENV_FILE"

cat > "$ADMIN_ENV_FILE" << EOF
# Auto-generated environment configuration
# Generated on: $(date)
# Environment: $ENVIRONMENT

VITE_API_ENDPOINT=$API_ENDPOINT
VITE_AWS_REGION=$REGION
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_MEDIA_BUCKET=$MEDIA_BUCKET
VITE_ENVIRONMENT=$ENVIRONMENT
EOF

echo "✅ Admin Panel configuration created"

# Generate Public Website .env file
PUBLIC_ENV_FILE="frontend/public-website/.env"
echo "📝 Writing Public Website config to $PUBLIC_ENV_FILE"

# Debug: Check if CAPTCHA secrets are available
if [ -n "$CAPTCHA_SCRIPT_URL" ]; then
  echo "   ✓ CAPTCHA_SCRIPT_URL is set"
else
  echo "   ⚠ CAPTCHA_SCRIPT_URL is not set (CAPTCHA will be disabled)"
fi

if [ -n "$CAPTCHA_API_KEY" ]; then
  echo "   ✓ CAPTCHA_API_KEY is set"
else
  echo "   ⚠ CAPTCHA_API_KEY is not set (CAPTCHA will be disabled)"
fi

cat > "$PUBLIC_ENV_FILE" << EOF
# Auto-generated environment configuration
# Generated on: $(date)
# Environment: $ENVIRONMENT

VITE_API_ENDPOINT=$API_ENDPOINT
VITE_ENVIRONMENT=$ENVIRONMENT
EOF

# Add CAPTCHA configuration if secrets are provided
if [ -n "$CAPTCHA_SCRIPT_URL" ]; then
  echo "" >> "$PUBLIC_ENV_FILE"
  echo "# AWS WAF CAPTCHA Configuration" >> "$PUBLIC_ENV_FILE"
  echo "VITE_CAPTCHA_SCRIPT_URL=$CAPTCHA_SCRIPT_URL" >> "$PUBLIC_ENV_FILE"
fi

if [ -n "$CAPTCHA_API_KEY" ]; then
  echo "VITE_CAPTCHA_API_KEY=\"$CAPTCHA_API_KEY\"" >> "$PUBLIC_ENV_FILE"
fi

echo "✅ Public Website configuration created"

echo ""
echo "🎉 Frontend configuration complete!"
echo ""
echo "Configuration Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Environment:        $ENVIRONMENT"
echo "API Endpoint:       $API_ENDPOINT"
echo "User Pool ID:       $USER_POOL_ID"
echo "User Pool Client:   $USER_POOL_CLIENT_ID"
echo "Region:             $REGION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next step: Build and deploy frontend applications"
echo "   Run: ./scripts/deploy-frontend.sh $ENVIRONMENT"
echo ""
