/**
 * Experian Automation Service
 * Automated credit verification and credential generation
 */

import { ExperianService, CreditScoreRequest, CreditVerificationResult } from '../ExperianService';
import { VerifiableCredential } from '../../types/identity';
import { storageService } from '../storageService';
import { errorService } from "@/services/errorService";

export interface ExperianAutomationConfig {
  autoGenerateCredentials: boolean;
  storeCredentials: boolean;
  verificationLevel: 'BASIC' | 'STANDARD' | 'COMPREHENSIVE';
  retryAttempts: number;
  cacheDuration: number; // hours
}

export interface AutomatedCreditVerificationResult {
  success: boolean;
  verificationId: string;
  creditScore?: number;
  riskGrade?: string;
  verificationLevel?: string;
  credential?: VerifiableCredential;
  error?: string;
  fromCache?: boolean;
  cacheExpiry?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    automationId: string;
    retryCount: number;
    processingTime: number;
  };
}

export interface CreditVerificationStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  description: string;
  startTime?: string;
  endTime?: string;
  error?: string;
  data?: any;
}

export class ExperianAutomationService {
  private experianService: ExperianService;
  private config: ExperianAutomationConfig;

  constructor(config: Partial<ExperianAutomationConfig> = {}) {
    this.experianService = ExperianService.create({
      sandboxMode: process.env.NODE_ENV !== 'production'
    });

    this.config = {
      autoGenerateCredentials: true,
      storeCredentials: true,
      verificationLevel: 'STANDARD',
      retryAttempts: 3,
      cacheDuration: 24, // 24 hours
      ...config
    };
  }

