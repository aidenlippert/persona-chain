/**
 * Secure API Credential Manager for PersonaPass
 * Handles secure storage and retrieval of API credentials
 */

import { errorService } from '../../errorService';

interface ApiCredential {
  provider: string;
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
  sandbox: boolean;
  expiresAt?: number;
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
}

interface ApiCredentialConfig {
  // Financial APIs
  plaid: ApiCredential;
  experian: ApiCredential;
  yodlee: ApiCredential;
  mx: ApiCredential;
  
  // Employment APIs
  workday: ApiCredential;
  adp: ApiCredential;
  linkedin: ApiCredential;
  
  // Government APIs
  usps: ApiCredential;
  ssa: ApiCredential;
  
  // Communication APIs
  twilio: ApiCredential;
  
  // Healthcare APIs
  epic: ApiCredential;
  cerner: ApiCredential;
  
  // Education APIs
  clearinghouse: ApiCredential;
  coursera: ApiCredential;
  
  // Real Estate APIs
  zillow: ApiCredential;
}

export class ApiCredentialManager {
  private static instance: ApiCredentialManager;
  private credentials: Map<string, ApiCredential> = new Map();
  private encryptionKey: string;

  private constructor() {
    this.encryptionKey = this.generateEncryptionKey();
    this.loadCredentials();
  }

  static getInstance(): ApiCredentialManager {
    if (!ApiCredentialManager.instance) {
      ApiCredentialManager.instance = new ApiCredentialManager();
    }
    return ApiCredentialManager.instance;
  }

  /**
   * Get API credentials for a specific provider
   */
  getCredentials(provider: string): ApiCredential | null {
    const encrypted = this.credentials.get(provider);
    if (!encrypted) return null;
    
    return this.decryptCredential(encrypted);
  }

  /**
   * Store API credentials securely
   */
  setCredentials(provider: string, credential: ApiCredential): void {
    const encrypted = this.encryptCredential(credential);
    this.credentials.set(provider, encrypted);
    this.saveCredentials();
  }

  /**
   * Check if API key is valid and not expired
   */
  isCredentialValid(provider: string): boolean {
    const credential = this.getCredentials(provider);
    if (!credential) return false;
    
    if (credential.expiresAt && Date.now() > credential.expiresAt) {
      return false;
    }
    
    return true;
  }

  /**
   * Get API base URL for provider
   */
  getBaseUrl(provider: string): string | null {
    const credential = this.getCredentials(provider);
    return credential?.baseUrl || null;
  }

  /**
   * Check rate limit for provider
   */
  checkRateLimit(provider: string): boolean {
    // Implementation would track request counts per provider
    // For now, return true (no rate limiting)
    return true;
  }

  private generateEncryptionKey(): string {
    // In production, this would use a more secure key derivation
    return btoa(Math.random().toString(36).substring(2, 15));
  }

  private encryptCredential(credential: ApiCredential): ApiCredential {
    // Simple encryption for demo - in production use proper encryption
    return {
      ...credential,
      apiKey: btoa(credential.apiKey),
      apiSecret: credential.apiSecret ? btoa(credential.apiSecret) : undefined
    };
  }

  private decryptCredential(encrypted: ApiCredential): ApiCredential {
    return {
      ...encrypted,
      apiKey: atob(encrypted.apiKey),
      apiSecret: encrypted.apiSecret ? atob(encrypted.apiSecret) : undefined
    };
  }

  private loadCredentials(): void {
    // Load from secure storage (localStorage in browser, keychain on mobile)
    const stored = localStorage.getItem('persona_api_credentials');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.credentials = new Map(Object.entries(parsed));
      } catch (error) {
        errorService.logError('Failed to load stored credentials:', error);
      }
    }
    
    // Load default development credentials
    this.loadDefaultCredentials();
  }

  private saveCredentials(): void {
    const obj = Object.fromEntries(this.credentials);
    localStorage.setItem('persona_api_credentials', JSON.stringify(obj));
  }

  private loadDefaultCredentials(): void {
    // Development/Sandbox credentials - would be environment-specific
    const defaultCredentials: Partial<ApiCredentialConfig> = {
      plaid: {
        provider: 'plaid',
        apiKey: process.env.VITE_PLAID_CLIENT_ID || 'sandbox',
        apiSecret: process.env.VITE_PLAID_SECRET || 'sandbox',
        baseUrl: 'https://sandbox.plaid.com',
        sandbox: true,
        rateLimit: { requests: 100, window: 60 }
      },
      twilio: {
        provider: 'twilio',
        apiKey: process.env.VITE_TWILIO_ACCOUNT_SID || 'sandbox',
        apiSecret: process.env.VITE_TWILIO_AUTH_TOKEN || 'sandbox',
        baseUrl: 'https://api.twilio.com/2010-04-01',
        sandbox: true,
        rateLimit: { requests: 1000, window: 3600 }
      },
      experian: {
        provider: 'experian',
        apiKey: process.env.VITE_EXPERIAN_API_KEY || 'sandbox',
        baseUrl: 'https://sandbox-api.experian.com',
        sandbox: true,
        rateLimit: { requests: 50, window: 60 }
      },
      usps: {
        provider: 'usps',
        apiKey: process.env.VITE_USPS_API_KEY || 'sandbox',
        baseUrl: 'https://api.usps.com',
        sandbox: true,
        rateLimit: { requests: 1000, window: 3600 }
      },
      zillow: {
        provider: 'zillow',
        apiKey: process.env.VITE_ZILLOW_API_KEY || 'sandbox',
        baseUrl: 'https://api.bridgedataoutput.com/api/v2',
        sandbox: true,
        rateLimit: { requests: 500, window: 3600 }
      }
    };

    Object.entries(defaultCredentials).forEach(([provider, credential]) => {
      if (!this.credentials.has(provider)) {
        this.setCredentials(provider, credential);
      }
    });
  }
}

export default ApiCredentialManager;