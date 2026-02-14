#!/usr/bin/env bash

# Package a plugin for installation
# Usage: ./scripts/package-plugin.sh <plugin-name>

set -e

PLUGIN_NAME=$1

if [ -z "$PLUGIN_NAME" ]; then
  echo "Usage: ./scripts/package-plugin.sh <plugin-name>"
  echo ""
  echo "Available plugins:"
  ls -1 plugins/ | grep -v README.md
  exit 1
fi

PLUGIN_DIR="plugins/$PLUGIN_NAME"

if [ ! -d "$PLUGIN_DIR" ]; then
  echo "❌ Error: Plugin directory not found: $PLUGIN_DIR"
  exit 1
fi

if [ ! -f "$PLUGIN_DIR/handler.py" ]; then
  echo "❌ Error: handler.py not found in $PLUGIN_DIR"
  exit 1
fi

if [ ! -f "$PLUGIN_DIR/README.md" ]; then
  echo "❌ Error: README.md not found in $PLUGIN_DIR"
  exit 1
fi

OUTPUT_DIR="dist/plugins"
mkdir -p "$OUTPUT_DIR"

OUTPUT_FILE="$OUTPUT_DIR/${PLUGIN_NAME}.zip"

echo "📦 Packaging plugin: $PLUGIN_NAME"
echo "   Source: $PLUGIN_DIR"
echo "   Output: $OUTPUT_FILE"

# Create zip file
cd "$PLUGIN_DIR"
zip -r "../../$OUTPUT_FILE" . -x "*.pyc" -x "__pycache__/*" -x ".DS_Store"
cd ../..

echo "✅ Plugin packaged successfully!"
echo ""
echo "📋 Plugin details:"
unzip -l "$OUTPUT_FILE"
echo ""
echo "🎯 Next steps:"
echo "   1. Go to the Plugins page in the admin panel"
echo "   2. Click 'Upload Plugin'"
echo "   3. Select: $OUTPUT_FILE"
echo "   4. Click 'Install'"
echo ""
