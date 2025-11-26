/**
 * Unified Error Handler
 *
 * Converts various error types (axios errors, API errors, etc.) into
 * user-friendly AppError objects that can be displayed in toast notifications
 */

import { AxiosError } from 'axios';
import { ErrorType, AppError, APIErrorResponse, ErrorField, UnifiedAPIResponse } from '@/types/errors';

/**
 * Check if error response follows the unified API response format
 */
function isUnifiedErrorResponse(data: any): data is UnifiedAPIResponse {
  return (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    data.success === false
  );
}

/**
 * Parse API error response to extract field errors
 * Handles both unified format and legacy DRF format
 */
function parseFieldErrors(data: APIErrorResponse | UnifiedAPIResponse): ErrorField[] {
  const fields: ErrorField[] = [];

  // Handle unified API response format with errors object
  if (isUnifiedErrorResponse(data) && data.errors) {
    Object.keys(data.errors).forEach((key) => {
      const value = data.errors![key];
      if (Array.isArray(value)) {
        fields.push({
          field: key,
          message: value.join(', '),
        });
      }
    });
    return fields;
  }

  // Handle legacy Django REST Framework field errors
  Object.keys(data).forEach((key) => {
    if (key === 'error' || key === 'detail' || key === 'message' || key === 'non_field_errors' || key === 'success' || key === 'code' || key === 'errors') {
      return; // Skip these, they're handled separately
    }

    const value = (data as APIErrorResponse)[key];
    if (Array.isArray(value)) {
      fields.push({
        field: key,
        message: value.join(', '),
      });
    } else if (typeof value === 'string') {
      fields.push({
        field: key,
        message: value,
      });
    }
  });

  return fields;
}

/**
 * Get user-friendly error message from API response
 * Handles both unified format and legacy DRF format
 */
function getErrorMessage(data: APIErrorResponse | UnifiedAPIResponse): string {
  // Handle unified API response format first
  if (isUnifiedErrorResponse(data)) {
    // Use message from unified format
    if (data.message) return data.message;

    // Check for field errors in the errors object
    if (data.errors) {
      const fieldErrors = parseFieldErrors(data);
      if (fieldErrors.length > 0) {
        return fieldErrors.map(f => `${f.field}: ${f.message}`).join(', ');
      }
    }
  }

  // Handle legacy format - Priority order for extracting error messages
  const legacyData = data as APIErrorResponse;
  if (legacyData.error) return legacyData.error;
  if (legacyData.detail) return legacyData.detail;
  if (legacyData.message) return legacyData.message;
  if (legacyData.non_field_errors && legacyData.non_field_errors.length > 0) {
    return legacyData.non_field_errors.join(', ');
  }

  // If we have field errors but no general message
  const fieldErrors = parseFieldErrors(data);
  if (fieldErrors.length > 0) {
    return fieldErrors.map(f => `${f.field}: ${f.message}`).join(', ');
  }

  return 'An unexpected error occurred';
}

/**
 * Determine error type based on status code
 */
