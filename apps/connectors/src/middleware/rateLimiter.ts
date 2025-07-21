import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const rateLimiter = (redis: Redis, options: RateLimitOptions = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 60, // 60 requests per minute
    keyPrefix = 'rate_limit',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting for health checks
      if (req.path === '/health') {
        return next();
      }

      // Get identifier (IP or user ID)
      const identifier = req.userId || req.ip || 'anonymous';
      const key = `${keyPrefix}:${identifier}:${Math.floor(Date.now() / windowMs)}`;

      // Get current count
      const current = await redis.incr(key);
      
      // Set expiry on first request
      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Math.ceil(Date.now() / windowMs) * windowMs).toISOString());

      // Check if limit exceeded
      if (current > maxRequests) {
        logger.warn('Rate limit exceeded', {
          requestId: req.id,
          identifier,
          current,
          limit: maxRequests
        });

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Handle response to potentially skip counting
      if (skipSuccessfulRequests || skipFailedRequests) {
        res.on('finish', async () => {
          const shouldSkip = 
            (skipSuccessfulRequests && res.statusCode < 400) ||
            (skipFailedRequests && res.statusCode >= 400);
          
          if (shouldSkip) {
            await redis.decr(key);
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error', {
        requestId: req.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
};

// Create specific rate limiters for different endpoints
export const authRateLimiter = (redis: Redis) => rateLimiter(redis, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per 15 minutes
  keyPrefix: 'auth_rate_limit',
  skipSuccessfulRequests: true // Only count failed attempts
});

export const apiRateLimiter = (redis: Redis) => rateLimiter(redis, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyPrefix: 'api_rate_limit'
});