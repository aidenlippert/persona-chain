/**
 * Utility functions for error handling and type safety
 */

/**
 * Safely extract error message from unknown error type
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/**
 * Create a standardized error response
 */
export const createErrorResponse = (message: string, statusCode: number = 500) => ({
  success: false,
  error: message,
  timestamp: new Date().toISOString(),
  statusCode
});

/**
 * Type guard to check if value is an Error
 */
export const isError = (value: unknown): value is Error => {
  return value instanceof Error;
};

/**
 * Safe error logging that handles unknown types
 */
export const logError = (context: string, error: unknown) => {
  const message = getErrorMessage(error);
  console.error(`❌ ${context}:`, message);
  if (isError(error) && error.stack) {
    console.error('Stack trace:', error.stack);
  }
};