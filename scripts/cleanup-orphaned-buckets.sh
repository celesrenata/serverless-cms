#!/bin/bash

# Script to clean up orphaned S3 buckets that are not managed by CloudFormation
# This happens when a stack is deleted but buckets are retained

set -e

ENVIRONMENT=${1:-dev}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🧹 Checking for orphaned S3 buckets in environment: $ENVIRONMENT"
echo "AWS Account: $AWS_ACCOUNT_ID"

BUCKETS=(
  "cms-admin-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
  "cms-media-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
  "cms-public-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
)

for BUCKET in "${BUCKETS[@]}"; do
  echo ""
  echo "Checking bucket: $BUCKET"
  
  # Check if bucket exists
  if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    echo "✓ Bucket exists"
    
    # Check if bucket is managed by CloudFormation
    STACK_NAME=$(aws s3api get-bucket-tagging --bucket "$BUCKET" 2>/dev/null | \
      jq -r '.TagSet[] | select(.Key=="aws:cloudformation:stack-name") | .Value' || echo "")
    
    if [ -z "$STACK_NAME" ]; then
      echo "⚠️  Bucket is NOT managed by CloudFormation (orphaned)"
      echo "   You have two options:"
      echo "   1. Delete the bucket: aws s3 rb s3://$BUCKET --force"
      echo "   2. Import it into CloudFormation stack (requires manual CDK import)"
    else
      echo "✓ Bucket is managed by stack: $STACK_NAME"
    fi
  else
    echo "✓ Bucket does not exist (will be created)"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "To delete all orphaned buckets, run:"
echo "  for bucket in ${BUCKETS[@]}; do aws s3 rb s3://\$bucket --force; done"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
