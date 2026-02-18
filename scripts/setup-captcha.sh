#!/bin/bash

# Setup CAPTCHA Configuration Script
# This script helps you configure AWS WAF CAPTCHA for the CMS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-dev}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AWS WAF CAPTCHA Setup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Get AWS region
REGION=$(aws configure get region)
if [ -z "$REGION" ]; then
    echo -e "${RED}Error: AWS region not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI configured${NC}"
echo -e "  Region: ${REGION}"
echo -e "  Environment: ${ENVIRONMENT}"
echo ""

# Get Web ACL ID from CloudFormation outputs
echo -e "${YELLOW}Fetching WAF Web ACL information...${NC}"
STACK_NAME="ServerlessCmsStack-${ENVIRONMENT}"

WEB_ACL_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='WebAclId'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -z "$WEB_ACL_ID" ]; then
    echo -e "${RED}Error: Could not find Web ACL ID${NC}"
    echo "Make sure you have deployed the stack:"
    echo "  npm run deploy:${ENVIRONMENT}"
    exit 1
fi

echo -e "${GREEN}✓ Found Web ACL ID: ${WEB_ACL_ID}${NC}"
echo ""

# Get Web ACL details
echo -e "${YELLOW}Fetching Web ACL details...${NC}"
WEB_ACL_NAME=$(aws wafv2 list-web-acls \
    --scope REGIONAL \
    --region "$REGION" \
    --query "WebACLs[?Id=='${WEB_ACL_ID}'].Name" \
    --output text)

if [ -z "$WEB_ACL_NAME" ]; then
    echo -e "${RED}Error: Could not find Web ACL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found Web ACL: ${WEB_ACL_NAME}${NC}"
echo ""

# Instructions for generating CAPTCHA API key
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CAPTCHA API Key Generation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}AWS does not provide an API to generate CAPTCHA keys programmatically.${NC}"
echo -e "${YELLOW}You need to generate it manually through the AWS Console.${NC}"
echo ""
echo -e "${GREEN}Follow these steps:${NC}"
echo ""
echo "1. Open AWS Console and navigate to WAF & Shield:"
echo -e "   ${BLUE}https://console.aws.amazon.com/wafv2/homev2/web-acls?region=${REGION}${NC}"
echo ""
echo "2. Click on your Web ACL: ${GREEN}${WEB_ACL_NAME}${NC}"
echo ""
echo "3. Go to the ${GREEN}'Application integration'${NC} tab"
echo ""
echo "4. Under ${GREEN}'CAPTCHA puzzle'${NC}, click ${GREEN}'Generate API key'${NC}"
echo ""
echo "5. ${YELLOW}IMPORTANT: Add your domains (max 5)${NC}"
echo "   Example domains to add:"
echo "   - yourdomain.com"
echo "   - www.yourdomain.com"
echo "   - staging.yourdomain.com"
echo ""
echo "6. Copy the following information:"
echo "   - JavaScript API URL (e.g., https://abc123.${REGION}.captcha-sdk.awswaf.com/abc123/jsapi.js)"
echo "   - API Key (the 'abc123' part)"
echo ""
echo -e "${YELLOW}Press Enter when you have the API key ready...${NC}"
read -r

# Prompt for CAPTCHA configuration
echo ""
echo -e "${GREEN}Enter your CAPTCHA configuration:${NC}"
echo ""

read -p "JavaScript SDK URL: " CAPTCHA_SCRIPT_URL
read -p "API Key: " CAPTCHA_API_KEY

if [ -z "$CAPTCHA_SCRIPT_URL" ] || [ -z "$CAPTCHA_API_KEY" ]; then
    echo -e "${RED}Error: Both values are required${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Note: AWS WAF CAPTCHA supports up to 5 domains per API key${NC}"
echo -e "${YELLOW}Make sure you added your domains when generating the API key${NC}"
echo ""
echo -e "${GREEN}Recommended domains to add:${NC}"
echo "  - yourdomain.com"
echo "  - www.yourdomain.com"
echo "  - staging.yourdomain.com (if applicable)"
echo ""

# Update .env file for public website
ENV_FILE="frontend/public-website/.env"

echo ""
echo -e "${YELLOW}Updating ${ENV_FILE}...${NC}"

# Backup existing .env
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "${ENV_FILE}.backup"
    echo -e "${GREEN}✓ Backed up existing .env to ${ENV_FILE}.backup${NC}"
fi

# Update or add CAPTCHA configuration
if [ -f "$ENV_FILE" ]; then
    # Remove existing CAPTCHA lines
    sed -i.tmp '/VITE_CAPTCHA_/d' "$ENV_FILE"
    rm -f "${ENV_FILE}.tmp"
fi

# Add CAPTCHA configuration
cat >> "$ENV_FILE" << EOF

# AWS WAF CAPTCHA Configuration
VITE_CAPTCHA_SCRIPT_URL=${CAPTCHA_SCRIPT_URL}
VITE_CAPTCHA_API_KEY=${CAPTCHA_API_KEY}
EOF

echo -e "${GREEN}✓ Updated ${ENV_FILE}${NC}"
echo ""

# Show the configuration
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Configuration Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo -e "Region: ${GREEN}${REGION}${NC}"
echo -e "Web ACL: ${GREEN}${WEB_ACL_NAME}${NC}"
echo -e "CAPTCHA Script URL: ${GREEN}${CAPTCHA_SCRIPT_URL}${NC}"
echo -e "CAPTCHA API Key: ${GREEN}${CAPTCHA_API_KEY}${NC}"
echo ""

# Next steps
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "1. Rebuild the frontend:"
echo -e "   ${GREEN}cd frontend/public-website && npm run build${NC}"
echo ""
echo "2. Deploy the frontend:"
echo -e "   ${GREEN}npm run deploy:frontend:${ENVIRONMENT}${NC}"
echo ""
echo "3. Enable CAPTCHA in admin settings:"
echo "   - Log in to admin panel"
echo "   - Go to Settings"
echo "   - Enable 'CAPTCHA Protection'"
echo "   - Save settings"
echo ""
echo "4. Test CAPTCHA:"
echo "   - Navigate to a blog post"
echo "   - Try to submit a comment"
echo "   - Verify CAPTCHA appears and works"
echo ""
echo -e "${GREEN}✓ CAPTCHA configuration complete!${NC}"
echo ""
