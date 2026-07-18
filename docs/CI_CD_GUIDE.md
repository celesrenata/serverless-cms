# CI/CD Pipeline Guide

## Overview

The Serverless CMS uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality through automated testing and provides safe, repeatable deployments to multiple environments.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Code Push / Pull Request                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Parallel Testing                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Backend    │ Admin Panel  │   Public     │ Infrastructure │
│   Tests      │   Tests      │   Website    │   Tests        │
│              │              │   Tests      │                │
│ • Unit       │ • Unit       │ • Unit       │ • CDK Build    │
│ • Coverage   │ • Lint       │ • Lint       │ • Synth        │
│              │ • Build      │ • Build      │ • Diff         │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Integration Tests                          │
│              (Only on main/develop branches)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Pipeline                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Development   │     Staging     │      Production         │
│   (develop)     │     (main)      │   (main + approval)     │
│                 │                 │                         │
│ • Auto deploy   │ • Auto deploy   │ • Manual approval       │
│ • Smoke tests   │ • Smoke tests   │ • Smoke tests           │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## Test Stages

### 1. Backend Tests (Lambda Functions)

**Location:** `tests/`

**What's tested:**
- Unit tests for all Lambda functions
- Integration tests for DynamoDB operations
- Plugin system functionality
- Authentication and authorization
- Content CRUD operations
- Media upload and processing
- Scheduled publishing

**Commands:**
```bash
# Run locally
pytest tests/ -v --cov=lambda

# Run specific test file
pytest tests/test_content_integration.py -v

# Run with coverage report
pytest tests/ --cov=lambda --cov-report=html
```

**Coverage Requirements:**
- Minimum 70% code coverage
- All critical paths must be tested
- Integration tests for external services

### 2. Admin Panel Tests

**Location:** `frontend/admin-panel/src/`

**What's tested:**
- React component rendering
- User interactions
- Form validation
- API service calls
- Authentication flows
- State management

**Commands:**
```bash
cd frontend/admin-panel

# Run tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run linter
npm run lint
```

**Test Structure:**
```
src/
├── components/
│   └── __tests__/
│       ├── ContentTable.test.tsx
│       ├── MediaUpload.test.tsx
│       └── EditorToolbar.test.tsx
├── services/
│   └── __tests__/
│       ├── api.test.ts
│       └── auth.test.ts
└── test/
    └── setup.ts
```

### 3. Public Website Tests

**Location:** `frontend/public-website/src/`

**What's tested:**
- Page rendering
- Content display
- SEO metadata
- Responsive design
- Performance

**Commands:**
```bash
cd frontend/public-website

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run linter
npm run lint
```

### 4. Infrastructure Tests

**Location:** `lib/`

**What's tested:**
- CDK stack synthesis
- Resource configuration
- IAM permissions
- Stack diff validation

**Commands:**
```bash
# Build CDK
npm run build

# Synthesize stack
npm run synth -- --context environment=dev

# Check diff
npm run diff -- --context environment=dev
```

### 5. Integration Tests

**Location:** `tests/test_*_integration.py`

**What's tested:**
- End-to-end workflows
- Cross-service interactions
- Authentication flows
- Content lifecycle
- Media processing pipeline
- Plugin execution

**Commands:**
```bash
# Run integration tests
pytest tests/test_*_integration.py -v

# Run specific integration test
pytest tests/test_content_integration.py -v
```

### 6. Smoke Tests

**Location:** `tests/smoke_tests.py`

**What's tested:**
- API health
- Frontend accessibility
- CORS configuration
- Basic functionality

**Commands:**
```bash
# Run smoke tests
python tests/smoke_tests.py --environment dev
python tests/smoke_tests.py --environment staging
python tests/smoke_tests.py --environment prod
```

## Deployment Environments

### Development Environment

**Branch:** `develop`

**Trigger:** Automatic on push to `develop`

**Purpose:** Testing new features and bug fixes

**Configuration:**
- No custom domain
- Shorter log retention (7 days)
- Lower resource limits
- Test data only

**Deployment:**
```bash
# Manual deployment
./scripts/deploy-all.sh dev

# Via GitHub Actions
git push origin develop
```

### Staging Environment

**Branch:** `main`

**Trigger:** Automatic on push to `main`

**Purpose:** Pre-production testing and validation

**Configuration:**
- Custom domain: `staging.your-domain.com`
- Production-like settings
- Longer log retention (30 days)
- Test data that mirrors production

**Deployment:**
```bash
# Manual deployment
./scripts/deploy-all.sh staging

# Via GitHub Actions
git push origin main
```

### Production Environment

**Branch:** `main`

**Trigger:** Manual approval required after staging deployment

**Purpose:** Live production system

**Configuration:**
- Custom domain: `www.your-domain.com`
- Full monitoring and alerting
- Long log retention (90 days)
- Backup and disaster recovery enabled

**Deployment:**
```bash
# Manual deployment
./scripts/deploy-all.sh prod

# Via GitHub Actions
# 1. Push to main
# 2. Wait for staging deployment
# 3. Approve production deployment in GitHub
```

## GitHub Actions Setup

### Required Secrets

