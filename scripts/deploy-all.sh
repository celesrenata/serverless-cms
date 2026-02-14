#!/usr/bin/env bash

# Complete deployment script for Serverless CMS
# Deploys infrastructure and frontend applications in one command
# Usage: ./scripts/deploy-all.sh [dev|staging|prod] [options]
# Options:
#   --skip-cdk       Skip CDK infrastructure deployment
#   --skip-frontend  Skip frontend deployment
#   --skip-invalidate Skip CloudFront cache invalidation

set -e

# Parse arguments
ENVIRONMENT=${1:-dev}
DEPLOY_CDK=true
DEPLOY_FRONTEND=true
SKIP_INVALIDATE=false

shift || true
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-cdk)
      DEPLOY_CDK=false
      shift
      ;;
    --skip-frontend)
      DEPLOY_FRONTEND=false
      shift
      ;;
    --skip-invalidate)
      SKIP_INVALIDATE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                  Serverless CMS Full Deployment                    ║"
echo "║                    Environment: $ENVIRONMENT                              ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

OUTPUTS_FILE="cdk.out/outputs-${ENVIRONMENT}.json"

# Step 1: Deploy CDK Infrastructure
if [ "$DEPLOY_CDK" = true ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Step 1: Deploying Infrastructure"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  ./scripts/deploy.sh "$ENVIRONMENT" --outputs-file "$OUTPUTS_FILE"
  
  echo ""
  echo "✅ Infrastructure deployment complete!"
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Step 1: Skipping Infrastructure Deployment"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  if [ ! -f "$OUTPUTS_FILE" ]; then
    echo "❌ Error: Outputs file not found at $OUTPUTS_FILE"
    echo "   Cannot skip CDK deployment without existing outputs."
    echo "   Please run: ./scripts/deploy.sh $ENVIRONMENT"
    exit 1
  fi
fi

# Step 2: Generate Frontend Configuration
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Generating Frontend Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

./scripts/generate-frontend-config.sh "$ENVIRONMENT" "$OUTPUTS_FILE"

echo ""
echo "✅ Frontend configuration generated!"

# Step 3: Deploy Frontend Applications
if [ "$DEPLOY_FRONTEND" = true ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Step 3: Deploying Frontend Applications"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  INVALIDATE_FLAG=""
  if [ "$SKIP_INVALIDATE" = true ]; then
    INVALIDATE_FLAG="--skip-invalidate"
  fi
  
  ./scripts/deploy-frontend.sh "$ENVIRONMENT" --outputs-file "$OUTPUTS_FILE" $INVALIDATE_FLAG
  
  echo ""
  echo "✅ Frontend deployment complete!"
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Step 3: Skipping Frontend Deployment"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
fi

# Final Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    🎉 Deployment Complete! 🎉                      ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Extract and display URLs
STACK_NAME=$(jq -r 'keys[0]' "$OUTPUTS_FILE")
ADMIN_URL=$(jq -r ".\"$STACK_NAME\".AdminCustomUrl // .\"$STACK_NAME\".AdminUrl" "$OUTPUTS_FILE")
PUBLIC_URL=$(jq -r ".\"$STACK_NAME\".PublicCustomUrl // .\"$STACK_NAME\".PublicUrl" "$OUTPUTS_FILE")
API_ENDPOINT=$(jq -r ".\"$STACK_NAME\".ApiEndpoint" "$OUTPUTS_FILE")

echo "🌐 Your Serverless CMS is now live!"
echo ""
echo "Admin Panel:        $ADMIN_URL"
echo "Public Website:     $PUBLIC_URL"
echo "API Endpoint:       $API_ENDPOINT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next steps:"
echo "   1. Create your first admin user in AWS Cognito:"
echo "      aws cognito-idp admin-create-user \\"
echo "        --user-pool-id $(jq -r ".\"$STACK_NAME\".UserPoolId" "$OUTPUTS_FILE") \\"
echo "        --username admin@example.com \\"
echo "        --user-attributes Name=email,Value=admin@example.com \\"
echo "        --temporary-password 'TempPassword123!' \\"
echo "        --message-action SUPPRESS"
echo ""
echo "   2. Set the user's role attribute:"
echo "      aws cognito-idp admin-update-user-attributes \\"
echo "        --user-pool-id $(jq -r ".\"$STACK_NAME\".UserPoolId" "$OUTPUTS_FILE") \\"
echo "        --username admin@example.com \\"
echo "        --user-attributes Name=custom:role,Value=admin"
echo ""
echo "   3. Log in to the Admin Panel at: $ADMIN_URL"
echo ""
echo "📚 For more information, see the documentation in README.md"
echo ""
