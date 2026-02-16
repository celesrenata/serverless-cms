# Tasks - Phase 2: User Management & Site Configuration

## Task 1: AWS SES Setup and Email Infrastructure

**Objective:** Configure AWS SES to send emails from no-reply@celestium.life

**Subtasks:**
- [ ] 1.1 Add SES email identity configuration to CDK stack
- [ ] 1.2 Implement lambda/shared/email.py utility module with send_email function
- [ ] 1.3 Add SES IAM permissions to Lambda execution role in CDK
- [ ] 1.4 Create email template functions (welcome, password reset, verification)
- [ ] 1.5 Configure SNS topics for bounce/complaint handling in CDK
- [ ]* 1.6 Test email sending to verified addresses
- [ ]* 1.7 Document SES configuration and DNS setup process

_Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.9, 27.1, 27.2, 27.3, 27.7_

---

## Task 2: User Management Backend

**Objective:** Implement Lambda functions for user CRUD operations

**Subtasks:**
- [ ] 2.1 Update lambda/users/list.py to support pagination and filtering
- [ ] 2.2 Create lambda/users/create.py - Create user in Cognito and DynamoDB with email notification
- [ ] 2.3 Create lambda/users/update.py - Update user details and role
- [ ] 2.4 Create lambda/users/delete.py - Delete user from Cognito and DynamoDB
- [ ] 2.5 Create lambda/users/reset_password.py - Trigger password reset with email
- [ ] 2.6 Add validation for email format and role values in all user functions
- [ ] 2.7 Update CDK stack to add user management API routes (POST, PUT, DELETE /users)
- [ ]* 2.8 Write integration tests for user management functions

_Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9_

---

## Task 3: User Management Frontend

**Objective:** Build admin panel interface for user management

**Subtasks:**
- [ ] 3.1 Create frontend/admin-panel/src/pages/Users.tsx with user list table
- [ ] 3.2 Create frontend/admin-panel/src/components/Users/UserCreateModal.tsx
- [ ] 3.3 Create frontend/admin-panel/src/components/Users/UserEditModal.tsx
- [ ] 3.4 Create frontend/admin-panel/src/components/Users/PasswordResetModal.tsx
- [ ] 3.5 Create frontend/admin-panel/src/hooks/useUsers.ts for user management operations
- [ ] 3.6 Add user management API methods to services/api.ts (createUser, updateUser, deleteUser, resetPassword)
- [ ] 3.7 Implement search and filter UI in Users page
- [ ] 3.8 Add navigation link to Users page in admin layout
- [ ] 3.9 Remove user management section from Settings.tsx (move to dedicated Users page)

_Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.7, 21.8_

---

## Task 4: Site Configuration Settings

**Objective:** Add toggles for user registration, comments, and CAPTCHA

**Subtasks:**
- [ ] 4.1 Update frontend/admin-panel/src/pages/Settings.tsx with toggle switches for registration, comments, CAPTCHA
- [ ] 4.2 Update lambda/settings/update.py to validate new settings keys
- [ ] 4.3 Add default values for new settings in CDK stack (user_registration_enabled, comments_enabled, captcha_enabled)
- [ ] 4.4 Update frontend/admin-panel/src/types/settings.ts to include new settings
- [ ]* 4.5 Test settings updates and retrieval

_Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9_

---

## Task 5: Comments Database and Backend

**Objective:** Create comments table and Lambda functions

**Subtasks:**
- [ ] 5.1 Add DynamoDB comments table definition to CDK stack with GSIs
- [ ] 5.2 Create lambda/comments/ directory and __init__.py
- [ ] 5.3 Create lambda/comments/list.py - List comments for content or moderation queue
- [ ] 5.4 Create lambda/comments/create.py - Submit new comment with validation and rate limiting
- [ ] 5.5 Create lambda/comments/update.py - Update comment status (approve, reject, spam)
- [ ] 5.6 Create lambda/comments/delete.py - Delete comment
- [ ] 5.7 Implement comment sanitization to prevent XSS in create.py
- [ ] 5.8 Implement rate limiting logic (5 per IP per hour) in create.py
- [ ] 5.9 Add support for threaded replies (parent_id field)
- [ ] 5.10 Update CDK stack to add comment API routes
- [ ] 5.11 Update .kiro/steering/database-schema.md with comments table schema
- [ ]* 5.12 Write integration tests for comment functions

_Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9_

---

## Task 6: Comments Frontend (Public Website)

**Objective:** Add comment form and list to public website

**Subtasks:**
- [ ] 6.1 Create frontend/public-website/src/components/CommentForm.tsx with validation
- [ ] 6.2 Create frontend/public-website/src/components/CommentList.tsx with threading support
- [ ] 6.3 Create frontend/public-website/src/components/Comment.tsx for individual comment display
- [ ] 6.4 Add comment API methods to frontend/public-website/src/services/api.ts
- [ ] 6.5 Create frontend/public-website/src/hooks/useComments.ts for comment operations
- [ ] 6.6 Integrate comment components into Post.tsx page
- [ ] 6.7 Add conditional rendering based on comments_enabled setting from site settings
- [ ] 6.8 Implement loading and error states for comment submission
- [ ] 6.9 Style comment components to match site theme
- [ ]* 6.10 Test comment submission and display

_Requirements: 24.1, 24.2, 24.3, 24.5, 24.6, 24.9_

---

## Task 7: Comment Moderation Interface

**Objective:** Build admin panel for comment moderation

**Subtasks:**
- [ ] 7.1 Create frontend/admin-panel/src/pages/Comments.tsx with comment list and filters
- [ ] 7.2 Create frontend/admin-panel/src/components/Comments/CommentTable.tsx
- [ ] 7.3 Create frontend/admin-panel/src/components/Comments/CommentActions.tsx for moderation actions
- [ ] 7.4 Create frontend/admin-panel/src/hooks/useComments.ts for comment moderation
- [ ] 7.5 Add comment moderation API methods to admin services/api.ts
- [ ] 7.6 Implement status filters (pending, approved, spam, rejected)
- [ ] 7.7 Add bulk moderation actions (approve all, delete all)
- [ ] 7.8 Add navigation link to Comments page in admin layout
- [ ]* 7.9 Test moderation workflows

_Requirements: 24.4, 24.8_

---

## Task 8: AWS WAF and CAPTCHA Integration

**Objective:** Configure WAF and integrate CAPTCHA for comment protection

**Subtasks:**
- [ ] 8.1 Add AWS WAF Web ACL definition to CDK stack
- [ ] 8.2 Configure CAPTCHA challenge rule for comment endpoint in WAF
- [ ] 8.3 Associate WAF with API Gateway stage in CDK
- [ ] 8.4 Add WAF CAPTCHA widget to CommentForm.tsx component
- [ ] 8.5 Implement CAPTCHA token validation in lambda/comments/create.py
- [ ] 8.6 Add conditional CAPTCHA rendering based on captcha_enabled setting
- [ ] 8.7 Ensure rate limiting fallback works when CAPTCHA disabled
- [ ]* 8.8 Test CAPTCHA flow end-to-end
- [ ]* 8.9 Document WAF configuration in DEPLOYMENT.md

_Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7, 25.8, 25.9_

---

## Task 9: User Registration System

**Objective:** Implement self-service user registration

**Subtasks:**
- [ ] 9.1 Create lambda/auth/ directory and __init__.py
- [ ] 9.2 Create lambda/auth/register.py - Handle registration requests with Cognito
- [ ] 9.3 Create lambda/auth/verify_email.py - Handle email verification callback
- [ ] 9.4 Create frontend/public-website/src/pages/Register.tsx with form validation
- [ ] 9.5 Create frontend/public-website/src/pages/VerifyEmail.tsx
- [ ] 9.6 Add registration API methods to public website services/api.ts
- [ ] 9.7 Integrate welcome email sending in register.py using email utility
- [ ] 9.8 Add conditional registration link to Login.tsx based on user_registration_enabled
- [ ] 9.9 Update CDK stack to add registration API routes
- [ ]* 9.10 Test registration flow end-to-end

_Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 26.9_

---

## Task 10: Settings Middleware and Feature Gating

**Objective:** Implement middleware to enforce settings across all endpoints

**Subtasks:**
- [ ] 10.1 Create lambda/shared/middleware.py with check_setting function
- [ ] 10.2 Add registration check to lambda/auth/register.py
- [ ] 10.3 Add comments check to lambda/comments/create.py
- [ ] 10.4 Add CAPTCHA check to lambda/comments/create.py
- [ ] 10.5 Update public website to fetch site settings on load
- [ ] 10.6 Implement settings caching in middleware (5 minute TTL)
- [ ]* 10.7 Test feature gating for all settings

_Requirements: 22.2, 22.3, 22.4, 22.5, 22.6, 22.8_

---

## Task 11: Testing and Documentation

**Objective:** Comprehensive testing and documentation for Phase 2

**Subtasks:**
- [ ]* 11.1 Write integration tests for user management in tests/test_user_management.py
- [ ]* 11.2 Write integration tests for comment system in tests/test_comments.py
- [ ]* 11.3 Write integration tests for registration flow in tests/test_registration.py
- [ ]* 11.4 Add E2E tests for Phase 2 workflows to tests/test_e2e_workflows.py
- [ ] 11.5 Update API_DOCUMENTATION.md with new endpoints (users, comments, auth/register)
- [ ] 11.6 Update .kiro/steering/database-schema.md with comments table
- [ ] 11.7 Create USER_MANAGEMENT_GUIDE.md with admin instructions
- [ ] 11.8 Create COMMENT_MODERATION_GUIDE.md with moderation workflows
- [ ] 11.9 Update DEPLOYMENT.md with SES and WAF setup instructions
- [ ]* 11.10 Add smoke tests for Phase 2 features to tests/smoke_tests.py

_Requirements: All Phase 2 requirements_

---

## Task 12: Monitoring and Alarms

**Objective:** Set up monitoring for Phase 2 features

**Subtasks:**
- [ ] 12.1 Add CloudWatch dashboard for Phase 2 metrics to CDK stack
- [ ] 12.2 Add CloudWatch alarms for email bounce rate in CDK
- [ ] 12.3 Add CloudWatch alarms for failed CAPTCHA validations in CDK
- [ ] 12.4 Add CloudWatch alarms for comment spam detection in CDK
- [ ] 12.5 Add CloudWatch alarms for user creation failures in CDK
- [ ] 12.6 Configure SNS notifications for alarms (reuse existing alarm topic)
- [ ]* 12.7 Document monitoring setup in MONITORING.md

_Requirements: 23.6, 25.2, 25.3_

---

## Summary

**Total Estimated Effort:** 80 hours (~10 days)

**Implementation Status:**
- Phase 1 (Core CMS): ✅ Complete
- Phase 2 (User Management & Site Configuration): 🔄 Not Started

**Critical Path:**
1. Task 1 (SES Setup) - Required for user management emails
2. Task 2 (User Management Backend) - Required for frontend
3. Task 3 (User Management Frontend) - Core feature
4. Task 5 (Comments Backend) - Required for frontend
5. Task 6 (Comments Frontend) - Core feature
6. Task 8 (WAF/CAPTCHA) - Required for comment protection
7. Task 11 (Testing & Documentation) - Required before deployment

**Parallel Work Opportunities:**
- Task 4 (Settings) can be done in parallel with Task 1-3
- Task 9 (Registration) can be done after Task 1-2
- Task 7 (Moderation) can be done after Task 5
- Task 10 (Middleware) can be done after Task 4-5
- Task 12 (Monitoring) can be done in parallel with testing
