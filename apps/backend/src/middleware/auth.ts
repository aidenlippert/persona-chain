import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    address: string;
  };
}

/**
 * JWT Authentication middleware for API endpoints
 */
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET environment variable not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // Validate token structure
    if (!decoded.id || !decoded.role || !decoded.address) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token structure'
      });
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      address: decoded.address
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token has expired'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRole: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${requiredRole}`,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Admin-only middleware (combines authentication and admin role check)
 */
export const requireAdmin = [
  authenticateJWT,
  requireRole('admin')
];

/**
 * Generate JWT token for authenticated users
 */
export const generateJWT = (user: { id: string; role: string; address: string }) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable not set');
  }

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'personapass-api',
    audience: 'personapass-clients'
  } as SignOptions;

  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      address: user.address
    },
    process.env.JWT_SECRET as string,
    options
  );
};

/**
 * Validate admin credentials and return JWT
 */
export const validateAdminCredentials = async (credentials: { username: string; password: string }) => {
  // In production, this should validate against a secure database
  // For now, we'll use environment variables
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminAddress = process.env.ADMIN_ADDRESS;

  if (!adminUsername || !adminPassword || !adminAddress) {
    throw new Error('Admin credentials not configured');
  }

  if (credentials.username === adminUsername && credentials.password === adminPassword) {
    return {
      id: `admin_${Date.now()}`,
      role: 'admin',
      address: adminAddress
    };
  }

  return null;
};