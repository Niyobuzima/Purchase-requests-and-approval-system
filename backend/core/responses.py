"""
Unified API response utilities.

This module provides a consistent response format for all API endpoints.
"""

from rest_framework.response import Response
from rest_framework import status
from typing import Any, Optional, Dict, List, Union

from .constants import ErrorCode


class APIResponse:
    """
    Unified API response format.

    All API responses should use this class to ensure consistency.

    Success Response Format:
    {
        "success": true,
        "message": "Operation completed successfully",
        "data": { ... }  # Optional
    }

    Error Response Format:
    {
        "success": false,
        "message": "Human-readable error message",
        "code": "ERROR_CODE",  # Optional
        "errors": { ... }  # Optional - for validation errors
    }
    """

    @staticmethod
    def success(
        data: Optional[Any] = None,
        message: str = "Success",
        status_code: int = status.HTTP_200_OK,
        **extra
    ) -> Response:
        """
        Create a success response.

        Args:
            data: Response data (serialized object, list, etc.)
            message: Success message
            status_code: HTTP status code (default: 200)
            **extra: Additional fields to include in response

        Returns:
            Response object with standardized format
        """
        response_data = {
            'success': True,
            'message': message,
        }
        if data is not None:
            response_data['data'] = data
        response_data.update(extra)
        return Response(response_data, status=status_code)

    @staticmethod
    def created(
        data: Optional[Any] = None,
        message: str = "Created successfully",
        **extra
    ) -> Response:
        """
        Create a 201 Created response.

        Args:
            data: Created resource data
            message: Success message
            **extra: Additional fields

        Returns:
            Response object with 201 status
        """
        return APIResponse.success(data, message, status.HTTP_201_CREATED, **extra)

    @staticmethod
    def no_content(message: str = "Deleted successfully") -> Response:
        """
        Create a 204 No Content response.

        Args:
            message: Success message (included for consistency, though body may be empty)

        Returns:
            Response object with 204 status
        """
        return Response(status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    def error(
        message: str = "An error occurred",
        errors: Optional[Dict[str, List[str]]] = None,
        code: Optional[str] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        **extra
    ) -> Response:
        """
        Create an error response.

        Args:
            message: Human-readable error message
            errors: Dictionary of field-specific errors
            code: Machine-readable error code
            status_code: HTTP status code (default: 400)
            **extra: Additional fields

        Returns:
            Response object with error format
        """
        response_data = {
            'success': False,
            'message': message,
        }
        if code:
            response_data['code'] = code
        if errors:
            response_data['errors'] = errors
        response_data.update(extra)
        return Response(response_data, status=status_code)

    @staticmethod
    def validation_error(
        errors: Union[Dict[str, Any], List[str], str],
        message: str = "Validation failed"
    ) -> Response:
        """
        Create a validation error response.

        Args:
            errors: Validation errors (dict of field errors or list/string of general errors)
            message: Error message

        Returns:
            Response object with validation error format
        """
        # Normalize errors format
        if isinstance(errors, str):
            errors = {'non_field_errors': [errors]}
        elif isinstance(errors, list):
            errors = {'non_field_errors': errors}

        return APIResponse.error(
            message=message,
            errors=errors,
            code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_400_BAD_REQUEST
        )

    @staticmethod
    def not_found(
        message: str = "Resource not found",
        resource_type: Optional[str] = None,
        resource_id: Optional[Any] = None
    ) -> Response:
        """
        Create a 404 Not Found response.

        Args:
            message: Error message
            resource_type: Type of resource (e.g., "PurchaseRequest")
            resource_id: ID of the resource

        Returns:
            Response object with 404 status
        """
        if resource_type and not message.startswith(resource_type):
            if resource_id:
                message = f"{resource_type} with ID {resource_id} not found"
            else:
                message = f"{resource_type} not found"

        return APIResponse.error(
            message=message,
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND
        )

    @staticmethod
    def forbidden(
        message: str = "Permission denied",
        action: Optional[str] = None
    ) -> Response:
        """
        Create a 403 Forbidden response.

        Args:
            message: Error message
            action: Action that was attempted

        Returns:
            Response object with 403 status
        """
        if action and message == "Permission denied":
            message = f"You do not have permission to {action}"

        return APIResponse.error(
            message=message,
            code=ErrorCode.PERMISSION_DENIED,
            status_code=status.HTTP_403_FORBIDDEN
        )

    @staticmethod
    def unauthorized(message: str = "Authentication required") -> Response:
        """
        Create a 401 Unauthorized response.

        Args:
            message: Error message

        Returns:
            Response object with 401 status
        """
        return APIResponse.error(
            message=message,
            code=ErrorCode.AUTHENTICATION_REQUIRED,
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    @staticmethod
    def conflict(
        message: str = "Operation conflicts with current state",
        details: Optional[Dict] = None
    ) -> Response:
        """
        Create a 409 Conflict response.

        Args:
            message: Error message
            details: Additional conflict details

        Returns:
            Response object with 409 status
        """
        return APIResponse.error(
            message=message,
            code=ErrorCode.CONFLICT,
            status_code=status.HTTP_409_CONFLICT,
            **(details or {})
        )

    @staticmethod
    def server_error(
        message: str = "Internal server error",
        code: str = ErrorCode.SERVER_ERROR
    ) -> Response:
        """
        Create a 500 Internal Server Error response.

        Args:
            message: Error message
            code: Error code

        Returns:
            Response object with 500 status
        """
        return APIResponse.error(
            message=message,
            code=code,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    @staticmethod
    def bad_gateway(
        message: str = "External service unavailable",
        service_name: Optional[str] = None
    ) -> Response:
        """
        Create a 502 Bad Gateway response for external service failures.

        Args:
            message: Error message
            service_name: Name of the failing service

        Returns:
            Response object with 502 status
        """
        if service_name and message == "External service unavailable":
            message = f"{service_name} service is currently unavailable"

        return APIResponse.error(
            message=message,
            code=ErrorCode.EXTERNAL_SERVICE_ERROR,
            status_code=status.HTTP_502_BAD_GATEWAY
        )

    @staticmethod
    def paginated(
        data: List[Any],
        count: int,
        page: int = 1,
        page_size: int = 20,
        message: str = "Success"
    ) -> Response:
        """
        Create a paginated response.

        Args:
            data: List of items for current page
            count: Total count of items
            page: Current page number
            page_size: Items per page
            message: Success message

        Returns:
            Response object with pagination metadata
        """
        return APIResponse.success(
            data=data,
            message=message,
            count=count,
            page=page,
            page_size=page_size,
            total_pages=(count + page_size - 1) // page_size if page_size > 0 else 0
        )

    @staticmethod
    def from_serializer_errors(
        errors: Dict[str, Any],
        message: str = "Validation failed"
    ) -> Response:
        """
        Create a response from DRF serializer errors.

        Args:
            errors: Serializer.errors dictionary
            message: Error message

        Returns:
            Response object with formatted validation errors
        """
        # Flatten nested errors if needed
        formatted_errors = {}
        for field, error_list in errors.items():
            if isinstance(error_list, list):
                formatted_errors[field] = [str(e) for e in error_list]
            elif isinstance(error_list, dict):
                # Handle nested serializer errors
                formatted_errors[field] = error_list
            else:
                formatted_errors[field] = [str(error_list)]

        return APIResponse.validation_error(formatted_errors, message)
