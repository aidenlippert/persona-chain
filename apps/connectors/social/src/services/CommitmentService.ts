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
   * Create a cryptographic commitment for sensitive social data
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
      
      console.log(`🔒 Created social commitment for ${data.type}:`, {
        type: data.type,
        platform: data.platform,
        hash: commitment.substring(0, 8) + '...',
        publicInput
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error creating social commitment:', error);
      throw new Error('Failed to create social commitment');
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
      console.error('❌ Error verifying social commitment:', error);
      return false;
    }
  }
  
  /**
   * Create a Merkle tree commitment for multiple social values
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
      
      console.log(`🌳 Created social Merkle commitment with ${leaves.length} leaves`);
      
      return {
        root: merkleRoot,
        leaves,
        proofs
      };
      
    } catch (error) {
      console.error('❌ Error creating social Merkle commitment:', error);
      throw new Error('Failed to create social Merkle commitment');
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
   * Extract public (non-sensitive) inputs from social data
   */
  private extractPublicInput(data: CommitmentData): string {
    const publicData: any = {
      type: data.type,
      timestamp: Date.now()
    };
    
    // Add type-specific public inputs for social data
    switch (data.type) {
      case 'social_profile':
        publicData.platform = data.platform;
        publicData.verified = data.verified;
        publicData.accountAge = data.createdAt ? 
          Math.floor((Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        publicData.hasAvatar = !!data.avatarUrl;
        publicData.hasBio = !!data.bio;
        // Note: username, display name, and other identifying info are kept private
        break;
        
      case 'linkedin_profile':
        publicData.platform = 'linkedin';
        publicData.hasHeadline = !!data.headline;
        publicData.hasIndustry = !!data.industry;
        publicData.educationCount = data.education?.length || 0;
        publicData.skillsCount = data.skills?.length || 0;
        publicData.hasCurrentPosition = !!data.currentPosition;
        publicData.verified = data.verified;
        // Note: actual connection count, company details are kept private
        break;
        
      case 'twitter_profile':
        publicData.platform = 'twitter';
        publicData.isVerifiedAccount = data.isVerifiedAccount;
        publicData.isProtected = data.isProtected;
        publicData.followerTier = this.getFollowerTier(data.followersCount || 0);
        publicData.engagementTier = this.getEngagementTier(data.metrics?.avgEngagementRate || 0);
        publicData.recentActivityCount = data.recentTweets?.length || 0;
        publicData.verified = data.verified;
        // Note: actual follower counts, tweet content are kept private
        break;
        
      case 'github_profile':
        publicData.platform = 'github';
        publicData.repoTier = this.getRepoTier(data.publicRepos || 0);
        publicData.followerTier = this.getFollowerTier(data.followers || 0);
        publicData.contributionTier = this.getContributionTier(data.contributions?.contributionsLastYear || 0);
        publicData.hasRecentActivity = (data.contributions?.contributionsLastYear || 0) > 0;
        publicData.verified = data.verified;
        // Note: actual repo names, contribution details are kept private
        break;
        
      case 'social_verification':
        publicData.platform = data.platform;
        publicData.verificationLevel = data.verificationLevel;
        publicData.verifiedChecksCount = data.verificationChecks ? 
          Object.values(data.verificationChecks).filter(Boolean).length : 0;
        publicData.credibilityTier = this.getCredibilityTier(data.credibilityScore || 0);
        publicData.verified = data.verified;
        // Note: actual credibility score details are kept private
        break;
        
      case 'social_credentials':
        publicData.platformCount = data.platforms?.length || 0;
        publicData.verifiedPlatforms = data.verifiedPlatforms || 0;
        publicData.professionalNetworks = data.professionalNetworks || 0;
        publicData.socialNetworks = data.socialNetworks || 0;
        publicData.followerTier = this.getFollowerTier(data.totalFollowers || 0);
        publicData.verified = data.verified;
        // Note: actual follower counts, platform details are kept private
        break;
        
      default:
        publicData.verified = data.verified || false;
        break;
    }
    
    return JSON.stringify(publicData);
  }
  
  /**
   * Get follower tier for privacy (logarithmic scale)
   */
  private getFollowerTier(count: number): string {
    if (count >= 1000000) return 'mega';
    if (count >= 100000) return 'macro';
    if (count >= 10000) return 'mid';
    if (count >= 1000) return 'micro';
    if (count >= 100) return 'nano';
    return 'minimal';
  }
  
  /**
   * Get engagement tier for privacy
   */
  private getEngagementTier(rate: number): string {
    if (rate >= 10) return 'very_high';
    if (rate >= 5) return 'high';
    if (rate >= 2) return 'medium';
    if (rate >= 1) return 'low';
    return 'minimal';
  }
  
  /**
   * Get repository tier for privacy
   */
  private getRepoTier(count: number): string {
    if (count >= 100) return 'prolific';
    if (count >= 50) return 'active';
    if (count >= 20) return 'moderate';
    if (count >= 5) return 'casual';
    return 'minimal';
  }
  
  /**
   * Get contribution tier for privacy
   */
  private getContributionTier(count: number): string {
    if (count >= 1000) return 'very_active';
    if (count >= 500) return 'active';
    if (count >= 100) return 'moderate';
    if (count >= 50) return 'casual';
    return 'minimal';
  }
  
  /**
   * Get credibility tier for privacy
   */
  private getCredibilityTier(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'very_good';
    if (score >= 70) return 'good';
    if (score >= 60) return 'fair';
    return 'basic';
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
      console.error('❌ Error verifying social Merkle proof:', error);
      return false;
    }
  }
}