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

cat > "$PUBLIC_ENV_FILE" << EOF
# Auto-generated environment configuration
# Generated on: $(date)
# Environment: $ENVIRONMENT

VITE_API_ENDPOINT=$API_ENDPOINT
VITE_ENVIRONMENT=$ENVIRONMENT
EOF

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
