# NixOS Quick Start

## 🚀 Get Started in 3 Steps

### 1. Enter Development Environment

```bash
# Modern way (with flakes)
nix develop

# Traditional way
nix-shell

# Automatic way (with direnv)
direnv allow
```

### 2. Run Tests

```bash
npm test
```

### 3. Start Developing

```bash
# Admin panel
cd frontend/admin-panel && npm run dev

# Public website
cd frontend/public-website && npm run dev
```

## 📋 Common Commands

### Testing
```bash
npm test                    # All tests
npm run test:backend        # Backend only
npm run test:admin          # Admin panel only
npm run test:public         # Public website only
```

### Development
```bash
cd frontend/admin-panel
npm run dev                 # Start dev server

cd frontend/public-website
npm run dev                 # Start dev server
```

### Deployment
```bash
npm run deploy:all:dev      # Deploy to dev
npm run deploy:all:staging  # Deploy to staging
npm run deploy:all:prod     # Deploy to prod
```

### AWS
```bash
aws configure               # Configure credentials
cdk bootstrap              # Bootstrap CDK (first time)
npm run synth              # Synthesize stack
```

## 🔧 Setup direnv (Recommended)

```bash
# 1. Install direnv
nix-env -iA nixpkgs.direnv

# 2. Add to ~/.bashrc or ~/.zshrc
eval "$(direnv hook bash)"  # or zsh

# 3. Allow in project directory
direnv allow

# 4. Done! Environment loads automatically
```

## 📦 What's Included

- ✅ Node.js 20
- ✅ Python 3.12
- ✅ AWS CLI v2
- ✅ AWS CDK
- ✅ pytest, boto3, moto
- ✅ All build tools

## 🐛 Troubleshooting

### Flakes not enabled?
```bash
# Add to /etc/nixos/configuration.nix:
nix.settings.experimental-features = [ "nix-command" "flakes" ];

# Then:
sudo nixos-rebuild switch
```

### Dependencies not installing?
```bash
# Exit and re-enter Nix environment
exit
nix develop  # or nix-shell
```

### Python issues?
```bash
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 📚 Full Documentation

- `NIXOS_DEVELOPMENT.md` - Complete NixOS guide
- `CI_CD_GUIDE.md` - Testing and CI/CD
- `DEPLOYMENT.md` - Deployment guide
- `README.md` - Project overview

## 💡 Pro Tips

1. **Use direnv** - Automatic environment loading
2. **Keep flake.lock** - Commit it for reproducibility
3. **Update regularly** - `nix flake update`
4. **Test before push** - `npm test`

---

**Need help?** See `NIXOS_DEVELOPMENT.md` for detailed documentation.
