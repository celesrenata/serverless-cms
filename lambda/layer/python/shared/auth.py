"""
Authentication utilities for Lambda functions.
Provides JWT token verification and role-based access control.
"""

import json
import os
import time
from functools import wraps
from typing import Tuple, List, Optional, Dict, Any, Callable
import boto3
from jose import jwk, jwt
from jose.utils import base64url_decode
import requests

# Environment variables
COGNITO_REGION = os.environ.get('COGNITO_REGION', 'us-west-2')
USER_POOL_ID = os.environ.get('USER_POOL_ID', '')
USER_POOL_CLIENT_ID = os.environ.get('USER_POOL_CLIENT_ID', '')
USERS_TABLE = os.environ.get('USERS_TABLE', '')

# AWS clients
dynamodb = boto3.resource('dynamodb')

# Cache for Cognito public keys and user roles
_jwks_cache: Optional[Dict[str, Any]] = None
_jwks_cache_time: float = 0
_role_cache: Dict[str, Tuple[str, float]] = {}

# Cache TTL in seconds
JWKS_CACHE_TTL = 3600  # 1 hour
ROLE_CACHE_TTL = 300   # 5 minutes


def get_cognito_jwks() -> Dict[str, Any]:
    """
    Fetch Cognito public keys for JWT verification.
    Results are cached for 1 hour.
    """
    global _jwks_cache, _jwks_cache_time
    
    current_time = time.time()
    
    # Return cached keys if still valid
    if _jwks_cache and (current_time - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache
    
    # Fetch new keys
    keys_url = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'
    response = requests.get(keys_url)
    response.raise_for_status()
    
    _jwks_cache = response.json()
    _jwks_cache_time = current_time
    
    return _jwks_cache


def verify_token(token: str) -> Tuple[str, str]:
    """
    Verify Cognito JWT token and extract user information.
    
    Args:
        token: JWT token string
        
    Returns:
        Tuple of (user_id, role)
        
    Raises:
        Exception: If token is invalid or expired
    """
    # Get the kid from the token header
    headers = jwt.get_unverified_headers(token)
    kid = headers['kid']
    
    # Get public keys
    jwks = get_cognito_jwks()
    
    # Find the correct key
    key = None
    for jwk_key in jwks['keys']:
        if jwk_key['kid'] == kid:
            key = jwk_key
            break
    
    if not key:
        raise Exception('Public key not found in jwks.json')
    
    # Construct the public key
    public_key = jwk.construct(key)
    
    # Get the message and signature from token
    message, encoded_signature = token.rsplit('.', 1)
    decoded_signature = base64url_decode(encoded_signature.encode('utf-8'))
    
    # Verify signature
    if not public_key.verify(message.encode('utf-8'), decoded_signature):
        raise Exception('Signature verification failed')
    
    # Decode and verify claims
    claims = jwt.get_unverified_claims(token)
    
    # Verify token expiration
    if time.time() > claims['exp']:
        raise Exception('Token is expired')
    
    # Verify token audience (client_id)
    if claims.get('client_id') != USER_POOL_CLIENT_ID and claims.get('aud') != USER_POOL_CLIENT_ID:
        raise Exception('Token was not issued for this audience')
    
    # Verify issuer
    expected_issuer = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}'
    if claims['iss'] != expected_issuer:
        raise Exception('Token issuer is invalid')
    
    # Extract user_id from sub claim
    user_id = claims['sub']
    
    # Get user role from DynamoDB (with caching)
    role = get_user_role(user_id)
    
    return user_id, role


def get_user_role(user_id: str) -> str:
    """
    Get user role from DynamoDB with caching.
    
    Args:
        user_id: Cognito user ID (sub)
        
    Returns:
        User role string (admin, editor, author, viewer)
    """
    global _role_cache
    
    current_time = time.time()
    
    # Check cache
    if user_id in _role_cache:
        cached_role, cache_time = _role_cache[user_id]
        if (current_time - cache_time) < ROLE_CACHE_TTL:
            return cached_role
    
    # Fetch from DynamoDB
    table = dynamodb.Table(USERS_TABLE)
    
    try:
        response = table.get_item(Key={'id': user_id})
        item = response.get('Item')
        
        if not item:
            # Default role for new users
            role = 'viewer'
        else:
            role = item.get('role', 'viewer')
        
        # Cache the role
        _role_cache[user_id] = (role, current_time)
        
        return role
    
    except Exception as e:
        print(f"Error fetching user role: {e}")
        # Return default role on error
        return 'viewer'


def check_permission(user_role: str, required_roles: List[str]) -> bool:
    """
    Check if user role has permission.
    
    Args:
        user_role: User's current role
        required_roles: List of roles that have permission
        
    Returns:
        True if user has permission, False otherwise
    """
    # Define role hierarchy
    role_hierarchy = {
        'admin': 4,
        'editor': 3,
        'author': 2,
        'viewer': 1,
    }
    
    user_level = role_hierarchy.get(user_role, 0)
    
    # Check if user role is in required roles or has higher privilege
    for required_role in required_roles:
        required_level = role_hierarchy.get(required_role, 0)
        if user_level >= required_level:
            return True
    
    return False


def require_auth(roles: Optional[List[str]] = None) -> Callable:
    """
    Decorator to require authentication and optionally specific roles.
    
    Args:
        roles: Optional list of roles that have permission
        
    Usage:
        @require_auth()
        def handler(event, context, user_id, role):
            # Function code
            
        @require_auth(roles=['admin', 'editor'])
        def handler(event, context, user_id, role):
            # Function code
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
            # Extract authorization header
            headers = event.get('headers', {})
            
            # Handle case-insensitive headers
            auth_header = None
            for key, value in headers.items():
                if key.lower() == 'authorization':
                    auth_header = value
                    break
            
            if not auth_header:
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({'error': 'Unauthorized', 'message': 'Missing authorization header'})
                }
            
            # Extract token
            if not auth_header.startswith('Bearer '):
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({'error': 'Unauthorized', 'message': 'Invalid authorization header format'})
                }
            
            token = auth_header.replace('Bearer ', '')
            
            # Verify token
            try:
                user_id, role = verify_token(token)
            except Exception as e:
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({'error': 'Unauthorized', 'message': f'Invalid token: {str(e)}'})
                }
            
            # Check role permissions if specified
            if roles and not check_permission(role, roles):
                return {
                    'statusCode': 403,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Forbidden', 
                        'message': f'Insufficient permissions. Required roles: {", ".join(roles)}'
                    })
                }
            
            # Call the original function with user context
            return func(event, context, user_id, role)
        
        return wrapper
    return decorator


def extract_user_from_event(event: Dict[str, Any]) -> Optional[Tuple[str, str]]:
    """
    Extract user information from event without enforcing authentication.
    Useful for endpoints that have optional authentication.
    
    Args:
        event: Lambda event object
        
    Returns:
        Tuple of (user_id, role) if authenticated, None otherwise
    """
    headers = event.get('headers', {})
    
    # Handle case-insensitive headers
    auth_header = None
    for key, value in headers.items():
        if key.lower() == 'authorization':
            auth_header = value
            break
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.replace('Bearer ', '')
    
    try:
        user_id, role = verify_token(token)
        return user_id, role
    except Exception:
        return None
