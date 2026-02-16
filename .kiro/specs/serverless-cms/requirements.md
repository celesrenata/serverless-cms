# Requirements Document - Phase 2: User Management & Site Configuration

## Introduction

Phase 2 extends the Serverless CMS with comprehensive user management, site configuration controls, email notifications via AWS SES, and comment system with optional CAPTCHA protection using AWS WAF.

## New Requirements

### Requirement 21: User Management

**User Story:** As an administrator, I want to manage user accounts from the admin panel, so that I can add, edit, reset passwords, and delete users without using AWS Console

#### Acceptance Criteria

1. WHEN an administrator accesses the Users page, THE System SHALL display a list of all users with email, name, role, and last login timestamp
2. WHEN an administrator creates a new user, THE System SHALL create the user in Cognito and send a welcome email with temporary password
3. WHEN an administrator resets a user password, THE System SHALL trigger Cognito password reset and send reset instructions via email
4. WHEN an administrator updates a user's role, THE System SHALL update the role in DynamoDB and the change SHALL take effect on next login
5. WHEN an administrator deletes a user, THE System SHALL remove the user from Cognito and mark associated content as "orphaned author"
6. WHERE a User has admin role, THE System SHALL permit all user management operations
7. WHEN an administrator edits a user, THE System SHALL allow updating name, email, and role fields
8. THE System SHALL prevent administrators from deleting their own account
9. THE System SHALL display user creation date and last login timestamp in the user list

### Requirement 22: Site Configuration Settings

**User Story:** As an administrator, I want to control site-wide features from the settings page, so that I can enable/disable user registration, comments, and CAPTCHA

#### Acceptance Criteria

1. WHEN an administrator accesses the Settings page, THE System SHALL display toggles for user registration, comments, and CAPTCHA
2. WHEN an administrator disables user registration, THE System SHALL hide the registration form on the public website and reject registration API requests
3. WHEN an administrator enables user registration, THE System SHALL display the registration form and accept new user registrations
4. WHEN an administrator disables comments, THE System SHALL hide comment forms and prevent new comment submissions
5. WHEN an administrator enables comments, THE System SHALL display comment forms on published content
6. WHEN an administrator enables CAPTCHA, THE System SHALL require CAPTCHA verification for comment submissions
7. THE System SHALL store all site configuration settings in the DynamoDB settings table
8. WHEN settings are updated, THE System SHALL apply changes immediately without requiring deployment
9. WHERE a User has admin role, THE System SHALL permit modification of site configuration settings

### Requirement 23: Email Notifications via AWS SES

**User Story:** As an administrator, I want the system to send emails for user management actions, so that users receive welcome messages, password resets, and notifications

#### Acceptance Criteria

1. WHEN a new user is created, THE System SHALL send a welcome email from no-reply@celestium.life with login instructions
2. WHEN a password reset is requested, THE System SHALL send a reset email with a secure reset link valid for 24 hours
3. WHEN an administrator resets a user's password, THE System SHALL send an email notification to the user
4. THE System SHALL use AWS SES to send all emails
5. THE System SHALL configure SES to send from no-reply@celestium.life domain
6. WHEN an email fails to send, THE System SHALL log the error and return a warning to the administrator
7. THE System SHALL include unsubscribe links in notification emails where required by email regulations
8. WHEN SES is in sandbox mode, THE System SHALL only send to verified email addresses
9. THE System SHALL format emails with both HTML and plain text versions

### Requirement 24: Comment System

**User Story:** As a website visitor, I want to leave comments on blog posts, so that I can engage with content and participate in discussions

#### Acceptance Criteria

1. WHEN comments are enabled, THE System SHALL display a comment form below published content
2. WHEN a visitor submits a comment, THE System SHALL store the comment in DynamoDB with content ID, author name, email, comment text, and timestamp
3. WHEN a visitor views a content item with comments, THE System SHALL display all approved comments sorted by timestamp
4. WHEN an administrator views comments in the admin panel, THE System SHALL display pending, approved, and spam comments with moderation actions
5. WHERE comments are disabled in settings, THE System SHALL hide comment forms and return error for comment submissions
6. THE System SHALL validate comment submissions for required fields (name, email, comment text)
7. WHEN a comment is submitted, THE System SHALL set initial status to "pending" for moderation
8. WHERE a User has editor role or higher, THE System SHALL permit comment moderation (approve, reject, mark as spam, delete)
9. THE System SHALL support threaded replies to comments (one level deep)

### Requirement 25: CAPTCHA Protection with AWS WAF

**User Story:** As an administrator, I want to require CAPTCHA for comments, so that I can prevent spam and bot submissions

#### Acceptance Criteria

1. WHEN CAPTCHA is enabled in settings, THE System SHALL display AWS WAF CAPTCHA challenge before comment submission
2. WHEN a visitor completes CAPTCHA successfully, THE System SHALL accept the comment submission
3. WHEN a visitor fails CAPTCHA verification, THE System SHALL reject the comment and display an error message
4. THE System SHALL use AWS WAF CAPTCHA (AWS managed CAPTCHA service)
5. WHERE CAPTCHA is disabled in settings, THE System SHALL accept comment submissions without CAPTCHA verification
6. THE System SHALL configure WAF rules to protect the comment submission endpoint
7. WHEN CAPTCHA is enabled, THE System SHALL include the CAPTCHA widget in the comment form
8. THE System SHALL validate CAPTCHA tokens on the backend before storing comments
9. THE System SHALL rate-limit comment submissions to 5 per IP address per hour when CAPTCHA is disabled

