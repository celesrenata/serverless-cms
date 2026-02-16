#!/bin/bash

# Script to import existing S3 buckets into CloudFormation stack
# This resolves the "bucket already exists" error when redeploying

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="ServerlessCmsStack-${ENVIRONMENT}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🔍 Checking for orphaned S3 buckets that need to be imported..."
echo "Stack: $STACK_NAME"
echo "Account: $AWS_ACCOUNT_ID"
echo ""

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" &>/dev/null; then
  echo "✓ Stack does not exist yet - no import needed"
  exit 0
fi

# Define bucket mappings: LogicalID -> BucketName
declare -A BUCKETS=(
  ["MediaBucketBCBB02BA"]="cms-media-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
  ["AdminBucketB0A70AB7"]="cms-admin-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
  ["PublicBucketA6745C15"]="cms-public-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
)

NEEDS_IMPORT=false
IMPORT_FILE="/tmp/cdk-import-${ENVIRONMENT}.json"
echo "[" > "$IMPORT_FILE"
FIRST=true

for LOGICAL_ID in "${!BUCKETS[@]}"; do
  BUCKET_NAME="${BUCKETS[$LOGICAL_ID]}"
  
  # Check if bucket exists in AWS
  if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    # Check if bucket is managed by CloudFormation
    STACK_ID=$(aws s3api get-bucket-tagging --bucket "$BUCKET_NAME" 2>/dev/null | \
      jq -r '.TagSet[] | select(.Key=="aws:cloudformation:stack-id") | .Value' || echo "")
    
    if [ -z "$STACK_ID" ]; then
      echo "⚠️  Bucket $BUCKET_NAME exists but is not managed by CloudFormation"
      NEEDS_IMPORT=true
      
      # Add to import file
      if [ "$FIRST" = false ]; then
        echo "," >> "$IMPORT_FILE"
      fi
      FIRST=false
      
      cat >> "$IMPORT_FILE" << EOF
  {
    "ResourceType": "AWS::S3::Bucket",
    "LogicalResourceId": "$LOGICAL_ID",
    "ResourceIdentifier": {
      "BucketName": "$BUCKET_NAME"
    }
  }
EOF
    else
      echo "✓ Bucket $BUCKET_NAME is already managed by CloudFormation"
    fi
  else
    echo "✓ Bucket $BUCKET_NAME does not exist (will be created)"
  fi
done

echo "]" >> "$IMPORT_FILE"

if [ "$NEEDS_IMPORT" = true ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  MANUAL ACTION REQUIRED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Orphaned buckets detected. To import them into CloudFormation:"
  echo ""
  echo "1. Run: cdk import --context environment=$ENVIRONMENT"
  echo "2. Or delete the buckets if they contain no important data:"
  echo ""
  for BUCKET_NAME in "${BUCKETS[@]}"; do
    echo "   aws s3 rb s3://$BUCKET_NAME --force"
  done
  echo ""
  echo "Import configuration saved to: $IMPORT_FILE"
  echo ""
  exit 1
else
  echo ""
  echo "✅ All buckets are properly managed - no import needed"
  rm -f "$IMPORT_FILE"
  exit 0
fi
