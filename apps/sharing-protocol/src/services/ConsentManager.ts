import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import {
  ConsentRecord,
  ConsentRecordSchema,
  ProofShareRequest,
  ProofShareResponse,
  ConsentError,
  SharingAnalytics,
} from '../types/sharing.js';

export interface ConsentManagerConfig {
  requireExplicitConsent: boolean;
  consentExpiryDays: number;
  enableAuditLog: boolean;
  maxConsentRecords: number;
  autoRevokeOnExpiry: boolean;
}

export interface ConsentDecision {
  consentGiven: boolean;
  selectedProofs: string[]; // domain names of proofs to share
  customConditions?: Record<string, any>;
  expiresAt?: string;
  signature: string;
}

export class ConsentManager extends EventEmitter {
  private consentRecords: Map<string, ConsentRecord> = new Map();
  private config: ConsentManagerConfig;

  constructor(config: Partial<ConsentManagerConfig> = {}) {
    super();
    
    this.config = {
      requireExplicitConsent: true,
      consentExpiryDays: 30,
      enableAuditLog: true,
      maxConsentRecords: 10000,
      autoRevokeOnExpiry: true,
      ...config,
    };

    console.log('✅ PersonaPass Consent Manager initialized');
    console.log(`   Explicit consent required: ${this.config.requireExplicitConsent}`);
    console.log(`   Default expiry: ${this.config.consentExpiryDays} days`);
  }

  /**
   * Request consent for sharing proofs
   */
  async requestConsent(
    holderDid: string,
    request: ProofShareRequest
  ): Promise<{
    consentId: string;
    requiresDecision: boolean;
    existingConsent?: ConsentRecord;
  }> {
    const consentId = nanoid(16);

    // Check for existing valid consent
    const existingConsent = this.findValidConsent(holderDid, request);
    if (existingConsent && !this.config.requireExplicitConsent) {
      console.log(`✅ Found existing consent for ${holderDid} to ${request.requester.did}`);
      return {
        consentId: existingConsent.id,
        requiresDecision: false,
        existingConsent,
      };
    }

    console.log(`📋 Requesting consent from ${holderDid} for ${request.requester.name}`);
    console.log(`   Purpose: ${request.purpose}`);
    console.log(`   Requested proofs: ${request.requestedProofs.length}`);

    this.emit('consentRequested', {
      consentId,
      holderDid,
      request,
    });

    return {
      consentId,
      requiresDecision: true,
      existingConsent,
    };
  }

