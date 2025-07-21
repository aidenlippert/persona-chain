/**
 * Validation Service
 * Handles validation of verifiable presentations and credentials
 */

import { EventEmitter } from '../utils/eventEmitter';
import { CryptoService } from './crypto';
import { ValidationErrorClass } from '../types';
import type {
  SDKConfig,
  VerifiablePresentation,
  VerifiableCredential,
  ValidationResult,
  ValidationError as IValidationError,
  ValidationWarning,
  Proof
} from '../types';

interface ValidationStats {
  total_validations: number;
  successful_validations: number;
  failed_validations: number;
  total_validation_time_ms: number;
}

export class ValidationService extends EventEmitter {
  private config: SDKConfig;
  private cryptoService: CryptoService;
  private stats: ValidationStats = {
    total_validations: 0,
    successful_validations: 0,
    failed_validations: 0,
    total_validation_time_ms: 0
  };
  private validationCache = new Map<string, ValidationResult>();

  constructor(config: SDKConfig, cryptoService: CryptoService) {
    super();
    this.config = config;
    this.cryptoService = cryptoService;
  }

  /**
   * Validate a verifiable presentation
   */
  async validatePresentation(
    presentation: VerifiablePresentation,
    challenge?: string,
    domain?: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    this.stats.total_validations++;

    try {
      const errors: IValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Basic structure validation
      await this.validatePresentationStructure(presentation, errors, warnings);

      // Validate proof
      if (presentation.proof) {
        await this.validateProof(presentation.proof, presentation, errors, warnings, challenge, domain);
      } else {
        errors.push({
          code: 'MISSING_PROOF',
          message: 'Presentation must include a proof',
          severity: 'critical'
        });
      }

      // Validate each credential
      for (const credential of presentation.verifiableCredential) {
        await this.validateCredential(credential, errors, warnings);
      }

      // Check holder binding
      await this.validateHolderBinding(presentation, errors, warnings);

      const isValid = errors.filter(e => e.severity === 'critical').length === 0;
      
      if (isValid) {
        this.stats.successful_validations++;
      } else {
        this.stats.failed_validations++;
      }

      const validationTime = Date.now() - startTime;
      this.stats.total_validation_time_ms += validationTime;

      const result: ValidationResult = {
        valid: isValid,
        errors,
        warnings,
        metadata: {
          verified_at: new Date().toISOString(),
          verifier: this.config.verifier.id,
          validation_time_ms: validationTime
        }
      };

      // Cache result
      this.cacheValidationResult(presentation.id, result);

      this.emit('presentation_validated', { presentation, result });
      return result;
    } catch (error) {
      this.stats.failed_validations++;
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      throw new ValidationErrorClass(`Presentation validation failed: ${message}`, {
        presentation_id: presentation.id
      });
    }
  }

