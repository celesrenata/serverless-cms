#!/usr/bin/env bash

# Deploy frontend applications to S3 and invalidate CloudFront cache
# Usage: ./scripts/deploy-frontend.sh [dev|staging|prod] [options]
# Options:
#   --admin-only     Deploy only admin panel
#   --public-only    Deploy only public website
#   --skip-build     Skip build step (use existing dist folder)
#   --skip-invalidate Skip CloudFront cache invalidation
#   --outputs-file   CDK outputs file (default: cdk.out/outputs-{env}.json)

set -e

# Parse arguments
ENVIRONMENT=${1:-dev}
DEPLOY_ADMIN=true
DEPLOY_PUBLIC=true
SKIP_BUILD=false
SKIP_INVALIDATE=false
OUTPUTS_FILE=""

shift || true
while [[ $# -gt 0 ]]; do
  case $1 in
    --admin-only)
      DEPLOY_PUBLIC=false
      shift
      ;;
    --public-only)
      DEPLOY_ADMIN=false
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-invalidate)
      SKIP_INVALIDATE=true
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

if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "❌ Error: Outputs file not found at $OUTPUTS_FILE"
  echo "   Please deploy the CDK stack first using ./scripts/deploy.sh"
  exit 1
fi

echo "🚀 Deploying frontend applications to $ENVIRONMENT environment..."

# Extract stack name and values from outputs
STACK_NAME=$(jq -r 'keys[0]' "$OUTPUTS_FILE")
ADMIN_BUCKET=$(jq -r ".\"$STACK_NAME\".AdminBucketName" "$OUTPUTS_FILE")
PUBLIC_BUCKET=$(jq -r ".\"$STACK_NAME\".PublicBucketName" "$OUTPUTS_FILE")
ADMIN_DIST_ID=$(jq -r ".\"$STACK_NAME\".AdminDistributionId" "$OUTPUTS_FILE")
PUBLIC_DIST_ID=$(jq -r ".\"$STACK_NAME\".PublicDistributionId" "$OUTPUTS_FILE")

# Generate frontend configuration if .env files don't exist
if [ ! -f "frontend/admin-panel/.env" ] || [ ! -f "frontend/public-website/.env" ]; then
  echo ""
  echo "📋 Generating frontend configuration..."
  ./scripts/generate-frontend-config.sh "$ENVIRONMENT" "$OUTPUTS_FILE"
fi

# Deploy Admin Panel
if [ "$DEPLOY_ADMIN" = true ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Admin Panel Deployment"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  cd frontend/admin-panel
  
  # Install dependencies if node_modules doesn't exist
  if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
  fi
  
  # Build
  if [ "$SKIP_BUILD" = false ]; then
    echo "🔨 Building Admin Panel..."
    npm run build
  else
    echo "⏭️  Skipping build..."
    if [ ! -d "dist" ]; then
      echo "❌ Error: dist folder not found. Cannot skip build."
      exit 1
    fi
  fi
  
  # Deploy to S3
  echo "☁️  Uploading to S3 bucket: $ADMIN_BUCKET"
  aws s3 sync dist/ "s3://$ADMIN_BUCKET" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "*.map"
  
  # Upload index.html with no-cache
  echo "📄 Uploading index.html with no-cache..."
  aws s3 cp dist/index.html "s3://$ADMIN_BUCKET/index.html" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --metadata-directive REPLACE
  
  # Invalidate CloudFront cache
  if [ "$SKIP_INVALIDATE" = false ]; then
    echo "🔄 Invalidating CloudFront cache..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
      --distribution-id "$ADMIN_DIST_ID" \
      --paths "/*" \
      --query 'Invalidation.Id' \
      --output text)
    echo "   Invalidation ID: $INVALIDATION_ID"
  fi
  
  cd ../..
  echo "✅ Admin Panel deployed successfully!"
fi

# Deploy Public Website
if [ "$DEPLOY_PUBLIC" = true ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🌐 Public Website Deployment"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  cd frontend/public-website
  
  # Install dependencies if node_modules doesn't exist
  if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
  fi
  
  # Build
  if [ "$SKIP_BUILD" = false ]; then
    echo "🔨 Building Public Website..."
    npm run build
  else
    echo "⏭️  Skipping build..."
    if [ ! -d "dist" ]; then
      echo "❌ Error: dist folder not found. Cannot skip build."
      exit 1
    fi
  fi
  
  # Deploy to S3
  echo "☁️  Uploading to S3 bucket: $PUBLIC_BUCKET"
  aws s3 sync dist/ "s3://$PUBLIC_BUCKET" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "*.map"
  
  # Upload index.html with no-cache
  echo "📄 Uploading index.html with no-cache..."
  aws s3 cp dist/index.html "s3://$PUBLIC_BUCKET/index.html" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --metadata-directive REPLACE
  
  # Invalidate CloudFront cache
  if [ "$SKIP_INVALIDATE" = false ]; then
    echo "🔄 Invalidating CloudFront cache..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
      --distribution-id "$PUBLIC_DIST_ID" \
      --paths "/*" \
      --query 'Invalidation.Id' \
      --output text)
    echo "   Invalidation ID: $INVALIDATION_ID"
  fi
  
  cd ../..
  echo "✅ Public Website deployed successfully!"
fi

# Display deployment summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DEPLOY_ADMIN" = true ]; then
  ADMIN_URL=$(jq -r ".\"$STACK_NAME\".AdminCustomUrl // .\"$STACK_NAME\".AdminUrl" "$OUTPUTS_FILE")
  echo "Admin Panel:        $ADMIN_URL"
fi

if [ "$DEPLOY_PUBLIC" = true ]; then
  PUBLIC_URL=$(jq -r ".\"$STACK_NAME\".PublicCustomUrl // .\"$STACK_NAME\".PublicUrl" "$OUTPUTS_FILE")
  echo "Public Website:     $PUBLIC_URL"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$SKIP_INVALIDATE" = false ]; then
  echo ""
  echo "⏳ Note: CloudFront cache invalidation may take a few minutes to complete."
  echo "   You can check the status in the AWS CloudFront console."
fi

echo ""
