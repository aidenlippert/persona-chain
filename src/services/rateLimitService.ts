/**
 * Rate Limiting Service for PersonaPass Identity Wallet
 * Implements production-level rate limiting with exponential backoff
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs: number;
  maxRetries: number;
  exponentialBackoff: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RequestAttempt {
  timestamp: number;
  retryCount: number;
  nextRetryTime: number;
}

export class RateLimitService {
  private requests: Map<string, RequestAttempt[]> = new Map();
  private static instance: RateLimitService;

  private readonly configs: Map<string, RateLimitConfig> = new Map([
    [
      'github-oauth',
      {
        maxRequests: 100,
        windowMs: 60 * 1000, // 1 minute
        retryAfterMs: 5 * 1000, // 5 seconds
        maxRetries: 3,
        exponentialBackoff: true,
      },
    ],
    [
      'linkedin-oauth',
      {
        maxRequests: 50,
        windowMs: 60 * 1000, // 1 minute
        retryAfterMs: 10 * 1000, // 10 seconds
        maxRetries: 3,
        exponentialBackoff: true,
      },
    ],
    [
      'plaid-api',
      {
        maxRequests: 20,
        windowMs: 60 * 1000, // 1 minute
        retryAfterMs: 30 * 1000, // 30 seconds
        maxRetries: 2,
        exponentialBackoff: true,
      },
    ],
    [
      'did-creation',
      {
        maxRequests: 10,
        windowMs: 60 * 1000, // 1 minute
        retryAfterMs: 60 * 1000, // 1 minute
        maxRetries: 2,
        exponentialBackoff: true,
      },
    ],
    [
      'credential-creation',
      {
        maxRequests: 15,
        windowMs: 60 * 1000, // 1 minute
        retryAfterMs: 30 * 1000, // 30 seconds
        maxRetries: 3,
        exponentialBackoff: true,
      },
    ],
  ]);

  private constructor() {
    // Clean up expired entries every minute
    setInterval(() => this.cleanupExpiredEntries(), 60 * 1000);
  }

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Check if a request is allowed under rate limiting
   */
  checkRateLimit(key: string, endpoint: string): RateLimitResult {
    const config = this.configs.get(endpoint);
    if (!config) {
      // No rate limiting configured for this endpoint
      return {
        allowed: true,
        remainingRequests: Infinity,
        resetTime: 0,
      };
    }

    const now = Date.now();
    const requestKey = `${endpoint}:${key}`;
    const requests = this.requests.get(requestKey) || [];

    // Filter out requests outside the current window
    const validRequests = requests.filter(
      (req) => now - req.timestamp < config.windowMs,
    );

    // Check if we've exceeded the rate limit
    if (validRequests.length >= config.maxRequests) {
      const oldestRequest = validRequests[0];
      const resetTime = oldestRequest.timestamp + config.windowMs;
      
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        retryAfter: config.retryAfterMs,
      };
    }

    // Check if we're in a retry cooldown period
    const lastRequest = validRequests[validRequests.length - 1];
    if (lastRequest && now < lastRequest.nextRetryTime) {
      return {
        allowed: false,
        remainingRequests: config.maxRequests - validRequests.length,
        resetTime: lastRequest.nextRetryTime,
        retryAfter: lastRequest.nextRetryTime - now,
      };
    }

    // Add the new request
    const newRequest: RequestAttempt = {
      timestamp: now,
      retryCount: 0,
      nextRetryTime: 0,
    };
    validRequests.push(newRequest);
    this.requests.set(requestKey, validRequests);

    return {
      allowed: true,
      remainingRequests: config.maxRequests - validRequests.length,
      resetTime: now + config.windowMs,
    };
  }

  /**
   * Record a failed request for exponential backoff
   */
  recordFailedRequest(key: string, endpoint: string): void {
    const config = this.configs.get(endpoint);
    if (!config) return;

    const requestKey = `${endpoint}:${key}`;
    const requests = this.requests.get(requestKey) || [];
    
    if (requests.length > 0) {
      const lastRequest = requests[requests.length - 1];
      lastRequest.retryCount++;
      
      if (config.exponentialBackoff) {
        // Exponential backoff: base delay * (2 ^ retry count)
        const backoffMs = config.retryAfterMs * Math.pow(2, lastRequest.retryCount - 1);
        lastRequest.nextRetryTime = Date.now() + Math.min(backoffMs, 5 * 60 * 1000); // Cap at 5 minutes
      } else {
        lastRequest.nextRetryTime = Date.now() + config.retryAfterMs;
      }
    }
  }

  /**
   * Check if a request should be retried
   */
  shouldRetry(key: string, endpoint: string): boolean {
    const config = this.configs.get(endpoint);
    if (!config) return false;

    const requestKey = `${endpoint}:${key}`;
    const requests = this.requests.get(requestKey) || [];
    
    if (requests.length === 0) return true;

    const lastRequest = requests[requests.length - 1];
    return lastRequest.retryCount < config.maxRetries && Date.now() >= lastRequest.nextRetryTime;
  }

  /**
   * Get the next retry time for a request
   */
  getNextRetryTime(key: string, endpoint: string): number {
    const requestKey = `${endpoint}:${key}`;
    const requests = this.requests.get(requestKey) || [];
    
    if (requests.length === 0) return 0;

    const lastRequest = requests[requests.length - 1];
    return lastRequest.nextRetryTime;
  }

  /**
   * Clear rate limit entries for a specific key
   */
  clearRateLimit(key: string, endpoint: string): void {
    const requestKey = `${endpoint}:${key}`;
    this.requests.delete(requestKey);
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats(key: string, endpoint: string): {
    totalRequests: number;
    windowStart: number;
    windowEnd: number;
    retryCount: number;
    nextRetryTime: number;
  } {
    const config = this.configs.get(endpoint);
    if (!config) {
      return {
        totalRequests: 0,
        windowStart: 0,
        windowEnd: 0,
        retryCount: 0,
        nextRetryTime: 0,
      };
    }

    const requestKey = `${endpoint}:${key}`;
    const requests = this.requests.get(requestKey) || [];
    const now = Date.now();

    const validRequests = requests.filter(
      (req) => now - req.timestamp < config.windowMs,
    );

    const lastRequest = validRequests[validRequests.length - 1];

    return {
      totalRequests: validRequests.length,
      windowStart: validRequests[0]?.timestamp || 0,
      windowEnd: now + config.windowMs,
      retryCount: lastRequest?.retryCount || 0,
      nextRetryTime: lastRequest?.nextRetryTime || 0,
    };
  }

  /**
   * Add or update rate limit configuration
   */
  updateConfig(endpoint: string, config: RateLimitConfig): void {
    this.configs.set(endpoint, config);
  }

  /**
   * Remove expired entries from memory
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        (req) => now - req.timestamp < 60 * 60 * 1000, // Keep for 1 hour
      );

      if (validRequests.length === 0) {
        expiredKeys.push(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }

    expiredKeys.forEach((key) => this.requests.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired rate limit entries`);
    }
  }

  /**
   * Get all configured endpoints
   */
  getConfiguredEndpoints(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Get configuration for an endpoint
   */
  getEndpointConfig(endpoint: string): RateLimitConfig | undefined {
    return this.configs.get(endpoint);
  }
}

export const rateLimitService = RateLimitService.getInstance();

/**
 * Rate limit decorator for async functions
 */
export function rateLimit(endpoint: string, key?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const rateLimitKey = key || 'default';
      const result = rateLimitService.checkRateLimit(rateLimitKey, endpoint);

      if (!result.allowed) {
        throw new Error(
          `Rate limit exceeded for ${endpoint}. Retry after ${result.retryAfter}ms`,
        );
      }

      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        rateLimitService.recordFailedRequest(rateLimitKey, endpoint);
        throw error;
      }
    };

    return descriptor;
  };
}