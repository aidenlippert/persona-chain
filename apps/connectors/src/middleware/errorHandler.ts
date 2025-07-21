import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements ApiError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements ApiError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT';
  
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ExternalServiceError extends Error implements ApiError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  
  constructor(
    message: string,
    public service: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Error handler caught error', {
    requestId: req.id,
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      details: err.details
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    }
  });

  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Build error response
  const errorResponse: any = {
    error: {
      type: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred',
      code: err.code || 'INTERNAL_ERROR'
    },
    requestId: req.id,
    timestamp: new Date().toISOString()
  };

  // Add details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.details;
  }

  // Handle specific error types
  if (err.name === 'ValidationError' && err.details) {
    errorResponse.error.validationErrors = err.details;
  }

  if (err.name === 'ExternalServiceError') {
    errorResponse.error.service = (err as ExternalServiceError).service;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};