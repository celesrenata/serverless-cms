# Comment Moderation Guide

This guide covers comment moderation workflows in the Serverless CMS admin panel.

## Overview

The comment system allows public users to leave comments on published content. All comments require moderation before appearing on the public website. Users with "editor" or "admin" roles can moderate comments.

## Accessing Comment Moderation

1. Log in to the admin panel at `/admin`
2. Click "Comments" in the navigation menu
3. You'll see a list of all comments with filtering options

## Comment Status Values

Comments can have one of four status values:

- **pending**: Awaiting moderation (default for new comments)
- **approved**: Visible on the public website
- **rejected**: Hidden from public, not spam
- **spam**: Marked as spam, hidden from public

## Comment Moderation Workflow

### Reviewing Pending Comments

1. Navigate to the Comments page
2. Filter by "Pending" status (default view)
3. Review each comment for:
   - Appropriate content
   - Relevance to the post
   - Spam indicators
   - Abusive or offensive language

### Approving Comments

1. Find the comment in the list
2. Click the "Approve" button (checkmark icon)
3. The comment status changes to "approved"
4. The comment immediately appears on the public website

### Rejecting Comments

1. Find the comment in the list
2. Click the "Reject" button (X icon)
3. The comment status changes to "rejected"
4. The comment is hidden from the public website

Use "Reject" for comments that are:
- Off-topic or irrelevant
- Low quality but not spam
- Inappropriate but not abusive

### Marking as Spam

1. Find the comment in the list
2. Click the "Spam" button (flag icon)
3. The comment status changes to "spam"
4. The comment is hidden from the public website

Use "Spam" for comments that are:
- Automated bot submissions
- Commercial spam or advertising
- Malicious links or phishing attempts
- Repeated identical comments

### Deleting Comments

1. Find the comment in the list
2. Click the "Delete" button (trash icon)
3. Confirm the deletion in the dialog
4. The comment is permanently removed

**Note:** Deletion is permanent and cannot be undone. Consider rejecting or marking as spam instead to preserve records.

## Filtering Comments

Use the status filter dropdown to view:
- **All**: All comments regardless of status
- **Pending**: Comments awaiting moderation
- **Approved**: Comments visible on the website
- **Rejected**: Comments hidden but not spam
- **Spam**: Comments marked as spam

## Comment List Columns

The comment list displays:
- **Author**: Commenter's name
- **Content**: First 100 characters of the comment
- **Post**: Title of the content being commented on
- **Status**: Current moderation status
- **Date**: When the comment was submitted
- **Actions**: Approve, Reject, Spam, Delete buttons

## Threaded Comments

Comments can be replies to other comments, creating threaded discussions:
- Parent comments show normally in the list
- Reply comments show with indentation or a "Reply to" indicator
- Moderating a parent comment doesn't affect its replies
- Each reply must be moderated individually

## Spam Protection Features

### Rate Limiting
- Public users are limited to 5 comments per hour per IP address
- Rate limit resets automatically after 1 hour
- Prevents comment flooding and spam attacks

### CAPTCHA Protection
- When enabled in Settings, users must complete a CAPTCHA challenge
- Helps prevent automated bot submissions
- Can be toggled on/off in the Settings page

### Content Sanitization
- All comments are automatically sanitized to prevent XSS attacks
- HTML tags are escaped
- Malicious scripts are neutralized

## Best Practices

### Moderation Frequency
- Check pending comments at least daily
- Set up email notifications for new comments (via CloudWatch alarms)
- Respond to legitimate comments promptly to encourage engagement

### Spam Detection
- Look for common spam indicators:
  - Generic comments ("Great post!", "Nice article!")
  - Links to unrelated websites
  - Poor grammar or nonsensical text
  - Repeated identical comments
  - Commercial product mentions

### Community Guidelines
- Establish clear commenting guidelines for your site
- Be consistent in moderation decisions
- Consider creating a public commenting policy
- Communicate expectations to users

### Handling Difficult Comments
- **Criticism**: Allow constructive criticism, reject abusive attacks
- **Disagreement**: Allow respectful disagreement, reject personal attacks
- **Off-topic**: Reject if completely unrelated, allow if tangentially relevant
- **Self-promotion**: Reject blatant advertising, allow relevant mentions

## Enabling/Disabling Comments

Comments can be enabled or disabled site-wide:

1. Navigate to Settings page
2. Find "Enable Comments" toggle
3. Toggle on/off as needed
4. Changes take effect immediately

When disabled:
- Comment forms are hidden on the public website
- Existing comments remain visible if approved
- Comment submission endpoint returns an error

## Monitoring Comment Activity

### CloudWatch Metrics
- Comment submission rate
- Spam detection rate
- Failed CAPTCHA validations
- Rate limit violations

### CloudWatch Alarms
- High spam detection rate (>50% of submissions)
- Unusual comment volume spikes
- Failed CAPTCHA validation rate

See [MONITORING.md](MONITORING.md) for detailed metrics and alarm configuration.

## Troubleshooting

### Comments Not Appearing After Approval
1. Verify the comment status is "approved"
2. Check that comments are enabled in Settings
3. Clear browser cache and reload the page
4. Check CloudWatch logs for API errors

### Too Many Spam Comments
1. Enable CAPTCHA protection in Settings
2. Review and adjust rate limiting if needed
3. Consider implementing additional spam filters
4. Check for patterns in spam comments (IP addresses, content)

### Users Cannot Submit Comments
1. Verify comments are enabled in Settings
2. Check that CAPTCHA is working if enabled
3. Verify rate limiting isn't blocking legitimate users
4. Check CloudWatch logs for submission errors

### Bulk Moderation Needed
Currently, comments must be moderated individually. For bulk operations:
1. Use the status filter to view specific comment types
2. Process comments in batches
3. Consider using the API for programmatic bulk operations

## API Integration

For programmatic comment moderation, see the API documentation:
- `GET /api/v1/comments` - List all comments (with status filter)
- `PUT /api/v1/comments/{id}` - Update comment status
- `DELETE /api/v1/comments/{id}` - Delete comment
- `GET /api/v1/content/{id}/comments` - List comments for specific content

All moderation endpoints require editor or admin authentication.

## Related Documentation

- [API Documentation](API_DOCUMENTATION.md) - Complete API reference
- [Database Schema](.kiro/steering/database-schema.md) - Comments table structure
- [WAF CAPTCHA Setup](WAF_CAPTCHA_SETUP.md) - CAPTCHA configuration
- [Monitoring Guide](MONITORING.md) - Comment metrics and alarms
- [Settings Guide](USER_MANAGEMENT_GUIDE.md#site-configuration) - Enabling/disabling features
