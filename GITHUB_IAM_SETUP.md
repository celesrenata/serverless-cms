# GitHub Actions IAM Setup Guide

This guide walks you through creating IAM users for GitHub Actions CI/CD deployments.

## Overview

The CI/CD pipeline requires two separate IAM users:
- **Dev/Staging User**: Deploys to development and staging environments
- **Production User**: Deploys to production environment only

This separation provides security isolation between environments.

## Prerequisites

- AWS CLI installed and configured
- AWS account with IAM permissions to create users and policies
- GitHub repository with Actions enabled

## Step 1: Create IAM Policies

Create two policy files in your project root:

### iam-policy-dev-staging.json
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKDeployment",
      "Effect": "Allow",
      "Action": ["cloudformation:*", "sts:GetCallerIdentity"],
      "Resource": "*"
    },
    {
      "Sid": "S3Operations",
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": "*"
    },
    {
      "Sid": "CloudFrontOperations",
      "Effect": "Allow",
      "Action": ["cloudfront:*"],
      "Resource": "*"
    },
    {
      "Sid": "LambdaOperations",
      "Effect": "Allow",
      "Action": ["lambda:*"],
      "Resource": "*"
    },
    {
      "Sid": "APIGatewayOperations",
      "Effect": "Allow",
      "Action": ["apigateway:*"],
      "Resource": "*"
    },
    {
      "Sid": "DynamoDBOperations",
      "Effect": "Allow",
      "Action": ["dynamodb:*"],
      "Resource": "*"
    },
    {
      "Sid": "CognitoOperations",
      "Effect": "Allow",
      "Action": ["cognito-idp:*"],
      "Resource": "*"
    },
    {
      "Sid": "IAMOperations",
      "Effect": "Allow",
      "Action": [
        "iam:GetRole",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PassRole",
        "iam:TagRole",
        "iam:UntagRole"
      ],
      "Resource": "*"
    },
    {
      "Sid": "WAFOperations",
      "Effect": "Allow",
      "Action": ["wafv2:*"],
      "Resource": "*"
    },
    {
      "Sid": "ACMOperations",
      "Effect": "Allow",
      "Action": ["acm:*"],
      "Resource": "*"
    },
    {
      "Sid": "Route53Operations",
      "Effect": "Allow",
      "Action": ["route53:*"],
      "Resource": "*"
    },
    {
      "Sid": "SSMOperations",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:PutParameter",
        "ssm:DeleteParameter"
      ],
      "Resource": "*"
    },
    {
      "Sid": "LogsOperations",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DeleteLogGroup"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECROperations",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

### iam-policy-production.json
Copy the same content as `iam-policy-dev-staging.json` (permissions are identical).

## Step 2: Create IAM Users

```bash
# Create dev/staging user
aws iam create-user \
  --user-name github-actions-dev-staging \
  --tags Key=Purpose,Value="GitHub Actions CI/CD" Key=Environment,Value=dev-staging

# Create production user
aws iam create-user \
  --user-name github-actions-production \
  --tags Key=Purpose,Value="GitHub Actions CI/CD" Key=Environment,Value=production
```

## Step 3: Create and Attach Policies

```bash
# Create dev/staging policy
aws iam create-policy \
  --policy-name ServerlessCMS-DevStaging-Deployment \
  --policy-document file://iam-policy-dev-staging.json \
  --description "Permissions for deploying Serverless CMS to dev and staging"

# Create production policy
aws iam create-policy \
  --policy-name ServerlessCMS-Production-Deployment \
  --policy-document file://iam-policy-production.json \
  --description "Permissions for deploying Serverless CMS to production"

# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Attach policies to users
aws iam attach-user-policy \
  --user-name github-actions-dev-staging \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/ServerlessCMS-DevStaging-Deployment

aws iam attach-user-policy \
  --user-name github-actions-production \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/ServerlessCMS-Production-Deployment
```

## Step 4: Create Access Keys

```bash
# Create access key for dev/staging
aws iam create-access-key --user-name github-actions-dev-staging

# Create access key for production
aws iam create-access-key --user-name github-actions-production
```

**Important:** Save the `AccessKeyId` and `SecretAccessKey` from the output. You won't be able to retrieve the secret key again.

## Step 5: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

### For Dev/Staging:
- **Name:** `AWS_ACCESS_KEY_ID`
- **Value:** Access Key ID from dev/staging user

- **Name:** `AWS_SECRET_ACCESS_KEY`
- **Value:** Secret Access Key from dev/staging user

### For Production:
- **Name:** `AWS_ACCESS_KEY_ID_PROD`
- **Value:** Access Key ID from production user

- **Name:** `AWS_SECRET_ACCESS_KEY_PROD`
- **Value:** Secret Access Key from production user

### Optional CAPTCHA Secrets:
- **Name:** `CAPTCHA_SCRIPT_URL`
- **Value:** Your AWS WAF CAPTCHA JavaScript SDK URL

- **Name:** `CAPTCHA_API_KEY`
- **Value:** Your AWS WAF CAPTCHA API key

## Step 6: Verify Setup

Push a commit to test the deployment:

```bash
# Test dev deployment
git checkout develop
git push origin develop

# Test staging deployment
git checkout staging
git push origin staging

# Test production deployment (requires manual approval in GitHub)
git checkout main
git push origin main
```

## Security Best Practices

1. **Separate Credentials**: Never use the same credentials for dev/staging and production
2. **Rotate Keys**: Rotate access keys every 90 days
3. **Monitor Usage**: Enable CloudTrail to audit all API calls
4. **Least Privilege**: Only grant permissions required for deployment
5. **Delete Old Keys**: Remove old access keys after rotation

## Key Rotation

To rotate access keys:

```bash
# Create new key
aws iam create-access-key --user-name github-actions-dev-staging

# Update GitHub Secrets with new credentials

# List existing keys
aws iam list-access-keys --user-name github-actions-dev-staging

# Delete old key
aws iam delete-access-key \
  --user-name github-actions-dev-staging \
  --access-key-id OLD_KEY_ID
```

## Troubleshooting

### Deployment Fails with "Access Denied"

Check that policies are attached:
```bash
aws iam list-attached-user-policies --user-name github-actions-dev-staging
```

### Need to Update Permissions

Create a new policy version:
```bash
aws iam create-policy-version \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/ServerlessCMS-DevStaging-Deployment \
  --policy-document file://iam-policy-dev-staging.json \
  --set-as-default
```

### Check CloudTrail for Permission Errors

1. Go to AWS Console → CloudTrail → Event history
2. Filter by "Error code" → "AccessDenied"
3. Review which permissions are missing

## Cleanup

To remove IAM users (if no longer needed):

```bash
# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# List and delete access keys
aws iam list-access-keys --user-name github-actions-dev-staging
aws iam delete-access-key --user-name github-actions-dev-staging --access-key-id KEY_ID

aws iam list-access-keys --user-name github-actions-production
aws iam delete-access-key --user-name github-actions-production --access-key-id KEY_ID

# Detach policies
aws iam detach-user-policy \
  --user-name github-actions-dev-staging \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/ServerlessCMS-DevStaging-Deployment

aws iam detach-user-policy \
  --user-name github-actions-production \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/ServerlessCMS-Production-Deployment

# Delete users
aws iam delete-user --user-name github-actions-dev-staging
aws iam delete-user --user-name github-actions-production

# Delete policies
aws iam delete-policy --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/ServerlessCMS-DevStaging-Deployment
aws iam delete-policy --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/ServerlessCMS-Production-Deployment
```

## Next Steps

After setting up IAM users and GitHub secrets:
1. Review [CI_CD_GUIDE.md](CI_CD_GUIDE.md) for pipeline details
2. Check [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for CAPTCHA configuration
3. Read [DEPLOYMENT.md](DEPLOYMENT.md) for manual deployment instructions
