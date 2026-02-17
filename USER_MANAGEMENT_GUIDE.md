# User Management Guide

This guide covers user management operations in the Serverless CMS admin panel.

## Overview

The user management system allows administrators to create, update, and delete user accounts, manage roles and permissions, and reset passwords. All user operations are restricted to users with the "admin" role.

## Accessing User Management

1. Log in to the admin panel at `/admin`
2. Click "Users" in the navigation menu
3. You'll see a list of all users in the system

## User Roles

The system has four role levels with hierarchical permissions:

- **admin**: Full system access, can manage users, settings, and all content
- **editor**: Can manage all content and comments, cannot manage users or settings
- **author**: Can create and manage their own content
- **viewer**: Read-only access (default for new registrations)

## Creating a New User

1. Click the "Create User" button in the Users page
2. Fill in the required fields:
   - **Email**: Must be a valid email address (used for login)
   - **Name**: Display name shown in the system
   - **Role**: Select appropriate role level
   - **Temporary Password**: Initial password (user should change on first login)
3. Click "Create User"

The system will:
- Create the user in AWS Cognito
- Create a user record in DynamoDB
- Send a welcome email with login instructions
- Set the password as temporary (requires change on first login)

## Editing User Details

1. Find the user in the Users list
2. Click the "Edit" button (pencil icon)
3. Update the fields you want to change:
   - Name
   - Role
4. Click "Save Changes"

Note: Email addresses cannot be changed after account creation.

## Resetting User Passwords

1. Find the user in the Users list
2. Click the "Reset Password" button (key icon)
3. Enter a new temporary password
4. Click "Reset Password"

The system will:
- Update the password in Cognito
- Mark the password as temporary (requires change on next login)
- Send an email notification to the user

## Deleting Users

1. Find the user in the Users list
2. Click the "Delete" button (trash icon)
3. Confirm the deletion in the dialog

The system will:
- Delete the user from AWS Cognito
- Remove the user record from DynamoDB
- Mark all content created by the user as orphaned (content remains but author is cleared)

**Important Notes:**
- You cannot delete your own account while logged in
- User deletion is permanent and cannot be undone
- Content created by deleted users is preserved but shows no author

## Searching and Filtering

Use the search box to find users by:
- Name
- Email
- Role

The search is case-insensitive and matches partial strings.

## User List Columns

The user list displays:
- **Name**: User's display name
- **Email**: User's email address
- **Role**: Current role level
- **Created**: When the account was created
- **Last Login**: Most recent login time
- **Actions**: Edit, Reset Password, Delete buttons

## Best Practices

### Role Assignment
- Grant the minimum role level needed for the user's responsibilities
- Regularly review user roles and adjust as needed
- Limit the number of admin users to reduce security risk

### Password Management
- Use strong temporary passwords when creating users
- Encourage users to change their password immediately after first login
- Reset passwords promptly when users report access issues

### Account Cleanup
- Regularly review inactive accounts (check Last Login column)
- Delete accounts that are no longer needed
- Consider downgrading roles for users who no longer need elevated access

### Security Considerations
- Never share admin credentials
- Log out when finished with admin tasks
- Monitor the user list for unauthorized accounts
- Review user activity regularly through CloudWatch logs

## Troubleshooting

### User Cannot Log In
1. Verify the email address is correct
2. Check if the account exists in the Users list
3. Try resetting the password
4. Check CloudWatch logs for authentication errors

### Welcome Email Not Received
1. Verify the email address is correct
2. Check spam/junk folders
3. Verify SES is configured and out of sandbox mode
4. Check CloudWatch logs for email sending errors

### Cannot Delete User
- You cannot delete your own account while logged in
- Log in with a different admin account to delete the user

### Role Changes Not Taking Effect
- User must log out and log back in for role changes to take effect
- Check that the role was saved successfully in the Users list

## Email Notifications

The system sends automatic emails for:
- **Welcome Email**: Sent when a new user is created
- **Password Reset**: Sent when an admin resets a user's password

Email templates are defined in `lambda/shared/email.py` and can be customized as needed.

## API Integration

For programmatic user management, see the API documentation:
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user
- `POST /api/v1/users/{id}/reset-password` - Reset password
- `GET /api/v1/users` - List users

All endpoints require admin authentication.

## Related Documentation

- [API Documentation](API_DOCUMENTATION.md) - Complete API reference
- [Database Schema](.kiro/steering/database-schema.md) - User table structure
- [Deployment Guide](DEPLOYMENT.md) - SES email configuration
- [Monitoring Guide](MONITORING.md) - User management metrics and alarms