  /**
   * Validate credential structure and content
   */
  async validateCredential(
    credential: VerifiableCredential,
    errors: IValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      // Basic structure validation
      if (!credential.id) {
        errors.push({
          code: 'MISSING_CREDENTIAL_ID',
          message: 'Credential must have an id',
          severity: 'critical'
        });
      }

      if (!credential.type || !Array.isArray(credential.type)) {
        errors.push({
          code: 'INVALID_CREDENTIAL_TYPE',
          message: 'Credential must have a type array',
          severity: 'critical'
        });
      }

      if (!credential.issuer) {
        errors.push({
          code: 'MISSING_ISSUER',
          message: 'Credential must have an issuer',
          severity: 'critical'
        });
      }

      if (!credential.credentialSubject) {
        errors.push({
          code: 'MISSING_SUBJECT',
          message: 'Credential must have a credentialSubject',
          severity: 'critical'
        });
      }

      // Date validation
      if (credential.issuanceDate) {
        const issuanceDate = new Date(credential.issuanceDate);
        if (isNaN(issuanceDate.getTime())) {
          errors.push({
            code: 'INVALID_ISSUANCE_DATE',
            message: 'Invalid issuance date format',
            severity: 'major'
          });
        }
      }

      // Expiration check
      if (this.config.validation.check_expiration && credential.expirationDate) {
        const expirationDate = new Date(credential.expirationDate);
        if (expirationDate < new Date()) {
          errors.push({
            code: 'CREDENTIAL_EXPIRED',
            message: 'Credential has expired',
            severity: 'critical'
          });
        } else if (expirationDate < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
          warnings.push({
            code: 'CREDENTIAL_EXPIRING_SOON',
            message: 'Credential expires within 24 hours',
            recommendation: 'Request credential renewal'
          });
        }
      }

      // Revocation check
      if (this.config.validation.check_revocation && credential.credentialStatus) {
        const revocationStatus = await this.checkCredentialStatus(credential.id);
        if (revocationStatus.revoked) {
          errors.push({
            code: 'CREDENTIAL_REVOKED',
            message: `Credential has been revoked: ${revocationStatus.reason || 'Unknown reason'}`,
            severity: 'critical'
          });
        }
      }

      // Issuer trust validation
      if (this.config.validation.check_issuer_trust) {
        const issuerDid = typeof credential.issuer === 'string' 
          ? credential.issuer 
          : credential.issuer.id;
        
        const trustResult = await this.verifyIssuerTrust(issuerDid);
        if (!trustResult.trusted) {
          if (trustResult.level === 'untrusted') {
            errors.push({
              code: 'UNTRUSTED_ISSUER',
              message: `Issuer is not trusted: ${trustResult.reason || 'Unknown reason'}`,
              severity: 'critical'
            });
          } else {
            warnings.push({
              code: 'LOW_TRUST_ISSUER',
              message: `Issuer has ${trustResult.level} trust level`,
              recommendation: 'Verify issuer credentials manually'
            });
          }
        }
      }

      // Proof validation
      if (credential.proof) {
        const proofs = Array.isArray(credential.proof) ? credential.proof : [credential.proof];
        for (const proof of proofs) {
          await this.validateCredentialProof(proof, credential, errors, warnings);
        }
      } else {
        warnings.push({
          code: 'MISSING_CREDENTIAL_PROOF',
          message: 'Credential does not have a proof',
          recommendation: 'Verify credential authenticity through other means'
        });
      }

      // Age check
      if (this.config.validation.max_age_seconds && credential.issuanceDate) {
        const issuanceDate = new Date(credential.issuanceDate);
        const maxAge = this.config.validation.max_age_seconds * 1000;
        if (Date.now() - issuanceDate.getTime() > maxAge) {
          warnings.push({
            code: 'CREDENTIAL_TOO_OLD',
            message: 'Credential exceeds maximum age limit',
            recommendation: 'Request fresh credential'
          });
        }
      }
    } catch (error) {
      errors.push({
        code: 'CREDENTIAL_VALIDATION_ERROR',
        message: `Error validating credential: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'major'
      });
    }
  }

  /**
   * Validate presentation structure
   */
  private async validatePresentationStructure(
    presentation: VerifiablePresentation,
    errors: IValidationError[],
    _warnings: ValidationWarning[]
  ): Promise<void> {
    if (!presentation.id) {
      errors.push({
        code: 'MISSING_PRESENTATION_ID',
        message: 'Presentation must have an id',
        severity: 'critical'
      });
    }

    if (!presentation.type || !Array.isArray(presentation.type)) {
      errors.push({
        code: 'INVALID_PRESENTATION_TYPE',
        message: 'Presentation must have a type array',
        severity: 'critical'
      });
    }

    if (!presentation.holder) {
      errors.push({
        code: 'MISSING_HOLDER',
        message: 'Presentation must have a holder',
        severity: 'critical'
      });
    }

    if (!presentation.verifiableCredential || presentation.verifiableCredential.length === 0) {
      errors.push({
        code: 'NO_CREDENTIALS',
        message: 'Presentation must contain at least one credential',
        severity: 'critical'
      });
    }
  }

  /**
   * Validate presentation proof
   */
  private async validateProof(
    proof: Proof,
    presentation: VerifiablePresentation,
    errors: IValidationError[],
    warnings: ValidationWarning[],
    challenge?: string,
    domain?: string
  ): Promise<void> {
    try {
      // Check required proof fields
      if (!proof.type) {
        errors.push({
          code: 'MISSING_PROOF_TYPE',
          message: 'Proof must have a type',
          severity: 'critical'
        });
        return;
      }

      if (!proof.verificationMethod) {
        errors.push({
          code: 'MISSING_VERIFICATION_METHOD',
          message: 'Proof must have a verification method',
          severity: 'critical'
        });
        return;
      }

      // Validate challenge if provided
      if (challenge && proof.challenge !== challenge) {
        errors.push({
          code: 'INVALID_CHALLENGE',
          message: 'Proof challenge does not match expected challenge',
          severity: 'critical'
        });
      }

      // Validate domain if provided
      if (domain && proof.domain !== domain) {
        errors.push({
          code: 'INVALID_DOMAIN',
          message: 'Proof domain does not match expected domain',
          severity: 'critical'
        });
      }

      // Verify cryptographic proof
      if (this.config.security.signature_validation) {
        const isValidSignature = await this.cryptoService.verifyProof(proof, presentation);
        if (!isValidSignature) {
          errors.push({
            code: 'INVALID_SIGNATURE',
            message: 'Proof signature verification failed',
            severity: 'critical'
          });
        }
      }

      // Check proof freshness
      if (proof.created) {
        const createdDate = new Date(proof.created);
        const age = Date.now() - createdDate.getTime();
        const maxAge = 5 * 60 * 1000; // 5 minutes

        if (age > maxAge) {
          warnings.push({
            code: 'OLD_PROOF',
            message: 'Proof is older than recommended maximum age',
            recommendation: 'Request fresh proof'
          });
        }
      }
    } catch (error) {
      errors.push({
        code: 'PROOF_VALIDATION_ERROR',
        message: `Error validating proof: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'major'
      });
    }
  }

  /**
   * Validate credential proof
   */
  private async validateCredentialProof(
    proof: Proof,
    credential: VerifiableCredential,
    errors: IValidationError[],
    _warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      if (this.config.security.signature_validation) {
        const isValidSignature = await this.cryptoService.verifyCredentialProof(proof, credential);
        if (!isValidSignature) {
          errors.push({
            code: 'INVALID_CREDENTIAL_SIGNATURE',
            message: 'Credential proof signature verification failed',
            path: `credential.${credential.id}.proof`,
            severity: 'critical'
          });
        }
      }
    } catch (error) {
      errors.push({
        code: 'CREDENTIAL_PROOF_VALIDATION_ERROR',
        message: `Error validating credential proof: ${error instanceof Error ? error.message : 'Unknown error'}`,
        path: `credential.${credential.id}.proof`,
        severity: 'major'
      });
    }
  }

  /**
   * Validate holder binding
   */
  private async validateHolderBinding(
    presentation: VerifiablePresentation,
    errors: IValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      // Check that all credentials are bound to the same holder
      const holders = new Set<string>();
      
      for (const credential of presentation.verifiableCredential) {
        if (credential.credentialSubject?.id) {
          holders.add(credential.credentialSubject.id as string);
        }
      }

      if (holders.size > 1) {
        warnings.push({
          code: 'MULTIPLE_HOLDERS',
          message: 'Credentials are bound to different holders',
          recommendation: 'Verify holder binding manually'
        });
      }

      // Check that presentation holder matches credential subjects
      if (holders.size > 0 && !holders.has(presentation.holder)) {
        errors.push({
          code: 'HOLDER_MISMATCH',
          message: 'Presentation holder does not match credential subjects',
          severity: 'critical'
        });
      }
    } catch (error) {
      warnings.push({
        code: 'HOLDER_BINDING_CHECK_ERROR',
        message: `Error checking holder binding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendation: 'Verify holder binding manually'
      });
    }
  }

  /**
   * Check credential status (revocation, suspension, etc.)
   */
  async checkCredentialStatus(credentialId: string): Promise<{
    active: boolean;
    revoked: boolean;
    suspended: boolean;
    reason?: string;
  }> {
    try {
      // Check cache first
      const cacheKey = `status_${credentialId}`;
      if (this.validationCache.has(cacheKey)) {
        return this.validationCache.get(cacheKey) as any;
      }

      // In a real implementation, this would call the credential status endpoint
      // For now, return active status
      const status = {
        active: true,
        revoked: false,
        suspended: false
      };

      // Cache result for 5 minutes
      setTimeout(() => this.validationCache.delete(cacheKey), 5 * 60 * 1000);
      this.validationCache.set(cacheKey, status as any);

      return status;
    } catch (error) {
      console.error('Error checking credential status:', error);
      // Default to active if check fails
      return {
        active: true,
        revoked: false,
        suspended: false,
        reason: 'Status check failed'
      };
    }
  }

  /**
   * Verify issuer trust
   */
  async verifyIssuerTrust(issuerDid: string): Promise<{
    trusted: boolean;
    level: 'high' | 'medium' | 'low' | 'untrusted';
    reason?: string;
  }> {
    try {
      // Check against trusted issuers list
      if (this.config.validation.trusted_issuers?.includes(issuerDid)) {
        return {
          trusted: true,
          level: 'high',
          reason: 'Issuer in trusted list'
        };
      }

      // In a real implementation, this would:
      // 1. Check DID document and verify control
      // 2. Check issuer registry/reputation
      // 3. Validate issuer certificates
      // 4. Check governance frameworks

      // For now, return medium trust for known DID methods
      if (issuerDid.startsWith('did:')) {
        return {
          trusted: true,
          level: 'medium',
          reason: 'Valid DID format'
        };
      }

      return {
        trusted: false,
        level: 'untrusted',
        reason: 'Unknown issuer format'
      };
    } catch (error) {
      console.error('Error verifying issuer trust:', error);
      return {
        trusted: false,
        level: 'untrusted',
        reason: 'Trust verification failed'
      };
    }
  }

  /**
   * Cache validation result
   */
  private cacheValidationResult(presentationId: string, result: ValidationResult): void {
    const cacheKey = `validation_${presentationId}`;
    this.validationCache.set(cacheKey, result);
    
    // Clear cache after 10 minutes
    setTimeout(() => this.validationCache.delete(cacheKey), 10 * 60 * 1000);
  }

  /**
   * Get validation statistics
   */
  getStats(): {
    total_validations: number;
    successful_validations: number;
    failed_validations: number;
    average_validation_time_ms: number;
  } {
    return {
      ...this.stats,
      average_validation_time_ms: this.stats.total_validations > 0 
        ? this.stats.total_validation_time_ms / this.stats.total_validations 
        : 0
    };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: SDKConfig): void {
    this.config = config;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.clearCache();
  }
}