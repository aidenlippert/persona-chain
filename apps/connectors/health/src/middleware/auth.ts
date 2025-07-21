import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import rateLimit from 'express-rate-limit';

export interface HealthAuthRequest extends Request {
  did?: string;
  decryptedPayload?: any;
}

/**
 * JWT validation middleware
 */
export const validateJWT = async (req: HealthAuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      req.did = decoded.did;
      req.decryptedPayload = decoded;
      
      // HIPAA audit logging
      if (config.hipaa.auditLogging) {
        console.log(`📋 AUDIT: Health connector access - DID: ${req.did}, IP: ${req.ip}, Timestamp: ${new Date().toISOString()}`);
      }
      
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
  } catch (error) {
    console.error('❌ JWT validation error:', error);
    res.status(500).json({ error: 'Authentication validation failed' });
  }
};

/**
 * API key validation middleware
 */
export const validateAPIKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    if (apiKey !== config.apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    next();
  } catch (error) {
    console.error('❌ API key validation error:', error);
    res.status(500).json({ error: 'API key validation failed' });
  }
};

/**
 * Rate limiting middleware (stricter for health data)
 */
export const rateLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.max,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimiting.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: HealthAuthRequest) => {
    // Rate limit by DID if available, otherwise by IP
    return req.did || req.ip;
  }
});

/**
 * HIPAA compliance middleware
 */
export const hipaaCompliance = (req: HealthAuthRequest, res: Response, next: NextFunction) => {
  try {
    // Set security headers for HIPAA compliance
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    
    // HIPAA access logging
    if (config.hipaa.accessLogging) {
      console.log(`📋 AUDIT: Health data request - Method: ${req.method}, Path: ${req.path}, DID: ${req.did || 'unknown'}, IP: ${req.ip}, Timestamp: ${new Date().toISOString()}`);
    }
    
    next();
  } catch (error) {
    console.error('❌ HIPAA compliance middleware error:', error);
    res.status(500).json({ error: 'Security compliance check failed' });
  }
};

/**
 * Data encryption utility
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
 * Data decryption utility
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
 * Generate health data commitment hash
 */
export const generateCommitment = (data: any): string => {
  const stringified = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(stringified).digest('hex');
};

/**
 * Validate FHIR token middleware
 */
export const validateFHIRToken = async (req: HealthAuthRequest, res: Response, next: NextFunction) => {
  try {
    const fhirToken = req.headers['x-fhir-token'] as string;
    
    if (!fhirToken) {
      return res.status(401).json({ error: 'FHIR access token required' });
    }
    
    // In production, validate token with FHIR server
    // For now, just check token format
    if (!fhirToken.startsWith('fhir_') && !fhirToken.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid FHIR token format' });
    }
    
    next();
  } catch (error) {
    console.error('❌ FHIR token validation error:', error);
    res.status(500).json({ error: 'FHIR token validation failed' });
  }
};

/**
 * Patient context validation middleware
 */
export const validatePatientContext = (req: HealthAuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.headers['x-patient-id'] as string;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID required for health data access' });
    }
    
    // Additional patient context validation can be added here
    
    next();
  } catch (error) {
    console.error('❌ Patient context validation error:', error);
    res.status(500).json({ error: 'Patient context validation failed' });
  }
};