import { Request, Response, NextFunction } from 'express';

export interface APIError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(
  err: APIError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error('API Error:', {
    statusCode,
    message,
    stack: err.stack,
    details: err.details,
    path: req.path,
    method: req.method
  });

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}