"""
Application-wide constants.

This module contains all magic numbers, configuration values, and enums
that were previously scattered across the codebase.
"""

# =============================================================================
# File Upload Settings
# =============================================================================

MAX_UPLOAD_SIZE_MB = 10
MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024  # 10MB in bytes

ALLOWED_UPLOAD_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
]

ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
]

ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

# =============================================================================
# Validation Settings
# =============================================================================

AMOUNT_TOLERANCE_PERCENT = 0.05  # 5% tolerance for receipt validation
VENDOR_NAME_SIMILARITY_THRESHOLD = 0.8  # 80% similarity for vendor matching

# =============================================================================
# Cache Settings
# =============================================================================

TEMP_FILE_CACHE_TIMEOUT = 300  # 5 minutes
DEFAULT_CACHE_TIMEOUT = 3600  # 1 hour

# =============================================================================
# HTTP Settings
# =============================================================================

HTTP_CONNECT_TIMEOUT = 5  # seconds
HTTP_READ_TIMEOUT = 10  # seconds
HTTP_TIMEOUT = (HTTP_CONNECT_TIMEOUT, HTTP_READ_TIMEOUT)

# =============================================================================
# Pagination Settings
# =============================================================================

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# =============================================================================
# Email Settings
# =============================================================================

EMAIL_HEADER_COLOR = '#2563eb'
EMAIL_BUTTON_COLOR = '#2563eb'

# =============================================================================
# Status Enums
# =============================================================================


class RequestStatus:
    """Purchase Request status values"""
    DRAFT = 'DRAFT'
    PENDING_L1 = 'PENDING_L1'
    PENDING_L2 = 'PENDING_L2'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'

    CHOICES = [
        (DRAFT, 'Draft'),
        (PENDING_L1, 'Pending L1 Approval'),
        (PENDING_L2, 'Pending L2 Approval'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
    ]

    # Statuses that allow editing
    EDITABLE_STATUSES = [DRAFT, REJECTED]

    # Statuses that allow submission
    SUBMITTABLE_STATUSES = [DRAFT, REJECTED]

    # Statuses that allow deletion
    DELETABLE_STATUSES = [DRAFT]


class ApprovalAction:
    """Approval action types"""
    APPROVE = 'APPROVE'
    REJECT = 'REJECT'

    CHOICES = [
        (APPROVE, 'Approve'),
        (REJECT, 'Reject'),
    ]


class ApprovalLevel:
    """Approval levels"""
    L1 = 'L1'
    L2 = 'L2'

    CHOICES = [
        (L1, 'Level 1'),
        (L2, 'Level 2'),
    ]


class ReceiptStatus:
    """Receipt validation status values"""
    PENDING = 'PENDING'
    VALIDATED = 'VALIDATED'
    REJECTED = 'REJECTED'
    DISCREPANCY = 'DISCREPANCY'

    CHOICES = [
        (PENDING, 'Pending'),
        (VALIDATED, 'Validated'),
        (REJECTED, 'Rejected'),
        (DISCREPANCY, 'Has Discrepancies'),
    ]


class POStatus:
    """Purchase Order status values"""
    GENERATED = 'GENERATED'
    SENT = 'SENT'
    RECEIVED = 'RECEIVED'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'

    CHOICES = [
        (GENERATED, 'Generated'),
        (SENT, 'Sent'),
        (RECEIVED, 'Received'),
        (COMPLETED, 'Completed'),
        (CANCELLED, 'Cancelled'),
    ]


class NotificationType:
    """Notification type values"""
    APPROVAL = 'APPROVAL'
    REJECTION = 'REJECTION'
    SUBMISSION = 'SUBMISSION'
    PO_GENERATED = 'PO_GENERATED'
    RECEIPT_UPLOADED = 'RECEIPT_UPLOADED'
    RECEIPT_VALIDATED = 'RECEIPT_VALIDATED'
    SYSTEM = 'SYSTEM'

    CHOICES = [
        (APPROVAL, 'Approval'),
        (REJECTION, 'Rejection'),
        (SUBMISSION, 'Submission'),
        (PO_GENERATED, 'PO Generated'),
        (RECEIPT_UPLOADED, 'Receipt Uploaded'),
        (RECEIPT_VALIDATED, 'Receipt Validated'),
        (SYSTEM, 'System'),
    ]


class UserRole:
    """User role values"""
    STAFF = 'STAFF'
    APPROVER_L1 = 'APPROVER_L1'
    APPROVER_L2 = 'APPROVER_L2'
    FINANCE = 'FINANCE'
    ADMIN = 'ADMIN'

    CHOICES = [
        (STAFF, 'Staff'),
        (APPROVER_L1, 'Approver Level 1'),
        (APPROVER_L2, 'Approver Level 2'),
        (FINANCE, 'Finance'),
        (ADMIN, 'Administrator'),
    ]

    # Roles that can approve requests
    APPROVER_ROLES = [APPROVER_L1, APPROVER_L2]

    # Roles with elevated access
    ELEVATED_ROLES = [FINANCE, ADMIN]


# =============================================================================
# Error Codes
# =============================================================================


class ErrorCode:
    """Standard error codes for API responses"""
    # Validation errors
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    INVALID_FILE_TYPE = 'INVALID_FILE_TYPE'
    FILE_TOO_LARGE = 'FILE_TOO_LARGE'

    # Authentication/Authorization errors
    AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED'
    PERMISSION_DENIED = 'PERMISSION_DENIED'
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS'

    # Resource errors
    NOT_FOUND = 'NOT_FOUND'
    ALREADY_EXISTS = 'ALREADY_EXISTS'
    CONFLICT = 'CONFLICT'

    # Business logic errors
    INVALID_STATUS = 'INVALID_STATUS'
    CANNOT_EDIT = 'CANNOT_EDIT'
    CANNOT_DELETE = 'CANNOT_DELETE'
    ALREADY_PROCESSED = 'ALREADY_PROCESSED'

    # External service errors
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
    AI_PROCESSING_ERROR = 'AI_PROCESSING_ERROR'
    EMAIL_SEND_ERROR = 'EMAIL_SEND_ERROR'

    # Server errors
    SERVER_ERROR = 'SERVER_ERROR'
    DATABASE_ERROR = 'DATABASE_ERROR'
