# User Management Lambda Functions

This module contains Lambda functions for user profile management.

## Functions

### get_me.py
**Endpoint:** `GET /api/v1/users/me`

**Authentication:** Required (any authenticated user)

**Description:** Get the current authenticated user's profile information.

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "username": "username",
  "display_name": "Display Name",
  "role": "author",
  "avatar_url": "https://...",
  "bio": "User bio",
  "created_at": 1234567890,
  "last_login": 1234567890
}
```

**Features:**
- Automatically creates user in DynamoDB if not exists (syncs from Cognito)
- Updates last_login timestamp on each request
- Syncs user attributes from Cognito

### update_me.py
**Endpoint:** `PUT /api/v1/users/me`

**Authentication:** Required (any authenticated user)

**Description:** Update the current authenticated user's profile information.

**Request Body:**
```json
{
  "display_name": "New Display Name",
  "bio": "Updated bio",
  "avatar_url": "https://..."
}
```

**Allowed Fields:**
- `display_name`: User's display name
- `bio`: User biography
- `avatar_url`: URL to user's avatar image

**Note:** Users cannot change their own role. Role changes must be done by administrators.

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "username": "username",
  "display_name": "New Display Name",
  "role": "author",
  "avatar_url": "https://...",
  "bio": "Updated bio",
  "created_at": 1234567890,
  "last_login": 1234567890
}
```

**Features:**
- Validates that only allowed fields are updated
- Syncs display_name changes to Cognito
- Returns updated user object

### list.py
**Endpoint:** `GET /api/v1/users`

**Authentication:** Required (admin only)

**Description:** List all users in the system (admin only).

**Query Parameters:**
- `limit` (optional): Number of users to return (1-100, default: 50)
- `last_key` (optional): Pagination token from previous response

**Response:**
```json
{
  "items": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "username": "username",
      "display_name": "Display Name",
      "role": "author",
      "avatar_url": "https://...",
      "bio": "User bio",
      "created_at": 1234567890,
      "last_login": 1234567890
    }
  ],
  "last_key": {"id": "last-user-uuid"}
}
```

**Features:**
- Pagination support for large user lists
- Admin-only access
- Returns all user information

## Environment Variables

All functions require the following environment variables:

- `USER_POOL_ID`: Cognito User Pool ID
- `USER_POOL_CLIENT_ID`: Cognito User Pool Client ID
- `COGNITO_REGION`: AWS region for Cognito
- `USERS_TABLE`: DynamoDB table name for users

## Requirements Mapping

- **Requirement 5.1:** User account management and authentication
- **Requirement 5.2:** User profile updates and role management

## Error Responses

All functions return standardized error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common status codes:
- `400`: Bad request (invalid input)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found (user doesn't exist)
- `500`: Internal server error