  /**
   * Complete automated Experian credit verification workflow
   */
  async completeAutomatedCreditVerification(
    request: CreditScoreRequest,
    userDid: string
  ): Promise<AutomatedCreditVerificationResult> {
    const automationId = `experian_auto_${Date.now()}`;
    const startTime = Date.now();

    console.log('🤖 Starting automated Experian credit verification...');
    console.log(`👤 User: ${request.firstName} ${request.lastName}`);

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = await this.getCachedResult(cacheKey);

      if (cachedResult) {
        console.log('📋 Using cached credit verification result');
        return {
          ...cachedResult,
          fromCache: true,
          metadata: {
            ...cachedResult.metadata,
            automationId,
            processingTime: Date.now() - startTime
          }
        };
      }

      // Perform credit verification with retries
      let lastError: Error | null = null;
      let retryCount = 0;

      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        retryCount = attempt;

        try {
          console.log(`🔄 Credit verification attempt ${attempt + 1}/${this.config.retryAttempts + 1}`);

          const verificationResult = await this.experianService.performCreditVerification(
            request,
            userDid
          );

          if (verificationResult.success) {
            // Store credential if enabled
            if (this.config.storeCredentials && verificationResult.credential) {
              await this.storeCredential(verificationResult.credential);
            }

            const result: AutomatedCreditVerificationResult = {
              success: true,
              verificationId: verificationResult.verificationId,
              creditScore: verificationResult.creditScore,
              riskGrade: verificationResult.riskGrade,
              verificationLevel: verificationResult.verificationLevel,
              credential: verificationResult.credential,
              fromCache: false,
              metadata: {
                requestId: verificationResult.metadata.requestId,
                timestamp: new Date().toISOString(),
                automationId,
                retryCount,
                processingTime: Date.now() - startTime
              }
            };

            // Cache successful result
            await this.cacheResult(cacheKey, result);

            console.log('✅ Automated credit verification completed successfully');
            console.log(`📊 Credit Score: ${verificationResult.creditScore} (${verificationResult.riskGrade})`);

            return result;
          } else {
            throw new Error(verificationResult.error || 'Credit verification failed');
          }

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.log(`❌ Attempt ${attempt + 1} failed:`, lastError.message);

          if (attempt < this.config.retryAttempts) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All attempts failed
      return {
        success: false,
        verificationId: '',
        error: lastError?.message || 'Credit verification failed after all retry attempts',
        fromCache: false,
        metadata: {
          requestId: '',
          timestamp: new Date().toISOString(),
          automationId,
          retryCount,
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      errorService.logError('❌ Automated credit verification failed:', error);

      return {
        success: false,
        verificationId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        fromCache: false,
        metadata: {
          requestId: '',
          timestamp: new Date().toISOString(),
          automationId,
          retryCount: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Execute step-by-step credit verification with detailed tracking
   */
  async executeStepByCreditVerification(
    request: CreditScoreRequest,
    userDid: string,
    onStepUpdate?: (step: CreditVerificationStep) => void
  ): Promise<AutomatedCreditVerificationResult> {
    const automationId = `experian_stepped_${Date.now()}`;
    const startTime = Date.now();

    const steps: CreditVerificationStep[] = [
      {
        id: 'validation',
        name: 'Input Validation',
        status: 'pending',
        description: 'Validating personal information and request data'
      },
      {
        id: 'cache_check',
        name: 'Cache Check',
        status: 'pending',
        description: 'Checking for existing cached credit verification'
      },
      {
        id: 'experian_api',
        name: 'Experian API Call',
        status: 'pending',
        description: 'Fetching credit score and report from Experian'
      },
      {
        id: 'credential_generation',
        name: 'Credential Generation',
        status: 'pending',
        description: 'Generating verifiable credential for credit verification'
      },
      {
        id: 'storage',
        name: 'Storage',
        status: 'pending',
        description: 'Storing credential and caching results'
      }
    ];

    const updateStep = (stepId: string, updates: Partial<CreditVerificationStep>) => {
      const step = steps.find(s => s.id === stepId);
      if (step) {
        Object.assign(step, updates);
        if (updates.status === 'in_progress') {
          step.startTime = new Date().toISOString();
        } else if (updates.status === 'completed' || updates.status === 'failed') {
          step.endTime = new Date().toISOString();
        }
        onStepUpdate?.(step);
      }
    };

    try {
      // Step 1: Input Validation
      updateStep('validation', { status: 'in_progress' });
      
      if (!request.firstName || !request.lastName || !request.dateOfBirth || !request.ssn) {
        updateStep('validation', { 
          status: 'failed', 
          error: 'Missing required personal information' 
        });
        throw new Error('Missing required personal information for credit verification');
      }

      updateStep('validation', { status: 'completed' });

      // Step 2: Cache Check
      updateStep('cache_check', { status: 'in_progress' });
      
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = await this.getCachedResult(cacheKey);

      if (cachedResult) {
        updateStep('cache_check', { 
          status: 'completed', 
          data: { cacheHit: true, expiry: cachedResult.cacheExpiry } 
        });

        // Skip remaining steps
        steps.slice(2).forEach(step => {
          updateStep(step.id, { status: 'completed', description: 'Skipped - using cached result' });
        });

        return {
          ...cachedResult,
          fromCache: true,
          metadata: {
            ...cachedResult.metadata,
            automationId,
            processingTime: Date.now() - startTime
          }
        };
      }

      updateStep('cache_check', { 
        status: 'completed', 
        data: { cacheHit: false } 
      });

      // Step 3: Experian API Call
      updateStep('experian_api', { status: 'in_progress' });

      const verificationResult = await this.experianService.performCreditVerification(
        request,
        userDid
      );

      if (!verificationResult.success) {
        updateStep('experian_api', { 
          status: 'failed', 
          error: verificationResult.error 
        });
        throw new Error(verificationResult.error || 'Credit verification failed');
      }

      updateStep('experian_api', { 
        status: 'completed',
        data: {
          creditScore: verificationResult.creditScore,
          riskGrade: verificationResult.riskGrade,
          requestId: verificationResult.metadata.requestId
        }
      });

      // Step 4: Credential Generation (already done in previous step)
      updateStep('credential_generation', { 
        status: 'completed',
        data: { credentialGenerated: !!verificationResult.credential }
      });

      // Step 5: Storage
      updateStep('storage', { status: 'in_progress' });

      if (this.config.storeCredentials && verificationResult.credential) {
        await this.storeCredential(verificationResult.credential);
      }

      const result: AutomatedCreditVerificationResult = {
        success: true,
        verificationId: verificationResult.verificationId,
        creditScore: verificationResult.creditScore,
        riskGrade: verificationResult.riskGrade,
        verificationLevel: verificationResult.verificationLevel,
        credential: verificationResult.credential,
        fromCache: false,
        metadata: {
          requestId: verificationResult.metadata.requestId,
          timestamp: new Date().toISOString(),
          automationId,
          retryCount: 0,
          processingTime: Date.now() - startTime
        }
      };

      await this.cacheResult(cacheKey, result);

      updateStep('storage', { 
        status: 'completed',
        data: { cached: true, stored: this.config.storeCredentials }
      });

      console.log('✅ Step-by-step credit verification completed successfully');

      return result;

    } catch (error) {
      errorService.logError('❌ Step-by-step credit verification failed:', error);

      return {
        success: false,
        verificationId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        fromCache: false,
        metadata: {
          requestId: '',
          timestamp: new Date().toISOString(),
          automationId,
          retryCount: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Generate cache key for credit verification
   */
  private generateCacheKey(request: CreditScoreRequest): string {
    const keyData = `${request.firstName}_${request.lastName}_${request.dateOfBirth}_${request.ssn}`;
    return `experian_credit_${btoa(keyData).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Get cached verification result
   */
  private async getCachedResult(cacheKey: string): Promise<AutomatedCreditVerificationResult | null> {
    try {
      const cached = await storageService.get(`credit_cache_${cacheKey}`);
      
      if (cached && cached.cacheExpiry && new Date(cached.cacheExpiry) > new Date()) {
        return cached;
      }

      // Remove expired cache
      if (cached) {
        await storageService.delete(`credit_cache_${cacheKey}`);
      }

      return null;
    } catch (error) {
      errorService.logError('❌ Failed to get cached result:', error);
      return null;
    }
  }

  /**
   * Cache verification result
   */
  private async cacheResult(cacheKey: string, result: AutomatedCreditVerificationResult): Promise<void> {
    try {
      const cacheExpiry = new Date(Date.now() + this.config.cacheDuration * 60 * 60 * 1000).toISOString();
      
      const cacheData = {
        ...result,
        cacheExpiry
      };

      await storageService.set(`credit_cache_${cacheKey}`, cacheData);
      console.log(`📋 Cached credit verification result until ${cacheExpiry}`);
    } catch (error) {
      errorService.logError('❌ Failed to cache result:', error);
    }
  }

  /**
   * Store credential in user's wallet
   */
  private async storeCredential(credential: VerifiableCredential): Promise<void> {
    try {
      const existingCredentials = await storageService.get('credentials') || [];
      const updatedCredentials = [credential, ...existingCredentials];
      
      await storageService.set('credentials', updatedCredentials);
      console.log('💾 Credit verification credential stored successfully');
    } catch (error) {
      errorService.logError('❌ Failed to store credential:', error);
      throw error;
    }
  }

  /**
   * Get automation configuration
   */
  getConfig(): ExperianAutomationConfig {
    return { ...this.config };
  }

  /**
   * Update automation configuration
   */
  updateConfig(updates: Partial<ExperianAutomationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('⚙️ Experian automation configuration updated:', updates);
  }
}

// Export default instance
export const experianAutomationService = new ExperianAutomationService();