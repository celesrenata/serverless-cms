# Implementation Plan - Phase 2: User Management & Site Configuration

This task list covers Phase 2 features including user management, comment system, email notifications, CAPTCHA protection, and user registration. Phase 1 (core CMS) is complete.

---

## Task 1: AWS SES Setup and Email Infrastructure

**Objective:** Configure AWS SES to send emails from no-reply@celestium.life and implement email utility module

**Subtasks:**
- [x] 1.1 Add AWS SES email identity configuration to CDK stack (lib/serverless-cms-stack.ts)
- [x] 1.2 Implement lambda/shared/email.py utility module with send_email function and email templates
- [x] 1.3 Add SES IAM permissions to Lambda execution roles in CDK stack
- [x] 1.4 Configure SNS topics for bounce/complaint handling in CDK stack
- [x] 1.5 Write unit tests for email utility functions

_Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.9, 27.1, 27.2, 27.3, 27.7_

**Status:** ✅ COMPLETE

---

## Task 2: User Management Backend - Lambda Functions

**Objective:** Implement Lambda functions for complete user CRUD operations with Cognito integration

**Subtasks:**
- [x] 2.1 Create lambda/users/create.py - Create user in Cognito and DynamoDB with welcome email
- [x] 2.2 Create lambda/users/update.py - Update user details and role in Cognito and DynamoDB
- [x] 2.3 Create lambda/users/delete.py - Delete user from Cognito and mark content as orphaned
- [x] 2.4 Create lambda/users/reset_password.py - Trigger Cognito password reset with email notification
- [x] 2.5 Update lambda/users/list.py to include last_login and created_at timestamps
- [x] 2.6 Add email format validation and role validation to all user functions
- [x] 2.7 Implement self-deletion prevention in delete.py
- [x]* 2.8 Write integration tests for user management operations

_Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9_

**Status:** ✅ COMPLETE

---

## Task 3: User Management Backend - CDK Infrastructure

**Objective:** Add API Gateway routes and Lambda functions for user management to CDK stack

**Subtasks:**
- [x] 3.1 Create Lambda functions in CDK for user create, update, delete, reset_password
- [x] 3.2 Add POST /api/v1/users endpoint with admin authorization
- [x] 3.3 Add PUT /api/v1/users/{id} endpoint with admin authorization
- [x] 3.4 Add DELETE /api/v1/users/{id} endpoint with admin authorization
- [x] 3.5 Add POST /api/v1/users/{id}/reset-password endpoint with admin authorization
- [x] 3.6 Grant Cognito admin permissions to user management Lambda functions
- [x] 3.7 Grant SES send email permissions to user management Lambda functions
- [x] 3.8 Add CloudWatch alarms for user management Lambda functions

_Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

**Status:** ✅ COMPLETE

---

## Task 4: User Management Frontend - Admin Panel

**Objective:** Build complete user management interface in admin panel

**Subtasks:**
- [x] 4.1 Create frontend/admin-panel/src/pages/Users.tsx with user list table
- [x] 4.2 Create frontend/admin-panel/src/components/Users/ directory
- [x] 4.3 Create frontend/admin-panel/src/components/Users/UserCreateModal.tsx with role selection
- [x] 4.4 Create frontend/admin-panel/src/components/Users/UserEditModal.tsx
- [x] 4.5 Create frontend/admin-panel/src/components/Users/PasswordResetModal.tsx
- [x] 4.6 Create frontend/admin-panel/src/hooks/useUsers.ts for user management operations
- [x] 4.7 Add user management API methods to frontend/admin-panel/src/services/api.ts
- [x] 4.8 Add Users navigation link to admin layout
- [x] 4.9 Implement search and filter functionality in Users page
- [ ]* 4.10 Write frontend tests for user management components

_Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.7, 21.8_

**Status:** ✅ COMPLETE (tests pending)

---

## Task 5: Site Configuration Settings

**Objective:** Add toggles for user registration, comments, and CAPTCHA in settings

