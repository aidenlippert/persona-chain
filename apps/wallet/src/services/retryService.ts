/**
 * Retry Service - Production-Grade Retry Mechanisms with Exponential Backoff
 * Provides bulletproof retry strategies for API calls and critical operations
 */

import { errorService, ErrorCategory, ErrorSeverity } from './errorService';
import { errorService } from "@/services/errorService";

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  onMaxRetriesReached?: (error: any) => void;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open', 
  HALF_OPEN = 'half_open'
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalDuration: number;
  circuitBreakerTripped?: boolean;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - operation blocked');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = CircuitBreakerState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

export class RetryService {
  private static instance: RetryService;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  // Default configurations for different operation types
  private static readonly DEFAULT_CONFIGS: Record<string, RetryConfig> = {
    api_call: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => {
        // Retry on network errors, timeouts, and 5xx status codes
        return (
          error?.code === 'ECONNABORTED' ||
          error?.code === 'TIMEOUT' ||
          error?.code === 'NETWORK_ERROR' ||
          (error?.status >= 500 && error?.status < 600) ||
          error?.status === 429 // Rate limit
        );
      }
    },
    oauth_flow: {
      maxAttempts: 2,
      baseDelay: 2000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => {
        // Only retry on network errors and server errors, not on auth failures
        return (
          error?.code === 'ECONNABORTED' ||
          error?.code === 'TIMEOUT' ||
          error?.code === 'NETWORK_ERROR' ||
          error?.status >= 500 ||
          error?.status === 429 || // Rate limit
          (error?.retryable === true) ||
          (error?.message && (
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('connection')
          ))
        );
      }
    },
    blockchain_tx: {
      maxAttempts: 5,
      baseDelay: 3000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => {
        // Retry on network issues and gas errors, not on insufficient funds
        return (
          error?.message?.includes('network') ||
          error?.message?.includes('timeout') ||
          error?.message?.includes('gas') ||
          error?.message?.includes('nonce')
        );
      }
    },
    credential_creation: {
      maxAttempts: 3,
      baseDelay: 1500,
      maxDelay: 8000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => {
        // Retry on API errors but not on validation errors
        return (
          error?.category !== 'validation' &&
          (error?.retryable === true || 
           error?.status >= 500 ||
           error?.code === 'TIMEOUT')
        );
      }
    }
  };

  private constructor() {}

  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  /**
   * Execute operation with retry logic and circuit breaker
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: string = 'api_call',
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = {
      ...RetryService.DEFAULT_CONFIGS[operationType],
      ...customConfig
    };

    const startTime = Date.now();
    let lastError: any;
    let attempts = 0;

    // Get or create circuit breaker for this operation type
    const circuitBreaker = this.getCircuitBreaker(operationType);

    for (attempts = 1; attempts <= config.maxAttempts; attempts++) {
      try {
        // Check circuit breaker before attempting
        if (circuitBreaker.getState() === CircuitBreakerState.OPEN) {
          const circuitError = errorService.createError(
            'CIRCUIT_BREAKER_OPEN',
            `Circuit breaker is open for ${operationType}`,
            ErrorCategory.NETWORK,
            ErrorSeverity.HIGH,
            errorService.createContext({
              component: 'retry-service',
              action: operationType,
              metadata: { 
                attempts,
                circuitState: circuitBreaker.getState(),
                circuitMetrics: circuitBreaker.getMetrics()
              }
            }),
            {
              retryable: false,
              userMessage: 'Service temporarily unavailable. Please try again later.',
              recoveryActions: ['wait_and_retry', 'check_status']
            }
          );

          return {
            success: false,
            error: circuitError,
            attempts,
            totalDuration: Date.now() - startTime,
            circuitBreakerTripped: true
          };
        }

        // Execute operation through circuit breaker
        const result = await circuitBreaker.execute(operation);
        
        // Success!
        return {
          success: true,
          result,
          attempts,
          totalDuration: Date.now() - startTime
        };

      } catch (error) {
        lastError = error;

        // Log the attempt
        const retryError = errorService.createError(
          'RETRY_ATTEMPT_FAILED',
          `Attempt ${attempts}/${config.maxAttempts} failed for ${operationType}`,
          ErrorCategory.NETWORK,
          attempts === config.maxAttempts ? ErrorSeverity.HIGH : ErrorSeverity.LOW,
          errorService.createContext({
            component: 'retry-service',
            action: operationType,
            metadata: { 
              attempt: attempts,
              maxAttempts: config.maxAttempts,
              operationType,
              circuitState: circuitBreaker.getState()
            }
          }),
          {
            retryable: attempts < config.maxAttempts,
            originalError: error,
            userMessage: attempts < config.maxAttempts 
              ? `Retrying operation (attempt ${attempts}/${config.maxAttempts})...`
              : 'Operation failed after multiple attempts.'
          }
        );

        errorService.reportError(retryError);

        // Call onRetry callback if provided
        if (config.onRetry) {
          try {
            config.onRetry(attempts, error);
          } catch (callbackError) {
            console.warn('Error in retry callback:', callbackError);
          }
        }

        // Check if we should retry
        const shouldRetry = attempts < config.maxAttempts && 
          (config.retryCondition ? config.retryCondition(error) : true);

        if (!shouldRetry) {
          console.log(`⏭️ Skipping retry for ${operationType} (attempt ${attempts}/${config.maxAttempts}): retry condition not met`);
          break;
        }

        // Calculate delay with exponential backoff and jitter
        if (attempts < config.maxAttempts) {
          const delay = this.calculateDelay(attempts, config);
          await this.sleep(delay);
        }
      }
    }

    // All attempts exhausted
    if (config.onMaxRetriesReached) {
      try {
        config.onMaxRetriesReached(lastError);
      } catch (callbackError) {
        console.warn('Error in max retries callback:', callbackError);
      }
    }

    // Create final error
    const finalError = errorService.createError(
      'MAX_RETRIES_EXCEEDED',
      `Operation ${operationType} failed after ${attempts} attempts`,
      ErrorCategory.NETWORK,
      ErrorSeverity.HIGH,
      errorService.createContext({
        component: 'retry-service',
        action: operationType,
        metadata: { 
          attempts,
          maxAttempts: config.maxAttempts,
          operationType,
          totalDuration: Date.now() - startTime
        }
      }),
      {
        retryable: false,
        originalError: lastError,
        userMessage: 'Operation failed after multiple attempts. Please try again later.',
        recoveryActions: ['check_network', 'try_later', 'contact_support']
      }
    );

    return {
      success: false,
      error: finalError,
      attempts,
      totalDuration: Date.now() - startTime
    };
  }

  /**
   * Retry specifically for OAuth operations
   */
  async retryOAuthOperation<T>(
    operation: () => Promise<T>,
    provider: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = {
      ...RetryService.DEFAULT_CONFIGS.oauth_flow,
      ...customConfig,
      onRetry: (attempt: number, error: any) => {
        console.log(`[LOADING] Retrying ${provider} OAuth (attempt ${attempt}):`, error.message);
        // Optionally show user-friendly retry message
      },
      onMaxRetriesReached: (error: any) => {
        errorService.logError(`[ERROR] ${provider} OAuth failed after all retries:`, error);
      }
    };

    return this.executeWithRetry(operation, `oauth_${provider}`, config);
  }

  /**
   * Retry for API calls with smart error handling
   */
  async retryApiCall<T>(
    operation: () => Promise<T>,
    apiName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = {
      ...RetryService.DEFAULT_CONFIGS.api_call,
      ...customConfig,
      onRetry: (attempt: number, error: any) => {
        console.log(`[LOADING] Retrying ${apiName} API call (attempt ${attempt}):`, error.message);
      }
    };

    return this.executeWithRetry(operation, `api_${apiName}`, config);
  }

  /**
   * Retry for credential creation with specialized handling
   */
  async retryCredentialCreation<T>(
    operation: () => Promise<T>,
    credentialType: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = {
      ...RetryService.DEFAULT_CONFIGS.credential_creation,
      ...customConfig,
      onRetry: (attempt: number, error: any) => {
        console.log(`[LOADING] Retrying ${credentialType} credential creation (attempt ${attempt}):`, error.message);
      }
    };

    return this.executeWithRetry(operation, `credential_${credentialType}`, config);
  }

  /**
   * Get or create circuit breaker for operation type
   */
  private getCircuitBreaker(operationType: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationType)) {
      const config: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 30000 // 30 seconds
      };
      this.circuitBreakers.set(operationType, new CircuitBreaker(config));
    }
    return this.circuitBreakers.get(operationType)!;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );

    if (config.jitter) {
      // Add random jitter (±25% of delay)
      const jitterRange = exponentialDelay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(0, exponentialDelay + jitter);
    }

    return exponentialDelay;
  }

  /**
   * Sleep utility with proper typing
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [operationType, circuitBreaker] of this.circuitBreakers.entries()) {
      metrics[operationType] = circuitBreaker.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Reset circuit breaker for specific operation type
   */
  resetCircuitBreaker(operationType: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(operationType);
    if (circuitBreaker) {
      // Create new circuit breaker (effectively resets it)
      const config: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 30000
      };
      this.circuitBreakers.set(operationType, new CircuitBreaker(config));
      return true;
    }
    return false;
  }

  /**
   * Health check for all circuit breakers
   */
  getServiceHealth(): { healthy: boolean; details: Record<string, any> } {
    const details: Record<string, any> = {};
    let allHealthy = true;

    for (const [operationType, circuitBreaker] of this.circuitBreakers.entries()) {
      const metrics = circuitBreaker.getMetrics();
      const isHealthy = metrics.state !== CircuitBreakerState.OPEN;
      
      details[operationType] = {
        healthy: isHealthy,
        state: metrics.state,
        failureCount: metrics.failureCount,
        lastFailureTime: metrics.lastFailureTime
      };

      if (!isHealthy) {
        allHealthy = false;
      }
    }

    return {
      healthy: allHealthy,
      details
    };
  }
}

// Export singleton instance
export const retryService = RetryService.getInstance();

/**
 * Decorator for automatic retry on method calls
 */
export function withRetry(
  operationType: string = 'api_call',
  config?: Partial<RetryConfig>
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const operation = () => originalMethod.apply(this, args);
      
      const result = await retryService.executeWithRetry(
        operation,
        operationType,
        config
      );

      if (result.success) {
        return result.result;
      } else {
        throw result.error;
      }
    };

    return descriptor;
  };
}