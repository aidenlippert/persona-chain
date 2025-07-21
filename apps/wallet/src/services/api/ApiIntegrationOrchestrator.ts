/**
 * API Integration Orchestrator for PersonaPass
 * Unified interface for all verified data API integrations
 */

import { PlaidApiService } from './providers/PlaidApiService';
import { TwilioApiService } from './providers/TwilioApiService';
import { VCGenerationFramework } from './vc/VCGenerationFramework';
import { ApiCredentialManager } from './credentials/ApiCredentialManager';
import { VerifiableCredential } from '../../types/credentials';

export interface VerificationSession {
  id: string;
  provider: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  credential?: VerifiableCredential;
  error?: string;
  metadata?: any;
}

export interface VerificationRequest {
  type: 'bank_account' | 'income' | 'phone' | 'address' | 'employment' | 'education';
  provider: string;
  data: any;
  subjectDid: string;
  generateZK?: boolean;
}

export interface VerificationResult {
  success: boolean;
  sessionId: string;
  credential?: VerifiableCredential;
  zkProof?: any;
  error?: string;
  metadata?: any;
}

export class ApiIntegrationOrchestrator {
  private static instance: ApiIntegrationOrchestrator;
  private sessions: Map<string, VerificationSession> = new Map();
  private credentialManager: ApiCredentialManager;
  private vcFramework: VCGenerationFramework;
  
  // Service instances
  private plaidService: PlaidApiService;
  private twilioService: TwilioApiService;

  private constructor() {
    this.credentialManager = ApiCredentialManager.getInstance();
    this.vcFramework = VCGenerationFramework.getInstance();
    
    // Initialize services
    this.plaidService = new PlaidApiService();
    this.twilioService = new TwilioApiService();
  }

  static getInstance(): ApiIntegrationOrchestrator {
    if (!ApiIntegrationOrchestrator.instance) {
      ApiIntegrationOrchestrator.instance = new ApiIntegrationOrchestrator();
    }
    return ApiIntegrationOrchestrator.instance;
  }

  /**
   * Start a new verification session
   */
  async startVerification(request: VerificationRequest): Promise<VerificationResult> {
    const sessionId = this.generateSessionId();
    
    const session: VerificationSession = {
      id: sessionId,
      provider: request.provider,
      type: request.type,
      status: 'pending',
      startedAt: Date.now(),
      metadata: { generateZK: request.generateZK }
    };

    this.sessions.set(sessionId, session);

    try {
      session.status = 'in_progress';
      this.sessions.set(sessionId, session);

      let result: VerificationResult;

      switch (request.type) {
        case 'bank_account':
          result = await this.verifyBankAccount(request, sessionId);
          break;
        case 'income':
          result = await this.verifyIncome(request, sessionId);
          break;
        case 'phone':
          result = await this.verifyPhone(request, sessionId);
          break;
        case 'address':
          result = await this.verifyAddress(request, sessionId);
          break;
        case 'employment':
          result = await this.verifyEmployment(request, sessionId);
          break;
        case 'education':
          result = await this.verifyEducation(request, sessionId);
          break;
        default:
          throw new Error(`Unsupported verification type: ${request.type}`);
      }

      // Update session with result
      session.status = result.success ? 'completed' : 'failed';
      session.completedAt = Date.now();
      session.credential = result.credential;
      session.error = result.error;
      this.sessions.set(sessionId, session);

      return result;
    } catch (error) {
      session.status = 'failed';
      session.error = (error as Error).message;
      session.completedAt = Date.now();
      this.sessions.set(sessionId, session);

      return {
        success: false,
        sessionId,
        error: (error as Error).message
      };
    }
  }

  /**
   * Verify bank account using Plaid
   */
  private async verifyBankAccount(
    request: VerificationRequest,
    sessionId: string
  ): Promise<VerificationResult> {
    const { data, subjectDid } = request;

    if (request.provider === 'plaid') {
      const { accessToken } = data;
      
      const credential = await this.plaidService.generateBankAccountVC(accessToken, subjectDid);
      
      if (!credential) {
        throw new Error('Failed to generate bank account credential');
      }

      return {
        success: true,
        sessionId,
        credential,
        metadata: {
          provider: 'plaid',
          type: 'bank_account'
        }
      };
    }

    throw new Error(`Unsupported bank verification provider: ${request.provider}`);
  }