  /**
   * Record consent decision
   */
  async recordConsent(
    consentId: string,
    holderDid: string,
    requesterDid: string,
    request: ProofShareRequest,
    decision: ConsentDecision
  ): Promise<ConsentRecord> {
    if (!this.verifyConsentSignature(decision)) {
      throw new ConsentError('Invalid consent signature');
    }

    const now = new Date().toISOString();
    const expiresAt = decision.expiresAt || new Date(
      Date.now() + this.config.consentExpiryDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const consentRecord: ConsentRecord = {
      id: consentId,
      holderDid,
      requesterDid,
      sharedProofs: decision.selectedProofs,
      purpose: request.purpose,
      consentGiven: decision.consentGiven,
      consentWithdrawn: false,
      signature: decision.signature,
      timestamp: now,
      expiresAt,
      auditLog: [{
        action: 'given',
        timestamp: now,
        details: {
          requestedProofs: request.requestedProofs.map(p => p.domain),
          selectedProofs: decision.selectedProofs,
          customConditions: decision.customConditions,
        },
      }],
    };

    // Validate against schema
    ConsentRecordSchema.parse(consentRecord);

    // Store consent record
    this.consentRecords.set(consentId, consentRecord);

    // Emit event
    this.emit('consentRecorded', consentRecord);

    if (decision.consentGiven) {
      console.log(`✅ Consent granted by ${holderDid} to ${requesterDid}`);
      console.log(`   Sharing: ${decision.selectedProofs.join(', ')}`);
      console.log(`   Expires: ${expiresAt}`);
    } else {
      console.log(`❌ Consent denied by ${holderDid} to ${requesterDid}`);
    }

    return consentRecord;
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    consentId: string,
    holderDid: string,
    reason?: string
  ): Promise<ConsentRecord> {
    const consent = this.consentRecords.get(consentId);
    if (!consent) {
      throw new ConsentError('Consent record not found', { consentId });
    }

    if (consent.holderDid !== holderDid) {
      throw new ConsentError('Unauthorized to withdraw this consent');
    }

    if (consent.consentWithdrawn) {
      throw new ConsentError('Consent already withdrawn');
    }

    const now = new Date().toISOString();
    const updatedConsent: ConsentRecord = {
      ...consent,
      consentWithdrawn: true,
      auditLog: [
        ...consent.auditLog,
        {
          action: 'withdrawn',
          timestamp: now,
          details: { reason },
        },
      ],
    };

    this.consentRecords.set(consentId, updatedConsent);
    this.emit('consentWithdrawn', updatedConsent);

    console.log(`🚫 Consent withdrawn by ${holderDid}`);
    console.log(`   Consent ID: ${consentId}`);
    console.log(`   Reason: ${reason || 'Not specified'}`);

    return updatedConsent;
  }

  /**
   * Log consent access/usage
   */
  async logConsentUsage(
    consentId: string,
    action: 'accessed' | 'shared',
    details?: Record<string, any>
  ): Promise<void> {
    const consent = this.consentRecords.get(consentId);
    if (!consent) {
      throw new ConsentError('Consent record not found', { consentId });
    }

    if (!this.config.enableAuditLog) {
      return;
    }

    const now = new Date().toISOString();
    const updatedConsent: ConsentRecord = {
      ...consent,
      auditLog: [
        ...consent.auditLog,
        {
          action,
          timestamp: now,
          details,
        },
      ],
    };

    this.consentRecords.set(consentId, updatedConsent);
    this.emit('consentUsed', { consent: updatedConsent, action, details });

    console.log(`📝 Consent ${action}: ${consentId}`);
  }

  /**
   * Validate consent for a sharing operation
   */
  async validateConsent(
    holderDid: string,
    requesterDid: string,
    requestedProofs: string[]
  ): Promise<{
    valid: boolean;
    consent?: ConsentRecord;
    reason?: string;
  }> {
    // Find all valid consents between these parties
    const validConsents = Array.from(this.consentRecords.values()).filter(consent =>
      consent.holderDid === holderDid &&
      consent.requesterDid === requesterDid &&
      consent.consentGiven &&
      !consent.consentWithdrawn &&
      new Date() < new Date(consent.expiresAt!)
    );

    if (validConsents.length === 0) {
      return {
        valid: false,
        reason: 'No valid consent found',
      };
    }

    // Check if any consent covers all requested proofs
    for (const consent of validConsents) {
      const allowedProofs = new Set(consent.sharedProofs);
      const hasAllProofs = requestedProofs.every(proof => allowedProofs.has(proof));
      
      if (hasAllProofs) {
        await this.logConsentUsage(consent.id, 'accessed', {
          requestedProofs,
          requesterDid,
        });

        return {
          valid: true,
          consent,
        };
      }
    }

    return {
      valid: false,
      reason: 'Consent does not cover all requested proofs',
    };
  }

  /**
   * Get consent history for a holder
   */
  getConsentHistory(
    holderDid: string,
    options?: {
      requesterDid?: string;
      status?: 'active' | 'withdrawn' | 'expired' | 'all';
      limit?: number;
    }
  ): ConsentRecord[] {
    let consents = Array.from(this.consentRecords.values())
      .filter(consent => consent.holderDid === holderDid);

    if (options?.requesterDid) {
      consents = consents.filter(consent => consent.requesterDid === options.requesterDid);
    }

    if (options?.status && options.status !== 'all') {
      const now = new Date();
      consents = consents.filter(consent => {
        switch (options.status) {
          case 'active':
            return consent.consentGiven && 
                   !consent.consentWithdrawn && 
                   new Date(consent.expiresAt!) > now;
          case 'withdrawn':
            return consent.consentWithdrawn;
          case 'expired':
            return !consent.consentWithdrawn && 
                   new Date(consent.expiresAt!) <= now;
          default:
            return true;
        }
      });
    }

    // Sort by timestamp (newest first)
    consents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (options?.limit) {
      consents = consents.slice(0, options.limit);
    }

    return consents;
  }

  /**
   * Get consent analytics
   */
  getConsentAnalytics(): {
    totalConsents: number;
    activeConsents: number;
    withdrawnConsents: number;
    expiredConsents: number;
    consentRate: number;
    withdrawalRate: number;
    topRequesters: Array<{
      did: string;
      consentCount: number;
    }>;
    averageConsentDuration: number; // days
  } {
    const consents = Array.from(this.consentRecords.values());
    const now = new Date();

    const activeConsents = consents.filter(c => 
      c.consentGiven && 
      !c.consentWithdrawn && 
      new Date(c.expiresAt!) > now
    );
    
    const withdrawnConsents = consents.filter(c => c.consentWithdrawn);
    const expiredConsents = consents.filter(c => 
      !c.consentWithdrawn && 
      new Date(c.expiresAt!) <= now
    );

    const givenConsents = consents.filter(c => c.consentGiven);
    const consentRate = consents.length > 0 ? givenConsents.length / consents.length : 0;
    const withdrawalRate = givenConsents.length > 0 ? withdrawnConsents.length / givenConsents.length : 0;

    // Calculate top requesters
    const requesterCounts = new Map<string, number>();
    consents.forEach(consent => {
      requesterCounts.set(
        consent.requesterDid,
        (requesterCounts.get(consent.requesterDid) || 0) + 1
      );
    });

    const topRequesters = Array.from(requesterCounts.entries())
      .map(([did, count]) => ({ did, consentCount: count }))
      .sort((a, b) => b.consentCount - a.consentCount)
      .slice(0, 10);

    // Calculate average consent duration
    const completedConsents = [...withdrawnConsents, ...expiredConsents];
    const avgDuration = completedConsents.length > 0
      ? completedConsents.reduce((sum, consent) => {
          const start = new Date(consent.timestamp).getTime();
          const end = consent.consentWithdrawn 
            ? new Date(consent.auditLog.find(log => log.action === 'withdrawn')?.timestamp || consent.timestamp).getTime()
            : new Date(consent.expiresAt!).getTime();
          return sum + (end - start);
        }, 0) / (completedConsents.length * 24 * 60 * 60 * 1000) // Convert to days
      : 0;

    return {
      totalConsents: consents.length,
      activeConsents: activeConsents.length,
      withdrawnConsents: withdrawnConsents.length,
      expiredConsents: expiredConsents.length,
      consentRate,
      withdrawalRate,
      topRequesters,
      averageConsentDuration: Math.round(avgDuration * 100) / 100,
    };
  }

  /**
   * Clean up expired consents
   */
  cleanupExpiredConsents(): number {
    if (!this.config.autoRevokeOnExpiry) {
      return 0;
    }

    const now = new Date();
    let cleanedCount = 0;

    for (const [id, consent] of this.consentRecords.entries()) {
      if (!consent.consentWithdrawn && new Date(consent.expiresAt!) <= now) {
        // Mark as withdrawn due to expiry
        const updatedConsent: ConsentRecord = {
          ...consent,
          consentWithdrawn: true,
          auditLog: [
            ...consent.auditLog,
            {
              action: 'withdrawn',
              timestamp: now.toISOString(),
              details: { reason: 'Automatic expiry' },
            },
          ],
        };

        this.consentRecords.set(id, updatedConsent);
        this.emit('consentExpired', updatedConsent);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Auto-revoked ${cleanedCount} expired consents`);
    }

    return cleanedCount;
  }

  /**
   * Find existing valid consent
   */
  private findValidConsent(
    holderDid: string,
    request: ProofShareRequest
  ): ConsentRecord | null {
    const now = new Date();
    const requestedDomains = request.requestedProofs.map(p => p.domain);

    for (const consent of this.consentRecords.values()) {
      if (
        consent.holderDid === holderDid &&
        consent.requesterDid === request.requester.did &&
        consent.consentGiven &&
        !consent.consentWithdrawn &&
        consent.expiresAt &&
        new Date(consent.expiresAt) > now
      ) {
        // Check if consent covers all requested domains
        const allowedDomains = new Set(consent.sharedProofs);
        const coversAllDomains = requestedDomains.every(domain => allowedDomains.has(domain));
        
        if (coversAllDomains) {
          return consent;
        }
      }
    }

    return null;
  }

  /**
   * Verify consent signature (simplified implementation)
   */
  private verifyConsentSignature(decision: ConsentDecision): boolean {
    // In production, implement proper cryptographic signature verification
    // For now, just check that signature is present and not empty
    return decision.signature && decision.signature.length > 0;
  }
}