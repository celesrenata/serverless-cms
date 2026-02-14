"""
HTTP response helpers with CORS support
"""
import json
from typing import Any, Dict, Optional


def cors_headers() -> Dict[str, str]:
    """
    Get CORS headers for API responses
    """
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',  # Should be restricted in production
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }


def success_response(
    status_code: int,
    body: Any,
    headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Create a success response with CORS headers
    
    Args:
        status_code: HTTP status code
        body: Response body (will be JSON encoded)
        headers: Additional headers to include
    
    Returns:
        API Gateway response dict
    """
    response_headers = cors_headers()
    if headers:
        response_headers.update(headers)
    
    return {
        'statusCode': status_code,
        'headers': response_headers,
        'body': json.dumps(body) if not isinstance(body, str) else body
    }


def error_response(
    status_code: int,
    error_message: str,
    headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Create an error response with CORS headers
    
    Args:
        status_code: HTTP status code
        error_message: Error message
        headers: Additional headers to include
    
    Returns:
        API Gateway response dict
    """
    return success_response(
        status_code,
        {'error': error_message},
        headers
    )
