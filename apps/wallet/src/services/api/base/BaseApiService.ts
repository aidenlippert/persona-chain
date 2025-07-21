/**
 * Base API Service for PersonaPass - Consistent API integration patterns
 */

import { ApiCredentialManager } from '../credentials/ApiCredentialManager';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  rateLimit?: {
    remaining: number;
    reset: number;
  };
}

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export abstract class BaseApiService {
  protected credentialManager: ApiCredentialManager;
  protected provider: string;
  protected baseUrl: string;

  constructor(provider: string) {
    this.credentialManager = ApiCredentialManager.getInstance();
    this.provider = provider;
    
    const baseUrl = this.credentialManager.getBaseUrl(provider);
    if (!baseUrl) {
      throw new Error(`No base URL configured for provider: ${provider}`);
    }
    this.baseUrl = baseUrl;
  }

  /**
   * Execute API request with automatic retry and rate limiting
   */
  protected async executeRequest<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const { method, endpoint, data, headers = {}, timeout = 30000, retries = 3 } = config;

    // Check if credentials are valid
    if (!this.credentialManager.isCredentialValid(this.provider)) {
      return {
        success: false,
        error: `Invalid or expired credentials for ${this.provider}`,
        statusCode: 401
      };
    }

    // Check rate limiting
    if (!this.credentialManager.checkRateLimit(this.provider)) {
      return {
        success: false,
        error: `Rate limit exceeded for ${this.provider}`,
        statusCode: 429
      };
    }

    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...headers
    };

    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseData = await response.json();

        if (response.ok) {
          return {
            success: true,
            data: responseData,
            statusCode: response.status,
            rateLimit: this.extractRateLimit(response)
          };
        } else {
          return {
            success: false,
            error: responseData.message || responseData.error || 'API request failed',
            statusCode: response.status
          };
        }
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    return {
      success: false,
      error: `Request failed after ${retries + 1} attempts: ${lastError.message}`,
      statusCode: 500
    };
  }

  /**
   * Get authentication headers for the provider
   */
  protected getAuthHeaders(): Record<string, string> {
    const credentials = this.credentialManager.getCredentials(this.provider);
    if (!credentials) {
      throw new Error(`No credentials found for provider: ${this.provider}`);
    }

    // Default to API key in header - override in specific services
    return {
      'Authorization': `Bearer ${credentials.apiKey}`
    };
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimit(response: Response): { remaining: number; reset: number } | undefined {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (remaining && reset) {
      return {
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10)
      };
    }
    
    return undefined;
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate required fields in API response
   */
  protected validateResponse<T>(data: any, requiredFields: string[]): T | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    for (const field of requiredFields) {
      if (!(field in data)) {
        console.warn(`Missing required field: ${field}`);
        return null;
      }
    }

    return data as T;
  }

  /**
   * Format error for user display
   */
  protected formatError(error: string): string {
    // Remove sensitive information and format for user
    return error
      .replace(/API key|token|secret/gi, '[REDACTED]')
      .replace(/\b\d{4,}\b/g, '[REDACTED]');
  }
}

export default BaseApiService;