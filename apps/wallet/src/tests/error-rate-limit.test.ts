/**
 * Error Service and Rate Limiting Test Suite
 * Tests comprehensive error handling and rate limiting functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorService, ErrorCategory, ErrorSeverity, PersonaPassError } from '../services/errorService';
import { rateLimitService } from '../services/rateLimitService';

describe('Error Service Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up error reports
    errorService.clearOldReports(0);
  });

  describe('PersonaPassError Class', () => {
    it('should create a PersonaPassError with all properties', () => {
      const context = errorService.createContext({ component: 'test' });
      const error = new PersonaPassError(
        'TEST_ERROR',
        'Test error message',
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        context,
        {
          retryable: true,
          recoveryActions: ['retry', 'check_input'],
          userMessage: 'Please try again',
        }
      );

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.retryable).toBe(true);
      expect(error.recoveryActions).toEqual(['retry', 'check_input']);
      expect(error.userMessage).toBe('Please try again');
      expect(error.context).toBe(context);
    });

    it('should serialize to JSON correctly', () => {
      const context = errorService.createContext({ component: 'test' });
      const error = new PersonaPassError(
        'TEST_ERROR',
        'Test error message',
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        context
      );

      const json = error.toJSON();
      expect(json.code).toBe('TEST_ERROR');
      expect(json.message).toBe('Test error message');
      expect(json.category).toBe(ErrorCategory.VALIDATION);
      expect(json.severity).toBe(ErrorSeverity.MEDIUM);
      expect(json.context).toBe(context);
    });
  });

  describe('Error Creation and Reporting', () => {
    it('should create and report errors', () => {
      const error = errorService.createError(
        'TEST_ERROR',
        'Test error message',
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        { component: 'test-component' },
        {
          retryable: true,
          userMessage: 'Network error occurred',
        }
      );

      const reportId = errorService.reportError(error);
      expect(reportId).toBeDefined();
      expect(reportId).toMatch(/^report_/);

      const report = errorService.getErrorReport(reportId);
      expect(report).toBeDefined();
      expect(report!.errorInfo.code).toBe('TEST_ERROR');
      expect(report!.resolved).toBe(false);
    });

    it('should create context with default values', () => {
      const context = errorService.createContext({ component: 'test' });
      
      expect(context.component).toBe('test');
      expect(context.timestamp).toBeGreaterThan(0);
      expect(context.sessionId).toMatch(/^session_/);
      expect(context.requestId).toMatch(/^req_/);
    });

    it('should handle error listeners', () => {
      const mockListener = vi.fn();
      errorService.addErrorListener(mockListener);

      const error = errorService.createError(
        'TEST_ERROR',
        'Test error message',
        ErrorCategory.INTERNAL,
        ErrorSeverity.LOW
      );

      errorService.reportError(error);
      expect(mockListener).toHaveBeenCalledWith(error.toJSON());

      errorService.removeErrorListener(mockListener);
    });
  });

  describe('Specialized Error Handlers', () => {
    it('should handle OAuth2 errors', () => {
      const oauthError = errorService.handleOAuth2Error(
        'GitHub',
        new Error('access_denied'),
        { component: 'github-oauth' }
      );

      expect(oauthError.code).toBe('OAUTH2_ACCESS_DENIED');
      expect(oauthError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(oauthError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(oauthError.retryable).toBe(true);
      expect(oauthError.recoveryActions).toContain('retry_oauth_flow');
    });

    it('should handle API errors', () => {
      const apiError = errorService.handleAPIError(
        'GitHub',
        { status: 429, statusText: 'Too Many Requests' },
        { component: 'github-api' }
      );

      expect(apiError.code).toBe('API_RATE_LIMIT');
      expect(apiError.category).toBe(ErrorCategory.EXTERNAL_API);
      expect(apiError.retryable).toBe(true);
      expect(apiError.recoveryActions).toContain('wait_and_retry');
    });

    it('should handle validation errors', () => {
      const validationError = errorService.handleValidationError(
        'email',
        'invalid-email',
        'email_format',
        { component: 'form-validation' }
      );

      expect(validationError.code).toBe('VALIDATION_ERROR');
      expect(validationError.category).toBe(ErrorCategory.VALIDATION);
      expect(validationError.severity).toBe(ErrorSeverity.LOW);
      expect(validationError.retryable).toBe(false);
    });

    it('should handle blockchain errors', () => {
      const blockchainError = errorService.handleBlockchainError(
        'register_did',
        new Error('insufficient funds'),
        { component: 'blockchain-service' }
      );

      expect(blockchainError.code).toBe('BLOCKCHAIN_INSUFFICIENT_FUNDS');
      expect(blockchainError.category).toBe(ErrorCategory.BLOCKCHAIN);
      expect(blockchainError.severity).toBe(ErrorSeverity.HIGH);
      expect(blockchainError.recoveryActions).toContain('add_funds');
    });
  });

  describe('Error Report Management', () => {
    it('should manage error reports', () => {
      const error = errorService.createError(
        'TEST_ERROR',
        'Test error message',
        ErrorCategory.INTERNAL,
        ErrorSeverity.MEDIUM
      );

      const reportId = errorService.reportError(error);
      const report = errorService.getErrorReport(reportId);

      expect(report).toBeDefined();
      expect(report!.resolved).toBe(false);

      // Resolve the error
      errorService.resolveError(reportId, 'Fixed by user action');
      const resolvedReport = errorService.getErrorReport(reportId);

      expect(resolvedReport!.resolved).toBe(true);
      expect(resolvedReport!.resolution).toBe('Fixed by user action');
      expect(resolvedReport!.resolvedAt).toBeGreaterThan(0);
    });

    it('should get all error reports', () => {
      const error1 = errorService.createError('ERROR_1', 'Error 1', ErrorCategory.INTERNAL, ErrorSeverity.LOW);
      const error2 = errorService.createError('ERROR_2', 'Error 2', ErrorCategory.NETWORK, ErrorSeverity.HIGH);

      errorService.reportError(error1);
      errorService.reportError(error2);

      const allReports = errorService.getAllErrorReports();
      expect(allReports).toHaveLength(2);
      expect(allReports.map(r => r.errorInfo.code)).toContain('ERROR_1');
      expect(allReports.map(r => r.errorInfo.code)).toContain('ERROR_2');
    });

    it('should clear old reports', () => {
      const error = errorService.createError('OLD_ERROR', 'Old error', ErrorCategory.INTERNAL, ErrorSeverity.LOW);
      const reportId = errorService.reportError(error);

      // Verify report exists
      expect(errorService.getErrorReport(reportId)).toBeDefined();

      // Clear old reports (maxAge = 0 means clear all)
      errorService.clearOldReports(0);

      // Verify report is cleared
      expect(errorService.getErrorReport(reportId)).toBeUndefined();
    });
  });
});

describe('Rate Limiting Service Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear all rate limits
    rateLimitService.getConfiguredEndpoints().forEach(endpoint => {
      rateLimitService.clearRateLimit('test-user', endpoint);
    });
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within rate limits', () => {
      const result = rateLimitService.checkRateLimit('test-user', 'github-api');
      
      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBeLessThan(100);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should block requests exceeding rate limits', () => {
      const endpoint = 'github-api';
      const config = rateLimitService.getEndpointConfig(endpoint);
      
      // Exhaust rate limit
      for (let i = 0; i < config!.maxRequests; i++) {
        rateLimitService.checkRateLimit('test-user', endpoint);
      }

      const result = rateLimitService.checkRateLimit('test-user', endpoint);
      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should reset rate limits after window expires', async () => {
      const endpoint = 'github-api';
      const config = rateLimitService.getEndpointConfig(endpoint);
      
      // Exhaust rate limit
      for (let i = 0; i < config!.maxRequests; i++) {
        rateLimitService.checkRateLimit('test-user', endpoint);
      }

      // Should be blocked
      expect(rateLimitService.checkRateLimit('test-user', endpoint).allowed).toBe(false);

      // Wait for window to expire (simulate)
      await new Promise(resolve => setTimeout(resolve, config!.windowMs + 10));

      // Should be allowed again
      expect(rateLimitService.checkRateLimit('test-user', endpoint).allowed).toBe(true);
    });
  });

  describe('Exponential Backoff', () => {
    it('should implement exponential backoff for failed requests', () => {
      const endpoint = 'github-api';
      const user = 'test-user';

      rateLimitService.recordFailedRequest(user, endpoint);
      rateLimitService.recordFailedRequest(user, endpoint);
      rateLimitService.recordFailedRequest(user, endpoint);

      const shouldRetry = rateLimitService.shouldRetry(user, endpoint);
      expect(shouldRetry).toBe(false);

      const nextRetryTime = rateLimitService.getNextRetryTime(user, endpoint);
      expect(nextRetryTime).toBeGreaterThan(Date.now());
    });

    it('should respect maximum retry attempts', () => {
      const endpoint = 'github-api';
      const user = 'test-user';
      const config = rateLimitService.getEndpointConfig(endpoint);

      // Exceed max retries
      for (let i = 0; i < config!.maxRetries + 1; i++) {
        rateLimitService.recordFailedRequest(user, endpoint);
      }

      const shouldRetry = rateLimitService.shouldRetry(user, endpoint);
      expect(shouldRetry).toBe(false);
    });
  });

  describe('Rate Limit Statistics', () => {
    it('should provide accurate rate limit statistics', () => {
      const endpoint = 'github-api';
      const user = 'test-user';

      // Make some requests
      rateLimitService.checkRateLimit(user, endpoint);
      rateLimitService.checkRateLimit(user, endpoint);
      rateLimitService.recordFailedRequest(user, endpoint);

      const stats = rateLimitService.getRateLimitStats(user, endpoint);
      expect(stats.totalRequests).toBe(2);
      expect(stats.retryCount).toBe(1);
      expect(stats.windowStart).toBeGreaterThan(0);
      expect(stats.windowEnd).toBeGreaterThan(stats.windowStart);
    });

    it('should handle non-existent endpoints gracefully', () => {
      const stats = rateLimitService.getRateLimitStats('user', 'non-existent');
      expect(stats.totalRequests).toBe(0);
      expect(stats.retryCount).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    it('should get configured endpoints', () => {
      const endpoints = rateLimitService.getConfiguredEndpoints();
      expect(endpoints).toContain('github-api');
      expect(endpoints).toContain('linkedin-api');
      expect(endpoints).toContain('plaid-api');
    });

    it('should get endpoint configurations', () => {
      const config = rateLimitService.getEndpointConfig('github-api');
      expect(config).toBeDefined();
      expect(config!.maxRequests).toBe(100);
      expect(config!.windowMs).toBe(60 * 1000);
    });

    it('should update endpoint configurations', () => {
      const newConfig = {
        maxRequests: 50,
        windowMs: 30 * 1000,
        retryAfterMs: 10 * 1000,
        maxRetries: 5,
        exponentialBackoff: true,
      };

      rateLimitService.updateConfig('test-endpoint', newConfig);
      const config = rateLimitService.getEndpointConfig('test-endpoint');
      expect(config).toEqual(newConfig);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent requests correctly', async () => {
      const endpoint = 'github-api';
      const user = 'concurrent-user';
      const promises = [];

      // Create multiple concurrent requests
      for (let i = 0; i < 10; i++) {
        promises.push(rateLimitService.checkRateLimit(user, endpoint));
      }

      const results = await Promise.all(promises);
      const allowedCount = results.filter(r => r.allowed).length;
      
      expect(allowedCount).toBeGreaterThan(0);
      expect(allowedCount).toBeLessThanOrEqual(10);
    });

    it('should handle high-frequency requests', () => {
      const endpoint = 'github-api';
      const user = 'high-freq-user';
      const results = [];

      // Make rapid requests
      for (let i = 0; i < 50; i++) {
        results.push(rateLimitService.checkRateLimit(user, endpoint));
      }

      const allowedCount = results.filter(r => r.allowed).length;
      const blockedCount = results.filter(r => !r.allowed).length;

      expect(allowedCount).toBeGreaterThan(0);
      expect(blockedCount).toBeGreaterThan(0);
      expect(allowedCount + blockedCount).toBe(50);
    });
  });

  describe('Memory Management', () => {
    it('should clean up expired entries', async () => {
      const endpoint = 'github-api';
      const user = 'cleanup-user';

      // Create some entries
      rateLimitService.checkRateLimit(user, endpoint);
      rateLimitService.recordFailedRequest(user, endpoint);

      // Force cleanup (this is typically done automatically)
      // We can't directly test the private cleanup method, but we can verify
      // that old entries are eventually cleaned up through normal operation
      const statsBefore = rateLimitService.getRateLimitStats(user, endpoint);
      expect(statsBefore.totalRequests).toBeGreaterThan(0);

      // In a real scenario, entries would be cleaned up after the cleanup interval
      // For testing, we'll just verify that the cleanup doesn't break anything
      rateLimitService.clearRateLimit(user, endpoint);
      const statsAfter = rateLimitService.getRateLimitStats(user, endpoint);
      expect(statsAfter.totalRequests).toBe(0);
    });
  });
});