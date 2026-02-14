# NixOS Development Guide

## Overview

This project includes Nix configuration files for a reproducible development environment on NixOS. All dependencies are managed through Nix, ensuring consistency across different machines.

## Quick Start

### Option 1: Using Nix Flakes (Recommended)

If you have Nix flakes enabled:

```bash
# Enter development environment
nix develop

# Or use direnv for automatic environment loading
direnv allow
```

### Option 2: Using Traditional Nix Shell

```bash
# Enter development environment
nix-shell

# The environment will automatically:
# - Install all dependencies
# - Set up Python virtual environment
# - Install npm packages
# - Make scripts executable
```

### Option 3: Using direnv (Automatic)

Install direnv and allow the directory:

```bash
# Install direnv (if not already installed)
nix-env -iA nixpkgs.direnv

# Allow direnv for this directory
direnv allow

# Environment will automatically load when you cd into the directory
```

## What's Included

The Nix environment provides:

### Node.js Ecosystem
- Node.js 20.x
- npm
- TypeScript
- TypeScript Language Server

### Python Ecosystem
- Python 3.12
- pip
- pytest (testing framework)
- pytest-cov (coverage reporting)
- boto3 (AWS SDK)
- moto (AWS mocking)
- requests (HTTP library)

### AWS Tools
- AWS CLI v2
- AWS CDK

### Build Tools
- jq (JSON processor)
- git
- curl
- wget

### Shell Utilities
- bash
- coreutils
- findutils
- grep
- sed

## Environment Setup

### First Time Setup

1. **Enable Nix Flakes** (if using flakes):

   Add to `/etc/nixos/configuration.nix`:
   ```nix
   nix.settings.experimental-features = [ "nix-command" "flakes" ];
   ```

   Then rebuild:
   ```bash
   sudo nixos-rebuild switch
   ```

2. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd serverless-cms
   ```

3. **Enter the development environment**:
   ```bash
   # Using flakes
   nix develop

   # Or using traditional shell
   nix-shell
   ```

4. **Verify installation**:
   ```bash
   node --version    # Should show v20.x
   python --version  # Should show 3.12.x
   aws --version     # Should show AWS CLI v2
   cdk --version     # Should show AWS CDK version
   ```

## Running Tests

Once in the Nix environment:

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run backend tests with coverage
npm run test:backend:coverage

# Run admin panel tests
npm run test:admin

# Run public website tests
npm run test:public

# Run smoke tests
python tests/smoke_tests.py --environment dev
```

## Development Workflow

### Starting Development

```bash
# Enter Nix environment
nix develop  # or nix-shell

# Start admin panel dev server
cd frontend/admin-panel
npm run dev

# In another terminal, start public website dev server
cd frontend/public-website
npm run dev
```

### Running Backend Tests

```bash
# In Nix environment
pytest tests/ -v

# With coverage
pytest tests/ --cov=lambda --cov-report=html

# Specific test file
pytest tests/test_content_integration.py -v
```

### Building and Deploying

```bash
# Build CDK
npm run build

# Synthesize stack
npm run synth -- --context environment=dev

# Deploy to development
npm run deploy:all:dev

# Deploy to staging
npm run deploy:all:staging

# Deploy to production (requires approval)
npm run deploy:all:prod
```

## Using direnv (Recommended)

direnv automatically loads the Nix environment when you enter the project directory.

### Setup direnv

1. **Install direnv**:
   ```bash
   nix-env -iA nixpkgs.direnv
   ```

2. **Add to your shell** (add to `~/.bashrc` or `~/.zshrc`):
   ```bash
   eval "$(direnv hook bash)"  # for bash
   # or
   eval "$(direnv hook zsh)"   # for zsh
   ```

3. **Allow the directory**:
   ```bash
   cd serverless-cms
   direnv allow
   ```

4. **Automatic loading**:
   Now whenever you `cd` into the project directory, the environment will automatically load!

### direnv Benefits

- ✅ Automatic environment activation
- ✅ No need to remember to run `nix develop`
- ✅ Environment unloads when you leave the directory
- ✅ Faster than manual activation

