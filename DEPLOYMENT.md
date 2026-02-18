# Deployment Guide

This comprehensive guide covers deploying the Serverless CMS to AWS, from initial setup to production deployment and ongoing maintenance.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Deployment Methods](#deployment-methods)
- [Environment Configuration](#environment-configuration)
- [Post-Deployment Setup](#post-deployment-setup)
- [Deployment Outputs](#deployment-outputs)
- [Custom Domain Setup](#custom-domain-setup)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)
- [Cost Optimization](#cost-optimization)
- [Backup and Recovery](#backup-and-recovery)
- [Security Best Practices](#security-best-practices)
- [Cleanup](#cleanup)

---

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured with appropriate credentials
   ```bash
   aws configure
   ```

2. **Node.js** (v18 or later) and npm installed

3. **AWS CDK** installed globally (optional, but recommended)
   ```bash
   npm install -g aws-cdk
   ```

4. **jq** installed for JSON parsing (used by deployment scripts)
   - macOS: `brew install jq`
   - Linux: `apt-get install jq` or `yum install jq`

5. **AWS Account** with appropriate permissions to create:
   - DynamoDB tables
   - S3 buckets
   - Lambda functions
   - API Gateway
   - Cognito User Pools
   - CloudFront distributions
   - IAM roles and policies
   - EventBridge rules (for scheduled publishing)

6. **Python 3.12** installed (for Lambda functions)

7. **Git** installed for version control

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/serverless-cms.git
cd serverless-cms
```

### 2. Install Dependencies

Install all project dependencies:

```bash
# Install root dependencies (CDK)
npm install

# Install admin panel dependencies
cd frontend/admin-panel
npm install
cd ../..

# Install public website dependencies
cd frontend/public-website
npm install
cd ../..
```

### 3. Bootstrap AWS CDK

If this is your first time using CDK in your AWS account/region:

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

Replace `ACCOUNT-ID` with your AWS account ID and `REGION` with your target region (e.g., `us-east-1`).

### 4. Configure Environments

Edit `config/environments.ts` to configure your deployment environments:

```typescript
export const environments: Record<string, EnvironmentConfig> = {
  dev: {
    region: 'us-east-1',
    // No custom domain for dev
  },
  staging: {
    region: 'us-east-1',
    domainName: 'staging.your-domain.com',
    hostedZoneName: 'your-domain.com',
  },
  prod: {
    region: 'us-east-1',
    domainName: 'www.your-domain.com',
    hostedZoneName: 'your-domain.com',
  },
};
```

**Note:** For custom domains, you must have a Route53 hosted zone already set up.

---

## Deployment Methods

### Method 1: Full Deployment (Recommended)

Deploy both infrastructure and frontend applications in one command:

```bash
# Deploy to dev environment
./scripts/deploy-all.sh dev

# Deploy to staging environment
./scripts/deploy-all.sh staging

# Deploy to production environment
./scripts/deploy-all.sh prod
```

Or using npm scripts:

```bash
npm run deploy:all:dev
npm run deploy:all:staging
npm run deploy:all:prod
```

### Method 2: Step-by-Step Deployment

#### Step 1: Deploy Infrastructure

Deploy the CDK stack (DynamoDB, S3, Lambda, API Gateway, Cognito, CloudFront):

```bash
./scripts/deploy.sh dev
```

Or using npm:

```bash
npm run deploy:dev
```

This will:
- Build the CDK TypeScript code
- Synthesize CloudFormation templates
- Deploy the stack to AWS
- Save outputs to `cdk.out/outputs-dev.json`

#### Step 2: Generate Frontend Configuration

Generate `.env` files for frontend applications from CDK outputs:

```bash
./scripts/generate-frontend-config.sh dev
```

Or using npm:

```bash
npm run config:frontend:dev
```

This creates:
- `frontend/admin-panel/.env`
- `frontend/public-website/.env`

#### Step 3: Deploy Frontend Applications

Build and deploy frontend applications to S3:

```bash
./scripts/deploy-frontend.sh dev
```

Or using npm:

```bash
npm run deploy:frontend:dev
```

This will:
- Install dependencies (if needed)
- Build both React applications
- Upload to S3 buckets
- Invalidate CloudFront caches

## Deployment Script Options

### deploy-all.sh Options

```bash
./scripts/deploy-all.sh [environment] [options]

Options:
  --skip-cdk          Skip CDK infrastructure deployment
  --skip-frontend     Skip frontend deployment
  --skip-invalidate   Skip CloudFront cache invalidation
```

Examples:

```bash
# Deploy only frontend (infrastructure already deployed)
./scripts/deploy-all.sh dev --skip-cdk

# Deploy only infrastructure
./scripts/deploy-all.sh dev --skip-frontend

# Deploy without CloudFront invalidation (faster, but changes may not be visible immediately)
./scripts/deploy-all.sh dev --skip-invalidate
```

### deploy.sh Options

```bash
./scripts/deploy.sh [environment] [options]

Options:
  --skip-build       Skip CDK build step
  --outputs-file     Save stack outputs to file (default: outputs-{env}.json)
```

### deploy-frontend.sh Options

```bash
./scripts/deploy-frontend.sh [environment] [options]

Options:
  --admin-only       Deploy only admin panel
  --public-only      Deploy only public website
  --skip-build       Skip build step (use existing dist folder)
  --skip-invalidate  Skip CloudFront cache invalidation
  --outputs-file     CDK outputs file (default: cdk.out/outputs-{env}.json)
```

Examples:

```bash
# Deploy only admin panel
./scripts/deploy-frontend.sh dev --admin-only

# Deploy only public website
./scripts/deploy-frontend.sh dev --public-only

# Deploy without rebuilding (faster for quick updates)
./scripts/deploy-frontend.sh dev --skip-build
```

## Building Frontend Locally

To build frontend applications without deploying:

```bash
./scripts/build-frontend.sh
```

Or using npm:

```bash
npm run build:frontend
```

Options:

```bash
./scripts/build-frontend.sh [options]

Options:
  --admin-only    Build only admin panel
  --public-only   Build only public website
  --clean         Clean dist folders before building
```

## Environment Configuration

### CDK Environments

Configure environments in `config/environments.ts`:

```typescript
export const environments: Record<string, EnvironmentConfig> = {
  dev: {
    region: 'us-east-1',
    // No custom domain for dev
  },
  staging: {
    region: 'us-east-1',
    domainName: 'staging-cms.example.com',
    hostedZoneName: 'example.com',
  },
  prod: {
    region: 'us-east-1',
    domainName: 'cms.example.com',
    hostedZoneName: 'example.com',
  },
};
```

### Frontend Environment Variables

After deployment, frontend `.env` files are auto-generated with:

**Admin Panel** (`frontend/admin-panel/.env`):
```env
VITE_API_ENDPOINT=https://xxx.execute-api.us-east-1.amazonaws.com/dev/api/v1
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_MEDIA_BUCKET=cms-media-dev-xxxxxxxxxxxx
VITE_ENVIRONMENT=dev
```

**Public Website** (`frontend/public-website/.env`):
```env
VITE_API_ENDPOINT=https://xxx.execute-api.us-east-1.amazonaws.com/dev/api/v1
VITE_ENVIRONMENT=dev
```

## Post-Deployment Setup

### 1. Create Admin User

After deployment, create your first admin user in Cognito:

```bash
# Get User Pool ID from outputs
USER_POOL_ID=$(jq -r '.ServerlessCmsStack.UserPoolId' cdk.out/outputs-dev.json)

# Create user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true \
  --temporary-password 'TempPassword123!' \
  --message-action SUPPRESS

# Set admin role
aws cognito-idp admin-update-user-attributes \
  --user-pool-id $USER_POOL_ID \
  --username admin@example.com \
  --user-attributes Name=custom:role,Value=admin
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### 2. Access the Admin Panel

Get the Admin Panel URL from deployment outputs:

```bash
jq -r '.ServerlessCmsStack.AdminUrl' cdk.out/outputs-dev.json
```

Or if using custom domain:

```bash
jq -r '.ServerlessCmsStack.AdminCustomUrl' cdk.out/outputs-dev.json
```

### 3. First Login

1. Navigate to the Admin Panel URL
2. Log in with the email and temporary password
3. You'll be prompted to change your password
4. After changing password, you can start creating content!

### 4. Configure Site Settings

After logging in:

1. Navigate to Settings in the admin panel
2. Configure:
   - Site title
   - Site description
   - Default theme
   - Any other global settings

### 5. Create Additional Users (Optional)

Create additional users with different roles:

```bash
# Create an editor
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username editor@example.com \
  --user-attributes Name=email,Value=editor@example.com Name=email_verified,Value=true Name=custom:role,Value=editor \
  --temporary-password 'TempPassword123!' \
  --message-action SUPPRESS

# Create an author
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username author@example.com \
  --user-attributes Name=email,Value=author@example.com Name=email_verified,Value=true Name=custom:role,Value=author \
  --temporary-password 'TempPassword123!' \
  --message-action SUPPRESS
```

**User Roles:**
- `admin` - Full system access
- `editor` - Content and media management
- `author` - Create and edit own content
- `viewer` - Read-only access

---

## Deployment Outputs

After deployment, the following outputs are available:

### Infrastructure Outputs

- **ApiEndpoint**: API Gateway endpoint URL
- **UserPoolId**: Cognito User Pool ID
- **UserPoolClientId**: Cognito User Pool Client ID
- **AdminUrl**: Admin Panel CloudFront URL
- **PublicUrl**: Public Website CloudFront URL
- **AdminBucketName**: S3 bucket for admin panel
- **PublicBucketName**: S3 bucket for public website
- **MediaBucketName**: S3 bucket for media files
- **AdminDistributionId**: CloudFront distribution ID for admin panel
- **PublicDistributionId**: CloudFront distribution ID for public website

### Custom Domain Outputs (if configured)

- **DomainName**: Custom domain name
- **AdminCustomUrl**: Admin Panel custom domain URL
- **PublicCustomUrl**: Public Website custom domain URL
- **CertificateArn**: ACM certificate ARN
- **HostedZoneId**: Route53 hosted zone ID

---

## Custom Domain Setup

### Prerequisites

1. **Domain registered** with any registrar
2. **Route53 Hosted Zone** created for your domain
3. **ACM Certificate** in us-east-1 (for CloudFront)

### Step 1: Create ACM Certificate

If you don't have an ACM certificate:

```bash
# Request certificate
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names "*.your-domain.com" \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
CERT_ARN=$(aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='your-domain.com'].CertificateArn" \
  --output text)

# Get validation records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord"
```

### Step 2: Add DNS Validation Records

Add the CNAME records to your Route53 hosted zone to validate the certificate.

### Step 3: Configure Environment

Update `config/environments.ts`:

```typescript
prod: {
  region: 'us-east-1',
  domainName: 'www.your-domain.com',
  hostedZoneName: 'your-domain.com',
  certificateArn: 'arn:aws:acm:us-east-1:123456789:certificate/xxx',
}
```

### Step 4: Deploy with Custom Domain

```bash
./scripts/deploy-all.sh prod
```

The CDK stack will:
1. Create CloudFront distributions with custom domains
2. Create Route53 A records pointing to CloudFront
3. Configure SSL/TLS with your ACM certificate

### Step 5: Verify DNS Propagation

```bash
# Check admin panel
dig admin.your-domain.com

# Check public website
dig www.your-domain.com
```

DNS propagation can take up to 48 hours, but usually completes within minutes.

---

## Monitoring and Logging

### CloudWatch Logs

All Lambda functions log to CloudWatch Logs. View logs:

```bash
# List log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/ServerlessCms

# Tail logs for a specific function
aws logs tail /aws/lambda/ServerlessCms-ContentCreate --follow
```

### CloudWatch Metrics

Monitor key metrics:

1. **Lambda Metrics:**
   - Invocations
   - Duration
   - Errors
   - Throttles

2. **API Gateway Metrics:**
   - Request count
   - Latency
   - 4XX/5XX errors

3. **DynamoDB Metrics:**
   - Read/Write capacity units
   - Throttled requests
   - System errors

### CloudWatch Alarms

Set up alarms for critical metrics:

```bash
# Create alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name cms-content-create-errors \
  --alarm-description "Alert on content creation errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=ServerlessCms-ContentCreate
```

### X-Ray Tracing

Enable X-Ray for distributed tracing:

1. Lambda functions are already configured with X-Ray
2. View traces in AWS X-Ray console
3. Analyze performance bottlenecks
4. Debug errors across services

### Application Monitoring

Monitor application-level metrics:

```python
# In Lambda functions
import json
from datetime import datetime

def handler(event, context):
    start_time = datetime.now()
    
    try:
        # Your code
        result = process_content(event)
        
        # Log success metrics
        duration = (datetime.now() - start_time).total_seconds()
        print(json.dumps({
            'metric': 'content_create_success',
            'duration': duration,
            'content_type': event.get('type')
        }))
        
        return result
    except Exception as e:
        # Log error metrics
        print(json.dumps({
            'metric': 'content_create_error',
            'error': str(e),
            'content_type': event.get('type')
        }))
        raise
```

---

## Troubleshooting

### CDK Deployment Fails

1. **Bootstrap CDK** (first time only):
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```

2. **Check AWS credentials**:
   ```bash
   aws sts get-caller-identity
   ```

3. **View detailed error**:
   ```bash
   cdk deploy --context environment=dev --verbose
   ```

### Frontend Build Fails

1. **Clear node_modules and reinstall**:
   ```bash
   cd frontend/admin-panel
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version**:
   ```bash
   node --version  # Should be v18 or later
   ```

### CloudFront Cache Issues

If changes aren't visible after deployment:

1. **Manually invalidate cache**:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id DISTRIBUTION_ID \
     --paths "/*"
   ```

2. **Wait for invalidation** (can take 5-15 minutes)

3. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)

### Permission Errors

Ensure your AWS user/role has permissions for:
- CloudFormation
- DynamoDB
- S3
- Lambda
- API Gateway
- Cognito
- CloudFront
- IAM
- Route53 (if using custom domains)
- ACM (if using custom domains)
- EventBridge (for scheduled publishing)
- CloudWatch Logs

**Minimum IAM Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "dynamodb:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "cognito-idp:*",
        "cloudfront:*",
        "iam:*",
        "route53:*",
        "acm:*",
        "events:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Lambda Function Errors

Check CloudWatch Logs for detailed error messages:

```bash
# View recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/ServerlessCms-ContentCreate \
  --filter-pattern "ERROR" \
  --max-items 10
```

Common issues:
- **Timeout errors**: Increase Lambda timeout in CDK stack
- **Memory errors**: Increase Lambda memory allocation
- **Permission errors**: Check IAM role permissions
- **Import errors**: Ensure all dependencies are included

### DynamoDB Throttling

If you see throttling errors:

1. **Check metrics**:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ThrottledRequests \
     --dimensions Name=TableName,Value=ServerlessCms-Content \
     --start-time 2024-01-01T00:00:00Z \
     --end-time 2024-01-02T00:00:00Z \
     --period 3600 \
     --statistics Sum
   ```

2. **Enable auto-scaling** (if needed for production)
3. **Use PAY_PER_REQUEST billing mode** (already configured)

### S3 Upload Failures

Common S3 issues:

1. **CORS errors**: Check S3 bucket CORS configuration
2. **Size limits**: Ensure files are under Lambda payload limit (6MB)
3. **Permission errors**: Verify Lambda has S3 write permissions

### API Gateway 502 Errors

502 errors usually indicate Lambda function failures:

1. Check CloudWatch Logs for the Lambda function
2. Verify Lambda timeout is sufficient
3. Check for unhandled exceptions in code

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Install dependencies
        run: npm install
      
      - name: Deploy
        run: ./scripts/deploy-all.sh prod
```

## Cost Optimization

### Development Environment

For cost savings in dev:

1. **Use PAY_PER_REQUEST billing** (already configured)
   - No minimum charges
   - Pay only for actual requests

2. **Set shorter retention periods for logs**:
   ```bash
   aws logs put-retention-policy \
     --log-group-name /aws/lambda/ServerlessCms-ContentCreate \
     --retention-in-days 7
   ```

3. **Use smaller Lambda memory sizes** for low-traffic functions

4. **Consider CloudFront price class 100** (North America & Europe only):
   ```typescript
   priceClass: cloudfront.PriceClass.PRICE_CLASS_100
   ```

5. **Delete unused resources** regularly

### Production Environment

For production optimization:

1. **Enable DynamoDB auto-scaling** if traffic is predictable:
   ```typescript
   const table = new dynamodb.Table(this, 'ContentTable', {
     billingMode: dynamodb.BillingMode.PROVISIONED,
     readCapacity: 5,
     writeCapacity: 5,
   });
   
   table.autoScaleReadCapacity({
     minCapacity: 5,
     maxCapacity: 100,
   }).scaleOnUtilization({ targetUtilizationPercent: 70 });
   ```

2. **Configure CloudWatch alarms** for cost monitoring

3. **Set up S3 lifecycle policies** for old media:
   ```typescript
   mediaBucket.addLifecycleRule({
     id: 'archive-old-media',
     transitions: [
       {
         storageClass: s3.StorageClass.INTELLIGENT_TIERING,
         transitionAfter: Duration.days(90),
       },
     ],
   });
   ```

4. **Use Lambda provisioned concurrency** only for critical functions

5. **Enable CloudFront compression** (already configured)

6. **Monitor and optimize Lambda memory** based on actual usage

### Cost Monitoring

Set up billing alerts:

```bash
# Create SNS topic for billing alerts
aws sns create-topic --name billing-alerts

# Subscribe to topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:billing-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Create billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name monthly-billing-alert \
  --alarm-description "Alert when monthly bill exceeds $100" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Currency,Value=USD
```

### Estimated Monthly Costs

**Development (low traffic):**
- DynamoDB: $1-5
- Lambda: $0-2
- S3: $1-3
- CloudFront: $1-5
- API Gateway: $1-3
- Cognito: $0 (free tier)
- **Total: ~$5-20/month**

**Production (moderate traffic - 10k requests/day):**
- DynamoDB: $10-30
- Lambda: $5-15
- S3: $5-20
- CloudFront: $10-50
- API Gateway: $10-30
- Cognito: $0-5
- **Total: ~$40-150/month**

---

## Backup and Recovery

### DynamoDB Backups

#### Point-in-Time Recovery (PITR)

Enable PITR for continuous backups:

```bash
# Enable PITR
aws dynamodb update-continuous-backups \
  --table-name ServerlessCms-Content \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

PITR allows recovery to any point in time within the last 35 days.

#### On-Demand Backups

Create manual backups:

```bash
# Create backup
aws dynamodb create-backup \
  --table-name ServerlessCms-Content \
  --backup-name cms-content-backup-$(date +%Y%m%d)

# List backups
aws dynamodb list-backups --table-name ServerlessCms-Content

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name ServerlessCms-Content-Restored \
  --backup-arn arn:aws:dynamodb:us-east-1:123456789:table/ServerlessCms-Content/backup/xxx
```

#### Automated Backup Script

```bash
#!/bin/bash
# backup-dynamodb.sh

TABLES=(
  "ServerlessCms-Content"
  "ServerlessCms-Media"
  "ServerlessCms-Users"
  "ServerlessCms-Settings"
  "ServerlessCms-Plugins"
)

DATE=$(date +%Y%m%d-%H%M%S)

for TABLE in "${TABLES[@]}"; do
  echo "Backing up $TABLE..."
  aws dynamodb create-backup \
    --table-name $TABLE \
    --backup-name "${TABLE}-backup-${DATE}"
done

echo "All backups completed!"
```

### S3 Backups

#### Enable Versioning

```bash
# Enable versioning on media bucket
aws s3api put-bucket-versioning \
  --bucket cms-media-prod-xxxxxxxxxxxx \
  --versioning-configuration Status=Enabled
```

#### Cross-Region Replication

For disaster recovery, set up cross-region replication:

```typescript
// In CDK stack
const replicationBucket = new s3.Bucket(this, 'MediaReplicationBucket', {
  bucketName: `cms-media-replica-${env}`,
  versioned: true,
  removalPolicy: RemovalPolicy.RETAIN,
});

mediaBucket.addToResourcePolicy(new iam.PolicyStatement({
  actions: ['s3:ReplicateObject', 's3:ReplicateDelete'],
  resources: [replicationBucket.arnForObjects('*')],
  principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
}));
```

#### S3 Sync for Backups

```bash
# Backup media to another bucket
aws s3 sync s3://cms-media-prod s3://cms-media-backup --storage-class GLACIER
```

### Recovery Procedures

#### Restore DynamoDB Table

```bash
# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name ServerlessCms-Content \
  --backup-arn arn:aws:dynamodb:us-east-1:123456789:table/ServerlessCms-Content/backup/xxx

# Or restore to a point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name ServerlessCms-Content \
  --target-table-name ServerlessCms-Content-Restored \
  --restore-date-time 2024-01-01T12:00:00Z
```

#### Restore S3 Objects

```bash
# Restore specific file version
aws s3api get-object \
  --bucket cms-media-prod \
  --key uploads/2024/01/image.jpg \
  --version-id VERSION_ID \
  image-restored.jpg

# Restore all files from backup bucket
aws s3 sync s3://cms-media-backup s3://cms-media-prod
```

---

## Security Best Practices

### 1. Enable MFA for Admin Users

```bash
# Enable MFA for Cognito user pool
aws cognito-idp set-user-pool-mfa-config \
  --user-pool-id $USER_POOL_ID \
  --mfa-configuration OPTIONAL \
  --software-token-mfa-configuration Enabled=true
```

### 2. Rotate Secrets Regularly

- Rotate Cognito app client secrets
- Update API keys for external services
- Rotate IAM access keys

### 3. Enable CloudTrail

```bash
# Create CloudTrail trail
aws cloudtrail create-trail \
  --name cms-audit-trail \
  --s3-bucket-name cms-cloudtrail-logs

# Start logging
aws cloudtrail start-logging --name cms-audit-trail
```

### 4. Configure WAF (Web Application Firewall)

```typescript
// In CDK stack
const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
  scope: 'CLOUDFRONT',
  defaultAction: { allow: {} },
  rules: [
    {
      name: 'RateLimitRule',
      priority: 1,
      statement: {
        rateBasedStatement: {
          limit: 2000,
          aggregateKeyType: 'IP',
        },
      },
      action: { block: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRule',
      },
    },
  ],
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: 'WebAcl',
  },
});
```

### 5. Enable S3 Bucket Encryption

```bash
# Enable default encryption
aws s3api put-bucket-encryption \
  --bucket cms-media-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 6. Implement Least Privilege IAM Policies

Review and minimize Lambda function permissions regularly.

### 7. Enable VPC Endpoints (Optional)

For enhanced security, use VPC endpoints for DynamoDB and S3:

```typescript
const vpc = new ec2.Vpc(this, 'CmsVpc');

vpc.addGatewayEndpoint('DynamoDbEndpoint', {
  service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
});

vpc.addGatewayEndpoint('S3Endpoint', {
  service: ec2.GatewayVpcEndpointAwsService.S3,
});
```

### 8. Regular Security Audits

```bash
# Run AWS Trusted Advisor checks
aws support describe-trusted-advisor-checks

# Use AWS Security Hub
aws securityhub enable-security-hub
```

---

## Cleanup

To delete all resources and avoid ongoing charges:

### Step 1: Empty S3 Buckets

S3 buckets must be empty before deletion:

```bash
# Get bucket names from outputs
ADMIN_BUCKET=$(jq -r '.ServerlessCmsStack.AdminBucketName' cdk.out/outputs-dev.json)
PUBLIC_BUCKET=$(jq -r '.ServerlessCmsStack.PublicBucketName' cdk.out/outputs-dev.json)
MEDIA_BUCKET=$(jq -r '.ServerlessCmsStack.MediaBucketName' cdk.out/outputs-dev.json)

# Empty buckets
aws s3 rm s3://$ADMIN_BUCKET --recursive
aws s3 rm s3://$PUBLIC_BUCKET --recursive
aws s3 rm s3://$MEDIA_BUCKET --recursive

# If versioning is enabled, delete all versions
aws s3api delete-objects \
  --bucket $MEDIA_BUCKET \
  --delete "$(aws s3api list-object-versions \
    --bucket $MEDIA_BUCKET \
    --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
    --output json)"
```

### Step 2: Delete CloudFormation Stack

```bash
# Delete CDK stack
cdk destroy --context environment=dev

# Or use AWS CLI
aws cloudformation delete-stack --stack-name ServerlessCmsStack-dev
```

### Step 3: Clean Up Additional Resources

Some resources may need manual cleanup:

```bash
# Delete CloudWatch log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/ServerlessCms \
  --query 'logGroups[*].logGroupName' --output text | \
  xargs -I {} aws logs delete-log-group --log-group-name {}

# Delete DynamoDB backups
aws dynamodb list-backups --table-name ServerlessCms-Content \
  --query 'BackupSummaries[*].BackupArn' --output text | \
  xargs -I {} aws dynamodb delete-backup --backup-arn {}

# Delete Cognito user pool (if not deleted by CDK)
aws cognito-idp delete-user-pool --user-pool-id $USER_POOL_ID
```

### Step 4: Verify Deletion

```bash
# Check if stack is deleted
aws cloudformation describe-stacks --stack-name ServerlessCmsStack-dev

# Should return: "Stack with id ServerlessCmsStack-dev does not exist"
```

**Warning**: This will permanently delete all data including:
- All content (posts, pages, galleries, projects)
- All media files
- All user accounts
- All settings and configurations
- All plugins

**Make sure to backup any important data before cleanup!**

---

## AWS SES Email Configuration

### Overview

AWS Simple Email Service (SES) is used to send transactional emails including:
- Welcome emails for new user registrations
- Password reset notifications
- Email verification for new accounts

### Step 1: Verify Email Identity

Before sending emails, you must verify your sender email address or domain in SES.

#### Option A: Verify Single Email Address (Quick Start)

```bash
# Verify the sender email address
aws ses verify-email-identity \
  --email-address no-reply@celestium.life \
  --region us-east-1

# Check verification status
aws ses get-identity-verification-attributes \
  --identities no-reply@celestium.life \
  --region us-east-1
```

You'll receive a verification email at the specified address. Click the link to complete verification.

#### Option B: Verify Domain (Recommended for Production)

```bash
# Verify the domain
aws ses verify-domain-identity \
  --domain celestium.life \
  --region us-east-1
```

This returns a verification token. Add it as a TXT record in your DNS:

```
Name: _amazonses.celestium.life
Type: TXT
Value: [verification-token-from-command-output]
```

### Step 2: Configure DNS Records for Email Authentication

For production use, configure SPF, DKIM, and DMARC records to improve email deliverability and prevent spoofing.

#### SPF Record

Add an SPF TXT record to your domain:

```
Name: celestium.life
Type: TXT
Value: "v=spf1 include:amazonses.com ~all"
```

#### DKIM Records

Generate DKIM tokens:

```bash
aws ses verify-domain-dkim \
  --domain celestium.life \
  --region us-east-1
```

This returns three DKIM tokens. Add them as CNAME records:

```
Name: [token1]._domainkey.celestium.life
Type: CNAME
Value: [token1].dkim.amazonses.com

Name: [token2]._domainkey.celestium.life
Type: CNAME
Value: [token2].dkim.amazonses.com

Name: [token3]._domainkey.celestium.life
Type: CNAME
Value: [token3].dkim.amazonses.com
```

#### DMARC Record

Add a DMARC TXT record:

```
Name: _dmarc.celestium.life
Type: TXT
Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@celestium.life"
```

DMARC policies:
- `p=none`: Monitor only (recommended for testing)
- `p=quarantine`: Send suspicious emails to spam
- `p=reject`: Reject suspicious emails (recommended for production)

### Step 3: Move Out of SES Sandbox

By default, SES accounts start in sandbox mode with limitations:
- Can only send to verified email addresses
- Limited to 200 emails per day
- Maximum send rate of 1 email per second

To send to any email address and increase limits:

1. **Request Production Access:**
   - Go to AWS SES Console → Account Dashboard
   - Click "Request production access"
   - Fill out the form with:
     - Use case description
     - Website URL
     - Compliance with AWS policies
     - How you handle bounces and complaints

2. **Wait for Approval:**
   - AWS typically responds within 24 hours
   - You may be asked for additional information

3. **Verify Approval:**
   ```bash
   aws ses get-account-sending-enabled --region us-east-1
   ```

### Step 4: Configure Bounce and Complaint Handling

The CDK stack automatically creates SNS topics for bounce and complaint notifications. Subscribe to these topics:

```bash
# Get SNS topic ARNs from stack outputs
BOUNCE_TOPIC=$(aws cloudformation describe-stacks \
  --stack-name ServerlessCmsStack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`EmailBounceTopicArn`].OutputValue' \
  --output text)

COMPLAINT_TOPIC=$(aws cloudformation describe-stacks \
  --stack-name ServerlessCmsStack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`EmailComplaintTopicArn`].OutputValue' \
  --output text)

# Subscribe to bounce notifications
aws sns subscribe \
  --topic-arn $BOUNCE_TOPIC \
  --protocol email \
  --notification-endpoint admin@celestium.life

# Subscribe to complaint notifications
aws sns subscribe \
  --topic-arn $COMPLAINT_TOPIC \
  --protocol email \
  --notification-endpoint admin@celestium.life
```

### Step 5: Test Email Sending

Test email functionality after verification:

```bash
# Send test email using AWS CLI
aws ses send-email \
  --from no-reply@celestium.life \
  --destination ToAddresses=test@example.com \
  --message Subject={Data="Test Email",Charset=utf-8},Body={Text={Data="This is a test email from SES",Charset=utf-8}} \
  --region us-east-1
```

Or test through the application:
1. Create a new user in the admin panel
2. Check that the welcome email is received
3. Trigger a password reset
4. Verify the password reset email is received

### Step 6: Monitor Email Metrics

Monitor email sending in CloudWatch:

```bash
# View sent email count
aws cloudwatch get-metric-statistics \
  --namespace AWS/SES \
  --metric-name Send \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --region us-east-1

# View bounce rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/SES \
  --metric-name Reputation.BounceRate \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average \
  --region us-east-1
```

### SES Best Practices

1. **Maintain Low Bounce Rate:**
   - Keep bounce rate below 5%
   - Remove invalid email addresses from your system
   - Monitor bounce notifications

2. **Handle Complaints:**
   - Keep complaint rate below 0.1%
   - Provide clear unsubscribe options
   - Honor unsubscribe requests immediately

3. **Warm Up Your Sending:**
   - Start with low volume (hundreds per day)
   - Gradually increase over 2-4 weeks
   - Monitor reputation metrics

4. **Use Email Templates:**
   - Templates are defined in `lambda/shared/email.py`
   - Customize templates for your brand
   - Test templates before production use

5. **Monitor Reputation:**
   - Check SES reputation dashboard regularly
   - Set up CloudWatch alarms for high bounce/complaint rates
   - Respond quickly to reputation issues

### Troubleshooting SES

**Emails Not Being Sent:**
- Verify email identity is confirmed
- Check Lambda function has SES permissions
- Review CloudWatch logs for errors
- Verify SES is not in sandbox mode (for production)

**Emails Going to Spam:**
- Configure SPF, DKIM, and DMARC records
- Ensure "From" address matches verified identity
- Improve email content (avoid spam trigger words)
- Warm up your sending reputation

**High Bounce Rate:**
- Validate email addresses before sending
- Remove invalid addresses from database
- Check for typos in email addresses
- Monitor bounce notifications

**SES Sending Paused:**
- Check for high bounce or complaint rates
- Review AWS SES account status
- Contact AWS Support if needed
- Implement better email validation

---

## AWS WAF and CAPTCHA Configuration

### Overview

AWS WAF (Web Application Firewall) protects the comment submission endpoint from spam and abuse. When enabled, users must complete a CAPTCHA challenge before submitting comments.

### WAF Components

The CDK stack automatically creates:
- **Web ACL**: Firewall rules for API Gateway
- **CAPTCHA Rule**: Challenge for comment endpoint
- **Rate Limit Rule**: Prevents abuse (100 requests per 5 minutes per IP)
- **CloudWatch Metrics**: Monitor WAF activity

### Step 1: Verify WAF Deployment

After deploying the stack, verify WAF is active:

```bash
# Get Web ACL ARN
WAF_ARN=$(aws cloudformation describe-stacks \
  --stack-name ServerlessCmsStack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`WebAclArn`].OutputValue' \
  --output text)

# Get Web ACL details
aws wafv2 get-web-acl \
  --scope REGIONAL \
  --id [web-acl-id] \
  --region us-east-1
```

### Step 2: Enable CAPTCHA in Settings

CAPTCHA is controlled by the `captcha_enabled` setting:

1. Log in to the admin panel
2. Navigate to Settings
3. Toggle "Enable CAPTCHA for Comments" on
4. Save settings

When enabled:
- Comment form displays CAPTCHA widget
- Users must solve CAPTCHA before submitting
- Invalid CAPTCHA tokens are rejected

When disabled:
- CAPTCHA widget is hidden
- Rate limiting still applies (5 comments per hour per IP)
- Comments go through normal validation

### Step 3: Test CAPTCHA Flow

Test the CAPTCHA integration:

1. Navigate to a blog post on the public website
2. Scroll to the comment form
3. Fill in name, email, and comment
4. Complete the CAPTCHA challenge
5. Submit the comment
6. Verify the comment is created successfully

### Step 4: Monitor WAF Metrics

Monitor WAF activity in CloudWatch:

```bash
# View blocked requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=Rule,Value=CaptchaRule Name=WebACL,Value=ServerlessCmsWebAcl \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --region us-east-1

# View CAPTCHA challenge count
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name CaptchaChallengeCount \
  --dimensions Name=Rule,Value=CaptchaRule Name=WebACL,Value=ServerlessCmsWebAcl \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --region us-east-1
```

### Step 5: Configure WAF Alarms

CloudWatch alarms are automatically created for:
- High CAPTCHA failure rate (>50%)
- Unusual blocked request volume
- Rate limit violations

View alarms:

```bash
# List WAF-related alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix ServerlessCms-WAF \
  --region us-east-1
```

### WAF Rules Explained

#### 1. CAPTCHA Rule

Applies to: `POST /api/v1/content/{id}/comments`

Behavior:
- Challenges users with CAPTCHA on first request
- Stores CAPTCHA token in browser (valid for 6 hours)
- Subsequent requests use stored token
- Invalid tokens are blocked

#### 2. Rate Limit Rule

Applies to: All API endpoints

Limits:
- 100 requests per 5 minutes per IP address
- Applies to all endpoints
- Prevents brute force and DoS attacks

#### 3. IP Reputation Rule (Optional)

Can be added for additional protection:

```typescript
// In lib/serverless-cms-stack.ts
{
  name: 'IpReputationRule',
  priority: 3,
  statement: {
    managedRuleGroupStatement: {
      vendorName: 'AWS',
      name: 'AWSManagedRulesAmazonIpReputationList',
    },
  },
  overrideAction: { none: {} },
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: 'IpReputationRule',
  },
}
```

### Customizing WAF Rules

To adjust rate limits or CAPTCHA behavior, edit `lib/serverless-cms-stack.ts`:

```typescript
// Adjust rate limit
const rateLimitRule = {
  name: 'RateLimitRule',
  priority: 2,
  statement: {
    rateBasedStatement: {
      limit: 200, // Change from 100 to 200
      aggregateKeyType: 'IP',
    },
  },
  // ...
};

// Adjust CAPTCHA immunity time
const captchaRule = {
  name: 'CaptchaRule',
  priority: 1,
  statement: {
    // ...
  },
  captchaConfig: {
    immunityTimeProperty: {
      immunityTime: 21600, // 6 hours in seconds (change as needed)
    },
  },
  // ...
};
```

After changes, redeploy:

```bash
npm run deploy:prod
```

### WAF Best Practices

1. **Monitor Metrics Regularly:**
   - Check blocked request counts
   - Review CAPTCHA failure rates
   - Investigate unusual patterns

2. **Adjust Rules Based on Traffic:**
   - Increase rate limits for legitimate high-traffic periods
   - Tighten rules if under attack
   - Use AWS WAF logs for analysis

3. **Test CAPTCHA User Experience:**
   - Ensure CAPTCHA is not too difficult
   - Test on mobile devices
   - Verify accessibility compliance

4. **Use Managed Rule Groups:**
   - AWS provides pre-configured rule sets
   - Protects against common vulnerabilities
   - Regularly updated by AWS

5. **Enable WAF Logging (Optional):**
   ```bash
   # Create S3 bucket for WAF logs
   aws s3 mb s3://cms-waf-logs-prod
   
   # Enable logging
   aws wafv2 put-logging-configuration \
     --logging-configuration ResourceArn=$WAF_ARN,LogDestinationConfigs=s3://cms-waf-logs-prod \
     --region us-east-1
   ```

### Troubleshooting WAF

**CAPTCHA Not Appearing:**
- Verify `captcha_enabled` is true in settings
- Check browser console for JavaScript errors
- Ensure WAF is associated with API Gateway
- Clear browser cache and reload

**Legitimate Users Being Blocked:**
- Review rate limit settings (may be too strict)
- Check CloudWatch logs for block reasons
- Whitelist specific IP addresses if needed
- Adjust CAPTCHA difficulty

**CAPTCHA Failures:**
- Check CloudWatch metrics for failure rate
- Verify CAPTCHA token validation in Lambda
- Ensure clock synchronization (CAPTCHA tokens are time-sensitive)
- Test with different browsers

**High WAF Costs:**
- WAF charges per million requests
- Review rule complexity (more rules = higher cost)
- Consider disabling CAPTCHA for low-traffic sites
- Use rate limiting as primary protection

### WAF Pricing

AWS WAF pricing (as of 2024):
- Web ACL: $5.00 per month
- Rules: $1.00 per rule per month
- Requests: $0.60 per million requests
- CAPTCHA: $0.40 per 1,000 challenge attempts

Estimated monthly cost for moderate traffic (100k requests):
- Web ACL: $5.00
- Rules (3 rules): $3.00
- Requests: $0.06
- CAPTCHA (1k challenges): $0.40
- **Total: ~$8.50/month**

---

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Amazon DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [Amazon CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)

---

## Support and Community

- **Documentation**: https://docs.your-domain.com
- **GitHub Issues**: https://github.com/your-org/serverless-cms/issues
- **Community Forum**: https://community.your-domain.com
- **Email Support**: support@your-domain.com

---

## Deployment Checklist

Use this checklist for production deployments:

- [ ] AWS account configured with appropriate permissions
- [ ] CDK bootstrapped in target region
- [ ] Environment configuration updated in `config/environments.ts`
- [ ] Custom domain and ACM certificate configured (if applicable)
- [ ] Route53 hosted zone set up (if using custom domain)
- [ ] All dependencies installed (`npm install`)
- [ ] Infrastructure deployed successfully
- [ ] Frontend applications built and deployed
- [ ] Admin user created in Cognito
- [ ] Admin user role set to 'admin'
- [ ] First login completed and password changed
- [ ] Site settings configured
- [ ] CloudWatch alarms configured
- [ ] Backup strategy implemented (PITR enabled)
- [ ] Monitoring dashboard set up
- [ ] Security best practices applied
- [ ] Cost monitoring alerts configured
- [ ] Documentation updated with environment-specific details
- [ ] Team members granted appropriate access
- [ ] Disaster recovery plan documented
- [ ] Performance testing completed
- [ ] Security audit completed

---

**Congratulations!** Your Serverless CMS is now deployed and ready to use. 🎉
