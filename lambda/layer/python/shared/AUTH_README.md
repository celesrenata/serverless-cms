# Authentication Utilities

This module provides JWT token verification and role-based access control for Lambda functions using AWS Cognito.

## Features

- **JWT Token Verification**: Validates Cognito JWT tokens with signature verification
- **Role-Based Access Control**: Enforces permissions based on user roles
- **Caching**: Caches Cognito public keys and user roles for performance
- **Decorator Pattern**: Simple `@require_auth()` decorator for Lambda handlers
- **Optional Authentication**: Support for endpoints with optional authentication

## Environment Variables

The following environment variables must be set for Lambda functions:

```bash
COGNITO_REGION=us-east-1
USER_POOL_ID=us-east-1_XXXXXXXXX
USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
USERS_TABLE=cms-users-dev
```

## Role Hierarchy

The system supports four roles with hierarchical permissions:

1. **admin** (highest) - Full system access
2. **editor** - Content management and media
3. **author** - Create and edit own content
4. **viewer** (lowest) - Read-only access

When checking permissions, higher roles automatically have access to lower role endpoints.

## Usage Examples

### 1. Protected Endpoint (Any Authenticated User)

```python
from shared.auth import require_auth

@require_auth()
def handler(event, context, user_id, role):
    """Any authenticated user can access this."""
    return {
        'statusCode': 200,
        'body': json.dumps({'user_id': user_id, 'role': role})
    }
```

### 2. Role-Specific Endpoint

```python
from shared.auth import require_auth

@require_auth(roles=['admin', 'editor'])
def handler(event, context, user_id, role):
    """Only admin and editor roles can access this."""
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Content updated'})
    }
```

### 3. Optional Authentication

```python
from shared.auth import extract_user_from_event

def handler(event, context):
    """Public endpoint with optional authentication."""
    user_info = extract_user_from_event(event)
    
    if user_info:
        user_id, role = user_info
        # Show additional content for authenticated users
        return {'statusCode': 200, 'body': 'Authenticated content'}
    else:
        # Show public content only
        return {'statusCode': 200, 'body': 'Public content'}
```

## API Reference

### `verify_token(token: str) -> Tuple[str, str]`

Verifies a Cognito JWT token and returns user information.

**Parameters:**
- `token`: JWT token string

**Returns:**
- Tuple of `(user_id, role)`

**Raises:**
- `Exception`: If token is invalid, expired, or verification fails

### `get_user_role(user_id: str) -> str`

Fetches user role from DynamoDB with caching.

**Parameters:**
- `user_id`: Cognito user ID (sub claim)

**Returns:**
- User role string (admin, editor, author, viewer)

### `check_permission(user_role: str, required_roles: List[str]) -> bool`

Checks if a user role has permission based on role hierarchy.

**Parameters:**
- `user_role`: User's current role
- `required_roles`: List of roles that have permission

**Returns:**
- `True` if user has permission, `False` otherwise

### `require_auth(roles: Optional[List[str]] = None)`

Decorator that enforces authentication and optional role-based access control.

**Parameters:**
- `roles`: Optional list of roles that have permission

**Decorated Function Signature:**
```python
def handler(event, context, user_id, role):
    # user_id and role are automatically injected
    pass
```

### `extract_user_from_event(event: Dict[str, Any]) -> Optional[Tuple[str, str]]`

Extracts user information from event without enforcing authentication.

**Parameters:**
- `event`: Lambda event object

**Returns:**
- Tuple of `(user_id, role)` if authenticated, `None` otherwise

## Caching

The module implements two levels of caching for performance:

1. **JWKS Cache**: Cognito public keys are cached for 1 hour
2. **Role Cache**: User roles are cached for 5 minutes

This reduces DynamoDB queries and external API calls significantly.

## Error Responses

The decorator returns standard error responses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Missing authorization header"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions. Required roles: admin, editor"
}
```

## Security Considerations

1. **Token Verification**: All tokens are verified against Cognito public keys
2. **Signature Validation**: JWT signatures are cryptographically verified
3. **Expiration Checks**: Expired tokens are rejected
4. **Audience Validation**: Tokens must be issued for the correct client
5. **Issuer Validation**: Tokens must be issued by the correct Cognito pool

## Testing

When testing locally, ensure you have valid Cognito tokens. You can obtain tokens by:

1. Using AWS Amplify Auth in your frontend
2. Using the AWS Cognito API directly
3. Using the AWS CLI to authenticate

Example request with authentication:

```bash
curl -H "Authorization: Bearer eyJraWQ..." \
     https://api.example.com/api/v1/content
```
