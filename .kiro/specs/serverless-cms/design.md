# Design Document - Phase 2: User Management & Site Configuration

## Architecture Overview

Phase 2 adds user management, comment system, and site configuration features while maintaining the serverless architecture. Key additions include AWS SES for email, AWS WAF for CAPTCHA, and new Lambda functions for user/comment operations.

## Component Design

### 1. User Management System

**Backend Components:**
- Lambda functions for CRUD operations on Cognito users
- DynamoDB users table (already exists) for role and metadata storage
- SES integration for email notifications
- Cognito Admin API for user management operations

**Frontend Components:**
- Users list page with search and filter
- User creation modal with role selection
- User edit modal for updating details
- Password reset confirmation dialog
- Bulk actions for user management

**Data Flow:**
1. Admin requests user list → Lambda queries Cognito + DynamoDB → Returns merged data
2. Admin creates user → Lambda creates Cognito user → Stores metadata in DynamoDB → Sends welcome email via SES
3. Admin resets password → Lambda triggers Cognito password reset → Sends reset email via SES

### 2. Comment System

**Backend Components:**
- New DynamoDB comments table with GSIs for querying
- Lambda functions for comment CRUD and moderation
- WAF integration for CAPTCHA verification
- Rate limiting using DynamoDB or WAF rules

**Frontend Components:**
- Comment form on public website (conditional rendering)
- Comment list with threading support
- Comment moderation interface in admin panel
- CAPTCHA widget integration

**Data Flow:**
1. Visitor submits comment → WAF validates CAPTCHA (if enabled) → Lambda stores in DynamoDB with "pending" status
2. Admin views pending comments → Lambda queries comments by status → Returns list
3. Admin approves comment → Lambda updates status to "approved" → Comment appears on public site

### 3. Site Configuration

**Backend Components:**
- Settings table (already exists) with new configuration keys
- Lambda functions to get/update settings
- Middleware to check settings before processing requests

**Frontend Components:**
- Settings page with toggle switches
- Real-time preview of setting changes
- Save confirmation and validation

**Data Flow:**
1. Admin toggles setting → Lambda updates DynamoDB settings table → Returns success
2. Public site loads → Lambda checks settings → Conditionally renders features
3. API receives request → Middleware checks settings → Allows/denies based on configuration

### 4. Email System (AWS SES)

**Backend Components:**
- SES configuration with verified domain
- Email templates stored in Lambda or S3
- Shared email utility module in lambda/shared/email.py
- SNS topics for bounce/complaint handling

**Email Templates:**
- Welcome email (new user creation)
- Password reset email (with secure link)
- Email verification (for registration)
- Comment notification (optional future feature)

**Configuration Steps:**
1. Verify celestium.life domain in SES
2. Add DNS records (SPF, DKIM, DMARC)
3. Create email templates
4. Configure bounce/complaint handling
5. Request production access

### 5. CAPTCHA System (AWS WAF)

**Backend Components:**
- WAF Web ACL attached to API Gateway
- CAPTCHA challenge rule for comment endpoint
- Token validation in Lambda

**Frontend Components:**
- AWS WAF CAPTCHA widget
- CAPTCHA loading state
- Error handling for failed verification

**Integration Flow:**
1. User loads comment form → Frontend includes WAF CAPTCHA widget
2. User completes CAPTCHA → WAF issues token
3. User submits comment with token → WAF validates token → Lambda processes if valid

## Database Schema

### Comments Table

```typescript
interface Comment {
  id: string;                    // UUID
  content_id: string;            // UUID of content item
  parent_id?: string;            // UUID of parent comment (for replies)
  author_name: string;
  author_email: string;
  author_ip: string;
  comment_text: string;
  status: 'pending' | 'approved' | 'spam' | 'rejected';
  created_at: number;            // Unix timestamp
  updated_at: number;
  moderated_by?: string;         // User ID
  moderated_at?: number;
}
```

**Indexes:**
- Primary: `id` (partition key), `content_id#timestamp` (sort key)
- GSI: `content_id-created_at-index` for listing comments by content
- GSI: `status-created_at-index` for moderation queue

### Settings Updates

```typescript
interface SiteSettings {
  // Existing settings
  site_title: string;
  site_description: string;
  theme: string;
  
  // New settings
  user_registration_enabled: boolean;
  comments_enabled: boolean;
  captcha_enabled: boolean;
  ses_verified: boolean;
  ses_sandbox_mode: boolean;
}
```

## API Design

### User Management Endpoints

```
GET /api/v1/users
  Query params: ?limit=20&last_key={key}&role={role}&search={query}
  Response: { users: User[], last_key?: string }
  Auth: Admin only

POST /api/v1/users
  Body: { email, name, role, send_welcome_email }
  Response: { user: User, temporary_password?: string }
  Auth: Admin only

PUT /api/v1/users/{id}
  Body: { name?, email?, role? }
  Response: { user: User }
  Auth: Admin only

DELETE /api/v1/users/{id}
  Response: { success: boolean }
  Auth: Admin only

POST /api/v1/users/{id}/reset-password
  Body: { send_email: boolean }
  Response: { success: boolean, temporary_password?: string }
  Auth: Admin only
```

