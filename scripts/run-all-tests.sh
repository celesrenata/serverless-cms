#!/usr/bin/env bash

# Run all tests for the Serverless CMS
# This script runs backend, frontend, and infrastructure tests

set -e

echo "🧪 Running all tests for Serverless CMS..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
BACKEND_PASSED=0
ADMIN_PASSED=0
PUBLIC_PASSED=0
INFRA_PASSED=0

# Backend Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Running Backend Tests (Python/Lambda)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pytest tests/ -v --cov=lambda --cov-report=term; then
    echo -e "${GREEN}✅ Backend tests passed${NC}"
    BACKEND_PASSED=1
else
    echo -e "${RED}❌ Backend tests failed${NC}"
fi
echo ""

# Admin Panel Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 Running Admin Panel Tests (React)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd frontend/admin-panel
if npm test -- --run; then
    echo -e "${GREEN}✅ Admin panel tests passed${NC}"
    ADMIN_PASSED=1
else
    echo -e "${RED}❌ Admin panel tests failed${NC}"
fi
cd ../..
echo ""

# Public Website Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Running Public Website Tests (React)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd frontend/public-website
if npm test -- --run; then
    echo -e "${GREEN}✅ Public website tests passed${NC}"
    PUBLIC_PASSED=1
else
    echo -e "${RED}❌ Public website tests failed${NC}"
fi
cd ../..
echo ""

# Infrastructure Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  Running Infrastructure Tests (CDK)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npm run build && npm run synth -- --context environment=dev > /dev/null; then
    echo -e "${GREEN}✅ Infrastructure tests passed${NC}"
    INFRA_PASSED=1
else
    echo -e "${RED}❌ Infrastructure tests failed${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $BACKEND_PASSED -eq 1 ]; then
    echo -e "Backend:        ${GREEN}✅ PASSED${NC}"
else
    echo -e "Backend:        ${RED}❌ FAILED${NC}"
fi

if [ $ADMIN_PASSED -eq 1 ]; then
    echo -e "Admin Panel:    ${GREEN}✅ PASSED${NC}"
else
    echo -e "Admin Panel:    ${RED}❌ FAILED${NC}"
fi

if [ $PUBLIC_PASSED -eq 1 ]; then
    echo -e "Public Website: ${GREEN}✅ PASSED${NC}"
else
    echo -e "Public Website: ${RED}❌ FAILED${NC}"
fi

if [ $INFRA_PASSED -eq 1 ]; then
    echo -e "Infrastructure: ${GREEN}✅ PASSED${NC}"
else
    echo -e "Infrastructure: ${RED}❌ FAILED${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Calculate total
TOTAL_PASSED=$((BACKEND_PASSED + ADMIN_PASSED + PUBLIC_PASSED + INFRA_PASSED))

if [ $TOTAL_PASSED -eq 4 ]; then
    echo -e "${GREEN}🎉 All tests passed! (4/4)${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed ($TOTAL_PASSED/4 passed)${NC}"
    exit 1
fi