**Subtasks:**
- [x] 5.1 Update frontend/admin-panel/src/pages/Settings.tsx with toggle switches
- [x] 5.2 Update frontend/admin-panel/src/types/settings.ts to include new settings fields
- [x] 5.3 Update lambda/settings/update.py to validate new settings keys
- [x] 5.4 Add default settings initialization in CDK stack or deployment script
- [x] 5.5 Update frontend/admin-panel/src/hooks/useSettings.ts if needed

_Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9_

**Status:** ✅ COMPLETE

---

## Task 6: Comments Database and Backend - Infrastructure

**Objective:** Create DynamoDB comments table and Lambda functions

**Subtasks:**
- [x] 6.1 Add DynamoDB comments table to CDK stack with GSIs (content_id-created_at-index, status-created_at-index)
- [x] 6.2 Create lambda/comments/ directory with __init__.py
- [x] 6.3 Create lambda/comments/list.py - List comments by content_id or status with pagination
- [x] 6.4 Create lambda/comments/create.py - Submit comment with validation, sanitization, and rate limiting
- [x] 6.5 Create lambda/comments/update.py - Update comment status (approve, reject, spam)
- [x] 6.6 Create lambda/comments/delete.py - Delete comment
- [x] 6.7 Implement XSS sanitization in create.py using html.escape
- [x] 6.8 Implement IP-based rate limiting (5 per hour) in create.py
- [x] 6.9 Add support for threaded replies with parent_id field
- [ ]* 6.10 Write integration tests for comment operations

_Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9_

**Status:** ✅ COMPLETE (tests pending)

## Task 7: Comments Backend - CDK Infrastructure

**Objective:** Add API Gateway routes for comments to CDK stack

**Subtasks:**
- [x] 7.1 Create Lambda functions in CDK for comment list, create, update, delete
- [x] 7.2 Add GET /api/v1/content/{id}/comments endpoint (public)
- [x] 7.3 Add POST /api/v1/content/{id}/comments endpoint (public if enabled)
- [x] 7.4 Add GET /api/v1/comments endpoint for moderation (editor+ auth)
- [x] 7.5 Add PUT /api/v1/comments/{id} endpoint (editor+ auth)
- [x] 7.6 Add DELETE /api/v1/comments/{id} endpoint (editor+ auth)
- [x] 7.7 Grant DynamoDB permissions to comment Lambda functions
- [x] 7.8 Add CloudWatch alarms for comment Lambda functions

_Requirements: 24.1, 24.2, 24.3, 24.4, 24.8_

**Status:** ✅ COMPLETE

---

## Task 8: Comments Frontend - Public Website

**Objective:** Add comment form and display to public website

**Subtasks:**
- [x] 8.1 Create frontend/public-website/src/components/CommentForm.tsx with validation
- [x] 8.2 Create frontend/public-website/src/components/CommentList.tsx with threading
- [x] 8.3 Create frontend/public-website/src/components/Comment.tsx for individual comments
- [x] 8.4 Create frontend/public-website/src/hooks/useComments.ts
- [x] 8.5 Add comment API methods to frontend/public-website/src/services/api.ts
- [x] 8.6 Integrate comment components into frontend/public-website/src/pages/Post.tsx
- [x] 8.7 Add conditional rendering based on comments_enabled setting
- [x] 8.8 Implement loading and error states
- [ ]* 8.9 Write frontend tests for comment components

_Requirements: 24.1, 24.2, 24.3, 24.5, 24.6, 24.9_

**Status:** ✅ COMPLETE (tests pending)

## Task 9: Comment Moderation Interface - Admin Panel

**Objective:** Build comment moderation interface in admin panel

**Subtasks:**
- [x] 9.1 Create frontend/admin-panel/src/pages/Comments.tsx with comment list
- [x] 9.2 Create frontend/admin-panel/src/components/Comments/ directory
- [x] 9.3 Create frontend/admin-panel/src/components/Comments/CommentTable.tsx
- [x] 9.4 Create frontend/admin-panel/src/components/Comments/CommentActions.tsx
- [x] 9.5 Create frontend/admin-panel/src/hooks/useComments.ts for moderation
- [x] 9.6 Add comment moderation API methods to frontend/admin-panel/src/services/api.ts
- [x] 9.7 Implement status filters (pending, approved, spam, rejected)
- [x] 9.8 Add Comments navigation link to admin layout
- [ ]* 9.9 Write frontend tests for moderation interface

