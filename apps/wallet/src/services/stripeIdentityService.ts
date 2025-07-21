/**
 * Stripe Identity Service - Real-time Identity Verification & KYC
 * Provides government ID verification, address verification, and age verification
 */

import { loadStripe } from '@stripe/stripe-js';
import { vcManagerService } from './vcManagerService';
import { analyticsService } from './analyticsService';
import { errorService } from "@/services/errorService";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export interface VerificationSession {
  id: string;
  object: 'identity.verification_session';
  client_secret: string;
  created: number;
  last_error: any;
  metadata: Record<string, string>;
  options: {
    document: {
      allowed_types: string[];
      require_id_number: boolean;
      require_live_capture: boolean;
      require_matching_selfie: boolean;
    };
  };
  redacted: any;
  status: 'requires_input' | 'processing' | 'verified' | 'canceled';
  type: 'document' | 'id_number';
  url: string;
  verified_outputs: {
    address?: {
      city: string;
      country: string;
      line1: string;
      line2?: string;
      postal_code: string;
      state: string;
    };
    dob?: {
      day: number;
      month: number;
      year: number;
    };
    first_name?: string;
    last_name?: string;
    id_number?: string;
    id_number_type?: string;
  };
}

export interface IdentityVerificationResult {
  verified: boolean;
  session: VerificationSession;
  credential?: any;
  error?: string;
}

export interface KYCVerificationOptions {
  requireIdNumber: boolean;
  requireLiveCapture: boolean;
  requireMatchingSelfie: boolean;
  allowedDocumentTypes: string[];
  metadata?: Record<string, string>;
}

class StripeIdentityService {
  private stripe: any;
  private initialized = false;

  constructor() {
    this.initializeStripe();
  }

  private async initializeStripe() {
    try {
      this.stripe = await stripePromise;
      this.initialized = true;
    } catch (error) {
      errorService.logError('Failed to initialize Stripe:', error);
      throw new Error('Stripe initialization failed');
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeStripe();
    }
  }

  /**
   * Create a new identity verification session
   */
  async createVerificationSession(
    options: KYCVerificationOptions
  ): Promise<VerificationSession> {
    await this.ensureInitialized();

    try {
      const response = await fetch('/api/stripe/identity/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          options: {
            document: {
              allowed_types: options.allowedDocumentTypes,
              require_id_number: options.requireIdNumber,
              require_live_capture: options.requireLiveCapture,
              require_matching_selfie: options.requireMatchingSelfie,
            },
          },
          metadata: options.metadata || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create verification session: ${response.status}`);
      }

      const session = await response.json();
      
      // Track verification session creation
      analyticsService.trackEvent(
        'identity_verification',
        'session_created',
        'stripe_identity',
        this.getUserId(),
        {
          sessionId: session.id,
          options: JSON.stringify(options),
          timestamp: Date.now(),
        }
      );

      return session;
    } catch (error) {
      errorService.logError('Error creating verification session:', error);
      throw error;
    }
  }

  /**
   * Start identity verification process
   */
  async startVerification(
    options: KYCVerificationOptions = {
      requireIdNumber: true,
      requireLiveCapture: true,
      requireMatchingSelfie: true,
      allowedDocumentTypes: ['driving_license', 'passport', 'id_card'],
    }
  ): Promise<IdentityVerificationResult> {
    try {
      // Create verification session
      const session = await this.createVerificationSession(options);

      // Open Stripe Identity modal
      const result = await this.stripe.verifyIdentity(session.client_secret);

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Get the updated session
      const updatedSession = await this.getVerificationSession(session.id);

      if (updatedSession.status === 'verified') {
        // Create verifiable credential from verification
        const credential = await this.createIdentityCredential(updatedSession);

        // Track successful verification
        analyticsService.trackEvent(
          'identity_verification',
          'verification_completed',
          'stripe_identity',
          this.getUserId(),
          {
            sessionId: session.id,
            verified: true,
            timestamp: Date.now(),
          }
        );

        return {
          verified: true,
          session: updatedSession,
          credential,
        };
      }

      return {
        verified: false,
        session: updatedSession,
        error: 'Verification not completed',
      };
    } catch (error) {
      errorService.logError('Identity verification error:', error);
      
      // Track verification error
      analyticsService.trackEvent(
        'identity_verification',
        'verification_failed',
        'stripe_identity',
        this.getUserId(),
        {
          error: error.message,
          timestamp: Date.now(),
        }
      );

      return {
        verified: false,
        session: null as any,
        error: error.message,
      };
    }
  }

  /**
   * Get verification session details
   */
  async getVerificationSession(sessionId: string): Promise<VerificationSession> {
    try {
      const response = await fetch(`/api/stripe/identity/session/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get verification session: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      errorService.logError('Error getting verification session:', error);
      throw error;
    }
  }

