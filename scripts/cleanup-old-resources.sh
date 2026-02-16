#!/usr/bin/env bash

# Cleanup orphaned AWS resources from previous deployments
# Usage: ./scripts/cleanup-old-resources.sh [--dry-run]

set -e

DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No resources will be deleted"
  echo ""
fi

echo "🧹 Cleaning up orphaned AWS resources..."
echo ""

# Get current stack resources to avoid deleting active ones
ACTIVE_POOLS=()
ACTIVE_BUCKETS=()

for env in dev staging prod; do
  OUTPUTS_FILE="cdk.out/outputs-${env}.json"
  if [ -f "$OUTPUTS_FILE" ]; then
    STACK_NAME=$(jq -r 'keys[0]' "$OUTPUTS_FILE" 2>/dev/null || echo "")
    if [ -n "$STACK_NAME" ] && [ "$STACK_NAME" != "null" ]; then
      POOL_ID=$(jq -r ".\"$STACK_NAME\".UserPoolId" "$OUTPUTS_FILE" 2>/dev/null || echo "")
      if [ -n "$POOL_ID" ] && [ "$POOL_ID" != "null" ]; then
        ACTIVE_POOLS+=("$POOL_ID")
      fi
      
      ADMIN_BUCKET=$(jq -r ".\"$STACK_NAME\".AdminBucketName" "$OUTPUTS_FILE" 2>/dev/null || echo "")
      PUBLIC_BUCKET=$(jq -r ".\"$STACK_NAME\".PublicBucketName" "$OUTPUTS_FILE" 2>/dev/null || echo "")
      MEDIA_BUCKET=$(jq -r ".\"$STACK_NAME\".MediaBucketName" "$OUTPUTS_FILE" 2>/dev/null || echo "")
      
      [ -n "$ADMIN_BUCKET" ] && [ "$ADMIN_BUCKET" != "null" ] && ACTIVE_BUCKETS+=("$ADMIN_BUCKET")
      [ -n "$PUBLIC_BUCKET" ] && [ "$PUBLIC_BUCKET" != "null" ] && ACTIVE_BUCKETS+=("$PUBLIC_BUCKET")
      [ -n "$MEDIA_BUCKET" ] && [ "$MEDIA_BUCKET" != "null" ] && ACTIVE_BUCKETS+=("$MEDIA_BUCKET")
    fi
  fi
done

echo "📋 Active resources (will be preserved):"
echo "   User Pools: ${ACTIVE_POOLS[*]:-none}"
echo "   Buckets: ${ACTIVE_BUCKETS[*]:-none}"
echo ""

# Find orphaned Cognito User Pools
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Checking for orphaned Cognito User Pools..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ORPHANED_POOLS=$(aws cognito-idp list-user-pools --max-results 60 --query 'UserPools[?starts_with(Name, `cms-users-`)].Id' --output text)

if [ -n "$ORPHANED_POOLS" ]; then
  for pool_id in $ORPHANED_POOLS; do
    # Check if this pool is active
    if [[ " ${ACTIVE_POOLS[*]} " =~ " ${pool_id} " ]]; then
      echo "✅ Keeping active pool: $pool_id"
    else
      echo "🗑️  Found orphaned pool: $pool_id"
      
      if [ "$DRY_RUN" = false ]; then
        echo "   Deleting..."
        aws cognito-idp delete-user-pool --user-pool-id "$pool_id" 2>&1 || echo "   ⚠️  Failed to delete (may have dependencies)"
      fi
    fi
  done
else
  echo "✅ No orphaned user pools found"
fi

echo ""

# Find orphaned S3 buckets
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Checking for orphaned S3 buckets..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ORPHANED_BUCKETS=$(aws s3 ls | grep -E '(cms-|serverless-cms-)' | awk '{print $3}')

if [ -n "$ORPHANED_BUCKETS" ]; then
  for bucket in $ORPHANED_BUCKETS; do
    # Check if this bucket is active
    if [[ " ${ACTIVE_BUCKETS[*]} " =~ " ${bucket} " ]]; then
      echo "✅ Keeping active bucket: $bucket"
    else
      echo "🗑️  Found orphaned bucket: $bucket"
      
      if [ "$DRY_RUN" = false ]; then
        echo "   Emptying bucket..."
        aws s3 rm "s3://$bucket" --recursive 2>&1 || echo "   ⚠️  Failed to empty bucket"
        echo "   Deleting bucket..."
        aws s3 rb "s3://$bucket" 2>&1 || echo "   ⚠️  Failed to delete bucket"
      fi
    fi
  done
else
  echo "✅ No orphaned buckets found"
fi

echo ""

# Find orphaned DynamoDB tables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Checking for orphaned DynamoDB tables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ORPHANED_TABLES=$(aws dynamodb list-tables --query 'TableNames[?starts_with(@, `cms-`)]' --output text)

if [ -n "$ORPHANED_TABLES" ]; then
  for table in $ORPHANED_TABLES; do
    # Check if table has recent activity (created in last 7 days = likely active)
    CREATION_TIME=$(aws dynamodb describe-table --table-name "$table" --query 'Table.CreationDateTime' --output text 2>/dev/null || echo "")
    
    if [ -n "$CREATION_TIME" ]; then
      DAYS_OLD=$(( ($(date +%s) - $(date -d "$CREATION_TIME" +%s)) / 86400 ))
      
      if [ "$DAYS_OLD" -lt 7 ]; then
        echo "✅ Keeping recent table: $table (${DAYS_OLD} days old)"
      else
        echo "🗑️  Found old table: $table (${DAYS_OLD} days old)"
        
        if [ "$DRY_RUN" = false ]; then
          echo "   ⚠️  Skipping DynamoDB table deletion (manual review recommended)"
          echo "   To delete manually: aws dynamodb delete-table --table-name $table"
        fi
      fi
    fi
  done
else
  echo "✅ No orphaned tables found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = true ]; then
  echo "✅ Dry run complete - no resources were deleted"
  echo "   Run without --dry-run to actually delete orphaned resources"
else
  echo "✅ Cleanup complete!"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
