# Serverless CMS

A WordPress-equivalent content management system built entirely on AWS serverless infrastructure.

## Project Structure

```
.
├── bin/                          # CDK app entry point
├── lib/                          # CDK stack definitions
├── config/                       # Environment configurations
├── lambda/                       # Lambda function code
│   ├── shared/                   # Shared utilities
│   ├── content/                  # Content management functions
│   ├── media/                    # Media management functions
│   ├── users/                    # User management functions
│   ├── settings/                 # Settings management functions
│   ├── plugins/                  # Plugin management functions
│   └── scheduler/                # Scheduled task functions
├── frontend/
│   ├── admin-panel/              # React admin application
│   └── public-website/           # React public website
└── cdk.out/                      # CDK synthesis output
```

## Prerequisites

### Standard Setup
- Node.js 18+ and npm
- Python 3.12+
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### NixOS Setup (Recommended for NixOS users)
- Nix with flakes enabled (or traditional Nix)
- All dependencies managed automatically via Nix

**NixOS users:** See [NIXOS_QUICKSTART.md](NIXOS_QUICKSTART.md) for a quick start guide, or [NIXOS_DEVELOPMENT.md](NIXOS_DEVELOPMENT.md) for detailed setup instructions.

## Setup

### NixOS Setup (Automatic)

```bash
# Enter development environment (installs everything automatically)
nix develop  # or nix-shell

# Optional: Use direnv for automatic environment loading
direnv allow

# All dependencies are now installed and ready!
npm test  # Run tests
```

### Standard Setup

### 1. Install CDK dependencies

```bash
npm install
```

### 2. Install Lambda dependencies

```bash
cd lambda
pip install -r requirements.txt -t .
cd ..
```

### 3. Install Admin Panel dependencies

```bash
cd frontend/admin-panel
npm install
cd ../..
```

### 4. Install Public Website dependencies

```bash
cd frontend/public-website
npm install
cd ../..
```

## Development

### Build CDK

```bash
npm run build
```

### Deploy to environments

```bash
# Deploy to dev (default)
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod
```

### Run Admin Panel locally

```bash
cd frontend/admin-panel
npm run dev
```

### Run Public Website locally

```bash
cd frontend/public-website
npm run dev
```

## Environment Configuration

Environment-specific configurations are defined in:
- `bin/app.ts` - CDK app configuration
- `config/environments.ts` - Environment settings

Update these files with your AWS account details and domain names before deploying.

## CDK Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run cdk synth` - Synthesize CloudFormation template
- `npm run cdk diff` - Compare deployed stack with current state
- `cdk deploy` - Deploy stack to AWS
- `cdk destroy` - Remove stack from AWS

## Architecture

The system consists of:
- **DynamoDB** - Data persistence
- **S3** - Media storage and static hosting
- **Lambda** - Backend business logic
- **API Gateway** - HTTP API routing
- **Cognito** - User authentication
- **CloudFront** - CDN for content delivery
- **EventBridge** - Scheduled tasks

## Next Steps

Follow the implementation tasks in `.kiro/specs/serverless-cms/tasks.md` to build out the complete system.
