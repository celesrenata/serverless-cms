"""
Structured logging utility for Lambda functions.

Provides consistent, structured logging with request IDs, user context,
and performance metrics.
"""

import json
import logging
import time
from typing import Any, Dict, Optional
from functools import wraps
import os

# Configure logger
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))


class StructuredLogger:
    """Structured logger that outputs JSON-formatted logs."""
    
    def __init__(self, request_id: str = None, user_id: str = None, user_role: str = None):
        """
        Initialize structured logger with context.
        
        Args:
            request_id: AWS request ID from Lambda context
            user_id: Authenticated user ID
            user_role: User role (admin, editor, author, viewer)
        """
        self.request_id = request_id
        self.user_id = user_id
        self.user_role = user_role
        self.environment = os.environ.get('ENVIRONMENT', 'dev')
    
    def _format_log(self, level: str, message: str, **kwargs) -> Dict[str, Any]:
        """Format log entry as structured JSON."""
        log_entry = {
            'timestamp': time.time(),
            'level': level,
            'message': message,
            'environment': self.environment,
        }
        
        # Add context if available
        if self.request_id:
            log_entry['request_id'] = self.request_id
        if self.user_id:
            log_entry['user_id'] = self.user_id
        if self.user_role:
            log_entry['user_role'] = self.user_role
        
        # Add any additional fields
        log_entry.update(kwargs)
        
        return log_entry
    
    def info(self, message: str, **kwargs):
        """Log info level message."""
        log_entry = self._format_log('INFO', message, **kwargs)
        logger.info(json.dumps(log_entry))
    
    def warning(self, message: str, **kwargs):
        """Log warning level message."""
        log_entry = self._format_log('WARNING', message, **kwargs)
        logger.warning(json.dumps(log_entry))
    
    def error(self, message: str, **kwargs):
        """Log error level message."""
        log_entry = self._format_log('ERROR', message, **kwargs)
        logger.error(json.dumps(log_entry))
    
    def debug(self, message: str, **kwargs):
        """Log debug level message."""
        log_entry = self._format_log('DEBUG', message, **kwargs)
        logger.debug(json.dumps(log_entry))
    
    def metric(self, metric_name: str, value: float, unit: str = 'None', **kwargs):
        """
        Log a custom metric.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            unit: Unit of measurement (Count, Milliseconds, Bytes, etc.)
            **kwargs: Additional metric dimensions
        """
        log_entry = self._format_log('METRIC', f'Metric: {metric_name}', 
                                     metric_name=metric_name,
                                     metric_value=value,
                                     metric_unit=unit,
                                     **kwargs)
        logger.info(json.dumps(log_entry))


def log_performance(log: StructuredLogger):
    """
    Decorator to log function performance metrics.
    
    Usage:
        @log_performance(log)
        def my_function():
            pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            function_name = func.__name__
            
            try:
                log.debug(f'Starting {function_name}', function=function_name)
                result = func(*args, **kwargs)
                
                duration_ms = (time.time() - start_time) * 1000
                log.metric(
                    f'{function_name}_duration',
                    duration_ms,
                    'Milliseconds',
                    function=function_name,
                    status='success'
                )
                log.info(f'Completed {function_name}', 
                        function=function_name,
                        duration_ms=duration_ms)
                
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                log.metric(
                    f'{function_name}_duration',
                    duration_ms,
                    'Milliseconds',
                    function=function_name,
                    status='error'
                )
                log.error(f'Failed {function_name}',
                         function=function_name,
                         duration_ms=duration_ms,
                         error=str(e),
                         error_type=type(e).__name__)
                raise
        
        return wrapper
    return decorator


def create_logger(event: Dict[str, Any], context: Any, user_id: str = None, user_role: str = None) -> StructuredLogger:
    """
    Create a structured logger from Lambda event and context.
    
    Args:
        event: Lambda event object
        context: Lambda context object
        user_id: Authenticated user ID (optional)
        user_role: User role (optional)
    
    Returns:
        StructuredLogger instance
    """
    request_id = context.request_id if context else None
    return StructuredLogger(request_id=request_id, user_id=user_id, user_role=user_role)
