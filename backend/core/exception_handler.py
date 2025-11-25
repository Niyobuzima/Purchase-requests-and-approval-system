"""
Custom exception handler for Django REST Framework.

This module provides a custom exception handler that:
- Converts all exceptions to a consistent response format
- Logs all exceptions appropriately
- Handles our custom exceptions
- Provides meaningful error messages
"""

from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import (
    APIException,
    ValidationError as DRFValidationError,
    NotFound,
    PermissionDenied,
    AuthenticationFailed,
    NotAuthenticated,
)
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from django.db import IntegrityError

from .logging_utils import app_logger
from .exceptions import AppException
from .constants import ErrorCode


def custom_exception_handler(exc, context):
    """
    Custom exception handler that formats all errors consistently.

    This handler:
    1. Logs all exceptions
    2. Converts exceptions to our standard format
    3. Handles both DRF and Django exceptions
    4. Handles our custom AppException hierarchy

    Args:
        exc: The exception that was raised
        context: Additional context including the view and request

    Returns:
        Response with standardized error format
    """
    # Get request and view info for logging
    request = context.get('request')
    view = context.get('view')
    view_name = view.__class__.__name__ if view else 'Unknown'

    # Log the exception
    _log_exception(exc, request, view_name)

    # Handle our custom exceptions first
    if isinstance(exc, AppException):
        return _handle_app_exception(exc)

    # Handle Django's Http404
    if isinstance(exc, Http404):
        return _handle_http404(exc)

    # Handle Django's ValidationError
    if isinstance(exc, DjangoValidationError):
        return _handle_django_validation_error(exc)

    # Handle IntegrityError (database constraints)
    if isinstance(exc, IntegrityError):
        return _handle_integrity_error(exc)

    # Let DRF handle its own exceptions, then format the response
    response = drf_exception_handler(exc, context)

    if response is not None:
        return _format_drf_response(exc, response)

    # For any unhandled exception, return a generic 500 error
    # The exception will have been logged above
    return _handle_unhandled_exception(exc)


def _log_exception(exc, request, view_name):
    """Log the exception with appropriate level and context"""
    user_id = getattr(request.user, 'id', None) if request and hasattr(request, 'user') else None
    path = request.path if request else 'Unknown'

    # Determine log level based on exception type
    if isinstance(exc, (NotFound, Http404, PermissionDenied, NotAuthenticated)):
        # These are expected errors, log as warning
        app_logger.warning(
            f"Expected error in {view_name}: {type(exc).__name__}",
            user_id=user_id,
            path=path,
            error=str(exc)
        )
    elif isinstance(exc, (DRFValidationError, DjangoValidationError, AppException)):
        # Validation errors, log as info (client errors)
        app_logger.info(
            f"Validation error in {view_name}: {type(exc).__name__}",
            user_id=user_id,
            path=path,
            error=str(exc)
        )
    else:
        # Unexpected errors, log as error with traceback
        app_logger.error(
            f"Unhandled exception in {view_name}: {type(exc).__name__}",
            exc_info=True,
            user_id=user_id,
            path=path,
            error_type=type(exc).__name__
        )


def _handle_app_exception(exc):
    """Handle our custom AppException and its subclasses"""
    from rest_framework.response import Response

    response_data = exc.to_dict()
    return Response(response_data, status=exc.status_code)


def _handle_http404(exc):
    """Handle Django's Http404 exception"""
    from rest_framework.response import Response

    message = str(exc) if str(exc) != 'Http404' else "Resource not found"

    return Response({
        'success': False,
        'message': message,
        'code': ErrorCode.NOT_FOUND,
    }, status=status.HTTP_404_NOT_FOUND)