_Requirements: 24.4, 24.8_

**Status:** ✅ COMPLETE (tests pending)

---

## Task 10: AWS WAF and CAPTCHA Integration

**Objective:** Configure AWS WAF with CAPTCHA for comment spam protection

**Subtasks:**
- [x] 10.1 Add AWS WAF Web ACL to CDK stack
- [x] 10.2 Configure CAPTCHA challenge rule for comment endpoint in WAF
- [x] 10.3 Associate WAF with API Gateway stage in CDK stack
- [x] 10.4 Add WAF CAPTCHA widget to CommentForm.tsx
- [x] 10.5 Implement CAPTCHA token validation in lambda/comments/create.py
- [x] 10.6 Add conditional CAPTCHA rendering based on captcha_enabled setting
- [x] 10.7 Ensure rate limiting works as fallback when CAPTCHA disabled
- [ ]* 10.8 Test CAPTCHA flow end-to-end

_Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7, 25.8, 25.9_

**Status:** ✅ COMPLETE (testing pending)

---

## Task 11: User Registration System - Backend

**Objective:** Implement self-service user registration with email verification

**Subtasks:**
- [x] 11.1 Create lambda/auth/ directory with __init__.py
- [x] 11.2 Create lambda/auth/register.py - Handle registration with Cognito and send welcome email
- [x] 11.3 Create lambda/auth/verify_email.py - Handle email verification callback
- [x] 11.4 Implement email format and password strength validation in register.py
- [x] 11.5 Set default role to "viewer" for new registrations
- [x] 11.6 Prevent duplicate registrations with same email
- [x] 11.7 Write integration tests for registration flow

_Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 26.9_

**Status:** ✅ COMPLETE

---

## Task 12: User Registration System - CDK Infrastructure

**Objective:** Add API Gateway routes for registration to CDK stack

**Subtasks:**
- [x] 12.1 Create Lambda functions in CDK for register and verify_email
- [x] 12.2 Add POST /api/v1/auth/register endpoint (public if enabled)
- [x] 12.3 Add POST /api/v1/auth/verify-email endpoint (public)
- [x] 12.4 Grant Cognito user creation permissions to register Lambda
- [x] 12.5 Grant SES send email permissions to register Lambda
- [x] 12.6 Add CloudWatch alarms for registration Lambda functions

_Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.8_

**Status:** ✅ COMPLETE

---

## Task 13: User Registration System - Frontend

**Objective:** Build registration and verification pages for public website

**Subtasks:**
- [x] 13.1 Create frontend/public-website/src/pages/Register.tsx with form validation
- [x] 13.2 Create frontend/public-website/src/pages/VerifyEmail.tsx
- [x] 13.3 Add registration API methods to frontend/public-website/src/services/api.ts
- [x] 13.4 Add conditional registration link to frontend/public-website/src/pages/Login.tsx
- [x] 13.5 Add registration route to frontend/public-website/src/App.tsx
- [x] 13.6 Implement password strength indicator in Register.tsx
- [ ]* 13.7 Write frontend tests for registration components

_Requirements: 26.1, 26.2, 26.4, 26.5, 26.7_

**Status:** ✅ COMPLETE (tests pending)

---

## Task 14: Settings Middleware and Feature Gating

**Objective:** Implement middleware to enforce settings across all endpoints

**Subtasks:**
- [x] 14.1 Create lambda/shared/middleware.py with check_setting function
- [x] 14.2 Implement settings caching in middleware (5 minute TTL)
- [x] 14.3 Add registration check to lambda/auth/register.py
- [x] 14.4 Add comments check to lambda/comments/create.py
- [x] 14.5 Add CAPTCHA check to lambda/comments/create.py
- [x] 14.6 Update public website to fetch site settings on initial load
- [ ]* 14.7 Test feature gating for all settings

_Requirements: 22.2, 22.3, 22.4, 22.5, 22.6, 22.8_

**Status:** ✅ COMPLETE (testing pending)

---

## Task 15: Database Schema Documentation

**Objective:** Update database schema documentation with Phase 2 tables