  /**
   * Verify income using Plaid
   */
  private async verifyIncome(
    request: VerificationRequest,
    sessionId: string
  ): Promise<VerificationResult> {
    const { data, subjectDid } = request;

    if (request.provider === 'plaid') {
      const { accessToken } = data;
      
      const credential = await this.plaidService.generateIncomeVerificationVC(accessToken, subjectDid);
      
      if (!credential) {
        throw new Error('Failed to generate income verification credential');
      }

      return {
        success: true,
        sessionId,
        credential,
        metadata: {
          provider: 'plaid',
          type: 'income'
        }
      };
    }

    throw new Error(`Unsupported income verification provider: ${request.provider}`);
  }

  /**
   * Verify phone number using Twilio
   */
  private async verifyPhone(
    request: VerificationRequest,
    sessionId: string
  ): Promise<VerificationResult> {
    const { data, subjectDid } = request;

    if (request.provider === 'twilio') {
      const { phoneNumber, verificationCode } = data;
      
      const result = await this.twilioService.completePhoneVerification(
        phoneNumber,
        verificationCode,
        subjectDid,
        true // Include lookup data
      );

      if (!result.verified) {
        throw new Error(result.error || 'Phone verification failed');
      }

      return {
        success: true,
        sessionId,
        credential: result.credential,
        metadata: {
          provider: 'twilio',
          type: 'phone'
        }
      };
    }

    throw new Error(`Unsupported phone verification provider: ${request.provider}`);
  }

  /**
   * Verify address (placeholder for USPS integration)
   */
  private async verifyAddress(
    request: VerificationRequest,
    sessionId: string
  ): Promise<VerificationResult> {
    // TODO: Implement USPS address verification
    throw new Error('Address verification not yet implemented');
  }

  /**
   * Verify employment (placeholder for Workday/ADP integration)
   */
  private async verifyEmployment(
    request: VerificationRequest,
    sessionId: string
  ): Promise<VerificationResult> {
    // TODO: Implement employment verification
    throw new Error('Employment verification not yet implemented');
  }

  /**
   * Verify education (placeholder for National Student Clearinghouse integration)
   */
  private async verifyEducation(
    request: VerificationRequest,
    sessionId: string
  ): Promise<VerificationResult> {
    // TODO: Implement education verification
    throw new Error('Education verification not yet implemented');
  }

  /**
   * Get verification session status
   */
  getSession(sessionId: string): VerificationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all verification sessions for analytics
   */
  getAllSessions(): VerificationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get sessions by status
   */
  getSessionsByStatus(status: VerificationSession['status']): VerificationSession[] {
    return Array.from(this.sessions.values()).filter(session => session.status === status);
  }

  /**
   * Get available verification providers
   */
  getAvailableProviders(): Record<string, string[]> {
    return {
      bank_account: ['plaid'],
      income: ['plaid'],
      phone: ['twilio'],
      address: ['usps'],
      employment: ['workday', 'adp'],
      education: ['clearinghouse', 'coursera']
    };
  }

  /**
   * Check if provider is available and configured
   */
  isProviderAvailable(provider: string): boolean {
    return this.credentialManager.isCredentialValid(provider);
  }

  /**
   * Get provider status
   */
  getProviderStatus(): Record<string, { available: boolean; configured: boolean }> {
    const providers = ['plaid', 'twilio', 'usps', 'workday', 'adp', 'clearinghouse'];
    const status: Record<string, { available: boolean; configured: boolean }> = {};

    providers.forEach(provider => {
      const credentials = this.credentialManager.getCredentials(provider);
      status[provider] = {
        available: !!credentials,
        configured: this.credentialManager.isCredentialValid(provider)
      };
    });

    return status;
  }

  /**
   * Initialize Plaid Link for bank account verification
   */
  async initializePlaidLink(userId: string): Promise<{ linkToken: string }> {
    const response = await this.plaidService.createLinkToken(userId);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create Plaid link token');
    }

    return {
      linkToken: response.data.link_token
    };
  }

  /**
   * Send phone verification code
   */
  async sendPhoneVerificationCode(phoneNumber: string, method: 'sms' | 'call' = 'sms'): Promise<{ success: boolean; error?: string }> {
    const response = await this.twilioService.sendVerificationCode(phoneNumber, method);
    
    return {
      success: response.success,
      error: response.error
    };
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old sessions (should be called periodically)
   */
  cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startedAt < cutoff) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export default ApiIntegrationOrchestrator;