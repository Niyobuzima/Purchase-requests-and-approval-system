/**
 * Error Types and Interfaces for Unified Error Handling
 */

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  SERVER = 'SERVER',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorField {
  field: string;
  message: string;
}

export interface AppError {
  type: ErrorType;
  title: string;
  message: string;
  statusCode?: number;
  fields?: ErrorField[];
  originalError?: any;
}

export interface APIErrorResponse {
  // New unified response format
  success?: boolean;
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
  // Legacy format fields (for backwards compatibility)
  error?: string;
  detail?: string;
  non_field_errors?: string[];
  [key: string]: any; // For field-specific errors
}

/**
 * Unified API Response format from backend
 */
export interface UnifiedAPIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  errors?: Record<string, string[]>;
  // Pagination fields (when applicable)
  count?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
}