### Requirement 26: User Registration Control

**User Story:** As an administrator, I want to control whether visitors can self-register, so that I can manage who has access to the system

#### Acceptance Criteria

1. WHEN user registration is enabled, THE System SHALL display a registration link on the login page
2. WHEN a visitor registers, THE System SHALL create a Cognito user with "viewer" role by default
3. WHEN user registration is disabled, THE System SHALL hide the registration link and reject registration API requests
4. THE System SHALL send email verification to new registrants via Cognito
5. WHEN a user registers, THE System SHALL require email verification before allowing login
6. THE System SHALL validate registration data (email format, password strength, required fields)
7. WHERE user registration is enabled, THE System SHALL allow visitors to create accounts without administrator approval
8. WHEN a user completes registration, THE System SHALL send a welcome email via SES
9. THE System SHALL prevent duplicate registrations with the same email address

### Requirement 27: Email Domain Configuration

**User Story:** As a system administrator, I want to configure AWS SES to send from celestium.life domain, so that emails appear professional and trustworthy

#### Acceptance Criteria

1. THE System SHALL use AWS SES to send emails from no-reply@celestium.life
2. THE System SHALL verify the celestium.life domain in AWS SES
3. THE System SHALL configure SPF, DKIM, and DMARC records for celestium.life domain
4. WHEN SES verification is complete, THE System SHALL move out of sandbox mode to send to any email address
5. THE System SHALL handle SES bounce and complaint notifications
6. THE System SHALL log all email sending attempts with status (sent, failed, bounced)
7. THE System SHALL provide email templates for welcome, password reset, and notification emails
8. WHERE SES is in sandbox mode, THE System SHALL display a warning in the admin panel
9. THE System SHALL support both transactional emails (password reset) and notification emails (welcome)

## Database Schema Updates

### Comments Table

```
Table: cms-comments-{env}
Primary Key: id (String - UUID)
Sort Key: content_id#timestamp (String)

Attributes:
- id: String (UUID)
- content_id: String (UUID of content item)
- parent_id: String (UUID of parent comment for replies, null for top-level)
- author_name: String
- author_email: String
- author_ip: String (for rate limiting)
- comment_text: String
- status: String (pending, approved, spam, rejected)
- created_at: Number (Unix timestamp)
- updated_at: Number (Unix timestamp)
- moderated_by: String (User ID who moderated)
- moderated_at: Number (Unix timestamp)

GSI: content_id-created_at-index
  Partition Key: content_id
  Sort Key: created_at

GSI: status-created_at-index
  Partition Key: status
  Sort Key: created_at
```

### Settings Table Updates

New settings keys:
- `user_registration_enabled`: Boolean
- `comments_enabled`: Boolean
- `captcha_enabled`: Boolean
- `ses_verified`: Boolean
- `ses_sandbox_mode`: Boolean

## API Endpoints

### User Management
- `GET /api/v1/users` - List all users (admin only)
- `POST /api/v1/users` - Create new user (admin only)
- `GET /api/v1/users/{id}` - Get user details (admin only)
- `PUT /api/v1/users/{id}` - Update user (admin only)
- `DELETE /api/v1/users/{id}` - Delete user (admin only)
- `POST /api/v1/users/{id}/reset-password` - Reset user password (admin only)

### Comments
- `GET /api/v1/content/{id}/comments` - List comments for content (public)
- `POST /api/v1/content/{id}/comments` - Submit comment (public, with optional CAPTCHA)
- `PUT /api/v1/comments/{id}` - Update comment status (editor+ only)
- `DELETE /api/v1/comments/{id}` - Delete comment (editor+ only)
- `GET /api/v1/comments` - List all comments for moderation (editor+ only)

### Registration
- `POST /api/v1/auth/register` - Register new user (public, if enabled)
- `POST /api/v1/auth/verify-email` - Verify email address (public)

## Infrastructure Updates

### AWS SES Configuration
1. Verify celestium.life domain in SES
2. Configure DKIM signing
3. Set up SNS topics for bounce/complaint handling
4. Request production access (move out of sandbox)
5. Configure email templates

### AWS WAF Configuration
1. Create WAF Web ACL for API Gateway
2. Configure CAPTCHA challenge rule
3. Set up rate limiting rules
4. Associate WAF with API Gateway stage

### Lambda Functions
- `lambda/users/list.py` - List users
- `lambda/users/create.py` - Create user
- `lambda/users/update.py` - Update user
- `lambda/users/delete.py` - Delete user
- `lambda/users/reset_password.py` - Reset password
- `lambda/comments/list.py` - List comments
- `lambda/comments/create.py` - Create comment
- `lambda/comments/update.py` - Update comment status
- `lambda/comments/delete.py` - Delete comment
- `lambda/auth/register.py` - User registration
- `lambda/auth/verify_email.py` - Email verification
- `lambda/shared/email.py` - SES email utilities

## Frontend Updates

### Admin Panel
- New page: `/users` - User management interface
- Update page: `/settings` - Add registration, comments, CAPTCHA toggles
- New page: `/comments` - Comment moderation interface
- Add user creation modal
- Add user edit modal
- Add password reset confirmation
- Add comment moderation actions

### Public Website
- Add comment form component (conditional on settings)
- Add comment list component
- Add CAPTCHA widget (conditional on settings)
- Add registration form (conditional on settings)
- Add email verification page