**Subtasks:**
- [x] 15.1 Add comments table schema to .kiro/steering/database-schema.md
- [x] 15.2 Document comment status values and GSI usage patterns
- [x] 15.3 Update settings table documentation with new settings keys
- [x] 15.4 Document user table fields for Phase 2 (last_login, created_at)

_Requirements: All Phase 2 requirements_

**Status:** ✅ COMPLETE

---

## Task 16: API Documentation

**Objective:** Document all Phase 2 API endpoints

**Subtasks:**
- [x] 16.1 Add user management endpoints to API_DOCUMENTATION.md
- [x] 16.2 Add comment endpoints to API_DOCUMENTATION.md
- [x] 16.3 Add registration endpoints to API_DOCUMENTATION.md
- [x] 16.4 Document request/response formats for all new endpoints
- [x] 16.5 Document authentication requirements for each endpoint

_Requirements: All Phase 2 requirements_

**Status:** ✅ COMPLETE

---

## Task 17: Monitoring and Alarms

**Objective:** Set up CloudWatch monitoring for Phase 2 features

**Subtasks:**
- [x] 17.1 Add CloudWatch dashboard for Phase 2 metrics to CDK stack
- [x] 17.2 Add alarm for email bounce rate (SES)
- [x] 17.3 Add alarm for failed CAPTCHA validations
- [x] 17.4 Add alarm for comment spam detection rate
- [x] 17.5 Add alarm for user creation failures
- [x] 17.6 Configure SNS notifications for Phase 2 alarms
- [x] 17.7 Update MONITORING.md with Phase 2 metrics and alarms

_Requirements: 23.6, 25.2, 25.3_

**Status:** ✅ COMPLETE

---

## Task 18: Integration Testing

**Objective:** Write comprehensive integration tests for Phase 2

**Subtasks:**
- [x] 18.1 Write tests/test_user_management.py for user CRUD operations
- [x] 18.2 Write tests/test_comments.py for comment system
- [x] 18.3 Write tests/test_registration.py for registration flow
- [x] 18.4 Add Phase 2 E2E tests to tests/test_e2e_workflows.py
- [x] 18.5 Add Phase 2 smoke tests to tests/smoke_tests.py
- [x] 18.6 Update tests/conftest.py with Phase 2 fixtures

_Requirements: All Phase 2 requirements_

**Status:** ✅ COMPLETE

---

## Task 19: Deployment Documentation

**Objective:** Document Phase 2 deployment and configuration

**Subtasks:**
- [x] 19.1 Create USER_MANAGEMENT_GUIDE.md with admin instructions
- [x] 19.2 Create COMMENT_MODERATION_GUIDE.md with moderation workflows
- [x] 19.3 Update DEPLOYMENT.md with SES setup instructions
- [x] 19.4 Update DEPLOYMENT.md with WAF configuration instructions
- [x] 19.5 Document DNS configuration for SES (SPF, DKIM, DMARC)
- [x] 19.6 Document moving SES out of sandbox mode

_Requirements: 23.4, 23.5, 23.8, 27.2, 27.3, 27.4, 27.8_

**Status:** ✅ COMPLETE

---

## Summary

**Phase 2 Status:** Not Started

**Total Tasks:** 19 tasks with 150+ subtasks

**Critical Path:**
1. Task 1 (SES Setup) → Required for all email functionality
2. Task 2-4 (User Management) → Core admin feature
3. Task 5-7 (Comments Backend) → Required for frontend
4. Task 8-9 (Comments Frontend) → User-facing feature
5. Task 10 (WAF/CAPTCHA) → Spam protection
6. Task 11-13 (Registration) → User onboarding
7. Task 14 (Middleware) → Feature gating
8. Task 15-19 (Documentation & Testing) → Production readiness

**Parallel Work Opportunities:**
- Task 5 (Settings) can be done in parallel with Task 1-4
- Task 11-13 (Registration) can be done after Task 1-2
- Task 9 (Moderation UI) can be done after Task 6-7
- Task 14 (Middleware) can be done after Task 5-7
- Task 15-19 (Docs/Testing) can be done in parallel with implementation

**Estimated Effort:** 80-100 hours (~2-3 weeks for one developer)
