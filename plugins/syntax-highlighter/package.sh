#!/bin/bash
# Package the syntax highlighter plugin for installation

set -e

PLUGIN_NAME="syntax-highlighter"
PACKAGE_DIR="package"
OUTPUT_FILE="${PLUGIN_NAME}.zip"

echo "Packaging ${PLUGIN_NAME} plugin..."

# Clean up previous package
rm -rf ${PACKAGE_DIR}
rm -f ${OUTPUT_FILE}

# Create package directory
mkdir -p ${PACKAGE_DIR}

# Copy plugin files
cp plugin.json ${PACKAGE_DIR}/
cp handler.py ${PACKAGE_DIR}/
cp requirements.txt ${PACKAGE_DIR}/
cp README.md ${PACKAGE_DIR}/

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt -t ${PACKAGE_DIR}/ --upgrade

# Create zip file
echo "Creating zip archive..."
cd ${PACKAGE_DIR}
zip -r ../${OUTPUT_FILE} .
cd ..

# Clean up
rm -rf ${PACKAGE_DIR}

echo "Plugin packaged successfully: ${OUTPUT_FILE}"
echo "File size: $(du -h ${OUTPUT_FILE} | cut -f1)"
