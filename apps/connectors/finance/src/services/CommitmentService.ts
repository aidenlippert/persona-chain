import crypto from 'crypto';

export interface CommitmentData {
  type: string;
  [key: string]: any;
}

export interface Commitment {
  hash: string;
  publicInput: string;
  salt: string;
  timestamp: number;
}

export class CommitmentService {
  
  /**
   * Create a cryptographic commitment for sensitive financial data
   */
  createCommitment(data: CommitmentData): Commitment {
    try {
      // Generate random salt for commitment
      const salt = crypto.randomBytes(32).toString('hex');
      
      // Serialize data in a deterministic way
      const serializedData = this.serializeData(data);
      
      // Create commitment hash: H(data || salt)
      const commitment = crypto
        .createHash('sha256')
        .update(serializedData + salt)
        .digest('hex');
      
      // Create public input (non-sensitive metadata)
      const publicInput = this.extractPublicInput(data);
      
      const result: Commitment = {
        hash: commitment,
        publicInput,
        salt,
        timestamp: Date.now()
      };
      
      console.log(`🔒 Created financial commitment for ${data.type}:`, {
        type: data.type,
        hash: commitment.substring(0, 8) + '...',
        publicInput
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error creating financial commitment:', error);
      throw new Error('Failed to create financial commitment');
    }
  }
  
  /**
   * Verify a commitment against provided data
   */
  verifyCommitment(
    commitment: string,
    data: CommitmentData,
    salt: string
  ): boolean {
    try {
      const serializedData = this.serializeData(data);
      const expectedCommitment = crypto
        .createHash('sha256')
        .update(serializedData + salt)
        .digest('hex');
      
      return commitment === expectedCommitment;
      
    } catch (error) {
      console.error('❌ Error verifying financial commitment:', error);
      return false;
    }
  }
  
  /**
   * Create a Merkle tree commitment for multiple financial values
   */
  createMerkleCommitment(dataArray: CommitmentData[]): {
    root: string;
    leaves: string[];
    proofs: any[];
  } {
    try {
      // Create individual commitments
      const leaves = dataArray.map(data => {
        const salt = crypto.randomBytes(32).toString('hex');
        const serializedData = this.serializeData(data);
        return crypto
          .createHash('sha256')
          .update(serializedData + salt)
          .digest('hex');
      });
      
      // Build Merkle tree (simplified binary tree)
      const merkleRoot = this.buildMerkleTree(leaves);
      
      // Generate inclusion proofs for each leaf
      const proofs = leaves.map((leaf, index) => 
        this.generateMerkleProof(leaves, index)
      );
      
      console.log(`🌳 Created financial Merkle commitment with ${leaves.length} leaves`);
      
      return {
        root: merkleRoot,
        leaves,
        proofs
      };
      
    } catch (error) {
      console.error('❌ Error creating financial Merkle commitment:', error);
      throw new Error('Failed to create financial Merkle commitment');
    }
  }
  
  /**
   * Serialize data in a deterministic way for hashing
   */
  private serializeData(data: CommitmentData): string {
    // Sort keys to ensure deterministic serialization
    const sortedKeys = Object.keys(data).sort();
    const sortedData: any = {};
    
    sortedKeys.forEach(key => {
      sortedData[key] = data[key];
    });
    
    return JSON.stringify(sortedData);
  }
  
  /**
   * Extract public (non-sensitive) inputs from financial data
   */
  private extractPublicInput(data: CommitmentData): string {
    const publicData: any = {
      type: data.type,
      timestamp: Date.now()
    };
    
    // Add type-specific public inputs for financial data
    switch (data.type) {
      case 'bank_account':
        publicData.accountType = data.accountType;
        publicData.institutionName = data.institutionName;
        publicData.currency = data.currency;
        publicData.verified = data.verified;
        // Note: actual balance and account numbers are kept private
        break;
        
      case 'transaction':
        publicData.currency = data.currency;
        publicData.date = data.date;
        publicData.category = data.category;
        publicData.transactionType = data.transactionType;
        publicData.verified = data.verified;
        // Note: actual amount and merchant details are kept private
        break;
        
      case 'credit_score':
        publicData.provider = data.provider;
        publicData.scoreRange = data.scoreRange;
        publicData.reportDate = data.reportDate;
        publicData.verified = data.verified;
        // Note: actual score value is kept private
        break;
        
      case 'credit_report':
        publicData.provider = data.provider;
        publicData.reportDate = data.reportDate;
        publicData.accountCount = data.accounts?.length || 0;
        publicData.inquiryCount = data.inquiries?.length || 0;
        publicData.verified = data.verified;
        // Note: actual account details are kept private
        break;
        
      case 'financial_profile':
        publicData.currency = data.currency || 'USD';
        publicData.accountCount = data.accounts?.length || 0;
        publicData.lastUpdated = data.lastUpdated;
        publicData.verified = data.verified;
        // Note: actual amounts and ratios are kept private
        break;
        
      default:
        publicData.verified = data.verified || false;
        break;
    }
    
    return JSON.stringify(publicData);
  }
  
  /**
   * Build simple Merkle tree from leaves
   */
  private buildMerkleTree(leaves: string[]): string {
    if (leaves.length === 0) return '';
    if (leaves.length === 1) return leaves[0];
    
    let currentLevel = [...leaves];
    
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          // Hash pair of nodes
          const combined = currentLevel[i] + currentLevel[i + 1];
          const hash = crypto.createHash('sha256').update(combined).digest('hex');
          nextLevel.push(hash);
        } else {
          // Odd number of nodes, promote the last one
          nextLevel.push(currentLevel[i]);
        }
      }
      
      currentLevel = nextLevel;
    }
    
    return currentLevel[0];
  }
  
  /**
   * Generate Merkle proof for a leaf at given index
   */
  private generateMerkleProof(leaves: string[], leafIndex: number): any {
    if (leafIndex < 0 || leafIndex >= leaves.length) {
      throw new Error('Invalid leaf index');
    }
    
    const proof: any[] = [];
    let currentLevel = [...leaves];
    let currentIndex = leafIndex;
    
    while (currentLevel.length > 1) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < currentLevel.length) {
        proof.push({
          hash: currentLevel[siblingIndex],
          isRight: !isRightNode
        });
      }
      
      // Move to next level
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          const combined = currentLevel[i] + currentLevel[i + 1];
          const hash = crypto.createHash('sha256').update(combined).digest('hex');
          nextLevel.push(hash);
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      
      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return proof;
  }
  
  /**
   * Verify Merkle proof
   */
  verifyMerkleProof(
    leaf: string,
    proof: any[],
    root: string
  ): boolean {
    try {
      let computedHash = leaf;
      
      for (const proofElement of proof) {
        if (proofElement.isRight) {
          computedHash = crypto
            .createHash('sha256')
            .update(computedHash + proofElement.hash)
            .digest('hex');
        } else {
          computedHash = crypto
            .createHash('sha256')
            .update(proofElement.hash + computedHash)
            .digest('hex');
        }
      }
      
      return computedHash === root;
      
    } catch (error) {
      console.error('❌ Error verifying financial Merkle proof:', error);
      return false;
    }
  }
}