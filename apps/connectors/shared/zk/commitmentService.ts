import crypto from 'crypto';
import { BigNumber } from 'ethers';

export interface CommitmentData {
  did: string;
  credentialType: string;
  source: string;
  verified: boolean;
  dataHash: string;
  metadata: Record<string, any>;
  timestamp: number;
}

export interface ZKCommitment {
  commitment: string;
  nullifier: string;
  proof: string;
  publicSignals: string[];
  verificationKey: string;
}

export interface CredentialCommitment {
  commitmentHash: string;
  merkleRoot: string;
  nullifierHash: string;
  credentialId: string;
  did: string;
  credentialType: string;
  source: string;
  verified: boolean;
  createdAt: string;
  expiresAt?: string;
  zkProofData?: ZKCommitment;
}

/**
 * Standard commitment service for all PersonaPass connectors
 * Generates cryptographic commitments for zero-knowledge proofs
 */
export class CommitmentService {
  private readonly COMMITMENT_DOMAIN = 'PersonaPass-v1';
  private readonly FIELD_PRIME = BigNumber.from('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  
  /**
   * Generate a commitment hash for credential data
   */
  generateCommitment(data: CommitmentData): CredentialCommitment {
    console.log(`🔐 Generating commitment for ${data.credentialType} from ${data.source}...`);
    
    // Create deterministic commitment using SHA256
    const commitmentInput = this.createCommitmentInput(data);
    const commitmentHash = crypto.createHash('sha256').update(commitmentInput).digest('hex');
    
    // Generate nullifier hash (prevents double-spending/reuse)
    const nullifierInput = `${data.did}:${data.credentialType}:${data.source}:${data.timestamp}`;
    const nullifierHash = crypto.createHash('sha256').update(nullifierInput).digest('hex');
    
    // Generate Merkle root for credential tree
    const merkleRoot = this.generateMerkleRoot(commitmentHash, data);
    
    const commitment: CredentialCommitment = {
      commitmentHash,
      merkleRoot,
      nullifierHash,
      credentialId: `${data.source}_${data.credentialType}_${data.did}_${data.timestamp}`,
      did: data.did,
      credentialType: data.credentialType,
      source: data.source,
      verified: data.verified,
      createdAt: new Date().toISOString(),
      expiresAt: this.calculateExpirationDate(data.credentialType)
    };
    
    console.log(`✅ Commitment generated: ${commitmentHash.substring(0, 16)}...`);
    return commitment;
  }
  
  /**
   * Generate zero-knowledge proof for a commitment
   */
  async generateZKProof(commitment: CredentialCommitment, secret: string): Promise<ZKCommitment> {
    console.log(`🔒 Generating ZK proof for commitment: ${commitment.commitmentHash.substring(0, 16)}...`);
    
    // In production, this would use circom/snarkjs for actual ZK proof generation
    // For now, we'll create a mock proof structure that follows the expected format
    
    const secretHash = crypto.createHash('sha256').update(secret).digest('hex');
    const proofInput = {
      secret: this.hashToField(secretHash),
      commitment: this.hashToField(commitment.commitmentHash),
      nullifier: this.hashToField(commitment.nullifierHash),
      merkleRoot: this.hashToField(commitment.merkleRoot)
    };
    
    // Mock ZK proof generation (in production, use actual circom circuit)
    const proof = this.generateMockProof(proofInput);
    const publicSignals = [
      commitment.commitmentHash,
      commitment.nullifierHash,
      commitment.merkleRoot,
      commitment.did
    ];
    
    const zkCommitment: ZKCommitment = {
      commitment: commitment.commitmentHash,
      nullifier: commitment.nullifierHash,
      proof: proof,
      publicSignals: publicSignals,
      verificationKey: this.getVerificationKey(commitment.credentialType)
    };
    
    console.log(`✅ ZK proof generated for commitment`);
    return zkCommitment;
  }
  
  /**
   * Verify a zero-knowledge proof
   */
  async verifyZKProof(zkCommitment: ZKCommitment): Promise<boolean> {
    console.log(`🔍 Verifying ZK proof for commitment: ${zkCommitment.commitment.substring(0, 16)}...`);
    
    try {
      // Verify proof structure
      if (!zkCommitment.proof || !zkCommitment.publicSignals || !zkCommitment.verificationKey) {
        console.error('❌ Invalid proof structure');
        return false;
      }
      
      // Verify public signals
      const expectedSignals = [
        zkCommitment.commitment,
        zkCommitment.nullifier,
        zkCommitment.publicSignals[2], // merkleRoot
        zkCommitment.publicSignals[3]  // did
      ];
      
      if (JSON.stringify(zkCommitment.publicSignals) !== JSON.stringify(expectedSignals)) {
        console.error('❌ Public signals mismatch');
        return false;
      }
      
      // In production, this would verify the actual SNARK proof
      const isValidProof = this.verifyMockProof(zkCommitment.proof, zkCommitment.publicSignals);
      
      if (isValidProof) {
        console.log(`✅ ZK proof verified successfully`);
        return true;
      } else {
        console.error('❌ ZK proof verification failed');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error verifying ZK proof:', error);
      return false;
    }
  }
  
  /**
   * Create batch commitment for multiple credentials
   */
  generateBatchCommitment(commitments: CredentialCommitment[]): CredentialCommitment {
    console.log(`🔐 Generating batch commitment for ${commitments.length} credentials...`);
    
    // Sort commitments by hash for deterministic ordering
    const sortedCommitments = commitments.sort((a, b) => a.commitmentHash.localeCompare(b.commitmentHash));
    
    // Create batch commitment hash
    const batchInput = sortedCommitments.map(c => c.commitmentHash).join(':');
    const batchHash = crypto.createHash('sha256').update(batchInput).digest('hex');
    
    // Create batch Merkle tree
    const merkleRoot = this.generateBatchMerkleRoot(sortedCommitments);
    
    // Create combined nullifier
    const nullifierInput = sortedCommitments.map(c => c.nullifierHash).join(':');
    const batchNullifier = crypto.createHash('sha256').update(nullifierInput).digest('hex');
    
    const batchCommitment: CredentialCommitment = {
      commitmentHash: batchHash,
      merkleRoot,
      nullifierHash: batchNullifier,
      credentialId: `batch_${Date.now()}`,
      did: commitments[0].did, // Assuming all belong to same DID
      credentialType: 'batch_credential',
      source: 'multiple',
      verified: commitments.every(c => c.verified),
      createdAt: new Date().toISOString(),
      expiresAt: this.findEarliestExpiration(commitments)
    };
    
    console.log(`✅ Batch commitment generated: ${batchHash.substring(0, 16)}...`);
    return batchCommitment;
  }
  
  /**
   * Validate commitment integrity
   */
  validateCommitment(commitment: CredentialCommitment, originalData: CommitmentData): boolean {
    console.log(`🔍 Validating commitment integrity...`);
    
    try {
      // Regenerate commitment from original data
      const regeneratedCommitment = this.generateCommitment(originalData);
      
      // Compare key fields
      const isValid = commitment.commitmentHash === regeneratedCommitment.commitmentHash &&
                     commitment.nullifierHash === regeneratedCommitment.nullifierHash &&
                     commitment.merkleRoot === regeneratedCommitment.merkleRoot &&
                     commitment.did === regeneratedCommitment.did &&
                     commitment.credentialType === regeneratedCommitment.credentialType &&
                     commitment.source === regeneratedCommitment.source;
      
      if (isValid) {
        console.log(`✅ Commitment integrity validated`);
      } else {
        console.error(`❌ Commitment integrity validation failed`);
      }
      
      return isValid;
      
    } catch (error) {
      console.error('❌ Error validating commitment:', error);
      return false;
    }
  }
  
  /**
   * Create commitment input for hashing
   */
  private createCommitmentInput(data: CommitmentData): string {
    const input = {
      domain: this.COMMITMENT_DOMAIN,
      did: data.did,
      credentialType: data.credentialType,
      source: data.source,
      verified: data.verified,
      dataHash: data.dataHash,
      timestamp: data.timestamp,
      metadata: this.sortObjectKeys(data.metadata)
    };
    
    return JSON.stringify(input);
  }
  
  /**
   * Generate Merkle root for credential
   */
  private generateMerkleRoot(commitmentHash: string, data: CommitmentData): string {
    // Create Merkle tree with commitment and metadata
    const leaves = [
      commitmentHash,
      data.dataHash,
      crypto.createHash('sha256').update(data.did).digest('hex'),
      crypto.createHash('sha256').update(data.credentialType).digest('hex'),
      crypto.createHash('sha256').update(data.source).digest('hex')
    ];
    
    return this.buildMerkleTree(leaves);
  }
  
  /**
   * Build Merkle tree from leaves
   */
  private buildMerkleTree(leaves: string[]): string {
    if (leaves.length === 0) return '';
    if (leaves.length === 1) return leaves[0];
    
    const nextLevel: string[] = [];
    
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = i + 1 < leaves.length ? leaves[i + 1] : left;
      const combined = crypto.createHash('sha256').update(left + right).digest('hex');
      nextLevel.push(combined);
    }
    
    return this.buildMerkleTree(nextLevel);
  }
  
  /**
   * Generate batch Merkle root
   */
  private generateBatchMerkleRoot(commitments: CredentialCommitment[]): string {
    const leaves = commitments.map(c => c.commitmentHash);
    return this.buildMerkleTree(leaves);
  }
  
  /**
   * Convert hash to field element for ZK circuits
   */
  private hashToField(hash: string): string {
    const bigIntHash = BigNumber.from('0x' + hash);
    const fieldElement = bigIntHash.mod(this.FIELD_PRIME);
    return fieldElement.toString();
  }
  
  /**
   * Generate mock ZK proof (replace with actual circom/snarkjs in production)
   */
  private generateMockProof(input: any): string {
    const proofData = {
      a: [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))],
      b: [[this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))], 
          [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))]],
      c: [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))],
      protocol: 'groth16',
      curve: 'bn128'
    };
    
    return JSON.stringify(proofData);
  }
  
  /**
   * Verify mock ZK proof (replace with actual verification in production)
   */
  private verifyMockProof(proof: string, publicSignals: string[]): boolean {
    try {
      const proofData = JSON.parse(proof);
      return proofData.protocol === 'groth16' && 
             proofData.curve === 'bn128' && 
             proofData.a && 
             proofData.b && 
             proofData.c &&
             publicSignals.length > 0;
    } catch {
      return false;
    }
  }
  
  /**
   * Get verification key for credential type
   */
  private getVerificationKey(credentialType: string): string {
    // In production, return actual verification key for the credential type's circuit
    const mockVerificationKey = {
      protocol: 'groth16',
      curve: 'bn128',
      nPublic: 4,
      credentialType,
      vk_alpha_1: [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))],
      vk_beta_2: [[this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))], 
                  [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))]],
      vk_gamma_2: [[this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))], 
                   [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))]],
      vk_delta_2: [[this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))], 
                   [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))]],
      IC: [
        [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))],
        [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))],
        [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))],
        [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))],
        [this.hashToField(crypto.randomBytes(32).toString('hex')), this.hashToField(crypto.randomBytes(32).toString('hex'))]
      ]
    };
    
    return JSON.stringify(mockVerificationKey);
  }
  
  /**
   * Calculate expiration date based on credential type
   */
  private calculateExpirationDate(credentialType: string): string | undefined {
    const now = new Date();
    let expirationMonths: number;
    
    switch (credentialType) {
      case 'academic':
        expirationMonths = 12; // 1 year
        break;
      case 'financial':
        expirationMonths = 6; // 6 months
        break;
      case 'health':
        expirationMonths = 3; // 3 months (sensitive data)
        break;
      case 'government':
        expirationMonths = 12; // 1 year
        break;
      case 'social':
        expirationMonths = 6; // 6 months
        break;
      default:
        expirationMonths = 6; // Default 6 months
    }
    
    const expirationDate = new Date(now.setMonth(now.getMonth() + expirationMonths));
    return expirationDate.toISOString();
  }
  
  /**
   * Find earliest expiration from batch commitments
   */
  private findEarliestExpiration(commitments: CredentialCommitment[]): string | undefined {
    const expirations = commitments
      .map(c => c.expiresAt)
      .filter(exp => exp !== undefined)
      .map(exp => new Date(exp!));
    
    if (expirations.length === 0) return undefined;
    
    const earliest = new Date(Math.min(...expirations.map(d => d.getTime())));
    return earliest.toISOString();
  }
  
  /**
   * Sort object keys for deterministic hashing
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sortObjectKeys(item));
    
    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObjectKeys(obj[key]);
    });
    
    return sorted;
  }
  
  /**
   * Export commitment for blockchain storage
   */
  exportForBlockchain(commitment: CredentialCommitment): {
    commitmentHash: string;
    merkleRoot: string;
    nullifierHash: string;
    metadata: string;
  } {
    return {
      commitmentHash: commitment.commitmentHash,
      merkleRoot: commitment.merkleRoot,
      nullifierHash: commitment.nullifierHash,
      metadata: JSON.stringify({
        credentialType: commitment.credentialType,
        source: commitment.source,
        verified: commitment.verified,
        createdAt: commitment.createdAt,
        expiresAt: commitment.expiresAt
      })
    };
  }
}