  /**
   * Create verifiable credential from Stripe verification
   */
  private async createIdentityCredential(
    session: VerificationSession
  ): Promise<any> {
    const verified = session.verified_outputs;
    
    if (!verified) {
      throw new Error('No verified outputs available');
    }

    const credentialData = {
      type: 'IdentityVerification',
      issuer: 'stripe_identity',
      subject: this.getUserId(),
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: this.getUserId(),
        verificationMethod: 'government_id',
        verificationProvider: 'stripe_identity',
        verificationSession: session.id,
        verifiedClaims: {
          ...(verified.first_name && { firstName: verified.first_name }),
          ...(verified.last_name && { lastName: verified.last_name }),
          ...(verified.dob && {
            dateOfBirth: `${verified.dob.year}-${verified.dob.month.toString().padStart(2, '0')}-${verified.dob.day.toString().padStart(2, '0')}`,
          }),
          ...(verified.address && {
            address: {
              streetAddress: verified.address.line1,
              ...(verified.address.line2 && { streetAddress2: verified.address.line2 }),
              city: verified.address.city,
              state: verified.address.state,
              postalCode: verified.address.postal_code,
              country: verified.address.country,
            },
          }),
          ...(verified.id_number && {
            idNumber: verified.id_number,
            idNumberType: verified.id_number_type,
          }),
        },
        verificationLevel: 'government_id',
        verificationTimestamp: new Date(session.created * 1000).toISOString(),
      },
    };

    // Create and store credential
    const credential = await vcManagerService.createCredential(credentialData);
    
    return credential;
  }

  /**
   * Verify age from identity verification
   */
  async verifyAge(minimumAge: number): Promise<{
    verified: boolean;
    age?: number;
    credential?: any;
    error?: string;
  }> {
    try {
      const verificationResult = await this.startVerification({
        requireIdNumber: false,
        requireLiveCapture: true,
        requireMatchingSelfie: true,
        allowedDocumentTypes: ['driving_license', 'passport', 'id_card'],
        metadata: {
          purpose: 'age_verification',
          minimumAge: minimumAge.toString(),
        },
      });

      if (!verificationResult.verified) {
        return {
          verified: false,
          error: verificationResult.error,
        };
      }

      const dob = verificationResult.session.verified_outputs?.dob;
      if (!dob) {
        return {
          verified: false,
          error: 'Date of birth not available',
        };
      }

      const birthDate = new Date(dob.year, dob.month - 1, dob.day);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1
        : age;

      const isVerified = actualAge >= minimumAge;

      // Create age verification credential
      const ageCredential = await vcManagerService.createCredential({
        type: 'AgeVerification',
        issuer: 'stripe_identity',
        subject: this.getUserId(),
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: this.getUserId(),
          ageVerified: isVerified,
          minimumAge: minimumAge,
          verificationMethod: 'government_id',
          verificationProvider: 'stripe_identity',
          verificationTimestamp: new Date().toISOString(),
        },
      });

      return {
        verified: isVerified,
        age: actualAge,
        credential: ageCredential,
      };
    } catch (error) {
      errorService.logError('Age verification error:', error);
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify address from identity verification
   */
  async verifyAddress(): Promise<{
    verified: boolean;
    address?: any;
    credential?: any;
    error?: string;
  }> {
    try {
      const verificationResult = await this.startVerification({
        requireIdNumber: false,
        requireLiveCapture: true,
        requireMatchingSelfie: false,
        allowedDocumentTypes: ['driving_license', 'utility_bill', 'bank_statement'],
        metadata: {
          purpose: 'address_verification',
        },
      });

      if (!verificationResult.verified) {
        return {
          verified: false,
          error: verificationResult.error,
        };
      }

      const address = verificationResult.session.verified_outputs?.address;
      if (!address) {
        return {
          verified: false,
          error: 'Address not available',
        };
      }

      // Create address verification credential
      const addressCredential = await vcManagerService.createCredential({
        type: 'AddressVerification',
        issuer: 'stripe_identity',
        subject: this.getUserId(),
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: this.getUserId(),
          verifiedAddress: {
            streetAddress: address.line1,
            ...(address.line2 && { streetAddress2: address.line2 }),
            city: address.city,
            state: address.state,
            postalCode: address.postal_code,
            country: address.country,
          },
          verificationMethod: 'government_id',
          verificationProvider: 'stripe_identity',
          verificationTimestamp: new Date().toISOString(),
        },
      });

      return {
        verified: true,
        address,
        credential: addressCredential,
      };
    } catch (error) {
      errorService.logError('Address verification error:', error);
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all identity verification sessions for user
   */
  async getVerificationHistory(): Promise<VerificationSession[]> {
    try {
      const response = await fetch('/api/stripe/identity/sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get verification history: ${response.status}`);
      }

      const data = await response.json();
      return data.sessions || [];
    } catch (error) {
      errorService.logError('Error getting verification history:', error);
      return [];
    }
  }

  /**
   * Cancel verification session
   */
  async cancelVerification(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/stripe/identity/cancel/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel verification: ${response.status}`);
      }

      // Track cancellation
      analyticsService.trackEvent(
        'identity_verification',
        'verification_cancelled',
        'stripe_identity',
        this.getUserId(),
        {
          sessionId,
          timestamp: Date.now(),
        }
      );

      return true;
    } catch (error) {
      errorService.logError('Error cancelling verification:', error);
      return false;
    }
  }

  /**
   * Get user ID for tracking
   */
  private getUserId(): string {
    return localStorage.getItem('persona_user_id') || 'anonymous';
  }

  /**
   * Check if Stripe Identity is properly configured
   */
  async checkConfiguration(): Promise<{
    configured: boolean;
    error?: string;
  }> {
    try {
      await this.ensureInitialized();
      
      if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
        return {
          configured: false,
          error: 'Stripe publishable key not configured',
        };
      }

      // Test API connectivity
      const response = await fetch('/api/stripe/identity/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          configured: false,
          error: 'Stripe Identity API not available',
        };
      }

      return { configured: true };
    } catch (error) {
      return {
        configured: false,
        error: error.message,
      };
    }
  }
}

export const stripeIdentityService = new StripeIdentityService();