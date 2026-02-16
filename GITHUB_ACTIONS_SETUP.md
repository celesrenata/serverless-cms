# GitHub Actions CI/CD Setup Guide

This guide will help you set up the GitHub Actions CI/CD pipeline for automatic deployments.

## Prerequisites

- GitHub repository created: `celesrenata/serverless-cms`
- AWS account with CDK bootstrapped in us-west-2 ✅
- IAM user created for GitHub Actions ✅

## Step 1: Add GitHub Secrets

1. Go to your repository settings:
   ```
   https://github.com/celesrenata/serverless-cms/settings/secrets/actions
   ```

2. Click **"New repository secret"**

3. Add the following secrets:

   **Secret 1:**
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: `<your-access-key-id>` (provided separately)

   **Secret 2:**
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: `<your-secret-access-key>` (provided separately)

## Step 2: Understanding the Pipeline

The CI/CD pipeline is configured in `.github/workflows/ci-cd.yml` and will:

### On Push to `develop` branch:
- Run all tests (backend, admin panel, public website)
- Validate infrastructure
- Deploy to **dev environment** in us-west-2
- Run smoke tests

### On Push to `main` branch:
- Run all tests
- Validate infrastructure
- Deploy to **staging environment** in us-west-2
- Run smoke tests

### Manual Production Deployment:
- Requires manual approval in GitHub Actions
- Deploys to **production environment** in us-west-2

## Step 3: Test the Pipeline

1. Make a small change (e.g., update README.md)
2. Commit and push to `develop` branch:
   ```bash
   git add .
   git commit -m "Test CI/CD pipeline"
   git push origin develop
   ```

3. Watch the pipeline run:
   ```
   https://github.com/celesrenata/serverless-cms/actions
   ```

## Step 4: Monitor Deployment

The pipeline will:
1. ✅ Run Python backend tests
2. ✅ Run admin panel tests
3. ✅ Run public website tests
4. ✅ Validate CDK infrastructure
5. 🚀 Deploy to AWS (us-west-2)
6. ✅ Run smoke tests

Deployment takes approximately 10-15 minutes due to CloudFront distribution creation.

## IAM User Details

A dedicated IAM user has been created with minimal required permissions:

- **User Name:** `github-actions-serverless-cms`
- **Policy:** `ServerlessCMS-GitHubActions-Policy`
- **Permissions:** Only what's needed for CDK deployments (no admin access)

### Permissions Include:
- CloudFormation (create/update/delete stacks)
- S3 (CDK assets and CMS buckets)
- Lambda (functions and layers)
- DynamoDB (tables)
- API Gateway
- Cognito
- CloudFront
- CloudWatch & SNS (monitoring)
- EventBridge (scheduler)
- IAM (limited to CDK roles)

## Deployment Outputs

After successful deployment, the pipeline will output:
- API Endpoint URL
- Admin Panel CloudFront URL
- Public Website CloudFront URL
- Cognito User Pool details
- S3 bucket names
- CloudFront distribution IDs

## Troubleshooting

### Pipeline Fails on First Run
- Ensure GitHub secrets are correctly set
- Check that CDK is bootstrapped in us-west-2 (already done ✅)
- Verify IAM user has correct permissions

### Tests Fail
- Check the test logs in GitHub Actions
- Tests run in isolated environments with mocked AWS services
- Frontend tests may need dependencies installed

### Deployment Fails
- Check CloudFormation stack events in AWS Console
- Verify no resource limits are hit (e.g., CloudFront distributions)
- Check for naming conflicts with existing resources

## Branch Strategy

- **develop** → dev environment (automatic deployment)
- **main** → staging environment (automatic deployment)
- **production** → prod environment (manual approval required)

## Next Steps

1. ✅ Add GitHub secrets
2. ✅ Push to develop branch to trigger first deployment
3. Monitor deployment in GitHub Actions
4. Access deployed application via CloudFront URLs
5. Create first admin user in Cognito

## Security Notes

- Never commit AWS credentials to the repository
- The IAM user follows principle of least privilege
- Rotate access keys periodically
- Monitor CloudWatch for unusual activity
- Review IAM policy regularly and remove unused permissions

## Cleanup

To remove the IAM user and policy (if needed):

```bash
# Detach policy
aws iam detach-user-policy \
  --user-name github-actions-serverless-cms \
  --policy-arn arn:aws:iam::776053071238:policy/ServerlessCMS-GitHubActions-Policy

# Delete access keys (use the actual access key ID)
aws iam delete-access-key \
  --user-name github-actions-serverless-cms \
  --access-key-id <ACCESS_KEY_ID>

# Delete user
aws iam delete-user --user-name github-actions-serverless-cms

# Delete policy
aws iam delete-policy \
  --policy-arn arn:aws:iam::776053071238:policy/ServerlessCMS-GitHubActions-Policy
```

## Support

For issues or questions:
- Check GitHub Actions logs
- Review AWS CloudFormation events
- Check CloudWatch logs for Lambda functions
- Refer to CI_CD_GUIDE.md for detailed pipeline documentation
