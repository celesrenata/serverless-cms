---
inclusion: always
---

# Serverless CMS Development Workflow

This project is a serverless content management system deployed to AWS via CDK. Changes trigger automated GitHub Actions workflows that deploy to AWS infrastructure.

## Critical Testing Requirement

**MANDATORY: After EVERY code change, immediately run the relevant tests for that area.**

This is non-negotiable. The workflow is:

1. Make your code changes
2. **IMMEDIATELY run tests** for the area you modified (see Test Commands below)
3. Fix any failures and re-run tests until they pass
4. Only proceed with git add/commit/push after tests pass
5. GitHub Actions will automatically deploy passing code to AWS

**AI Agents: You MUST run tests after making any code changes. Do not skip this step.**

## Test Commands

Run tests based on what you modified:

```bash
# All tests (recommended before any commit)
npm test
# or
./scripts/run-all-tests.sh

# Backend/Lambda tests only
npm run test:backend
# or
pytest tests/ -v

# Backend with coverage
npm run test:backend:coverage

# Admin panel tests only
npm run test:admin
# or
cd frontend/admin-panel && npm test -- --run

# Public website tests only
npm run test:public
# or
cd frontend/public-website && npm test -- --run

# Infrastructure/CDK validation
npm run build && npm run synth -- --context environment=dev
```

## Project Structure

- `lambda/` - Python Lambda functions (backend logic)
  - `shared/` - Shared utilities (auth, db, s3, plugins, logger)
  - `content/` - Content management (create, update, list, get)
  - `media/` - Media management (upload, processing)
  - `users/` - User management (get_me, update_me)
  - `plugins/` - Plugin system (install, activate, deactivate, settings)
  - `scheduler/` - Scheduled publishing
- `lib/` - CDK infrastructure definitions (TypeScript)
- `frontend/admin-panel/` - React admin interface
- `frontend/public-website/` - React public website
- `tests/` - Integration tests (pytest)
- `scripts/` - Deployment and utility scripts
- `config/` - Environment configurations

## Technology Stack

- Infrastructure: AWS CDK (TypeScript)
- Backend: Python 3.12, Lambda, DynamoDB, S3
- Frontend: React, TypeScript, Vite
- Auth: AWS Cognito
- Testing: pytest (backend), Vitest (frontend)
- CI/CD: GitHub Actions

## Deployment Flow

```
Code Change → Tests Pass → Git Push → GitHub Actions → AWS CDK Deploy
```

Branches:
- `develop` → deploys to Development environment
- `main` → deploys to Staging (auto) → Production (manual approval)

## Common Development Tasks

### Adding/Modifying Lambda Functions

1. Edit Python code in `lambda/` directory
2. Update shared utilities in `lambda/shared/` if needed
3. **IMMEDIATELY run backend tests:** `pytest tests/ -v`
4. Verify integration tests pass
5. Only commit and push after tests pass (triggers deployment)

### Modifying Infrastructure

1. Edit CDK stack in `lib/serverless-cms-stack.ts`
2. Build: `npm run build`
3. Synthesize: `npm run synth -- --context environment=dev`
4. Review changes: `npm run diff -- --context environment=dev`
5. **IMMEDIATELY run all tests:** `npm test`
6. Only commit and push after tests pass (triggers deployment)

### Frontend Changes

1. Edit React components in `frontend/admin-panel/` or `frontend/public-website/`
2. **IMMEDIATELY run frontend tests:** `npm run test:admin` or `npm run test:public`
3. **IMMEDIATELY run linting:** `npm run lint` in the frontend directory
4. Build locally to verify: `cd frontend/[app] && npm run build`
5. Only commit and push after tests pass (triggers deployment)

### Plugin Development

1. Create plugin in `plugins/[plugin-name]/`
2. Implement `handler.py` with required hooks
3. Add README.md with plugin documentation
4. **IMMEDIATELY test plugin integration:** `pytest tests/test_plugin_integration.py -v`
5. See `PLUGIN_DEVELOPMENT_GUIDE.md` for details

## Code Quality Standards

- Python: Follow PEP 8, use type hints
- TypeScript: Use strict mode, proper typing, NO `any` types (use proper interfaces/types)
- React: Functional components, hooks, TypeScript
- Tests: Maintain >80% coverage for critical paths
- Security: Never commit secrets, use environment variables
- Linting: ESLint configured with max-warnings 0 (all warnings must be fixed)

### TypeScript Best Practices

- Never use `any` type - create proper interfaces or use `unknown` with type guards
- Use `declare global` to extend Window or other global interfaces
- Create custom error interfaces when adding properties to Error objects
- Always run `npm run lint` before committing frontend changes

## Environment Variables

- Development uses `.env` files (not committed)
- Production uses AWS Secrets Manager and Parameter Store
- CDK context provides environment-specific configuration

## Manual Deployment (if needed)

```bash
# Deploy infrastructure only
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod

# Deploy everything (infrastructure + frontend)
npm run deploy:all:dev
npm run deploy:all:staging
npm run deploy:all:prod

# Deploy frontend only
npm run deploy:frontend:dev
npm run deploy:frontend:staging
npm run deploy:frontend:prod
```

## Troubleshooting

- If tests fail, check error messages carefully
- For Lambda errors, check CloudWatch logs
- For CDK errors, verify AWS credentials and permissions
- For frontend errors, check browser console and network tab
- Integration tests require AWS credentials configured

## NixOS Development

If using NixOS:
- Enter dev environment: `nix develop` or `nix-shell`
- All dependencies managed automatically
- See `NIXOS_DEVELOPMENT.md` for details

## Key Files to Know

- `.github/workflows/ci-cd.yml` - CI/CD pipeline definition
- `lib/serverless-cms-stack.ts` - Main infrastructure stack
- `pytest.ini` - Test configuration
- `package.json` - NPM scripts and dependencies
- `requirements.txt` - Python dependencies
- `scripts/run-all-tests.sh` - Comprehensive test runner

## Agent Hooks Available

This project includes helpful agent hooks in `.kiro/hooks/`:

- **Pre-Commit Test Runner** - Manual trigger to run all tests before committing
- **Smart Pre-Commit Tests** - Intelligently runs only relevant tests based on changed files, then automatically commits and pushes if tests pass
- **Test on Save** - Automatically runs linting/validation when you save files
- **Test on Save** - Automatically runs linting/validation when you save files

Access these via the Agent Hooks panel in the IDE or command palette.

## Before Every Commit

✅ Run tests for modified components (or use the Smart Pre-Commit hook)
✅ Verify code builds successfully
✅ Check for TypeScript/Python errors
✅ Review changes with `git diff`
✅ Write meaningful commit messages

Remember: GitHub Actions will deploy your code automatically, so ensure tests pass locally first!