function getErrorType(statusCode?: number): ErrorType {
  if (!statusCode) return ErrorType.NETWORK;

  if (statusCode >= 400 && statusCode < 500) {
    if (statusCode === 401) return ErrorType.AUTHENTICATION;
    if (statusCode === 403) return ErrorType.AUTHORIZATION;
    if (statusCode === 404) return ErrorType.NOT_FOUND;
    if (statusCode === 422 || statusCode === 400) return ErrorType.VALIDATION;
  }

  if (statusCode >= 500) return ErrorType.SERVER;

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error title based on error type
 */
function getErrorTitle(type: ErrorType): string {
  const titles: Record<ErrorType, string> = {
    [ErrorType.VALIDATION]: 'Please Fix the Following',
    [ErrorType.AUTHENTICATION]: 'Authentication Required',
    [ErrorType.AUTHORIZATION]: 'Permission Denied',
    [ErrorType.NETWORK]: 'Connection Problem',
    [ErrorType.SERVER]: 'Something Went Wrong',
    [ErrorType.NOT_FOUND]: 'Not Found',
    [ErrorType.UNKNOWN]: 'Unexpected Error',
  };

  return titles[type];
}

/**
 * Get helpful suggestion based on error type
 */
function getErrorSuggestion(type: ErrorType): string {
  const suggestions: Record<ErrorType, string> = {
    [ErrorType.VALIDATION]: '',
    [ErrorType.AUTHENTICATION]: 'Please sign in again to continue.',
    [ErrorType.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
    [ErrorType.NETWORK]: 'Please check your internet connection and try again.',
    [ErrorType.SERVER]: 'Our servers are having issues. Please try again in a few moments.',
    [ErrorType.NOT_FOUND]: 'The item you\'re looking for doesn\'t exist or has been removed.',
    [ErrorType.UNKNOWN]: 'Please try again. If the problem persists, contact support.',
  };

  return suggestions[type];
}

/**
 * Main error handler function
 * Converts any error into a standardized AppError
 */
export function handleError(error: unknown): AppError {
  // Handle Axios errors (API requests)
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<APIErrorResponse>;

    // Network error (no response from server)
    if (!axiosError.response) {
      return {
        type: ErrorType.NETWORK,
        title: getErrorTitle(ErrorType.NETWORK),
        message: getErrorSuggestion(ErrorType.NETWORK),
        originalError: error,
      };
    }

    // API error (server responded with error)
    const { status, data } = axiosError.response;
    const errorType = getErrorType(status);
    const fields = parseFieldErrors(data);

    return {
      type: errorType,
      title: getErrorTitle(errorType),
      message: getErrorMessage(data),
      statusCode: status,
      fields,
      originalError: error,
    };
  }

  // Handle Error instances
  if (error instanceof Error) {
    return {
      type: ErrorType.UNKNOWN,
      title: 'Error',
      message: error.message,
      originalError: error,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      title: 'Error',
      message: error,
      originalError: error,
    };
  }

  // Unknown error type
  return {
    type: ErrorType.UNKNOWN,
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
  };
}

/**
 * Format error for toast notification
 */
export function formatErrorForToast(error: AppError): {
  title: string;
  description: string;
  variant: 'destructive';
} {
  let description = error.message;

  // Add field errors if present
  if (error.fields && error.fields.length > 0) {
    const fieldMessages = error.fields
      .map(f => `• ${f.field}: ${f.message}`)
      .join('\n');

    // If the main message already contains field info, keep it as-is
    if (error.message.includes(':')) {
      description = error.message;
    } else {
      // Otherwise, combine main message with field errors
      description = `${error.message}\n${fieldMessages}`;
    }
  }

  return {
    title: error.title,
    description,
    variant: 'destructive',
  };
}

/**
 * Log error to console in development
 */
export function logError(error: AppError): void {
  if (import.meta.env.DEV) {
    console.group(`🔴 ${error.title}`);
    console.log('Message:', error.message);
    console.log('Type:', error.type);
    if (error.statusCode) console.log('Status Code:', error.statusCode);
    if (error.fields && error.fields.length > 0) {
      console.log('Field Errors:', error.fields);
    }
    if (error.originalError) {
      console.log('Original Error:', error.originalError);
    }
    console.groupEnd();
  }
}

/**
 * Complete error handling with logging and toast formatting
 * Accepts either raw error or AppError (for use with ErrorHandlers)
 */
export function handleAndFormatError(error: unknown | AppError): {
  appError: AppError;
  toastData: ReturnType<typeof formatErrorForToast>;
} {
  // Check if it's already an AppError (from ErrorHandlers)
  const appError = isAppError(error) ? error : handleError(error);
  logError(appError);
  const toastData = formatErrorForToast(appError);

  return { appError, toastData };
}

/**
 * Type guard to check if an object is an AppError
 */
function isAppError(error: any): error is AppError {
  return (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'title' in error &&
    'message' in error &&
    Object.values(ErrorType).includes(error.type)
  );
}

/**
 * Specific error handlers for common scenarios
 */
export const ErrorHandlers = {
  /**
   * Handle authentication errors (login, register)
   */
  auth: (error: unknown): AppError => {
    const appError = handleError(error);

    // Customize title and message for login failures
    if (appError.type === ErrorType.AUTHENTICATION) {
      appError.title = 'Login Failed';
      appError.message = 'The email or password you entered is incorrect.';
    }

    return appError;
  },

  /**
   * Handle validation errors (form submissions)
   */
  validation: (error: unknown): AppError => {
    const appError = handleError(error);

    if (appError.type !== ErrorType.VALIDATION) {
      // Convert to validation error if it has field errors
      if (appError.fields && appError.fields.length > 0) {
        appError.type = ErrorType.VALIDATION;
        appError.title = 'Validation Error';
      }
    }

    return appError;
  },

  /**
   * Handle network errors (connection issues)
   */
  network: (error: unknown): AppError => {
    const appError = handleError(error);

    if (appError.type === ErrorType.NETWORK) {
      appError.message = 'Unable to connect to the server. Please check your connection and try again.';
    }

    return appError;
  },
};
