import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  connector?: string;
  requestId?: string;
}

export class StandardAPIError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public connector?: string;
  public requestId?: string;
  
  constructor(
    message: string, 
    statusCode: number = 500, 
    isOperational: boolean = true, 
    connector?: string,
    requestId?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.connector = connector;
    this.requestId = requestId;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard async error handler wrapper
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Standard OAuth error handler
 */
export const handleOAuthError = (error: any, connector: string): StandardAPIError => {
  console.error(`🔐 OAuth Error in ${connector}:`, error.response?.data || error.message);
  
  if (error.message?.includes('invalid_grant')) {
    return new StandardAPIError('OAuth authorization code expired or invalid', 400, true, connector);
  }
  
  if (error.message?.includes('invalid_client')) {
    return new StandardAPIError('OAuth client configuration error', 500, true, connector);
  }
  
  if (error.message?.includes('access_denied')) {
    return new StandardAPIError('OAuth access was denied by the user', 400, true, connector);
  }
  
  if (error.message?.includes('invalid_scope')) {
    return new StandardAPIError('OAuth scope is invalid or not supported', 400, true, connector);
  }
  
  return new StandardAPIError('OAuth authentication failed', 500, true, connector);
};

/**
 * Standard API error handler (for external API calls)
 */
export const handleAPIError = (error: any, apiName: string, connector: string): StandardAPIError => {
  console.error(`🌐 API Error - ${apiName} in ${connector}:`, error.response?.data || error.message);
  
  if (error.response?.status === 401) {
    return new StandardAPIError(`${apiName} authentication failed - please re-authorize`, 401, true, connector);
  }
  
  if (error.response?.status === 403) {
    return new StandardAPIError(`${apiName} access forbidden - insufficient permissions`, 403, true, connector);
  }
  
  if (error.response?.status === 404) {
    return new StandardAPIError(`${apiName} resource not found`, 404, true, connector);
  }
  
  if (error.response?.status === 429) {
    return new StandardAPIError(`${apiName} rate limit exceeded - please try again later`, 429, true, connector);
  }
  
  if (error.response?.status === 500) {
    return new StandardAPIError(`${apiName} server error occurred`, 502, true, connector);
  }
  
  if (error.code === 'ECONNABORTED' || error.code === 'ECONNRESET') {
    return new StandardAPIError(`${apiName} connection timeout`, 504, true, connector);
  }
  
  return new StandardAPIError(`${apiName} error occurred`, 500, true, connector);
};

/**
 * Standard validation error handler
 */
export const handleValidationError = (error: any, connector: string): StandardAPIError => {
  const message = error.message || 'Validation failed';
  return new StandardAPIError(`Validation error: ${message}`, 400, true, connector);
};

/**
 * Standard compliance error logger
 */
const logError = (error: AppError, req: Request, connector: string) => {
  // Sanitize URLs to remove sensitive data
  const sanitizedUrl = req.url
    .replace(/\/user\/[^\/]+/g, '/user/***')
    .replace(/\/patient\/[^\/]+/g, '/patient/***')
    .replace(/token=[^&]+/g, 'token=***')
    .replace(/code=[^&]+/g, 'code=***');
  
  console.error(`📋 ${connector.toUpperCase()} ERROR LOG:`, {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: sanitizedUrl,
    statusCode: error.statusCode,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.headers['x-request-id'],
    connector
  });
};

/**
 * Standard global error handler factory
 */
export const createGlobalErrorHandler = (connector: string) => {
  return (
    error: AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    error.statusCode = error.statusCode || 500;
    error.isOperational = error.isOperational || false;
    error.connector = error.connector || connector;
    error.requestId = error.requestId || (req.headers['x-request-id'] as string);
    
    logError(error, req, connector);
    
    // Handle specific error types
    if (error.message?.includes('OAuth') || error.message?.includes('authorization')) {
      error = handleOAuthError(error, connector);
    }
    
    // Set security headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Connector', connector);
    
    if (process.env.NODE_ENV === 'development') {
      return res.status(error.statusCode).json({
        error: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        connector,
        requestId: error.requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Production error response (sanitized)
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        error: error.message,
        statusCode: error.statusCode,
        connector,
        requestId: error.requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Unknown errors - don't leak details
    res.status(500).json({
      error: `An unexpected error occurred in ${connector}`,
      statusCode: 500,
      connector,
      requestId: error.requestId,
      timestamp: new Date().toISOString()
    });
  };
};

/**
 * Standard 404 handler factory
 */
export const createNotFoundHandler = (connector: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const error = new StandardAPIError(
      `${connector} endpoint not found: ${req.originalUrl}`, 
      404, 
      true, 
      connector,
      req.headers['x-request-id'] as string
    );
    next(error);
  };
};

/**
 * Standard uncaught exception handler factory
 */
export const createUncaughtExceptionHandler = (connector: string) => {
  return () => {
    process.on('uncaughtException', (error: Error) => {
      console.error(`💥 UNCAUGHT EXCEPTION in ${connector}:`, error);
      
      console.log(`📋 AUDIT: ${connector} critical error - Type: uncaughtException, Message: ${error.message}, Timestamp: ${new Date().toISOString()}`);
      
      process.exit(1);
    });
  };
};

/**
 * Standard unhandled rejection handler factory
 */
export const createUnhandledRejectionHandler = (connector: string) => {
  return () => {
    process.on('unhandledRejection', (reason: any) => {
      console.error(`💥 UNHANDLED REJECTION in ${connector}:`, reason);
      
      console.log(`📋 AUDIT: ${connector} critical error - Type: unhandledRejection, Message: ${reason?.message || reason}, Timestamp: ${new Date().toISOString()}`);
      
      process.exit(1);
    });
  };
};

/**
 * Standard retry logic for API calls
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffFactor: number = 2
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry on certain error types
      if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
        break;
      }
      
      const delay = baseDelay * Math.pow(backoffFactor, attempt);
      console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Standard circuit breaker pattern
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private resetTimeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker moving to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log('🚨 Circuit breaker OPENED due to failures');
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}