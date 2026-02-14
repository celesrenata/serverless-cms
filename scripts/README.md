# Deployment Scripts

This directory contains scripts for deploying the Serverless CMS to AWS.

## Quick Start

### Full Deployment (Infrastructure + Frontend)

```bash
# Deploy everything to dev environment
./scripts/deploy-all.sh dev

# Deploy everything to production
./scripts/deploy-all.sh prod
```

## Available Scripts

### 1. deploy-all.sh

**Complete deployment** - Deploys infrastructure and frontend in one command.

```bash
./scripts/deploy-all.sh [environment] [options]
```

**Options:**
- `--skip-cdk` - Skip infrastructure deployment
- `--skip-frontend` - Skip frontend deployment
- `--skip-invalidate` - Skip CloudFront cache invalidation

**Examples:**
```bash
# Full deployment
./scripts/deploy-all.sh dev

# Deploy only frontend (infrastructure already exists)
./scripts/deploy-all.sh dev --skip-cdk

# Deploy without cache invalidation (faster)
./scripts/deploy-all.sh dev --skip-invalidate
```

### 2. deploy.sh

**Infrastructure deployment** - Deploys CDK stack (DynamoDB, S3, Lambda, API Gateway, etc.)

```bash
./scripts/deploy.sh [environment] [options]
```

**Options:**
- `--skip-build` - Skip TypeScript compilation
- `--outputs-file FILE` - Custom outputs file path

**Examples:**
```bash
# Deploy infrastructure
./scripts/deploy.sh dev

# Deploy without rebuilding CDK
./scripts/deploy.sh dev --skip-build
```

### 3. generate-frontend-config.sh

**Generate frontend configuration** - Creates `.env` files from CDK outputs.

```bash
./scripts/generate-frontend-config.sh [environment] [outputs-file]
```

**Examples:**
```bash
# Generate config for dev environment
./scripts/generate-frontend-config.sh dev

# Use custom outputs file
./scripts/generate-frontend-config.sh dev cdk.out/custom-outputs.json
```

**Generates:**
- `frontend/admin-panel/.env`
- `frontend/public-website/.env`

### 4. deploy-frontend.sh

**Frontend deployment** - Builds and deploys React applications to S3.

```bash
./scripts/deploy-frontend.sh [environment] [options]
```

**Options:**
- `--admin-only` - Deploy only admin panel
- `--public-only` - Deploy only public website
- `--skip-build` - Use existing dist folder
- `--skip-invalidate` - Skip CloudFront cache invalidation
- `--outputs-file FILE` - Custom outputs file path

**Examples:**
```bash
# Deploy both frontend apps
./scripts/deploy-frontend.sh dev

# Deploy only admin panel
./scripts/deploy-frontend.sh dev --admin-only

# Deploy without rebuilding (faster)
./scripts/deploy-frontend.sh dev --skip-build
```

### 5. build-frontend.sh

**Local build** - Builds frontend applications locally without deploying.

```bash
./scripts/build-frontend.sh [options]
```

**Options:**
- `--admin-only` - Build only admin panel
- `--public-only` - Build only public website
- `--clean` - Clean dist folders before building

**Examples:**
```bash
# Build both apps
./scripts/build-frontend.sh

# Build only admin panel
./scripts/build-frontend.sh --admin-only

# Clean build
./scripts/build-frontend.sh --clean
```

## NPM Scripts

You can also use npm scripts from the root directory:

```bash
# Infrastructure deployment
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod

# Full deployment (infrastructure + frontend)
npm run deploy:all:dev
npm run deploy:all:staging
npm run deploy:all:prod

# Frontend deployment only
npm run deploy:frontend:dev
npm run deploy:frontend:staging
npm run deploy:frontend:prod

# Generate frontend config
npm run config:frontend:dev
npm run config:frontend:staging
npm run config:frontend:prod

# Build frontend locally
npm run build:frontend
```

## Deployment Workflow

### First Time Deployment

1. **Deploy infrastructure:**
   ```bash
   ./scripts/deploy.sh dev
   ```

2. **Generate frontend config:**
   ```bash
   ./scripts/generate-frontend-config.sh dev
   ```

3. **Deploy frontend:**
   ```bash
   ./scripts/deploy-frontend.sh dev
   ```

Or use the all-in-one script:
```bash
./scripts/deploy-all.sh dev
```

### Updating Infrastructure Only

```bash
./scripts/deploy.sh dev
```

### Updating Frontend Only

```bash
./scripts/deploy-frontend.sh dev
```

### Quick Frontend Update (No Rebuild)

If you've already built locally and just want to upload:

```bash
./scripts/deploy-frontend.sh dev --skip-build
```

## Environment Files

After running `generate-frontend-config.sh`, you'll have:

**frontend/admin-panel/.env:**
```env
VITE_API_ENDPOINT=https://xxx.execute-api.us-east-1.amazonaws.com/dev/api/v1
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_MEDIA_BUCKET=cms-media-dev-xxxxxxxxxxxx
VITE_ENVIRONMENT=dev
```

**frontend/public-website/.env:**
```env
VITE_API_ENDPOINT=https://xxx.execute-api.us-east-1.amazonaws.com/dev/api/v1
VITE_ENVIRONMENT=dev
```

## Outputs File

CDK outputs are saved to `cdk.out/outputs-{environment}.json` and contain:

- API Gateway URLs
- Cognito User Pool IDs
- S3 bucket names
- CloudFront distribution IDs
- CloudFront URLs
- Custom domain URLs (if configured)

## Troubleshooting

### Script Permission Denied

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

### jq Command Not Found

Install jq:
- macOS: `brew install jq`
- Linux: `apt-get install jq` or `yum install jq`

### AWS Credentials Not Configured

Configure AWS CLI:
```bash
aws configure
```

### CDK Not Bootstrapped

Bootstrap CDK (first time only):
```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### CloudFront Changes Not Visible

Wait for cache invalidation (5-15 minutes) or manually invalidate:
```bash
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

## See Also

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Complete deployment guide
- [README.md](../README.md) - Project overview
- [SETUP.md](../SETUP.md) - Development setup
