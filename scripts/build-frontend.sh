#!/usr/bin/env bash

# Build frontend applications locally
# Usage: ./scripts/build-frontend.sh [options]
# Options:
#   --admin-only     Build only admin panel
#   --public-only    Build only public website
#   --clean          Clean dist folders before building

set -e

# Parse arguments
BUILD_ADMIN=true
BUILD_PUBLIC=true
CLEAN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --admin-only)
      BUILD_PUBLIC=false
      shift
      ;;
    --public-only)
      BUILD_ADMIN=false
      shift
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "🔨 Building frontend applications..."

# Build Admin Panel
if [ "$BUILD_ADMIN" = true ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Building Admin Panel"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  cd frontend/admin-panel
  
  # Clean if requested
  if [ "$CLEAN" = true ] && [ -d "dist" ]; then
    echo "🧹 Cleaning dist folder..."
    rm -rf dist
  fi
  
  # Install dependencies if node_modules doesn't exist
  if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
  fi
  
  # Check if .env file exists
  if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Using .env.example as template..."
    if [ -f ".env.example" ]; then
      cp .env.example .env
      echo "   Please update .env with your configuration"
    fi
  fi
  
  # Build
  echo "🔨 Building..."
  npm run build
  
  cd ../..
  echo "✅ Admin Panel build complete!"
  echo "   Output: frontend/admin-panel/dist"
fi

# Build Public Website
if [ "$BUILD_PUBLIC" = true ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🌐 Building Public Website"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  cd frontend/public-website
  
  # Clean if requested
  if [ "$CLEAN" = true ] && [ -d "dist" ]; then
    echo "🧹 Cleaning dist folder..."
    rm -rf dist
  fi
  
  # Install dependencies if node_modules doesn't exist
  if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
  fi
  
  # Check if .env file exists
  if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Using .env.example as template..."
    if [ -f ".env.example" ]; then
      cp .env.example .env
      echo "   Please update .env with your configuration"
    fi
  fi
  
  # Build
  echo "🔨 Building..."
  npm run build
  
  cd ../..
  echo "✅ Public Website build complete!"
  echo "   Output: frontend/public-website/dist"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Build Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next steps:"
echo "   - Test locally: npm run preview (in each frontend directory)"
echo "   - Deploy to AWS: ./scripts/deploy-frontend.sh [environment]"
echo ""