Configure these secrets in your GitHub repository settings:

**Development/Staging:**
- `AWS_ACCESS_KEY_ID` - AWS access key for dev/staging
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for dev/staging

**Production:**
- `AWS_ACCESS_KEY_ID_PROD` - AWS access key for production
- `AWS_SECRET_ACCESS_KEY_PROD` - AWS secret key for production

**Optional:**
- `CODECOV_TOKEN` - For code coverage reporting
- `SLACK_WEBHOOK_URL` - For deployment notifications

### Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with its value

### Environment Protection Rules

Configure environment protection in GitHub:

1. Go to Settings → Environments
2. Create environments: `development`, `staging`, `production`
3. For production:
   - Enable "Required reviewers"
   - Add team members who can approve deployments
   - Set deployment branch to `main` only

## Workflow Files

### Main CI/CD Workflow

**File:** `.github/workflows/ci-cd.yml`

**Jobs:**
1. `test-backend` - Run Python tests
2. `test-admin-panel` - Run admin panel tests
3. `test-public-website` - Run public website tests
4. `test-infrastructure` - Validate CDK stack
5. `integration-tests` - Run integration tests
6. `deploy-dev` - Deploy to development
7. `deploy-staging` - Deploy to staging
8. `deploy-production` - Deploy to production (manual approval)

### Pull Request Workflow

Pull requests trigger:
- All test jobs
- No deployment jobs
- Code coverage reporting
- Linting checks

## Local Testing

Before pushing code, run tests locally:

```bash
# Backend tests
pytest tests/ -v

# Admin panel tests
cd frontend/admin-panel
npm test

# Public website tests
cd frontend/public-website
npm test

# Infrastructure validation
npm run build
npm run synth -- --context environment=dev

# Run all tests
./scripts/run-all-tests.sh
```

## Test Coverage

### Viewing Coverage Reports

**Backend:**
```bash
pytest tests/ --cov=lambda --cov-report=html
open htmlcov/index.html
```

**Frontend:**
```bash
cd frontend/admin-panel
npm run test:coverage
open coverage/index.html
```

### Coverage Requirements

- Backend: Minimum 70% coverage
- Frontend: Minimum 60% coverage
- Critical paths: 100% coverage

## Troubleshooting

### Tests Failing Locally

1. **Check dependencies:**
   ```bash
   pip install -r requirements.txt
   cd frontend/admin-panel && npm install
   cd frontend/public-website && npm install
   ```

2. **Clear caches:**
   ```bash
   pytest --cache-clear
   npm run test -- --clearCache
   ```

3. **Check environment variables:**
   ```bash
   # Ensure .env files are configured
   cat frontend/admin-panel/.env
   ```

### GitHub Actions Failing

1. **Check workflow logs** in GitHub Actions tab
2. **Verify secrets** are configured correctly
3. **Check AWS permissions** for deployment user
4. **Review recent changes** that might have broken tests

### Deployment Failures

1. **Check CloudFormation events** in AWS Console
2. **Review Lambda logs** in CloudWatch
3. **Verify CDK outputs** are correct
4. **Run smoke tests** manually:
   ```bash
   python tests/smoke_tests.py --environment dev
   ```

## Best Practices

### Writing Tests

1. **Keep tests focused** - One test per behavior
2. **Use descriptive names** - Test names should explain what they test
3. **Mock external services** - Don't rely on real AWS services in unit tests
4. **Test edge cases** - Include error scenarios
5. **Keep tests fast** - Unit tests should run in milliseconds

### Code Quality

1. **Run linter** before committing:
   ```bash
   npm run lint
   ```

2. **Fix formatting** issues:
   ```bash
   npm run lint -- --fix
   ```

3. **Write meaningful commit messages**:
   ```
   feat: Add content scheduling feature
   fix: Resolve media upload timeout issue
   test: Add integration tests for plugin system
   ```

### Deployment Safety

1. **Always test in dev first**
2. **Review staging deployment** before production
3. **Monitor CloudWatch** after deployment
4. **Have rollback plan** ready
5. **Deploy during low-traffic periods**

## Monitoring Deployments

### CloudWatch Dashboards

After deployment, monitor:
- Lambda error rates
- API Gateway latency
- DynamoDB throttling
- CloudFront cache hit ratio

### Alerts

Set up alerts for:
- High error rates (>1% of requests)
- Slow response times (>3 seconds)
- Failed deployments
- Resource limits reached

## Rollback Procedures

### Quick Rollback

If deployment fails or causes issues:

```bash
# Rollback to previous version
aws cloudformation rollback-stack --stack-name ServerlessCmsStack-prod

# Or redeploy previous commit
git revert HEAD
git push origin main
```

### Manual Rollback

1. Identify last working commit
2. Create rollback branch
3. Deploy from that branch
4. Investigate and fix issue
5. Deploy fix when ready

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [Pytest Documentation](https://docs.pytest.org/)
- [AWS CDK Testing](https://docs.aws.amazon.com/cdk/v2/guide/testing.html)

## Support

For CI/CD issues:
- Check GitHub Actions logs
- Review CloudWatch logs
- Contact DevOps team
- Create GitHub issue with `ci/cd` label
