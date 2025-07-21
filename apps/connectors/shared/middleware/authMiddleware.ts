import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userDid?: string;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'default-secret';

    try {
      const decoded = jwt.verify(token, secret) as any;
      req.userId = decoded.userId;
      req.userDid = decoded.did;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
}