import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/config';
import { APIError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    did: string;
    sub: string;
    iat: number;
    exp: number;
  };
}

/**
 * Validate API key middleware
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      code: 'MISSING_API_KEY'
    });
  }
  
  // In production, validate against database of valid API keys
  if (apiKey !== config.apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
  }
  
  next();
};

/**
 * Validate JWT token middleware
 */
export const validateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new APIError('JWT token required', 401);
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new APIError('Token expired', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new APIError('Invalid token', 401);
    } else {
      throw new APIError('Token validation failed', 401);
    }
  }
};

/**
 * Generate JWT token for authenticated user
 */
export const generateJWT = (payload: { did: string; sub: string }): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '24h',
    issuer: 'academic-connector',
    audience: 'persona-chain'
  });
};

/**
 * Encrypt sensitive data
 */
export const encrypt = (text: string): string => {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, config.encryptionKey);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
};

/**
 * Decrypt sensitive data
 */
export const decrypt = (encryptedText: string): string => {
  const algorithm = 'aes-256-gcm';
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipher(algorithm, config.encryptionKey);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Hash data for commitment generation
 */
export const hashData = (data: any): string => {
  const stringified = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(stringified).digest('hex');
};

/**
 * Rate limiting by DID
 */
const didRateLimits = new Map<string, { count: number; resetTime: number }>();

export const rateLimitByDID = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const did = req.user?.did || req.headers['x-did'] as string;
    
    if (!did) {
      throw new APIError('DID required for rate limiting', 400);
    }
    
    const now = Date.now();
    const userLimit = didRateLimits.get(did);
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize rate limit for this DID
      didRateLimits.set(did, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (userLimit.count >= maxRequests) {
      throw new APIError('Rate limit exceeded for DID', 429);
    }
    
    userLimit.count++;
    next();
  };
};