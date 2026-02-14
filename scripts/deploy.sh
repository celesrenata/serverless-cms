#!/usr/bin/env bash

# Deployment script for Serverless CMS
# Usage: ./scripts/deploy.sh [dev|staging|prod] [options]
# Options:
#   --skip-build    Skip CDK build step
#   --outputs-file  Save stack outputs to file (default: outputs-{env}.json)

set -e

# Parse arguments
ENVIRONMENT=${1:-dev}
SKIP_BUILD=false
OUTPUTS_FILE=""

shift || true
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --outputs-file)
      OUTPUTS_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Set default outputs file if not specified
if [ -z "$OUTPUTS_FILE" ]; then
  OUTPUTS_FILE="cdk.out/outputs-${ENVIRONMENT}.json"
fi

echo "🚀 Deploying Serverless CMS to $ENVIRONMENT environment..."
echo "   Outputs will be saved to: $OUTPUTS_FILE"

# Build CDK (unless skipped)
if [ "$SKIP_BUILD" = false ]; then
  echo ""
  echo "📦 Building CDK..."
  npm run build
else
  echo ""
  echo "⏭️  Skipping CDK build..."
fi

# Synthesize CloudFormation template
echo ""
echo "🔨 Synthesizing CloudFormation template..."
npx cdk synth --context environment=$ENVIRONMENT > /dev/null

# Deploy stack
echo ""
echo "☁️  Deploying to AWS..."
npx cdk deploy \
  --context environment=$ENVIRONMENT \
  --require-approval never \
  --outputs-file "$OUTPUTS_FILE"

# Display important outputs
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Stack Outputs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Parse and display key outputs from the JSON file
if [ -f "$OUTPUTS_FILE" ]; then
  # Extract stack name (first key in the JSON)
  STACK_NAME=$(jq -r 'keys[0]' "$OUTPUTS_FILE")
  
  # Display key outputs
  echo "Environment:        $(jq -r ".\"$STACK_NAME\".Environment" "$OUTPUTS_FILE")"
  echo ""
  echo "API Endpoint:       $(jq -r ".\"$STACK_NAME\".ApiEndpoint" "$OUTPUTS_FILE")"
  echo "API URL:            $(jq -r ".\"$STACK_NAME\".ApiUrl" "$OUTPUTS_FILE")"
  echo ""
  echo "User Pool ID:       $(jq -r ".\"$STACK_NAME\".UserPoolId" "$OUTPUTS_FILE")"
  echo "User Pool Client:   $(jq -r ".\"$STACK_NAME\".UserPoolClientId" "$OUTPUTS_FILE")"
  echo ""
  echo "Admin Panel URL:    $(jq -r ".\"$STACK_NAME\".AdminUrl" "$OUTPUTS_FILE")"
  echo "Public Website URL: $(jq -r ".\"$STACK_NAME\".PublicUrl" "$OUTPUTS_FILE")"
  echo ""
  echo "Admin Bucket:       $(jq -r ".\"$STACK_NAME\".AdminBucketName" "$OUTPUTS_FILE")"
  echo "Public Bucket:      $(jq -r ".\"$STACK_NAME\".PublicBucketName" "$OUTPUTS_FILE")"
  echo "Media Bucket:       $(jq -r ".\"$STACK_NAME\".MediaBucketName" "$OUTPUTS_FILE")"
  echo ""
  echo "Admin CF Dist ID:   $(jq -r ".\"$STACK_NAME\".AdminDistributionId" "$OUTPUTS_FILE")"
  echo "Public CF Dist ID:  $(jq -r ".\"$STACK_NAME\".PublicDistributionId" "$OUTPUTS_FILE")"
  
  # Display custom domain outputs if they exist
  CUSTOM_DOMAIN=$(jq -r ".\"$STACK_NAME\".DomainName // empty" "$OUTPUTS_FILE")
  if [ -n "$CUSTOM_DOMAIN" ] && [ "$CUSTOM_DOMAIN" != "null" ]; then
    echo ""
    echo "Custom Domain:      $CUSTOM_DOMAIN"
    echo "Admin Custom URL:   $(jq -r ".\"$STACK_NAME\".AdminCustomUrl" "$OUTPUTS_FILE")"
    echo "Public Custom URL:  $(jq -r ".\"$STACK_NAME\".PublicCustomUrl" "$OUTPUTS_FILE")"
  fi
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "💾 Full outputs saved to: $OUTPUTS_FILE"
else
  echo "⚠️  Warning: Outputs file not found at $OUTPUTS_FILE"
fi

echo ""
echo "🎯 Next steps:"
echo "   1. Configure frontend environment variables using the outputs above"
echo "   2. Build and deploy frontend applications using ./scripts/deploy-frontend.sh"
echo "   3. Create your first admin user in Cognito"
echo ""
