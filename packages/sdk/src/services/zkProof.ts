/**
 * Zero-Knowledge Proof Service
 * Handles ZK proof validation and verification
 */

import { EventEmitter } from '../utils/eventEmitter';
import { CryptoService } from './crypto';
import { ZKProofError } from '../types';
import type {
  SDKConfig,
  ZKProof,
  ZKCredential,
  ValidationResult,
  ValidationError as IValidationError,
  ValidationWarning
} from '../types';

interface ZKVerificationKey {
  protocol: ZKProof['protocol'];
  curve: ZKProof['curve'];
  verificationKey: string;
  circuitId?: string;
}

interface ZKValidationContext {
  expectedCommitment?: string;
  expectedNullifier?: string;
  merkleRoot?: string;
  allowedCircuits?: string[];
}

export class ZKProofService extends EventEmitter {
  private config: SDKConfig;
  private cryptoService: CryptoService;
  private verificationKeys = new Map<string, ZKVerificationKey>();

  constructor(config: SDKConfig, cryptoService: CryptoService) {
    super();
    this.config = config;
    this.cryptoService = cryptoService;
    this.loadVerificationKeys();
  }

  /**
   * Validate a zero-knowledge proof
   */
  async validateZKProof(
    zkProof: ZKProof,
    verificationKey?: string,
    context?: ZKValidationContext
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const errors: IValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Basic structure validation
      this.validateZKProofStructure(zkProof, errors);

      // Protocol support check
      if (!this.config.zk.supported_protocols.includes(zkProof.protocol)) {
        errors.push({
          code: 'UNSUPPORTED_PROTOCOL',
          message: `ZK protocol '${zkProof.protocol}' is not supported`,
          severity: 'critical'
        });
      }

      // Get verification key
      const vKey = verificationKey || this.getVerificationKey(zkProof);
      if (!vKey) {
        errors.push({
          code: 'MISSING_VERIFICATION_KEY',
          message: 'No verification key available for this proof',
          severity: 'critical'
        });
      }

      // Validate proof format
      this.validateProofFormat(zkProof, errors, warnings);

      // Verify cryptographic proof
      if (vKey && errors.filter(e => e.severity === 'critical').length === 0) {
        const isValidProof = await this.verifyZKProof(zkProof, vKey, context);
        if (!isValidProof) {
          errors.push({
            code: 'INVALID_ZK_PROOF',
            message: 'Zero-knowledge proof verification failed',
            severity: 'critical'
          });
        }
      }

      // Context-specific validations
      if (context) {
        this.validateZKContext(zkProof, context, errors, warnings);
      }

      // Circuit validation
      if (zkProof.circuitId && this.config.zk.trusted_circuits) {
        if (!this.config.zk.trusted_circuits.includes(zkProof.circuitId)) {
          warnings.push({
            code: 'UNTRUSTED_CIRCUIT',
            message: 'Circuit is not in the trusted circuits list',
            recommendation: 'Verify circuit integrity manually'
          });
        }
      }

      const isValid = errors.filter(e => e.severity === 'critical').length === 0;
      const validationTime = Date.now() - startTime;

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

      this.emit('zk_proof_validated', { zkProof, result });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ZKProofError(`ZK proof validation failed: ${message}`, {
        protocol: zkProof.protocol,
        curve: zkProof.curve
      });
    }
  }

  /**
   * Validate a ZK credential
   */
  async validateZKCredential(
    zkCredential: ZKCredential,
    context?: ZKValidationContext
  ): Promise<ValidationResult> {
    try {
      const errors: IValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Basic credential structure validation
      this.validateZKCredentialStructure(zkCredential, errors);

      // Validate the embedded ZK proof
      const proofResult = await this.validateZKProof(
        zkCredential.proof,
        undefined,
        context
      );

      // Merge validation results
      errors.push(...proofResult.errors);
      warnings.push(...proofResult.warnings);

      // Additional credential-specific validations
      this.validateCredentialMetadata(zkCredential, errors, warnings);

      const isValid = errors.filter(e => e.severity === 'critical').length === 0;

      return {
        valid: isValid,
        errors,
        warnings,
        metadata: proofResult.metadata
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ZKProofError(`ZK credential validation failed: ${message}`, {
        credential_id: zkCredential.id
      });
    }
  }

  /**
   * Create a ZK proof verification challenge
   */
  async createZKChallenge(
    circuitId: string,
    publicInputs: Record<string, unknown>
  ): Promise<{
    challenge: string;
    commitment: string;
    nullifier: string;
  }> {
    try {
      // Generate cryptographic challenge
      const challenge = await this.cryptoService.generateChallenge();
      
      // Create commitment and nullifier based on public inputs
      const inputString = JSON.stringify(publicInputs, Object.keys(publicInputs).sort());
      const commitment = await this.cryptoService.generateHash(inputString + challenge);
      const nullifier = await this.cryptoService.generateHash(commitment + circuitId);

      return {
        challenge,
        commitment,
        nullifier
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ZKProofError(`Failed to create ZK challenge: ${message}`, {
        circuit_id: circuitId
      });
    }
  }

  /**
   * Validate ZK proof structure
   */
  private validateZKProofStructure(zkProof: ZKProof, errors: IValidationError[]): void {
    if (zkProof.type !== 'ZKProof') {
      errors.push({
        code: 'INVALID_ZK_TYPE',
        message: 'ZK proof type must be "ZKProof"',
        severity: 'critical'
      });
    }

    if (!zkProof.protocol) {
      errors.push({
        code: 'MISSING_PROTOCOL',
        message: 'ZK proof must specify a protocol',
        severity: 'critical'
      });
    }

    if (!zkProof.curve) {
      errors.push({
        code: 'MISSING_CURVE',
        message: 'ZK proof must specify a curve',
        severity: 'critical'
      });
    }

    if (!zkProof.proof) {
      errors.push({
        code: 'MISSING_PROOF_DATA',
        message: 'ZK proof must contain proof data',
        severity: 'critical'
      });
    }

    if (!zkProof.publicSignals || !Array.isArray(zkProof.publicSignals)) {
      errors.push({
        code: 'MISSING_PUBLIC_SIGNALS',
        message: 'ZK proof must contain public signals array',
        severity: 'critical'
      });
    }

    if (!zkProof.verificationKey) {
      errors.push({
        code: 'MISSING_VERIFICATION_KEY',
        message: 'ZK proof must contain verification key',
        severity: 'critical'
      });
    }

    if (!zkProof.commitment) {
      errors.push({
        code: 'MISSING_COMMITMENT',
        message: 'ZK proof must contain commitment',
        severity: 'critical'
      });
    }

    if (!zkProof.nullifier) {
      errors.push({
        code: 'MISSING_NULLIFIER',
        message: 'ZK proof must contain nullifier',
        severity: 'critical'
      });
    }
  }

  /**
   * Validate proof format and encoding
   */
  private validateProofFormat(
    zkProof: ZKProof,
    errors: IValidationError[],
    warnings: ValidationWarning[]
  ): void {
    try {
      // Validate proof encoding (should be hex or base64)
      if (!/^[0-9a-fA-F]+$/.test(zkProof.proof) && !/^[A-Za-z0-9+/]+=*$/.test(zkProof.proof)) {
        errors.push({
          code: 'INVALID_PROOF_ENCODING',
          message: 'Proof must be hex or base64 encoded',
          severity: 'major'
        });
      }

      // Validate public signals format
      for (const signal of zkProof.publicSignals) {
        if (typeof signal !== 'string' || !/^[0-9a-fA-F]+$/.test(signal)) {
          warnings.push({
            code: 'INVALID_SIGNAL_FORMAT',
            message: 'Public signals should be hex encoded strings',
            recommendation: 'Verify signal format'
          });
          break;
        }
      }

      // Protocol-specific validations
      switch (zkProof.protocol) {
        case 'groth16':
          this.validateGroth16Format(zkProof, errors, warnings);
          break;
        case 'plonk':
          this.validatePlonkFormat(zkProof, errors, warnings);
          break;
        case 'stark':
          this.validateStarkFormat(zkProof, errors, warnings);
          break;
        case 'bulletproofs':
          this.validateBulletproofsFormat(zkProof, errors, warnings);
          break;
      }
    } catch (error) {
      warnings.push({
        code: 'PROOF_FORMAT_CHECK_ERROR',
        message: `Error validating proof format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendation: 'Verify proof format manually'
      });
    }
  }

  /**
   * Validate Groth16 specific format
   */
  private validateGroth16Format(
    zkProof: ZKProof,
    errors: IValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Groth16 proofs should have 3 elements: A, B, C
    try {
      const proofData = JSON.parse(zkProof.proof);
      if (!proofData.A || !proofData.B || !proofData.C) {
        errors.push({
          code: 'INVALID_GROTH16_FORMAT',
          message: 'Groth16 proof must contain A, B, and C elements',
          severity: 'major'
        });
      }
    } catch {
      warnings.push({
        code: 'GROTH16_FORMAT_WARNING',
        message: 'Could not parse Groth16 proof structure',
        recommendation: 'Verify proof format'
      });
    }
  }

  /**
   * Validate PLONK specific format
   */
  private validatePlonkFormat(
    zkProof: ZKProof,
    _errors: IValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // PLONK proofs have different structure
    try {
      const proofData = JSON.parse(zkProof.proof);
      if (!proofData.commitments || !proofData.evaluations) {
        warnings.push({
          code: 'PLONK_FORMAT_WARNING',
          message: 'PLONK proof structure may be non-standard',
          recommendation: 'Verify proof format with circuit specification'
        });
      }
    } catch {
      warnings.push({
        code: 'PLONK_FORMAT_WARNING',
        message: 'Could not parse PLONK proof structure',
        recommendation: 'Verify proof format'
      });
    }
  }

  /**
   * Validate STARK specific format
   */
  private validateStarkFormat(
    _zkProof: ZKProof,
    _errors: IValidationError[],
    warnings: ValidationWarning[]
  ): void {
    warnings.push({
      code: 'STARK_EXPERIMENTAL',
      message: 'STARK proof validation is experimental',
      recommendation: 'Use additional validation methods'
    });
  }

  /**
   * Validate Bulletproofs specific format
   */
  private validateBulletproofsFormat(
    _zkProof: ZKProof,
    _errors: IValidationError[],
    warnings: ValidationWarning[]
  ): void {
    warnings.push({
      code: 'BULLETPROOFS_EXPERIMENTAL',
      message: 'Bulletproofs validation is experimental',
      recommendation: 'Use additional validation methods'
    });
  }

  /**
   * Verify the cryptographic ZK proof
   */
  private async verifyZKProof(
    zkProof: ZKProof,
    verificationKey: string,
    _context?: ZKValidationContext
  ): Promise<boolean> {
    try {
      // In a real implementation, this would use a ZK proof library
      // like snarkjs for Groth16/PLONK or specific STARK/Bulletproof libraries
      
      // For now, perform basic structural verification
      const proofHash = await this.cryptoService.generateHash(
        zkProof.proof + zkProof.publicSignals.join('') + verificationKey
      );
      
      // Simulate proof verification (always true for demo)
      // In production: return await zkLibrary.verify(zkProof, verificationKey, publicSignals);
      return proofHash.length > 0;
    } catch (error) {
      console.error('ZK proof verification error:', error);
      return false;
    }
  }

  /**
   * Validate ZK context (commitments, nullifiers, etc.)
   */
  private validateZKContext(
    zkProof: ZKProof,
    context: ZKValidationContext,
    errors: IValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    // Validate expected commitment
    if (context.expectedCommitment && zkProof.commitment !== context.expectedCommitment) {
      errors.push({
        code: 'COMMITMENT_MISMATCH',
        message: 'Proof commitment does not match expected value',
        severity: 'critical'
      });
    }

    // Validate expected nullifier
    if (context.expectedNullifier && zkProof.nullifier !== context.expectedNullifier) {
      errors.push({
        code: 'NULLIFIER_MISMATCH',
        message: 'Proof nullifier does not match expected value',
        severity: 'critical'
      });
    }

    // Validate merkle root if provided
    if (context.merkleRoot && zkProof.merkleRoot !== context.merkleRoot) {
      errors.push({
        code: 'MERKLE_ROOT_MISMATCH',
        message: 'Proof merkle root does not match expected value',
        severity: 'critical'
      });
    }

    // Validate allowed circuits
    if (context.allowedCircuits && zkProof.circuitId) {
      if (!context.allowedCircuits.includes(zkProof.circuitId)) {
        errors.push({
          code: 'CIRCUIT_NOT_ALLOWED',
          message: 'Circuit is not in the allowed circuits list',
          severity: 'critical'
        });
      }
    }
  }

  /**
   * Validate ZK credential structure
   */
  private validateZKCredentialStructure(
    zkCredential: ZKCredential,
    errors: IValidationError[]
  ): void {
    if (!zkCredential.id) {
      errors.push({
        code: 'MISSING_CREDENTIAL_ID',
        message: 'ZK credential must have an id',
        severity: 'critical'
      });
    }

    if (!zkCredential.type || !Array.isArray(zkCredential.type)) {
      errors.push({
        code: 'INVALID_CREDENTIAL_TYPE',
        message: 'ZK credential must have a type array',
        severity: 'critical'
      });
    }

    if (!zkCredential.holder) {
      errors.push({
        code: 'MISSING_HOLDER',
        message: 'ZK credential must have a holder',
        severity: 'critical'
      });
    }

    if (!zkCredential.proof) {
      errors.push({
        code: 'MISSING_ZK_PROOF',
        message: 'ZK credential must contain a ZK proof',
        severity: 'critical'
      });
    }

    if (!zkCredential.credentialSubject || !zkCredential.credentialSubject.id) {
      errors.push({
        code: 'MISSING_SUBJECT',
        message: 'ZK credential must have a credentialSubject with id',
        severity: 'critical'
      });
    }

    if (!zkCredential.metadata) {
      errors.push({
        code: 'MISSING_METADATA',
        message: 'ZK credential must have metadata',
        severity: 'critical'
      });
    }
  }

  /**
   * Validate credential metadata
   */
  private validateCredentialMetadata(
    zkCredential: ZKCredential,
    errors: IValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const metadata = zkCredential.metadata;

    if (!metadata.credentialType) {
      warnings.push({
        code: 'MISSING_CREDENTIAL_TYPE',
        message: 'ZK credential metadata should specify credentialType',
        recommendation: 'Add credential type for better validation'
      });
    }

    if (!metadata.source) {
      warnings.push({
        code: 'MISSING_SOURCE',
        message: 'ZK credential metadata should specify source',
        recommendation: 'Add source information for traceability'
      });
    }

    // Check expiration
    if (metadata.expiresAt) {
      const expirationDate = new Date(metadata.expiresAt);
      if (expirationDate < new Date()) {
        errors.push({
          code: 'ZK_CREDENTIAL_EXPIRED',
          message: 'ZK credential has expired',
          severity: 'critical'
        });
      }
    }

    // Validate commitment format
    if (metadata.commitment && !/^[0-9a-fA-F]+$/.test(metadata.commitment)) {
      warnings.push({
        code: 'INVALID_COMMITMENT_FORMAT',
        message: 'Commitment should be hex encoded',
        recommendation: 'Verify commitment format'
      });
    }

    // Validate nullifier hash format
    if (metadata.nullifierHash && !/^[0-9a-fA-F]+$/.test(metadata.nullifierHash)) {
      warnings.push({
        code: 'INVALID_NULLIFIER_FORMAT',
        message: 'Nullifier hash should be hex encoded',
        recommendation: 'Verify nullifier format'
      });
    }
  }

  /**
   * Get verification key for a ZK proof
   */
  private getVerificationKey(zkProof: ZKProof): string | undefined {
    const keyId = `${zkProof.protocol}_${zkProof.curve}`;
    const key = this.verificationKeys.get(keyId);
    return key?.verificationKey || zkProof.verificationKey;
  }

  /**
   * Load verification keys from configuration
   */
  private loadVerificationKeys(): void {
    for (const [keyId, verificationKey] of Object.entries(this.config.zk.verification_keys)) {
      // Parse keyId to extract protocol and curve
      const [protocol, curve] = keyId.split('_') as [ZKProof['protocol'], ZKProof['curve']];
      
      this.verificationKeys.set(keyId, {
        protocol,
        curve,
        verificationKey
      });
    }
  }

  /**
   * Add verification key
   */
  addVerificationKey(
    protocol: ZKProof['protocol'],
    curve: ZKProof['curve'],
    verificationKey: string,
    circuitId?: string
  ): void {
    const keyId = `${protocol}_${curve}`;
    this.verificationKeys.set(keyId, {
      protocol,
      curve,
      verificationKey,
      circuitId
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: SDKConfig): void {
    this.config = config;
    this.loadVerificationKeys();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.verificationKeys.clear();
  }
}