## Troubleshooting

### Nix Flakes Not Working

If you get an error about experimental features:

```bash
# Enable flakes temporarily
nix develop --extra-experimental-features 'nix-command flakes'

# Or enable permanently in /etc/nixos/configuration.nix
nix.settings.experimental-features = [ "nix-command" "flakes" ];
```

### Python Virtual Environment Issues

If the Python virtual environment has issues:

```bash
# Remove and recreate
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### npm Dependencies Not Installing

```bash
# Clear npm cache
rm -rf node_modules package-lock.json
rm -rf frontend/admin-panel/node_modules frontend/admin-panel/package-lock.json
rm -rf frontend/public-website/node_modules frontend/public-website/package-lock.json

# Reinstall
npm install
cd frontend/admin-panel && npm install
cd ../public-website && npm install
```

### AWS CLI Not Configured

```bash
# Configure AWS credentials
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-east-1
```

### CDK Bootstrap Required

```bash
# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/REGION
```

## File Structure

```
.
├── flake.nix              # Nix flakes configuration (modern)
├── shell.nix              # Traditional Nix shell configuration
├── .envrc                 # direnv configuration
├── .venv/                 # Python virtual environment (auto-created)
├── node_modules/          # Node.js dependencies (auto-installed)
├── frontend/
│   ├── admin-panel/
│   │   └── node_modules/  # Admin panel dependencies
│   └── public-website/
│       └── node_modules/  # Public website dependencies
└── tests/                 # Test files
```

## Environment Variables

The Nix environment sets these variables automatically:

- `AWS_REGION=us-east-1` - Default AWS region
- `NODE_ENV=development` - Node environment
- `PYTHONPATH=$PWD` - Python module path
- `NPM_CONFIG_PREFIX=$PWD/.npm-global` - Local npm prefix

## Updating Dependencies

### Updating Nix Packages

```bash
# Update flake inputs
nix flake update

# Or update nixpkgs in shell.nix
# Edit shell.nix and change the nixpkgs version
```

### Updating Node.js Packages

```bash
# Update root dependencies
npm update

# Update frontend dependencies
cd frontend/admin-panel && npm update
cd ../public-website && npm update
```

### Updating Python Packages

```bash
# Update requirements.txt, then:
pip install -r requirements.txt --upgrade
```

## CI/CD Integration

The GitHub Actions workflow doesn't use Nix (it uses Ubuntu runners), but you can test the CI/CD pipeline locally:

```bash
# Run the same tests that CI runs
npm test

# Run linting
cd frontend/admin-panel && npm run lint
cd ../public-website && npm run lint

# Build everything
npm run build
npm run build:frontend
```

## Best Practices

### 1. Always Use Nix Environment

Run all commands inside the Nix environment to ensure consistency:

```bash
nix develop  # or nix-shell
# Then run your commands
```

### 2. Use direnv for Convenience

Set up direnv once, and the environment loads automatically.

### 3. Commit Lock Files

- Commit `flake.lock` to ensure reproducible builds
- Commit `package-lock.json` files for npm dependencies

### 4. Don't Commit Generated Files

The `.gitignore` should exclude:
- `.venv/`
- `node_modules/`
- `.direnv/`
- `.npm-global/`

### 5. Keep Dependencies Updated

Regularly update Nix packages and npm dependencies to get security fixes.

## Additional Resources

- [Nix Manual](https://nixos.org/manual/nix/stable/)
- [Nix Flakes](https://nixos.wiki/wiki/Flakes)
- [direnv Documentation](https://direnv.net/)
- [NixOS Wiki](https://nixos.wiki/)

## Support

For NixOS-specific issues:
- Check the Nix logs: `nix develop --print-build-logs`
- Review `flake.nix` and `shell.nix` configurations
- Ensure Nix is up to date: `nix --version`

For project-specific issues:
- See `CI_CD_GUIDE.md` for testing
- See `DEPLOYMENT.md` for deployment
- See `README.md` for general information

---

**Happy NixOS Development!** 🚀
