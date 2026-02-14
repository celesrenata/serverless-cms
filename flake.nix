{
  description = "Serverless CMS Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "serverless-cms-dev";

          buildInputs = with pkgs; [
            # Node.js and package managers
            nodejs_20
            nodePackages.npm
            nodePackages.typescript
            nodePackages.typescript-language-server

            # Python and testing tools
            python312
            python312Packages.pip
            python312Packages.pytest
            python312Packages.pytest-cov
            python312Packages.boto3
            python312Packages.moto
            python312Packages.requests
            python312Packages.pillow
            python312Packages.python-jose

            # AWS Tools
            awscli2
            nodePackages.aws-cdk

            # Build tools
            jq
            git
            curl
            wget

            # Shell utilities
            bash
            coreutils
            findutils
            gnugrep
            gnused
          ];

          shellHook = ''
            echo "Serverless CMS Development Environment"
            echo "======================================"
            echo ""
            echo "Available Tools:"
            echo "  Node.js:    $(node --version)"
            echo "  npm:        $(npm --version)"
            echo "  Python:     $(python --version)"
            echo "  AWS CLI:    $(aws --version 2>&1 | head -n1)"
            echo "  CDK:        $(cdk --version)"
            echo ""
            echo "Testing Commands:"
            echo "  npm test                  - Run all tests"
            echo "  npm run test:backend      - Run backend tests"
            echo "  npm run test:admin        - Run admin panel tests"
            echo "  npm run test:public       - Run public website tests"
            echo ""
            echo "Deployment Commands:"
            echo "  npm run deploy:all:dev    - Deploy to development"
            echo "  npm run deploy:all:staging - Deploy to staging"
            echo "  npm run deploy:all:prod   - Deploy to production"
            echo ""
            echo "Documentation:"
            echo "  CI_CD_GUIDE.md            - CI/CD pipeline guide"
            echo "  DEPLOYMENT.md             - Deployment guide"
            echo "  PLUGIN_DEVELOPMENT_GUIDE.md - Plugin development"
            echo ""
            echo "======================================"
            echo ""

            # Set up Python virtual environment
            if [ ! -d ".venv" ]; then
              echo "Creating Python virtual environment..."
              python -m venv .venv
            fi

            # Activate virtual environment
            source .venv/bin/activate

            # Install Python dependencies if requirements.txt exists
            if [ -f "requirements.txt" ]; then
              echo "Installing Python dependencies..."
              pip install -q -r requirements.txt
            fi

            # Check if node_modules exists
            if [ ! -d "node_modules" ]; then
              echo "Installing root dependencies..."
              npm install
            fi

            # Check frontend dependencies
            if [ ! -d "frontend/admin-panel/node_modules" ]; then
              echo "Installing admin panel dependencies..."
              (cd frontend/admin-panel && npm install)
            fi

            if [ ! -d "frontend/public-website/node_modules" ]; then
              echo "Installing public website dependencies..."
              (cd frontend/public-website && npm install)
            fi

            # Make scripts executable
            chmod +x scripts/*.sh 2>/dev/null || true
            chmod +x tests/smoke_tests.py 2>/dev/null || true

            echo "Development environment ready!"
            echo ""
          '';

          # Environment variables
          AWS_REGION = "us-west-2";
          NODE_ENV = "development";
          
          # Prevent npm from using global cache
          NPM_CONFIG_PREFIX = "$PWD/.npm-global";
          
          # Python environment
          PYTHONPATH = "$PWD";
        };
      }
    );
}
