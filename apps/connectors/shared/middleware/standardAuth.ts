import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

export interface StandardAuthRequest extends Request {
  did?: string;
  decryptedPayload?: any;
  connector?: string;
}

/**
 * Standard JWT validation middleware for all connectors
 */
export const createJWTValidator = (jwtSecret: string, connector: string) => {
  return async (req: StandardAuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Authorization token required',
          connector,
          timestamp: new Date().toISOString()
        });
      }
      
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        req.did = decoded.did;
        req.decryptedPayload = decoded;
        req.connector = connector;
        
        // Standard audit logging
        console.log(`📋 AUDIT: ${connector} access - DID: ${req.did}, IP: ${req.ip}, Timestamp: ${new Date().toISOString()}`);
        
        next();
      } catch (jwtError) {
        return res.status(401).json({ 
          error: 'Invalid or expired token',
          connector,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error(`❌ JWT validation error in ${connector}:`, error);
      res.status(500).json({ 
        error: 'Authentication validation failed',
        connector,
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Standard API key validation middleware for all connectors
 */
export const createAPIKeyValidator = (expectedApiKey: string, connector: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'API key required',
          connector,
          timestamp: new Date().toISOString()
        });
      }
      
      if (apiKey !== expectedApiKey) {
        return res.status(401).json({ 
          error: 'Invalid API key',
          connector,
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    } catch (error) {
      console.error(`❌ API key validation error in ${connector}:`, error);
      res.status(500).json({ 
        error: 'API key validation failed',
        connector,
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Standard rate limiting factory for connectors
 */
export const createRateLimiter = (config: { windowMs: number; max: number }, connector: string) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      connector,
      retryAfter: Math.ceil(config.windowMs / 1000),
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: StandardAuthRequest) => {
      // Rate limit by DID if available, otherwise by IP
      return req.did || req.ip;
    }
  });
};

/**
 * Standard security headers middleware
 */
export const standardSecurityHeaders = (connector: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Set comprehensive security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('X-Connector', connector);
      
      next();
    } catch (error) {
      console.error(`❌ Security headers middleware error in ${connector}:`, error);
      res.status(500).json({ 
        error: 'Security compliance check failed',
        connector,
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Standard data encryption utility
 */
export const createEncryptionUtils = (encryptionKey: string) => {
  const encrypt = (text: string): string => {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, encryptionKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
  };

  const decrypt = (encryptedText: string): string => {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipher(algorithm, encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  };

  return { encrypt, decrypt };
};

/**
 * Standard commitment hash generation
 */
export const generateCommitment = (data: any): string => {
  const stringified = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(stringified).digest('hex');
};

/**
 * Standard request ID generator for tracing
 */
export const requestIdMiddleware = (connector: string) => {
  return (req: StandardAuthRequest, res: Response, next: NextFunction) => {
    const requestId = crypto.randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Connector', connector);
    
    console.log(`🔍 ${connector.toUpperCase()} REQUEST: ${req.method} ${req.path} - ID: ${requestId} - DID: ${req.did || 'anonymous'}`);
    
    next();
  };
};

/**
 * Standard CORS configuration factory
 */
export const createCORSConfig = (allowedOrigins: string[]) => {
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
  };
};

/**
 * Standard health check endpoint factory
 */
export const createHealthCheck = (connector: string, version: string = '1.0.0', additionalChecks?: () => Promise<any>) => {
  return async (req: Request, res: Response) => {
    try {
      const healthData: any = {
        status: 'healthy',
        service: `${connector}-connector`,
        version,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        requestId: req.headers['x-request-id']
      };
      
      // Run additional health checks if provided
      if (additionalChecks) {
        try {
          const additionalData = await additionalChecks();
          healthData.additional = additionalData;
        } catch (checkError) {
          healthData.status = 'degraded';
          healthData.error = 'Additional health checks failed';
        }
      }
      
      res.json(healthData);
    } catch (error) {
      console.error(`❌ Health check failed for ${connector}:`, error);
      res.status(500).json({
        status: 'unhealthy',
        service: `${connector}-connector`,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Standard error response formatter
 */
export const formatErrorResponse = (error: any, connector: string, requestId?: string) => {
  return {
    error: error.message || 'An error occurred',
    connector,
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString(),
    requestId: requestId || 'unknown',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
};

/**
 * Standard OAuth state management
 */
export const createOAuthStateManager = () => {
  const stateStore = new Map<string, any>();
  
  const storeState = async (state: string, data: any): Promise<void> => {
    stateStore.set(state, {
      ...data,
      createdAt: Date.now()
    });
    
    // Clean up expired states (1 hour)
    setTimeout(() => {
      stateStore.delete(state);
    }, 3600000);
  };
  
  const getState = async (state: string): Promise<any> => {
    const data = stateStore.get(state);
    if (!data) return null;
    
    // Check if expired (1 hour)
    if (Date.now() - data.createdAt > 3600000) {
      stateStore.delete(state);
      return null;
    }
    
    return data;
  };
  
  const clearState = async (state: string): Promise<void> => {
    stateStore.delete(state);
  };
  
  return { storeState, getState, clearState };
};

/**
 * Standard token validation patterns
 */
export const createTokenValidator = () => {
  const isTokenExpired = (expiresAt: number): boolean => {
    return Date.now() >= expiresAt;
  };
  
  const getTokenTimeRemaining = (expiresAt: number): number => {
    return Math.max(0, expiresAt - Date.now());
  };
  
  const shouldRefreshToken = (expiresAt: number, bufferMs: number = 300000): boolean => {
    return getTokenTimeRemaining(expiresAt) < bufferMs; // 5 minutes default buffer
  };
  
  return { isTokenExpired, getTokenTimeRemaining, shouldRefreshToken };
};