import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function rateLimiter(
  redis: Redis,
  options: RateLimitOptions = {}
) {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 100,
    keyPrefix = 'rate_limit',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || 'unknown';
    const key = `${keyPrefix}:${identifier}`;

    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }

      if (current > maxRequests) {
        const ttl = await redis.pttl(key);
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + ttl).toISOString());
        
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(ttl / 1000)
        });
      }

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - current).toString());

      // Store original res.end to check response status
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        // Optionally decrement counter based on response status
        if (
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400)
        ) {
          redis.decr(key).catch(console.error);
        }
        
        return originalEnd.apply(res, args);
      } as any;

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Allow request to proceed if rate limiter fails
      next();
    }
  };
}