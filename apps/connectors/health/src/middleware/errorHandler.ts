import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export class APIError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error handler wrapper
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * FHIR API error handler
 */
export const handleFHIRError = (error: any): APIError => {
  console.error('🏥 FHIR API Error:', error.response?.data || error.message);
  
  if (error.response?.status === 401) {
    return new APIError('FHIR authentication failed - please re-authorize', 401);
  }
  
  if (error.response?.status === 403) {
    return new APIError('FHIR access forbidden - insufficient permissions', 403);
  }
  
  if (error.response?.status === 404) {
    return new APIError('FHIR resource not found', 404);
  }
  
  if (error.response?.status === 429) {
    return new APIError('FHIR API rate limit exceeded - please try again later', 429);
  }
  
  return new APIError('FHIR API error occurred', 500);
};

/**
 * OAuth error handler
 */
export const handleOAuthError = (error: any): APIError => {
  console.error('🔐 OAuth Error:', error.response?.data || error.message);
  
  if (error.message?.includes('invalid_grant')) {
    return new APIError('OAuth authorization code expired or invalid', 400);
  }
  
  if (error.message?.includes('invalid_client')) {
    return new APIError('OAuth client configuration error', 500);
  }
  
  if (error.message?.includes('access_denied')) {
    return new APIError('OAuth access was denied by the user', 400);
  }
  
  return new APIError('OAuth authentication failed', 500);
};

/**
 * HIPAA compliant error logger
 */
const logError = (error: AppError, req: Request) => {
  const sanitizedUrl = req.url.replace(/\/patient\/[^\/]+/g, '/patient/***');
  
  console.error(`📋 HEALTH ERROR LOG:`, {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: sanitizedUrl,
    statusCode: error.statusCode,
    message: error.message,
    stack: config.nodeEnv === 'development' ? error.stack : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  // HIPAA audit logging for errors
  if (config.hipaa.auditLogging) {
    console.log(`📋 AUDIT: Health connector error - Status: ${error.statusCode}, Message: ${error.message}, IP: ${req.ip}, Timestamp: ${new Date().toISOString()}`);
  }
};

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  error.statusCode = error.statusCode || 500;
  error.isOperational = error.isOperational || false;
  
  logError(error, req);
  
  // Handle specific error types
  if (error.message?.includes('FHIR')) {
    error = handleFHIRError(error);
  } else if (error.message?.includes('OAuth') || error.message?.includes('authorization')) {
    error = handleOAuthError(error);
  }
  
  // Set HIPAA compliant headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  
  if (config.nodeEnv === 'development') {
    return res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  // Production error response (sanitized)
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString()
    });
  }
  
  // Unknown errors - don't leak details
  res.status(500).json({
    error: 'An unexpected error occurred while processing health data',
    statusCode: 500,
    timestamp: new Date().toISOString()
  });
};

/**
 * Handle 404 errors
 */
export const handleNotFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new APIError(`Health endpoint not found: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error: Error) => {
    console.error('💥 UNCAUGHT EXCEPTION in Health Connector:', error);
    
    // HIPAA audit logging for critical errors
    if (config.hipaa.auditLogging) {
      console.log(`📋 AUDIT: Health connector critical error - Type: uncaughtException, Message: ${error.message}, Timestamp: ${new Date().toISOString()}`);
    }
    
    process.exit(1);
  });
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason: any) => {
    console.error('💥 UNHANDLED REJECTION in Health Connector:', reason);
    
    // HIPAA audit logging for critical errors
    if (config.hipaa.auditLogging) {
      console.log(`📋 AUDIT: Health connector critical error - Type: unhandledRejection, Message: ${reason?.message || reason}, Timestamp: ${new Date().toISOString()}`);
    }
    
    process.exit(1);
  });
};