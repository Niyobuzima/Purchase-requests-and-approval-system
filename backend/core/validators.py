"""
File and data validators.

This module provides centralized validation utilities to eliminate
duplicated validation logic across the codebase.
"""

from typing import List, Optional, Tuple
from django.core.exceptions import ValidationError as DjangoValidationError

from .constants import (
    MAX_UPLOAD_SIZE,
    MAX_UPLOAD_SIZE_MB,
    ALLOWED_UPLOAD_TYPES,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_DOCUMENT_TYPES,
)
from .exceptions import FileValidationError


class FileValidator:
    """
    Centralized file validation utility.

    Usage:
        # Basic validation
        FileValidator.validate(uploaded_file)

        # Custom limits
        FileValidator.validate(uploaded_file, max_size=5*1024*1024)

        # Image-only validation
        FileValidator.validate_image(uploaded_file)

        # Document-only validation
        FileValidator.validate_document(uploaded_file)
    """

    @classmethod
    def validate(
        cls,
        file,
        max_size: Optional[int] = None,
        allowed_types: Optional[List[str]] = None,
        raise_exception: bool = True
    ) -> Tuple[bool, List[str]]:
        """
        Validate uploaded file size and type.

        Args:
            file: Uploaded file object
            max_size: Maximum file size in bytes (default from constants)
            allowed_types: List of allowed MIME types (default from constants)
            raise_exception: Whether to raise exception on validation failure

        Returns:
            Tuple of (is_valid, error_messages)

        Raises:
            FileValidationError: If validation fails and raise_exception is True
        """
        max_size = max_size or MAX_UPLOAD_SIZE
        allowed_types = allowed_types or ALLOWED_UPLOAD_TYPES

        errors = []
        file_name = getattr(file, 'name', 'file')

        # Validate file size
        if hasattr(file, 'size') and file.size > max_size:
            mb_size = max_size // (1024 * 1024)
            errors.append(f"File size cannot exceed {mb_size}MB")

        # Validate file type
        if hasattr(file, 'content_type'):
            if file.content_type not in allowed_types:
                type_names = cls._get_type_names(allowed_types)
                errors.append(f"Invalid file type. Allowed types: {type_names}")

        if errors and raise_exception:
            raise FileValidationError(
                message="; ".join(errors),
                file_name=file_name,
                reason=errors[0]
            )

        return len(errors) == 0, errors

    @classmethod
    def validate_image(
        cls,
        file,
        max_size: Optional[int] = None,
        raise_exception: bool = True
    ) -> Tuple[bool, List[str]]:
        """
        Validate image files specifically.

        Args:
            file: Uploaded file object
            max_size: Maximum file size in bytes
            raise_exception: Whether to raise exception on failure

        Returns:
            Tuple of (is_valid, error_messages)
        """
        return cls.validate(
            file,
            max_size=max_size,
            allowed_types=ALLOWED_IMAGE_TYPES,
            raise_exception=raise_exception
        )

    @classmethod
    def validate_document(
        cls,
        file,
        max_size: Optional[int] = None,
        raise_exception: bool = True
    ) -> Tuple[bool, List[str]]:
        """
        Validate document files (PDF, Word) specifically.

        Args:
            file: Uploaded file object
            max_size: Maximum file size in bytes
            raise_exception: Whether to raise exception on failure

        Returns:
            Tuple of (is_valid, error_messages)
        """
        return cls.validate(
            file,
            max_size=max_size,
            allowed_types=ALLOWED_DOCUMENT_TYPES,
            raise_exception=raise_exception
        )

    @classmethod
    def validate_receipt(
        cls,
        file,
        max_size: Optional[int] = None,
        raise_exception: bool = True
    ) -> Tuple[bool, List[str]]:
        """
        Validate receipt files (PDF and images).

        Args:
            file: Uploaded file object
            max_size: Maximum file size in bytes
            raise_exception: Whether to raise exception on failure

        Returns:
            Tuple of (is_valid, error_messages)
        """
        # Receipts can be PDF or images
        receipt_types = ALLOWED_IMAGE_TYPES + ['application/pdf']
        return cls.validate(
            file,
            max_size=max_size,
            allowed_types=receipt_types,
            raise_exception=raise_exception
        )

    @staticmethod
    def _get_type_names(mime_types: List[str]) -> str:
        """Convert MIME types to human-readable names"""
        type_mapping = {
            'application/pdf': 'PDF',
            'image/jpeg': 'JPEG',
            'image/jpg': 'JPEG',
            'image/png': 'PNG',
            'image/gif': 'GIF',
            'application/msword': 'Word (DOC)',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (DOCX)',
        }
        names = [type_mapping.get(t, t) for t in mime_types]
        # Remove duplicates while preserving order
        seen = set()
        unique_names = []
        for name in names:
            if name not in seen:
                seen.add(name)
                unique_names.append(name)
        return ', '.join(unique_names)


def validate_file_upload(file, max_size=None, allowed_types=None):
    """
    Convenience function for file validation.

    Can be used as a Django validator.

    Args:
        file: Uploaded file object
        max_size: Maximum file size in bytes
        allowed_types: List of allowed MIME types

    Raises:
        DjangoValidationError: If validation fails
    """
    try:
        FileValidator.validate(file, max_size, allowed_types)
    except FileValidationError as e:
        raise DjangoValidationError(e.message)


def validate_image_upload(file, max_size=None):
    """
    Convenience function for image validation.

    Args:
        file: Uploaded file object
        max_size: Maximum file size in bytes

    Raises:
        DjangoValidationError: If validation fails
    """
    try:
        FileValidator.validate_image(file, max_size)
    except FileValidationError as e:
        raise DjangoValidationError(e.message)


def validate_document_upload(file, max_size=None):
    """
    Convenience function for document validation.

    Args:
        file: Uploaded file object
        max_size: Maximum file size in bytes

    Raises:
        DjangoValidationError: If validation fails
    """
    try:
        FileValidator.validate_document(file, max_size)
    except FileValidationError as e:
        raise DjangoValidationError(e.message)