### Comment Endpoints

```
GET /api/v1/content/{id}/comments
  Query params: ?status=approved
  Response: { comments: Comment[], count: number }
  Auth: Public (only approved), Editor+ (all statuses)

POST /api/v1/content/{id}/comments
  Body: { author_name, author_email, comment_text, parent_id?, captcha_token? }
  Response: { comment: Comment }
  Auth: Public (if comments enabled)

GET /api/v1/comments
  Query params: ?status=pending&limit=20&last_key={key}
  Response: { comments: Comment[], last_key?: string }
  Auth: Editor+ only

PUT /api/v1/comments/{id}
  Body: { status: 'approved' | 'spam' | 'rejected' }
  Response: { comment: Comment }
  Auth: Editor+ only

DELETE /api/v1/comments/{id}
  Response: { success: boolean }
  Auth: Editor+ only
```

### Registration Endpoints

```
POST /api/v1/auth/register
  Body: { email, password, name }
  Response: { user_id: string, verification_required: boolean }
  Auth: Public (if registration enabled)

POST /api/v1/auth/verify-email
  Body: { email, code }
  Response: { success: boolean }
  Auth: Public
```

## Security Considerations

### User Management
- Only admins can create/edit/delete users
- Prevent self-deletion
- Validate email format and password strength
- Log all user management actions

### Comments
- Sanitize comment text to prevent XSS
- Rate limit by IP address (5 per hour without CAPTCHA)
- Store IP addresses for abuse tracking
- Validate email format
- Require moderation for first-time commenters

### Email
- Use SES with verified domain to prevent spoofing
- Include unsubscribe links where required
- Handle bounces and complaints
- Don't expose email addresses in public APIs

### CAPTCHA
- Validate tokens server-side
- Use WAF managed rules for bot protection
- Implement fallback if WAF is unavailable
- Rate limit even with CAPTCHA enabled

## Implementation Plan

### Phase 2.1: User Management (Week 1)
1. Create Lambda functions for user CRUD
2. Build admin panel Users page
3. Implement user creation with email
4. Add password reset functionality
5. Test user management workflows

### Phase 2.2: Email Integration (Week 1)
1. Verify domain in SES
2. Configure DNS records
3. Create email templates
4. Implement email utility module
5. Test email sending
6. Request production access

### Phase 2.3: Site Configuration (Week 2)
1. Add settings toggles to Settings page
2. Implement settings middleware
3. Update public site to respect settings
4. Test feature toggling
5. Document configuration options

### Phase 2.4: Comment System (Week 2-3)
1. Create comments DynamoDB table
2. Implement comment Lambda functions
3. Build comment form component
4. Build comment list component
5. Build moderation interface
6. Test comment workflows

### Phase 2.5: CAPTCHA Integration (Week 3)
1. Configure AWS WAF Web ACL
2. Create CAPTCHA challenge rule
3. Integrate WAF widget in frontend
4. Implement token validation
5. Test CAPTCHA flow
6. Add rate limiting fallback

### Phase 2.6: User Registration (Week 3)
1. Create registration Lambda
2. Build registration form
3. Implement email verification
4. Add registration toggle to settings
5. Test registration flow
6. Document registration process

## Testing Strategy

### Unit Tests
- Lambda function logic
- Email template rendering
- Comment validation
- User creation/update logic

### Integration Tests
- User CRUD operations with Cognito
- Comment submission and moderation
- Email sending via SES
- Settings updates and retrieval

### E2E Tests
- Complete user management workflow
- Comment submission with CAPTCHA
- Registration and email verification
- Settings toggle affecting public site

## Monitoring & Logging

### CloudWatch Metrics
- User creation/deletion count
- Comment submission rate
- Email send success/failure rate
- CAPTCHA challenge pass/fail rate
- Registration attempts

### CloudWatch Alarms
- High email bounce rate
- Failed CAPTCHA validations spike
- Comment spam detection
- User creation failures

### Logs
- All user management actions
- Comment moderation decisions
- Email sending attempts
- CAPTCHA validation results
- Registration attempts

## Cost Considerations

### AWS SES
- $0.10 per 1,000 emails sent
- Estimate: 100 emails/day = $0.30/month

### AWS WAF
- $5/month for Web ACL
- $1/month per rule
- $0.60 per million requests
- Estimate: $10-15/month

### Additional Lambda Invocations
- User management: ~100/month
- Comments: ~1,000/month
- Estimate: Negligible (within free tier)

### DynamoDB
- Comments table: ~1GB storage
- Read/write capacity: On-demand
- Estimate: $1-2/month

**Total Estimated Additional Cost: $15-20/month**
