/**
 * 🏆 ENHANCED CREDENTIAL MANAGER - Enterprise Credential Lifecycle Management
 * ✨ Complete lifecycle management | 📅 Auto-expiration | 🔄 Smart updates
 * 📜 Version history | 🛡️ Trust scoring | 🔗 Integration management
 */

import { githubAPIService } from '../api-integrations/GitHubAPIService';
import { enhancedZKProofService } from '../enhancedZKProofService';
import { storageService } from '../storageService';
import { errorService } from '../errorService';

export interface CredentialMetadata {
  id: string;
  version: number;
  createdAt: string;
  updatedAt?: string;
  lastVerified?: string;
  expiresAt?: string;
  lifecycle: 'active' | 'expiring' | 'expired' | 'revoked' | 'suspended' | 'archived';
  trustScore: number;
  verificationCount: number;
  shareCount: number;
  source: string;
  sourceType: 'github' | 'linkedin' | 'plaid' | 'stripe' | 'custom';
  autoUpdate: boolean;
  updateInterval?: number; // in milliseconds
  zkProofGenerated: boolean;
  zkProofCount: number;
  integrationStatus: 'connected' | 'disconnected' | 'error';
  sensitivityLevel: 'public' | 'private' | 'confidential' | 'restricted';
  complianceFlags: string[];
  history: CredentialHistoryEntry[];
  tags: string[];
  issuanceProof?: string;
  revocationReason?: string;
  securityFlags: SecurityFlag[];
}

export interface CredentialHistoryEntry {
  version: number;
  action: 'created' | 'updated' | 'verified' | 'shared' | 'zk_proof_generated' | 'refreshed' | 'archived' | 'revoked' | 'restored';
  timestamp: string;
  actor: string;
  changes?: string[];
  metadata?: any;
  previousValue?: any;
  newValue?: any;
}

export interface SecurityFlag {
  type: 'warning' | 'error' | 'info';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved?: boolean;
}

export interface CredentialUpdateResult {
  success: boolean;
  updated: boolean;
  newVersion?: number;
  changes?: string[];
  error?: string;
  trustScoreChange?: number;
}

export interface ZKProofResult {
  success: boolean;
  proofId?: string;
  commitment?: string;
  proofData?: any;
  error?: string;
}

/**
 * Enhanced Credential Manager - Enterprise-grade credential lifecycle management
 */
export class EnhancedCredentialManager {
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private trustScoreCache: Map<string, { score: number; timestamp: number }> = new Map();

  /**
   * Initialize credential with full metadata and lifecycle setup
   */
  async initializeCredential(credential: any, sourceType: string): Promise<CredentialMetadata> {
    const now = new Date().toISOString();
    
    // Determine lifecycle settings based on source type
    const lifecycleConfig = this.getLifecycleConfig(sourceType);
    
    const metadata: CredentialMetadata = {
      id: credential.id,
      version: 1,
      createdAt: now,
      lastVerified: now,
      expiresAt: lifecycleConfig.expiresAt,
      lifecycle: 'active',
      trustScore: await this.calculateInitialTrustScore(credential, sourceType),
      verificationCount: 1,
      shareCount: 0,
      source: credential.issuer || sourceType,
      sourceType: sourceType as any,
      autoUpdate: lifecycleConfig.autoUpdate,
      updateInterval: lifecycleConfig.updateInterval,
      zkProofGenerated: false,
      zkProofCount: 0,
      integrationStatus: 'connected',
      sensitivityLevel: lifecycleConfig.sensitivityLevel,
      complianceFlags: lifecycleConfig.complianceFlags,
      history: [{
        version: 1,
        action: 'created',
        timestamp: now,
        actor: 'system',
        metadata: { sourceType, initialTrustScore: await this.calculateInitialTrustScore(credential, sourceType) }
      }],
      tags: this.generateInitialTags(credential, sourceType),
      securityFlags: []
    };

    // Store metadata
    await this.storeCredentialMetadata(credential.id, metadata);
    
    // Setup auto-update if enabled
    if (metadata.autoUpdate && metadata.updateInterval) {
      this.setupAutoUpdate(credential.id, metadata.updateInterval);
    }
    
    // Schedule expiration checks
    this.scheduleExpirationCheck(credential.id, metadata.expiresAt);
    
    return metadata;
  }

