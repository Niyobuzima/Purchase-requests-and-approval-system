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
  error?: string;
  detail?: string;
  message?: string;
  non_field_errors?: string[];
  [key: string]: any; // For field-specific errors
}
