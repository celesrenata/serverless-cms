# Serverless CMS

A modern, serverless content management system built entirely on AWS infrastructure with a React-based admin panel and public website.

## Features

### Content Management
- Create, edit, and publish posts, pages, galleries, and projects
- Rich text editor with media picker
- Scheduled publishing
- Content status management (draft, published, archived)
- SEO metadata support

### User Management
- Role-based access control (Admin, Editor, Author, Viewer)
- User registration with email verification
- Password reset functionality
- Profile management

### Comment System
- Public commenting on content
- Comment moderation (approve, reject, spam)
- Optional moderation requirement
- Rate limiting and spam protection
- AWS WAF CAPTCHA integration
- Threaded replies

### Media Library
- Upload and manage images
- Automatic thumbnail generation
- Media metadata and organization

### Theme System
- 5 built-in themes: Default, Dark, Light, Minimal, Custom
- Dynamic theme switching
- Customizable CSS variables
- CAPTCHA styling per theme

### Plugin System
- Extensible plugin architecture
- Plugin activation/deactivation
- Plugin settings management
- Example plugins included

### Settings Management
- Site title and description
- Theme selection
- Feature toggles (registration, comments, CAPTCHA, moderation)
- Public settings API

## Project Structure

```
.
├── bin/                          # CDK app entry point
├── lib/                          # CDK stack definitions
├── config/                       # Environment configurations
├── lambda/                       # Lambda function code
│   ├── shared/                   # Shared utilities (auth, db, email, logger)
│   ├── content/                  # Content management functions
│   ├── media/                    # Media management functions
│   ├── users/                    # User management functions
│   ├── settings/                 # Settings management functions
│   ├── plugins/                  # Plugin management functions
│   ├── comments/                 # Comment management functions
│   ├── auth/                     # Authentication functions
│   └── scheduler/                # Scheduled task functions
├── frontend/
│   ├── admin-panel/              # React admin application
│   │   └── src/
│   │       ├── pages/            # Admin pages
│   │       ├── components/       # Reusable components
│   │       ├── hooks/            # Custom React hooks
│   │       └── services/         # API services
│   └── public-website/           # React public website
│       └── src/
│           ├── pages/            # Public pages
│           ├── components/       # Reusable components
│           ├── themes/           # Theme CSS files
│           └── services/         # API services
├── tests/                        # Integration tests
├── scripts/                      # Deployment and utility scripts
└── plugins/                      # Plugin examples
```

## Prerequisites

### Standard Setup
- Node.js 20+ and npm
- Python 3.12+
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### NixOS Setup (Recommended for NixOS users)
- Nix with flakes enabled (or traditional Nix)
- All dependencies managed automatically via Nix

**NixOS users:** See [NIXOS_DEVELOPMENT.md](NIXOS_DEVELOPMENT.md) for detailed setup instructions.

## Quick Start

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

1. **Install dependencies**
```bash
npm install
cd lambda && pip install -r requirements.txt && cd ..
cd frontend/admin-panel && npm install && cd ../..
cd frontend/public-website && npm install && cd ../..
```

2. **Configure environment**
- Update `bin/app.ts` with your AWS account details
- Update `config/environments.ts` with your domain names
- See [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for CI/CD setup

3. **Deploy**
```bash
npm run deploy:dev
```

## Development

### Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:admin
npm run test:public

# Run with coverage
npm run test:backend:coverage
```

### Local Development

```bash
# Admin Panel
cd frontend/admin-panel
npm run dev

# Public Website
cd frontend/public-website
npm run dev
```

### Deployment

```bash
# Deploy to dev (automatic via GitHub Actions on push to develop)
npm run deploy:dev

# Deploy to staging (automatic via GitHub Actions on push to main)
npm run deploy:staging

# Deploy to production (manual approval required)
npm run deploy:prod

# Deploy everything (infrastructure + frontend)
npm run deploy:all:dev
```

## Documentation

- [API Documentation](API_DOCUMENTATION.md) - REST API endpoints
- [Deployment Guide](DEPLOYMENT.md) - Deployment instructions
- [CI/CD Guide](CI_CD_GUIDE.md) - GitHub Actions setup
- [User Management Guide](USER_MANAGEMENT_GUIDE.md) - User roles and permissions
- [Comment Moderation Guide](COMMENT_MODERATION_GUIDE.md) - Comment system usage
- [Plugin Development Guide](PLUGIN_DEVELOPMENT_GUIDE.md) - Creating plugins
- [Monitoring Guide](MONITORING.md) - CloudWatch metrics and alarms
- [Testing Guide](tests/TESTING_GUIDE.md) - Testing strategy
- [NixOS Development](NIXOS_DEVELOPMENT.md) - NixOS setup

## Architecture

### AWS Services
- **DynamoDB** - Data persistence (content, users, media, settings, plugins, comments)
- **S3** - Media storage and static hosting
- **Lambda** - Backend business logic (Python 3.12)
- **API Gateway** - REST API routing
- **Cognito** - User authentication and authorization
- **CloudFront** - CDN for content delivery
- **EventBridge** - Scheduled publishing
- **SES** - Email delivery (verification, password reset)
- **WAF** - CAPTCHA and rate limiting
- **CloudWatch** - Monitoring and alarms

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **TanStack Query** for data fetching
- **React Router** for navigation
- **Tailwind CSS** for styling

### Backend
- **Python 3.12** Lambda functions
- **Boto3** for AWS SDK
- **JWT** authentication
- **Plugin system** with hooks

## Environment Variables

### Frontend (Admin Panel)
- `VITE_API_URL` - API Gateway URL
- `VITE_USER_POOL_ID` - Cognito User Pool ID
- `VITE_USER_POOL_CLIENT_ID` - Cognito Client ID
- `VITE_AWS_REGION` - AWS Region

### Frontend (Public Website)
- `VITE_API_URL` - API Gateway URL
- `VITE_CAPTCHA_SCRIPT_URL` - AWS WAF CAPTCHA script URL
- `VITE_CAPTCHA_API_KEY` - AWS WAF CAPTCHA API key

### Lambda Functions
- Environment variables are set automatically by CDK

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests: `npm test`
4. Commit and push
5. GitHub Actions will automatically deploy to dev environment

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