  /**
   * Update credential data from source
   */
  async updateCredential(credentialId: string): Promise<CredentialUpdateResult> {
    try {
      console.log(`🔄 Updating credential: ${credentialId}`);
      
      const metadata = await this.getCredentialMetadata(credentialId);
      if (!metadata) {
        return { success: false, updated: false, error: 'Credential metadata not found' };
      }

      const credential = await this.getCredential(credentialId);
      if (!credential) {
        return { success: false, updated: false, error: 'Credential not found' };
      }

      // Fetch fresh data from source
      let updatedData: any;
      let changes: string[] = [];

      switch (metadata.sourceType) {
        case 'github':
          updatedData = await this.updateGitHubCredential(credential);
          changes = this.detectGitHubChanges(credential, updatedData);
          break;
        default:
          return { success: false, updated: false, error: `Update not supported for source type: ${metadata.sourceType}` };
      }

      // Check if there are actual changes
      if (changes.length === 0) {
        console.log('✅ No changes detected, credential is up-to-date');
        await this.updateLastVerified(credentialId);
        return { success: true, updated: false };
      }

      // Create new version
      const newVersion = metadata.version + 1;
      const now = new Date().toISOString();
      
      // Update credential data
      const updatedCredential = {
        ...credential,
        ...updatedData,
        id: credentialId, // Preserve original ID
        version: newVersion,
        issuanceDate: credential.issuanceDate, // Preserve original issuance date
        updatedAt: now
      };

      // Store updated credential
      await this.storeCredential(updatedCredential);

      // Calculate new trust score
      const oldTrustScore = metadata.trustScore;
      const newTrustScore = await this.calculateTrustScore(updatedCredential, metadata.sourceType, metadata);
      
      // Update metadata
      const updatedMetadata: CredentialMetadata = {
        ...metadata,
        version: newVersion,
        updatedAt: now,
        lastVerified: now,
        trustScore: newTrustScore,
        verificationCount: metadata.verificationCount + 1,
        history: [
          ...metadata.history,
          {
            version: newVersion,
            action: 'updated',
            timestamp: now,
            actor: 'system',
            changes,
            previousValue: credential.credentialSubject,
            newValue: updatedCredential.credentialSubject
          }
        ]
      };

      await this.storeCredentialMetadata(credentialId, updatedMetadata);

      console.log(`✅ Credential updated successfully: version ${newVersion}`);
      return {
        success: true,
        updated: true,
        newVersion,
        changes,
        trustScoreChange: newTrustScore - oldTrustScore
      };

    } catch (error) {
      console.error('❌ Failed to update credential:', error);
      return {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate ZK proof for credential
   */
  async generateZKProof(credentialId: string, options?: { selective?: string[] }): Promise<ZKProofResult> {
    try {
      console.log(`🛡️ Generating ZK proof for credential: ${credentialId}`);
      
      const credential = await this.getCredential(credentialId);
      const metadata = await this.getCredentialMetadata(credentialId);
      
      if (!credential || !metadata) {
        return { success: false, error: 'Credential not found' };
      }

      // Generate ZK proof using enhanced service
      const zkProof = await enhancedZKProofService.generateOptimizedProof(
        credential,
        'selective_disclosure',
        options?.selective || Object.keys(credential.credentialSubject || {}),
        {
          selectiveFields: options?.selective || Object.keys(credential.credentialSubject || {}),
          useCache: true,
          performanceMode: 'balanced',
          constraintOptimization: true
        }
      );

      if (!zkProof || !zkProof.proof) {
        return { success: false, error: 'ZK proof generation failed' };
      }

      // Update metadata
      const now = new Date().toISOString();
      const updatedMetadata: CredentialMetadata = {
        ...metadata,
        zkProofGenerated: true,
        zkProofCount: metadata.zkProofCount + 1,
        history: [
          ...metadata.history,
          {
            version: metadata.version,
            action: 'zk_proof_generated',
            timestamp: now,
            actor: 'user',
            metadata: { 
              proofId: zkProof.nullifier, // Use nullifier as proof ID
              selectiveFields: options?.selective 
            }
          }
        ]
      };

      await this.storeCredentialMetadata(credentialId, updatedMetadata);

      console.log(`✅ ZK proof generated successfully: ${zkProof.nullifier}`);
      return {
        success: true,
        proofId: zkProof.nullifier,
        commitment: zkProof.commitment,
        proofData: zkProof.proof
      };

    } catch (error) {
      console.error('❌ Failed to generate ZK proof:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Archive credential (soft delete)
   */
  async archiveCredential(credentialId: string, reason?: string): Promise<boolean> {
    try {
      const metadata = await this.getCredentialMetadata(credentialId);
      if (!metadata) return false;

      const now = new Date().toISOString();
      const updatedMetadata: CredentialMetadata = {
        ...metadata,
        lifecycle: 'archived',
        history: [
          ...metadata.history,
          {
            version: metadata.version,
            action: 'archived',
            timestamp: now,
            actor: 'user',
            metadata: { reason }
          }
        ]
      };

      await this.storeCredentialMetadata(credentialId, updatedMetadata);
      
      // Clear auto-update if set
      if (this.updateIntervals.has(credentialId)) {
        clearInterval(this.updateIntervals.get(credentialId)!);
        this.updateIntervals.delete(credentialId);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to archive credential:', error);
      return false;
    }
  }

  /**
   * Revoke credential
   */
  async revokeCredential(credentialId: string, reason: string): Promise<boolean> {
    try {
      const metadata = await this.getCredentialMetadata(credentialId);
      if (!metadata) return false;

      const now = new Date().toISOString();
      const updatedMetadata: CredentialMetadata = {
        ...metadata,
        lifecycle: 'revoked',
        revocationReason: reason,
        integrationStatus: 'disconnected',
        history: [
          ...metadata.history,
          {
            version: metadata.version,
            action: 'revoked',
            timestamp: now,
            actor: 'user',
            metadata: { reason }
          }
        ]
      };

      await this.storeCredentialMetadata(credentialId, updatedMetadata);
      
      // Clear auto-update
      if (this.updateIntervals.has(credentialId)) {
        clearInterval(this.updateIntervals.get(credentialId)!);
        this.updateIntervals.delete(credentialId);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to revoke credential:', error);
      return false;
    }
  }

  /**
   * Get all credentials with metadata
   */
  async getAllCredentialsWithMetadata(): Promise<Array<{ credential: any; metadata: CredentialMetadata }>> {
    try {
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      const results = [];

      for (const credential of credentials) {
        const metadata = await this.getCredentialMetadata(credential.id);
        if (metadata) {
          results.push({ credential, metadata });
        } else {
          // Create metadata for credentials without it
          const newMetadata = await this.initializeCredential(credential, this.detectSourceType(credential));
          results.push({ credential, metadata: newMetadata });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to get credentials with metadata:', error);
      return [];
    }
  }

  /**
   * Run lifecycle management for all credentials
   */
  async runLifecycleManagement(): Promise<void> {
    console.log('🔄 Running credential lifecycle management...');
    
    const credentialsWithMetadata = await this.getAllCredentialsWithMetadata();
    
    for (const { credential, metadata } of credentialsWithMetadata) {
      await this.checkCredentialLifecycle(credential.id, metadata);
    }
  }

  // PRIVATE METHODS

  private getLifecycleConfig(sourceType: string) {
    const configs = {
      github: {
        expiresAt: null, // GitHub credentials don't expire
        autoUpdate: true,
        updateInterval: 24 * 60 * 60 * 1000, // 24 hours
        sensitivityLevel: 'public' as const,
        complianceFlags: ['SOC2', 'GDPR']
      },
      linkedin: {
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        autoUpdate: true,
        updateInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
        sensitivityLevel: 'private' as const,
        complianceFlags: ['GDPR', 'SOC2']
      },
      plaid: {
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        autoUpdate: true,
        updateInterval: 24 * 60 * 60 * 1000, // 24 hours
        sensitivityLevel: 'confidential' as const,
        complianceFlags: ['PCI-DSS', 'SOC2', 'FFIEC']
      },
      stripe: {
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        autoUpdate: true,
        updateInterval: 12 * 60 * 60 * 1000, // 12 hours
        sensitivityLevel: 'restricted' as const,
        complianceFlags: ['PCI-DSS', 'SOC2', 'KYC']
      },
      default: {
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        autoUpdate: false,
        updateInterval: undefined,
        sensitivityLevel: 'private' as const,
        complianceFlags: ['GDPR']
      }
    };

    return configs[sourceType as keyof typeof configs] || configs.default;
  }

  private async calculateInitialTrustScore(credential: any, sourceType: string): Promise<number> {
    let score = 50; // Base score

    // Source type bonuses
    const sourceBonus = {
      github: 20,
      linkedin: 15,
      plaid: 25,
      stripe: 30,
      custom: 0
    };
    score += sourceBonus[sourceType as keyof typeof sourceBonus] || 0;

    // Credential completeness
    const subjectKeys = Object.keys(credential.credentialSubject || {});
    score += Math.min(subjectKeys.length * 2, 20);

    // Has proof
    if (credential.proof) score += 10;

    return Math.min(score, 100);
  }

  private async calculateTrustScore(credential: any, sourceType: string, metadata: CredentialMetadata): Promise<number> {
    const cacheKey = `${credential.id}-${metadata.version}`;
    const cached = this.trustScoreCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) { // 1 hour cache
      return cached.score;
    }

    let score = await this.calculateInitialTrustScore(credential, sourceType);
    
    // Verification frequency bonus
    score += Math.min(metadata.verificationCount * 2, 15);
    
    // Age factor (newer is generally better for dynamic data)
    const daysSinceUpdate = (Date.now() - new Date(metadata.updatedAt || metadata.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) score += 10;
    else if (daysSinceUpdate < 30) score += 5;
    else if (daysSinceUpdate > 90) score -= 10;
    
    // ZK proof bonus
    if (metadata.zkProofGenerated) score += 10;
    
    // Integration status
    if (metadata.integrationStatus === 'connected') score += 5;
    else if (metadata.integrationStatus === 'error') score -= 15;

    // Security flags penalty
    const criticalFlags = metadata.securityFlags.filter(f => f.severity === 'critical' && !f.resolved);
    score -= criticalFlags.length * 20;

    const finalScore = Math.max(0, Math.min(score, 100));
    
    this.trustScoreCache.set(cacheKey, { score: finalScore, timestamp: Date.now() });
    return finalScore;
  }

  private detectSourceType(credential: any): string {
    if (credential.credentialSubject?.platform === 'github') return 'github';
    if (credential.issuer?.includes('linkedin')) return 'linkedin';
    if (credential.issuer?.includes('plaid')) return 'plaid';
    if (credential.issuer?.includes('stripe')) return 'stripe';
    return 'custom';
  }

  private generateInitialTags(credential: any, sourceType: string): string[] {
    const tags = [sourceType];
    
    if (credential.type) {
      tags.push(...credential.type.filter((t: string) => t !== 'VerifiableCredential'));
    }
    
    if (credential.credentialSubject?.platform) {
      tags.push(credential.credentialSubject.platform);
    }

    return tags;
  }

  private async updateGitHubCredential(credential: any): Promise<any> {
    // Use the existing GitHub service to get fresh data
    const storedCredential = githubAPIService.getStoredCredential();
    
    if (storedCredential && storedCredential.credentialSubject) {
      return {
        credentialSubject: {
          ...credential.credentialSubject,
          // Update with potentially new data (in real implementation, this would fetch fresh data)
          lastUpdated: new Date().toISOString(),
          // Add any new fields that might have been added
          ...storedCredential.credentialSubject
        }
      };
    }
    
    return credential;
  }

  private detectGitHubChanges(oldCredential: any, newCredential: any): string[] {
    const changes: string[] = [];
    const oldSubject = oldCredential.credentialSubject || {};
    const newSubject = newCredential.credentialSubject || {};
    
    // Check for changes in key fields
    const checkFields = ['username', 'name', 'email', 'publicRepos', 'followers', 'following'];
    
    for (const field of checkFields) {
      if (oldSubject[field] !== newSubject[field]) {
        changes.push(`${field}: ${oldSubject[field]} → ${newSubject[field]}`);
      }
    }
    
    return changes;
  }

  private setupAutoUpdate(credentialId: string, intervalMs: number): void {
    if (this.updateIntervals.has(credentialId)) {
      clearInterval(this.updateIntervals.get(credentialId)!);
    }
    
    const interval = setInterval(async () => {
      try {
        await this.updateCredential(credentialId);
      } catch (error) {
        console.error(`❌ Auto-update failed for credential ${credentialId}:`, error);
      }
    }, intervalMs);
    
    this.updateIntervals.set(credentialId, interval);
  }

  private scheduleExpirationCheck(credentialId: string, expiresAt?: string): void {
    if (!expiresAt) return;
    
    const expirationTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const timeUntilExpiry = expirationTime - now;
    
    if (timeUntilExpiry > 0) {
      // Schedule warning 7 days before expiry
      const warningTime = timeUntilExpiry - (7 * 24 * 60 * 60 * 1000);
      if (warningTime > 0) {
        setTimeout(async () => {
          await this.markCredentialExpiring(credentialId);
        }, warningTime);
      }
      
      // Schedule expiration
      setTimeout(async () => {
        await this.markCredentialExpired(credentialId);
      }, timeUntilExpiry);
    } else {
      // Already expired
      this.markCredentialExpired(credentialId);
    }
  }

  private async markCredentialExpiring(credentialId: string): Promise<void> {
    const metadata = await this.getCredentialMetadata(credentialId);
    if (!metadata || metadata.lifecycle !== 'active') return;

    const updatedMetadata: CredentialMetadata = {
      ...metadata,
      lifecycle: 'expiring',
      history: [
        ...metadata.history,
        {
          version: metadata.version,
          action: 'updated',
          timestamp: new Date().toISOString(),
          actor: 'system',
          metadata: { lifecycleChange: 'active → expiring' }
        }
      ]
    };

    await this.storeCredentialMetadata(credentialId, updatedMetadata);
    console.log(`⚠️ Credential ${credentialId} is expiring soon`);
  }

  private async markCredentialExpired(credentialId: string): Promise<void> {
    const metadata = await this.getCredentialMetadata(credentialId);
    if (!metadata) return;

    const updatedMetadata: CredentialMetadata = {
      ...metadata,
      lifecycle: 'expired',
      integrationStatus: 'disconnected',
      history: [
        ...metadata.history,
        {
          version: metadata.version,
          action: 'updated',
          timestamp: new Date().toISOString(),
          actor: 'system',
          metadata: { lifecycleChange: 'expiring → expired' }
        }
      ]
    };

    await this.storeCredentialMetadata(credentialId, updatedMetadata);
    
    // Clear auto-update
    if (this.updateIntervals.has(credentialId)) {
      clearInterval(this.updateIntervals.get(credentialId)!);
      this.updateIntervals.delete(credentialId);
    }

    console.log(`❌ Credential ${credentialId} has expired`);
  }

  private async checkCredentialLifecycle(credentialId: string, metadata: CredentialMetadata): Promise<void> {
    // Check for expiration
    if (metadata.expiresAt && metadata.lifecycle === 'active') {
      const daysUntilExpiry = Math.ceil((new Date(metadata.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        await this.markCredentialExpired(credentialId);
      } else if (daysUntilExpiry <= 7 && metadata.lifecycle === 'active') {
        await this.markCredentialExpiring(credentialId);
      }
    }
    
    // Check for stale credentials that need updates
    if (metadata.autoUpdate && metadata.integrationStatus === 'connected') {
      const daysSinceUpdate = (Date.now() - new Date(metadata.lastVerified || metadata.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const updateIntervalDays = (metadata.updateInterval || 24 * 60 * 60 * 1000) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > updateIntervalDays) {
        console.log(`🔄 Auto-updating stale credential: ${credentialId}`);
        await this.updateCredential(credentialId);
      }
    }
  }

  private async updateLastVerified(credentialId: string): Promise<void> {
    const metadata = await this.getCredentialMetadata(credentialId);
    if (!metadata) return;

    const updatedMetadata: CredentialMetadata = {
      ...metadata,
      lastVerified: new Date().toISOString(),
      verificationCount: metadata.verificationCount + 1
    };

    await this.storeCredentialMetadata(credentialId, updatedMetadata);
  }

  // Storage helpers
  private async storeCredentialMetadata(credentialId: string, metadata: CredentialMetadata): Promise<void> {
    localStorage.setItem(`credential_metadata_${credentialId}`, JSON.stringify(metadata));
  }

  private async getCredentialMetadata(credentialId: string): Promise<CredentialMetadata | null> {
    try {
      const data = localStorage.getItem(`credential_metadata_${credentialId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Failed to get credential metadata:', error);
      return null;
    }
  }

  private async storeCredential(credential: any): Promise<void> {
    const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
    const index = credentials.findIndex((c: any) => c.id === credential.id);
    
    if (index >= 0) {
      credentials[index] = credential;
    } else {
      credentials.push(credential);
    }
    
    localStorage.setItem('credentials', JSON.stringify(credentials));
  }

  private async getCredential(credentialId: string): Promise<any | null> {
    try {
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      return credentials.find((c: any) => c.id === credentialId) || null;
    } catch (error) {
      console.error('❌ Failed to get credential:', error);
      return null;
    }
  }
}

// Export singleton instance
export const enhancedCredentialManager = new EnhancedCredentialManager();

// Start lifecycle management on load
enhancedCredentialManager.runLifecycleManagement();