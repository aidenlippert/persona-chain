/**
 * Sprint 1.1 API Reliability Tests
 * Comprehensive test suite for OAuth reliability, error handling, and retry mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryService, RetryService } from '../services/retryService';
import { errorService, ErrorCategory, ErrorSeverity } from '../services/errorService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Sprint 1.1: API Reliability & Core Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
    // Clear all error reports
    errorService.clearOldReports(0); // Clear all reports regardless of age
    // Reset circuit breakers
    const retryServiceInstance = retryService as any;
    retryServiceInstance.circuitBreakers.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('OAuth API Reliability', () => {
    it('should successfully create GitHub credential on first attempt', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          credential: {
            id: 'test-credential-id',
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiableCredential', 'GitHubCredential'],
            issuer: 'did:persona:github',
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
              id: 'test-user-id',
              platform: 'github',
              username: 'test-user'
            },
            blockchainTxHash: '0x123456789abcdef'
          },
          userData: {
            login: 'test-user',
            id: 12345,
            name: 'Test User',
            email: 'test@example.com'
          },
          sessionId: 'test-session-id'
        })
      });

      const oauthOperation = async () => {
        const response = await fetch('/api/connectors/github/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'test-user-id' })
        });

        if (!response.ok) {
          throw new Error(`OAuth failed: ${response.status}`);
        }

        return response.json();
      };

      const result = await retryService.retryOAuthOperation(oauthOperation, 'github');

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.result?.success).toBe(true);
      expect(result.result?.credential).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network failures and eventually succeed', async () => {
      // Mock first two attempts fail with retryable errors, third succeeds
      const networkError = new Error('Network error');
      (networkError as any).code = 'NETWORK_ERROR';
      
      const timeoutError = new Error('Connection timeout');
      (timeoutError as any).code = 'TIMEOUT';

      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            credential: { id: 'test-credential' },
            sessionId: 'test-session'
          })
        });

      const oauthOperation = async () => {
        const response = await fetch('/api/connectors/github/auth', {
          method: 'POST',
          body: JSON.stringify({ userId: 'test-user-id' })
        });
        return response.json();
      };

      const result = await retryService.retryOAuthOperation(oauthOperation, 'github');

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle 500 errors with retry', async () => {
      // Mock server errors that should be retried
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal server error', retryable: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, credential: { id: 'test' } })
        });

      const oauthOperation = async () => {
        const response = await fetch('/api/connectors/github/auth', {
          method: 'POST',
          body: JSON.stringify({ userId: 'test-user-id' })
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.error);
          (error as any).status = response.status;
          (error as any).retryable = errorData.retryable;
          throw error;
        }

        return response.json();
      };

      const result = await retryService.retryOAuthOperation(oauthOperation, 'github');

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should not retry on 400 validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid request',
          details: 'userId is required',
          retryable: false
        })
      });

      const oauthOperation = async () => {
        const response = await fetch('/api/connectors/github/auth', {
          method: 'POST',
          body: JSON.stringify({}) // Invalid request
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.error);
          (error as any).status = response.status;
          (error as any).retryable = errorData.retryable;
          throw error;
        }

        return response.json();
      };

      const result = await retryService.retryOAuthOperation(oauthOperation, 'github');

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // Should not retry validation errors
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limiting with exponential backoff', async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Rate limit exceeded', retryable: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, credential: { id: 'test' } })
        });

      const oauthOperation = async () => {
        const response = await fetch('/api/connectors/github/auth', {
          method: 'POST',
          body: JSON.stringify({ userId: 'test-user-id' })
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.error);
          (error as any).status = response.status;
          (error as any).retryable = errorData.retryable;
          throw error;
        }

        return response.json();
      };

      const retryPromise = retryService.retryOAuthOperation(oauthOperation, 'github');

      // Fast-forward through the retry delay
      await vi.advanceTimersByTimeAsync(3000);

      const result = await retryPromise;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);

      vi.useRealTimers();
    });
  });

  describe('Error Handling & Reporting', () => {
    it('should create and report OAuth errors correctly', () => {
      const mockError = new Error('OAuth access denied');
      
      const personalError = errorService.handleOAuth2Error('github', mockError, {
        component: 'test-component',
        userId: 'test-user'
      });

      expect(personalError.code).toBe('OAUTH2_GENERIC_ERROR');
      expect(personalError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(personalError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(personalError.retryable).toBe(true);
      expect(personalError.userMessage).toContain('Github');
    });

    it('should handle API errors with appropriate categorization', () => {
      const mockError = { status: 500, message: 'Internal server error' };
      
      const personalError = errorService.handleAPIError('github-api', mockError, {
        component: 'credentials-manager'
      });

      expect(personalError.code).toBe('API_SERVER_ERROR');
      expect(personalError.category).toBe(ErrorCategory.EXTERNAL_API);
      expect(personalError.severity).toBe(ErrorSeverity.HIGH);
      expect(personalError.retryable).toBe(true);
    });

    it('should track error reports and metrics', () => {
      const error1 = errorService.createError(
        'TEST_ERROR_1',
        'Test error 1',
        ErrorCategory.NETWORK,
        ErrorSeverity.LOW,
        errorService.createContext()
      );

      const error2 = errorService.createError(
        'TEST_ERROR_2',
        'Test error 2',
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.HIGH,
        errorService.createContext()
      );

      const reportId1 = errorService.reportError(error1);
      const reportId2 = errorService.reportError(error2);

      const allReports = errorService.getAllErrorReports();
      expect(allReports).toHaveLength(2);

      const report1 = errorService.getErrorReport(reportId1);
      expect(report1?.errorInfo.code).toBe('TEST_ERROR_1');
      expect(report1?.resolved).toBe(false);

      // Test error resolution
      errorService.resolveError(reportId1, 'Test resolution');
      const resolvedReport = errorService.getErrorReport(reportId1);
      expect(resolvedReport?.resolved).toBe(true);
      expect(resolvedReport?.resolution).toBe('Test resolution');
    });
  });

  describe('Circuit Breaker Functionality', () => {
    it('should open circuit breaker after repeated failures', async () => {
      const failingOperation = async () => {
        throw new Error('Service unavailable');
      };

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 5; i++) {
        await retryService.executeWithRetry(failingOperation, 'test-service', {
          maxAttempts: 1 // Don't retry within each attempt
        });
      }

      // Next attempt should be blocked by circuit breaker
      const result = await retryService.executeWithRetry(failingOperation, 'test-service', {
        maxAttempts: 1
      });

      expect(result.success).toBe(false);
      expect(result.circuitBreakerTripped).toBe(true);

      // Check circuit breaker metrics
      const metrics = retryService.getCircuitBreakerMetrics();
      expect(metrics['test-service']).toBeDefined();
      expect(metrics['test-service'].state).toBe('open');
    });

    it('should provide service health status', () => {
      const health = retryService.getServiceHealth();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('details');
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.details).toBe('object');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete OAuth flow with all error scenarios', async () => {
      // Test successful flow
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          credential: {
            id: 'integration-test-credential',
            type: ['VerifiableCredential', 'GitHubCredential'],
            credentialSubject: { id: 'test-user', platform: 'github' }
          }
        })
      });

      const operation = async () => {
        const response = await fetch('/api/connectors/github/auth', {
          method: 'POST',
          body: JSON.stringify({ userId: 'test-user' })
        });
        return response.json();
      };

      const result = await retryService.retryOAuthOperation(operation, 'github');
      expect(result.success).toBe(true);

      // Verify no critical errors were reported for successful operation
      const errorReports = errorService.getAllErrorReports();
      const criticalOAuthErrors = errorReports.filter(report => 
        report.errorInfo.category === ErrorCategory.AUTHENTICATION &&
        report.errorInfo.severity === ErrorSeverity.HIGH
      );
      expect(criticalOAuthErrors).toHaveLength(0);
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      const operations: Promise<any>[] = [];

      // Simulate 10 concurrent OAuth operations
      for (let i = 0; i < 10; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, credential: { id: `cred-${i}` } })
        });

        const operation = async () => {
          const response = await fetch('/api/connectors/github/auth', {
            method: 'POST',
            body: JSON.stringify({ userId: `user-${i}` })
          });
          return response.json();
        };

        operations.push(retryService.retryOAuthOperation(operation, 'github'));
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();

      // All operations should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Should complete in reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // Each operation should complete in single attempt
      expect(results.every(r => r.attempts === 1)).toBe(true);
    });
  });

  describe('Request Validation', () => {
    it('should validate OAuth request parameters', async () => {
      // Test invalid userId format
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid request',
          details: 'Invalid userId format',
          retryable: false
        })
      });

      const operation = async () => {
        const response = await fetch('/api/connectors/github/auth', {
          method: 'POST',
          body: JSON.stringify({ userId: 'invalid@user#id!' })
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.error);
          (error as any).status = response.status;
          (error as any).retryable = errorData.retryable;
          throw error;
        }

        return response.json();
      };

      const result = await retryService.retryOAuthOperation(operation, 'github');
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // Should not retry validation errors
    });
  });
});

describe('Performance & Scalability Tests', () => {
  it('should handle high-frequency requests without degradation', async () => {
    const requestCount = 50; // Reduced for test speed
    const startTime = Date.now();
    const operations: Promise<any>[] = [];

    for (let i = 0; i < requestCount; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, credential: { id: `perf-test-${i}` } })
      });

      const operation = async () => {
        const response = await fetch('/api/test', { method: 'POST' });
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
      };

      operations.push(retryService.executeWithRetry(operation, `performance-test-${i}`, {
        maxAttempts: 1 // No retries for performance test
      }));
    }

    const results = await Promise.all(operations);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // All operations should succeed
    expect(results.every(r => r.success)).toBe(true);
    
    // Should maintain reasonable throughput (>10 requests/second for test environment)
    const throughput = requestCount / (duration / 1000);
    expect(throughput).toBeGreaterThan(10);
    
    console.log(`Performance test: ${requestCount} requests in ${duration}ms (${throughput.toFixed(2)} req/s)`);
  });
});