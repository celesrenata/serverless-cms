#!/usr/bin/env bash

# Deployment script for Serverless CMS
# Usage: ./scripts/deploy.sh [dev|staging|prod] [options]
# Options:
#   --skip-build       Skip CDK build step
#   --outputs-file     Save stack outputs to file (default: outputs-{env}.json)
#   --clean-buckets    Delete orphaned S3 buckets before deployment

set -e

# Parse arguments
ENVIRONMENT=${1:-dev}
SKIP_BUILD=false
OUTPUTS_FILE=""
CLEAN_BUCKETS=false

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
    --clean-buckets)
      CLEAN_BUCKETS=true
      shift
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

# Check for orphaned buckets (but don't fail - just warn)
echo ""
echo "🔍 Checking for orphaned resources..."
if bash "$(dirname "$0")/import-existing-buckets.sh" "$ENVIRONMENT" 2>/dev/null; then
  echo "✓ No orphaned resources detected"
else
  echo ""
  echo "⚠️  WARNING: Orphaned S3 buckets detected!"
  echo "   If deployment fails with 'bucket already exists' error:"
  echo "   1. Your data is safe (buckets are retained by design)"
  echo "   2. Run: ./scripts/import-existing-buckets.sh $ENVIRONMENT"
  echo "   3. Follow the instructions to import or clean up"
  echo ""
  
  # In CI environment, automatically continue
  if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then
    echo "   Running in CI - attempting deployment anyway..."
  else
    read -p "Continue with deployment anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Deployment cancelled"
      exit 1
    fi
  fi
fi

# Clean orphaned buckets if requested
if [ "$CLEAN_BUCKETS" = true ]; then
  echo ""
  echo "🧹 Cleaning orphaned S3 buckets..."
  echo "⚠️  WARNING: This will DELETE all data in the buckets!"
  
  AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  BUCKETS=(
    "cms-admin-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
    "cms-media-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
    "cms-public-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
  )
  
  for BUCKET in "${BUCKETS[@]}"; do
    if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
      echo "   Deleting bucket: $BUCKET"
      aws s3 rb "s3://$BUCKET" --force 2>/dev/null || echo "   ⚠️  Could not delete $BUCKET (may not exist or already managed)"
    fi
  done
  
  echo "   ✓ Cleanup complete"
fi

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

# Try deployment, if it fails due to existing buckets, provide helpful error message
if ! npx cdk deploy \
  --context environment=$ENVIRONMENT \
  --require-approval never \
  --outputs-file "$OUTPUTS_FILE" 2>&1 | tee /tmp/cdk-deploy.log; then
  
  # Check if error is due to existing buckets
  if grep -q "already exists" /tmp/cdk-deploy.log; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ Deployment failed: S3 buckets already exist"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "This happens when the CloudFormation stack was deleted but S3 buckets"
    echo "were retained (by design to protect your data)."
    echo ""
    echo "To resolve this issue, choose ONE of these options:"
    echo ""
    echo "Option 1: Import existing buckets into CloudFormation (RECOMMENDED)"
    echo "  cdk import --context environment=$ENVIRONMENT"
    echo ""
    echo "Option 2: Delete buckets and redeploy (⚠️  DESTROYS ALL DATA)"
    echo "  ./scripts/deploy.sh $ENVIRONMENT --clean-buckets"
    echo ""
    echo "Option 3: Manually delete specific buckets:"
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "ACCOUNT_ID")
    echo "  aws s3 rb s3://cms-admin-${ENVIRONMENT}-${AWS_ACCOUNT_ID} --force"
    echo "  aws s3 rb s3://cms-media-${ENVIRONMENT}-${AWS_ACCOUNT_ID} --force"
    echo "  aws s3 rb s3://cms-public-${ENVIRONMENT}-${AWS_ACCOUNT_ID} --force"
    echo ""
    exit 1
  else
    # Different error - just fail
    exit 1
  fi
fi

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