def _handle_django_validation_error(exc):
    """Handle Django's ValidationError"""
    from rest_framework.response import Response

    if hasattr(exc, 'message_dict'):
        errors = exc.message_dict
    elif hasattr(exc, 'messages'):
        errors = {'non_field_errors': list(exc.messages)}
    else:
        errors = {'non_field_errors': [str(exc)]}

    return Response({
        'success': False,
        'message': "Validation failed",
        'code': ErrorCode.VALIDATION_ERROR,
        'errors': errors,
    }, status=status.HTTP_400_BAD_REQUEST)


def _handle_integrity_error(exc):
    """Handle database IntegrityError"""
    from rest_framework.response import Response

    error_str = str(exc).lower()

    # Try to provide a meaningful message
    if 'unique constraint' in error_str or 'duplicate key' in error_str:
        message = "A record with this value already exists"
        code = ErrorCode.ALREADY_EXISTS
    elif 'foreign key' in error_str:
        message = "Referenced record does not exist"
        code = ErrorCode.VALIDATION_ERROR
    else:
        message = "Database constraint violation"
        code = ErrorCode.DATABASE_ERROR

    return Response({
        'success': False,
        'message': message,
        'code': code,
    }, status=status.HTTP_400_BAD_REQUEST)


def _format_drf_response(exc, response):
    """Format DRF exception response to our standard format"""
    from rest_framework.response import Response

    # Extract error details from the response
    error_data = response.data

    # Determine the error message
    message = _get_error_message(exc, error_data)

    # Determine the error code
    code = _get_error_code(exc)

    # Build the standardized response
    formatted_data = {
        'success': False,
        'message': message,
        'code': code,
    }

    # Include field errors for validation errors
    if isinstance(exc, DRFValidationError):
        if isinstance(error_data, dict):
            formatted_data['errors'] = error_data
        elif isinstance(error_data, list):
            formatted_data['errors'] = {'non_field_errors': error_data}

    return Response(formatted_data, status=response.status_code)


def _get_error_message(exc, error_data):
    """Extract a user-friendly error message from the exception"""
    # For validation errors, try to get the first field error
    if isinstance(exc, DRFValidationError):
        if isinstance(error_data, dict):
            for field, errors in error_data.items():
                if field == 'non_field_errors':
                    if errors:
                        return str(errors[0]) if isinstance(errors, list) else str(errors)
                elif errors:
                    error_msg = str(errors[0]) if isinstance(errors, list) else str(errors)
                    return f"{field}: {error_msg}"
        elif isinstance(error_data, list) and error_data:
            return str(error_data[0])
        return "Validation failed"

    # For other exceptions, use the detail if available
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, str):
            return exc.detail
        elif isinstance(exc.detail, list) and exc.detail:
            return str(exc.detail[0])
        elif isinstance(exc.detail, dict):
            # Get first error
            for key, value in exc.detail.items():
                if isinstance(value, list) and value:
                    return str(value[0])
                return str(value)

    return str(exc)


def _get_error_code(exc):
    """Get the error code for the exception"""
    code_mapping = {
        DRFValidationError: ErrorCode.VALIDATION_ERROR,
        NotFound: ErrorCode.NOT_FOUND,
        PermissionDenied: ErrorCode.PERMISSION_DENIED,
        AuthenticationFailed: ErrorCode.INVALID_CREDENTIALS,
        NotAuthenticated: ErrorCode.AUTHENTICATION_REQUIRED,
    }

    for exc_class, code in code_mapping.items():
        if isinstance(exc, exc_class):
            return code

    # Use the exception's default_code if available
    if hasattr(exc, 'default_code'):
        return exc.default_code.upper()

    return ErrorCode.SERVER_ERROR


def _handle_unhandled_exception(exc):
    """Handle any unhandled exception"""
    from rest_framework.response import Response

    # In production, don't expose internal error details
    from django.conf import settings

    if settings.DEBUG:
        message = f"Internal server error: {str(exc)}"
    else:
        message = "An unexpected error occurred. Please try again later."

    return Response({
        'success': False,
        'message': message,
        'code': ErrorCode.SERVER_ERROR,
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
