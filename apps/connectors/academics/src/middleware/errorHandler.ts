import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode = 500, message, stack } = err;
  
  // Log error for monitoring
  console.error(`🚨 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}:`, {
    error: message,
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    headers: req.headers,
    body: req.body,
    query: req.query
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message: statusCode === 500 ? 'Internal server error' : message,
      code: statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      ...(process.env.NODE_ENV === 'development' && { stack })
    }
  });
};

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

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};