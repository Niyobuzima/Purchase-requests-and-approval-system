"""
Custom exception classes for the application.

These exceptions provide a consistent way to handle errors across the application
and map to appropriate HTTP status codes and error responses.
"""

from rest_framework import status
from .constants import ErrorCode


class AppException(Exception):
    """
    Base exception for all application errors.

    Attributes:
        message: Human-readable error message
        code: Machine-readable error code
        status_code: HTTP status code
        details: Additional error details (optional)
    """

    default_message = "An error occurred"
    default_code = ErrorCode.SERVER_ERROR
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(self, message=None, code=None, details=None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self):
        """Convert exception to dictionary for API response"""
        result = {
            'success': False,
            'message': self.message,
            'code': self.code,
        }
        if self.details:
            result['errors'] = self.details
        return result


class ValidationError(AppException):
    """
    Raised when validation fails.

    Use for form validation errors, invalid input, etc.
    """

    default_message = "Validation failed"
    default_code = ErrorCode.VALIDATION_ERROR
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message=None, code=None, errors=None):
        """
        Args:
            message: Error message
            code: Error code
            errors: Dictionary of field errors {field: [error1, error2]}
        """
        super().__init__(message, code, errors)


class NotFoundError(AppException):
    """
    Raised when a requested resource is not found.
    """

    default_message = "Resource not found"
    default_code = ErrorCode.NOT_FOUND
    status_code = status.HTTP_404_NOT_FOUND

    def __init__(self, resource_type=None, resource_id=None, message=None):
        if not message and resource_type:
            if resource_id:
                message = f"{resource_type} with ID {resource_id} not found"
            else:
                message = f"{resource_type} not found"
        super().__init__(message)
        self.resource_type = resource_type
        self.resource_id = resource_id


class PermissionDeniedError(AppException):
    """
    Raised when user lacks permission to perform an action.
    """

    default_message = "You do not have permission to perform this action"
    default_code = ErrorCode.PERMISSION_DENIED
    status_code = status.HTTP_403_FORBIDDEN

    def __init__(self, message=None, required_role=None, action=None):
        if not message and action:
            message = f"You do not have permission to {action}"
        super().__init__(message)
        self.required_role = required_role
        self.action = action


class AuthenticationError(AppException):
    """
    Raised when authentication fails.
    """

    default_message = "Authentication required"
    default_code = ErrorCode.AUTHENTICATION_REQUIRED
    status_code = status.HTTP_401_UNAUTHORIZED


class ConflictError(AppException):
    """
    Raised when there's a conflict with the current state.

    Use for duplicate entries, concurrent modification conflicts, etc.
    """

    default_message = "Operation conflicts with current state"
    default_code = ErrorCode.CONFLICT
    status_code = status.HTTP_409_CONFLICT

    def __init__(self, message=None, conflicting_resource=None):
        super().__init__(message)
        self.conflicting_resource = conflicting_resource


class InvalidStatusError(AppException):
    """
    Raised when an operation is invalid for the current status.
    """

    default_message = "Operation not allowed for current status"
    default_code = ErrorCode.INVALID_STATUS
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, current_status=None, allowed_statuses=None, message=None):
        if not message and current_status:
            message = f"Operation not allowed when status is '{current_status}'"
            if allowed_statuses:
                message += f". Allowed statuses: {', '.join(allowed_statuses)}"
        super().__init__(message)
        self.current_status = current_status
        self.allowed_statuses = allowed_statuses


class ExternalServiceError(AppException):
    """
    Raised when an external service (API, email, etc.) fails.
    """

    default_message = "External service error"
    default_code = ErrorCode.EXTERNAL_SERVICE_ERROR
    status_code = status.HTTP_502_BAD_GATEWAY

    def __init__(self, service_name=None, message=None, original_error=None):
        if not message and service_name:
            message = f"{service_name} service is currently unavailable"
        super().__init__(message)
        self.service_name = service_name
        self.original_error = original_error


class AIProcessingError(ExternalServiceError):
    """
    Raised when AI processing (document extraction, etc.) fails.
    """

    default_message = "AI processing failed"
    default_code = ErrorCode.AI_PROCESSING_ERROR

    def __init__(self, message=None, original_error=None):
        super().__init__(service_name="AI Processing", message=message, original_error=original_error)


class FileValidationError(ValidationError):
    """
    Raised when file validation fails.
    """

    default_message = "File validation failed"

    def __init__(self, message=None, file_name=None, reason=None):
        if not message and reason:
            message = f"File validation failed: {reason}"
            if file_name:
                message = f"'{file_name}': {reason}"
        code = ErrorCode.INVALID_FILE_TYPE if 'type' in (reason or '').lower() else ErrorCode.FILE_TOO_LARGE
        super().__init__(message, code)
        self.file_name = file_name
        self.reason = reason


class BusinessLogicError(AppException):
    """
    Raised when a business rule is violated.
    """

    default_message = "Business rule violation"
    default_code = ErrorCode.VALIDATION_ERROR
    status_code = status.HTTP_400_BAD_REQUEST


class AlreadyProcessedError(BusinessLogicError):
    """
    Raised when trying to process something that's already been processed.
    """

    default_message = "This item has already been processed"
    default_code = ErrorCode.ALREADY_PROCESSED
