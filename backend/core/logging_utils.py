"""
Logging utilities for the application.

This module provides centralized logging functionality including:
- Application logging with consistent formatting
- Audit logging for critical operations
- View action decorators for automatic logging
"""

import logging
import json
from functools import wraps
from typing import Optional, Any, Dict
from datetime import datetime


# =============================================================================
# Logger Setup
# =============================================================================

# Application logger for general logging
logger = logging.getLogger('app')

# Audit logger for tracking critical operations
audit_logger = logging.getLogger('audit')


# =============================================================================
# AppLogger Class
# =============================================================================

class AppLogger:
    """
    Centralized logging utility with structured logging support.

    Usage:
        from core.logging_utils import app_logger

        app_logger.info("User logged in", user_id=123)
        app_logger.error("Failed to process request", error=str(e), request_id=456)
        app_logger.audit("APPROVAL", user, "PurchaseRequest", request.id)
    """

    def __init__(self, name: str = 'app'):
        self.logger = logging.getLogger(name)
        self.audit_logger = logging.getLogger('audit')

    def _format_extra(self, **kwargs) -> Dict[str, Any]:
        """Format extra context for logging"""
        return {k: v for k, v in kwargs.items() if v is not None}

    def debug(self, message: str, **extra) -> None:
        """Log debug message"""
        self.logger.debug(message, extra=self._format_extra(**extra))

    def info(self, message: str, **extra) -> None:
        """Log info message"""
        self.logger.info(message, extra=self._format_extra(**extra))

    def warning(self, message: str, **extra) -> None:
        """Log warning message"""
        self.logger.warning(message, extra=self._format_extra(**extra))

    def error(self, message: str, exc_info: bool = False, **extra) -> None:
        """
        Log error message.

        Args:
            message: Error message
            exc_info: Include exception traceback (default: False)
            **extra: Additional context
        """
        self.logger.error(message, exc_info=exc_info, extra=self._format_extra(**extra))

    def critical(self, message: str, exc_info: bool = True, **extra) -> None:
        """Log critical error message"""
        self.logger.critical(message, exc_info=exc_info, extra=self._format_extra(**extra))

    def exception(self, message: str, **extra) -> None:
        """Log exception with full traceback"""
        self.logger.exception(message, extra=self._format_extra(**extra))

    def audit(
        self,
        action: str,
        user: Any,
        resource_type: str,
        resource_id: Any,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None
    ) -> None:
        """
        Log an audit trail entry for critical operations.

        Args:
            action: Action performed (e.g., "APPROVE", "REJECT", "CREATE")
            user: User who performed the action
            resource_type: Type of resource (e.g., "PurchaseRequest", "Receipt")
            resource_id: ID of the resource
            details: Additional action details
            ip_address: Client IP address
        """
        audit_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'action': action,
            'user_id': getattr(user, 'id', None) if user else None,
            'user_email': getattr(user, 'email', None) if user else None,
            'resource_type': resource_type,
            'resource_id': str(resource_id) if resource_id else None,
            'details': details or {},
        }
        if ip_address:
            audit_entry['ip_address'] = ip_address

        self.audit_logger.info(json.dumps(audit_entry))


# Singleton instance
app_logger = AppLogger()


# =============================================================================
# Helper Functions
# =============================================================================

def audit_log(
    action: str,
    user: Any,
    resource_type: str,
    resource_id: Any,
    details: Optional[Dict] = None,
    request: Any = None
) -> None:
    """
    Convenience function for audit logging.

    Args:
        action: Action performed
        user: User who performed the action
        resource_type: Type of resource
        resource_id: ID of the resource
        details: Additional details
        request: HTTP request object (to extract IP)
    """
    ip_address = None
    if request:
        ip_address = get_client_ip(request)

    app_logger.audit(
        action=action,
        user=user,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address
    )


def get_client_ip(request) -> Optional[str]:
    """
    Extract client IP address from request.

    Args:
        request: HTTP request object

    Returns:
        Client IP address or None
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


# =============================================================================
# Decorators
# =============================================================================

def log_view_action(action_name: str, log_request_body: bool = False):
    """
    Decorator to automatically log view actions.

    Usage:
        @log_view_action("Create Purchase Request")
        def create(self, request, *args, **kwargs):
            ...

    Args:
        action_name: Name of the action for logging
        log_request_body: Whether to log request body (default: False for security)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            user_id = getattr(request.user, 'id', None) if hasattr(request, 'user') else None
            user_email = getattr(request.user, 'email', None) if hasattr(request, 'user') else None

            # Log action start
            log_data = {
                'user_id': user_id,
                'user_email': user_email,
                'path': request.path,
                'method': request.method,
            }

            if log_request_body and request.method in ['POST', 'PUT', 'PATCH']:
                # Sanitize sensitive data
                body = dict(request.data) if hasattr(request, 'data') else {}
                for sensitive_key in ['password', 'password2', 'old_password', 'new_password', 'token']:
                    if sensitive_key in body:
                        body[sensitive_key] = '[REDACTED]'
                log_data['body'] = body

            app_logger.info(f"{action_name} - Started", **log_data)

            try:
                response = func(self, request, *args, **kwargs)

                # Log action completion
                app_logger.info(
                    f"{action_name} - Completed",
                    user_id=user_id,
                    status_code=response.status_code
                )

                return response

            except Exception as e:
                # Log action failure
                app_logger.error(
                    f"{action_name} - Failed: {str(e)}",
                    exc_info=True,
                    user_id=user_id,
                    error_type=type(e).__name__
                )
                raise

        return wrapper
    return decorator


def log_service_call(service_name: str):
    """
    Decorator to log external service calls.

    Usage:
        @log_service_call("OpenAI API")
        def call_openai(self, prompt):
            ...

    Args:
        service_name: Name of the external service
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            app_logger.info(f"Calling {service_name}")

            try:
                result = func(*args, **kwargs)
                app_logger.info(f"{service_name} call successful")
                return result
            except Exception as e:
                app_logger.error(
                    f"{service_name} call failed: {str(e)}",
                    exc_info=True,
                    service=service_name
                )
                raise

        return wrapper
    return decorator


# =============================================================================
# Context Manager
# =============================================================================

class LogContext:
    """
    Context manager for logging operations with timing.

    Usage:
        with LogContext("Process receipt", receipt_id=123):
            # ... processing code ...
    """

    def __init__(self, operation: str, **context):
        self.operation = operation
        self.context = context
        self.start_time = None

    def __enter__(self):
        self.start_time = datetime.utcnow()
        app_logger.info(f"{self.operation} - Started", **self.context)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.utcnow() - self.start_time).total_seconds()

        if exc_type is None:
            app_logger.info(
                f"{self.operation} - Completed",
                duration_seconds=duration,
                **self.context
            )
        else:
            app_logger.error(
                f"{self.operation} - Failed: {str(exc_val)}",
                duration_seconds=duration,
                error_type=exc_type.__name__,
                **self.context
            )

        # Don't suppress the exception
        return False
