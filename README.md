# Serverless CMS

A modern, serverless content management system built entirely on AWS infrastructure with a React-based admin panel and public website.

## Features

### Content Management
- Create, edit, and publish posts, pages, galleries, and projects
- Rich text editor with media picker
- Markdown rendering with syntax-highlighted code blocks and Mermaid diagrams
- Scheduled publishing via EventBridge
- Content status management (draft, published, archived)
- SEO metadata support

### Blog Sections
- Hierarchical organization of blog content into sections
- Landing pages mapped to sections with dedicated navigation
- `show_posts` toggle to control post visibility per section
- Section-based navigation component

### Theme Engine
- 6 built-in themes: Celestium Neon (default), AWS Console After Dark, Glass Circuit, Paper Systems, Terminal Witchcraft, Celestium Bromide
- CSS custom properties driven by a structured token system (colors, typography, radius, shadows, motion)
- Theme panel drawer for live switching
- Command palette (Cmd+K / Ctrl+K) for quick theme and navigation access
- JSON import/export for sharing custom themes
- Custom CSS upload with live preview and validation
- Scroll reveal animations (respects `prefers-reduced-motion`)
- FOUC prevention with server-side theme injection
- Custom themes stored in DynamoDB with full CRUD API

### Interactive Architecture Map
- SVG-based interactive system diagram
- Keyboard navigable for accessibility
- Technical and non-technical explanation modes
- Highlights service connections on hover/focus

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
- Gallery embeds with lightbox

### Backup & Restore
- Full backup of all DynamoDB tables (content, users, media, settings, plugins, comments, sections, themes)
- S3 media backup with manifest tracking
- Checkpoint-based restore for safe recovery
- NDJSON format for portable data

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
├── docs/                         # All project documentation
│   ├── screenshots/              # Architecture and UI screenshots
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT.md
│   ├── CI_CD_GUIDE.md
│   └── ...
├── lambda/                       # Lambda function code
│   ├── shared/                   # Shared utilities (auth, db, email, logger)
│   ├── content/                  # Content management functions
│   ├── media/                    # Media management functions
│   ├── users/                    # User management functions
│   ├── settings/                 # Settings management functions
│   ├── plugins/                  # Plugin management functions
│   ├── comments/                 # Comment management functions
│   ├── sections/                 # Section management functions
│   ├── themes/                   # Theme CRUD functions
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
│           ├── components/
│           │   ├── ArchitectureMap/   # Interactive SVG architecture diagram
│           │   ├── CommandPalette/    # Cmd+K command palette
│           │   ├── ThemePanel/        # Theme switching drawer
│           │   ├── ScrollReveal.tsx   # Scroll-triggered animations
│           │   └── ...
│           ├── theme/            # Theme engine (tokens, provider, builtins, serialization)
│           ├── themes/           # Legacy theme CSS files
│           ├── pages/            # Public pages
│           ├── hooks/            # Custom React hooks
│           └── services/         # API services
├── tests/                        # Integration tests (pytest + Hypothesis)
├── scripts/                      # Deployment and utility scripts
├── backups/                      # Local backup storage
└── plugins/                      # Plugin examples
```

## Prerequisites

- Node.js 20+ and npm
- Python 3.12+
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### Testing
- **Backend:** pytest + Hypothesis (property-based testing)
- **Frontend:** Vitest + React Testing Library

### NixOS Setup (Recommended for NixOS users)
- Nix with flakes enabled (or traditional Nix)
- All dependencies managed automatically via Nix

**NixOS users:** See [docs/NIXOS_DEVELOPMENT.md](docs/NIXOS_DEVELOPMENT.md) for detailed setup instructions.

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
- Update `bin/app.ts` with your AWS account ID
- Update `config/environments.ts` with your domain configuration:
  - `hostedZoneName`: Your Route53 hosted zone domain (e.g., `example.com`)
  - `hostedZoneId`: Your Route53 hosted zone ID
  - `domainName`: The subdomain for each environment (e.g., `staging-cms.example.com`)
- For GitHub Actions CI/CD, see [docs/GITHUB_IAM_SETUP.md](docs/GITHUB_IAM_SETUP.md)
- Configure GitHub Secrets as described in [docs/GITHUB_SECRETS_SETUP.md](docs/GITHUB_SECRETS_SETUP.md)

3. **Deploy**
```bash
npm run deploy:dev
```

## Development

### Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:admin
npm run test:public

# Backend with coverage
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

# Deploy to staging (automatic via GitHub Actions on push to staging)
npm run deploy:staging

# Deploy to production (manual approval required)
npm run deploy:prod

# Deploy everything (infrastructure + frontend)
npm run deploy:all:dev
```

**Note:** On first deployment to a new environment, smoke tests will fail because no content exists yet. Create initial content through the admin panel, then subsequent deployments will pass.

## Documentation

- [API Documentation](docs/API_DOCUMENTATION.md) - REST API endpoints
- [Deployment Guide](docs/DEPLOYMENT.md) - Deployment instructions
- [CI/CD Guide](docs/CI_CD_GUIDE.md) - GitHub Actions pipeline overview
- [Pipeline Overview](docs/PIPELINE_OVERVIEW.md) - Full pipeline architecture
- [GitHub IAM Setup](docs/GITHUB_IAM_SETUP.md) - Create IAM users for GitHub Actions
- [GitHub Secrets Setup](docs/GITHUB_SECRETS_SETUP.md) - Configure repository secrets
- [User Management Guide](docs/USER_MANAGEMENT_GUIDE.md) - User roles and permissions
- [Comment Moderation Guide](docs/COMMENT_MODERATION_GUIDE.md) - Comment system usage
- [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT_GUIDE.md) - Creating plugins
- [Monitoring Guide](docs/MONITORING.md) - CloudWatch metrics and alarms
- [Testing Guide](tests/TESTING_GUIDE.md) - Testing strategy
- [NixOS Development](docs/NIXOS_DEVELOPMENT.md) - NixOS setup
- [WAF CAPTCHA Setup](docs/WAF_CAPTCHA_SETUP.md) - CAPTCHA configuration
- [CloudFront Setup](docs/CLOUDFRONT_SETUP.md) - CDN configuration
- [Cost Analysis](docs/COST_ANALYSIS.md) - AWS cost breakdown

## Architecture

### AWS Services
- **DynamoDB** - Data persistence (content, users, media, settings, plugins, comments, sections, themes)
- **S3** - Media storage and static hosting
- **Lambda** - Backend business logic (Python 3.12)
- **API Gateway** - REST API routing
- **Cognito** - User authentication and authorization
- **CloudFront** - CDN for content delivery
- **EventBridge** - Scheduled publishing
- **SES** - Email delivery (verification, password reset)
- **WAF** - CAPTCHA challenge and rate limiting
- **CloudWatch** - Monitoring and alarms

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **TanStack Query** for data fetching
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Vitest** for testing

### Backend
- **Python 3.12** Lambda functions
- **Boto3** for AWS SDK
- **JWT** authentication
- **Plugin system** with hooks
- **pytest + Hypothesis** for testing

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
