import crypto from 'crypto';
import axios from 'axios';
import { getErrorMessage } from '../../utils/errorHandler';

export interface ConnectorCommitment {
  connectorType: 'academic' | 'financial' | 'health' | 'social' | 'government' | 'iot';
  commitmentHash: string;
  publicInput: string;
  metadata: any;
  timestamp: number;
  verificationLevel: string;
  credibilityScore: number;
}

export interface AggregateCommitment {
  did: string;
  rootHash: string;
  connectorCommitments: ConnectorCommitment[];
  merkleTree: {
    root: string;
    leaves: string[];
    proofs: any[];
  };
  aggregateProof?: any;
  metadata: {
    totalConnectors: number;
    verifiedConnectors: number;
    aggregateCredibilityScore: number;
    lastUpdated: string;
    expiresAt?: string;
  };
  verified: boolean;
}

export interface ConnectorConfig {
  name: string;
  baseUrl: string;
  port: number;
  healthEndpoint: string;
  credentialsEndpoint: string;
  timeout: number;
}

export class AggregateCommitmentService {
  private connectorConfigs: Map<string, ConnectorConfig>;
  private commitmentStore = new Map<string, AggregateCommitment>();
  
  constructor() {
    this.connectorConfigs = new Map([
      ['academic', {
        name: 'Academic Connector',
        baseUrl: 'http://localhost:3001',
        port: 3001,
        healthEndpoint: '/health',
        credentialsEndpoint: '/api/academics/credentials',
        timeout: 30000
      }],
      ['financial', {
        name: 'Financial Connector',
        baseUrl: 'http://localhost:3002',
        port: 3002,
        healthEndpoint: '/health',
        credentialsEndpoint: '/api/financial/credentials',
        timeout: 30000
      }],
      ['health', {
        name: 'Health Connector',
        baseUrl: 'http://localhost:3003',
        port: 3003,
        healthEndpoint: '/health',
        credentialsEndpoint: '/api/health/credentials',
        timeout: 30000
      }],
      ['social', {
        name: 'Social Connector',
        baseUrl: 'http://localhost:3004',
        port: 3004,
        healthEndpoint: '/health',
        credentialsEndpoint: '/api/social/credentials',
        timeout: 30000
      }],
      ['government', {
        name: 'Government Connector',
        baseUrl: 'http://localhost:3005',
        port: 3005,
        healthEndpoint: '/health',
        credentialsEndpoint: '/api/government/credentials',
        timeout: 30000
      }],
      ['iot', {
        name: 'IoT Connector',
        baseUrl: 'http://localhost:3006',
        port: 3006,
        healthEndpoint: '/health',
        credentialsEndpoint: '/api/iot/credentials',
        timeout: 30000
      }]
    ]);
  }
  
  /**
   * Check health status of all connectors
   */
  async checkConnectorHealth(): Promise<{ [key: string]: boolean }> {
    const healthStatus: { [key: string]: boolean } = {};
    
    await Promise.all(
      Array.from(this.connectorConfigs.entries()).map(async ([type, config]) => {
        try {
          const response = await axios.get(`${config.baseUrl}${config.healthEndpoint}`, {
            timeout: 5000
          });
          
          healthStatus[type] = response.status === 200 && response.data.status === 'healthy';
          
        } catch (error) {
          console.warn(`⚠️ ${config.name} health check failed:`, getErrorMessage(error));
          healthStatus[type] = false;
        }
      })
    );
    
    return healthStatus;
  }
  
  /**
   * Fetch commitments from a specific connector
   */
  async fetchConnectorCommitments(
    connectorType: string, 
    did: string, 
    options?: any
  ): Promise<ConnectorCommitment[]> {
    const config = this.connectorConfigs.get(connectorType);
    if (!config) {
      throw new Error(`Unknown connector type: ${connectorType}`);
    }
    
    try {
      console.log(`🔍 Fetching commitments from ${config.name}...`);
      
      const response = await axios.get(`${config.baseUrl}${config.credentialsEndpoint}`, {
        params: {
          did,
          ...options
        },
        timeout: config.timeout
      });
      
      if (!response.data.success) {
        throw new Error(`${config.name} returned error: ${response.data.error}`);
      }
      
      // Transform connector response to our commitment format
      const commitments: ConnectorCommitment[] = [];
      const data = response.data.data;
      
      // Process different commitment types based on connector
      if (data.degreeCommitments) {
        data.degreeCommitments.forEach((commitment: any) => {
          commitments.push({
            connectorType: connectorType as any,
            commitmentHash: commitment.commitment,
            publicInput: commitment.publicInput,
            metadata: {
              type: 'degree',
              ...commitment.metadata
            },
            timestamp: Date.now(),
            verificationLevel: 'standard',
            credibilityScore: 0.9
          });
        });
      }
      
      if (data.accountCommitments) {
        data.accountCommitments.forEach((commitment: any) => {
          commitments.push({
            connectorType: connectorType as any,
            commitmentHash: commitment.commitment,
            publicInput: commitment.publicInput,
            metadata: {
              type: 'bank_account',
              ...commitment.metadata
            },
            timestamp: Date.now(),
            verificationLevel: 'enhanced',
            credibilityScore: 0.95
          });
        });
      }
      
      if (data.profileCommitments) {
        data.profileCommitments.forEach((commitment: any) => {
          commitments.push({
            connectorType: connectorType as any,
            commitmentHash: commitment.commitment,
            publicInput: commitment.publicInput,
            metadata: {
              type: 'social_profile',
              ...commitment.metadata
            },
            timestamp: Date.now(),
            verificationLevel: 'standard',
            credibilityScore: 0.8
          });
        });
      }
      
      // Add other commitment types as needed
      
      console.log(`✅ Fetched ${commitments.length} commitments from ${config.name}`);
      return commitments;
      
    } catch (error) {
      console.error(`❌ Error fetching commitments from ${config.name}:`, getErrorMessage(error));
      
      // Return empty array if connector is unavailable
      return [];
    }
  }
  
  /**
   * Aggregate commitments from all connectors for a DID
   */
  async aggregateCommitments(did: string, options?: {
    includeConnectors?: string[];
    excludeConnectors?: string[];
    minCredibilityScore?: number;
  }): Promise<AggregateCommitment> {
    try {
      console.log(`🔄 Aggregating commitments for DID: ${did}...`);
      
      // Determine which connectors to include
      let connectorsToQuery = Array.from(this.connectorConfigs.keys());
      
      if (options?.includeConnectors) {
        connectorsToQuery = connectorsToQuery.filter(c => options.includeConnectors!.includes(c));
      }
      
      if (options?.excludeConnectors) {
        connectorsToQuery = connectorsToQuery.filter(c => !options.excludeConnectors!.includes(c));
      }
      
      // Check connector health first
      const healthStatus = await this.checkConnectorHealth();
      const healthyConnectors = connectorsToQuery.filter(c => healthStatus[c]);
      
      console.log(`📊 Querying ${healthyConnectors.length}/${connectorsToQuery.length} healthy connectors`);
      
      // Fetch commitments from all healthy connectors in parallel
      const connectorCommitments = await Promise.all(
        healthyConnectors.map(async (connectorType) => {
          const commitments = await this.fetchConnectorCommitments(connectorType, did);
          return commitments;
        })
      );
      
      // Flatten and filter commitments
      const allCommitments = connectorCommitments.flat();
      
      let filteredCommitments = allCommitments;
      if (options?.minCredibilityScore) {
        filteredCommitments = allCommitments.filter(c => c.credibilityScore >= options.minCredibilityScore!);
      }
      
      // Create Merkle tree from commitment hashes
      const merkleTree = this.createMerkleTree(filteredCommitments.map(c => c.commitmentHash));
      
      // Calculate aggregate metrics
      const totalConnectors = connectorsToQuery.length;
      const verifiedConnectors = filteredCommitments.map(c => c.connectorType).filter((type, index, array) => array.indexOf(type) === index).length;
      const aggregateCredibilityScore = filteredCommitments.length > 0 ? 
        filteredCommitments.reduce((sum, c) => sum + c.credibilityScore, 0) / filteredCommitments.length : 0;
      
      // Create aggregate commitment
      const aggregateCommitment: AggregateCommitment = {
        did,
        rootHash: merkleTree.root,
        connectorCommitments: filteredCommitments,
        merkleTree,
        metadata: {
          totalConnectors,
          verifiedConnectors,
          aggregateCredibilityScore,
          lastUpdated: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        },
        verified: verifiedConnectors > 0 && aggregateCredibilityScore >= 0.7
      };
      
      // Store aggregate commitment
      this.commitmentStore.set(did, aggregateCommitment);
      
      console.log(`✅ Aggregate commitment created for DID: ${did}`, {
        totalCommitments: filteredCommitments.length,
        verifiedConnectors,
        credibilityScore: aggregateCredibilityScore.toFixed(3),
        merkleRoot: merkleTree.root.substring(0, 16) + '...'
      });
      
      return aggregateCommitment;
      
    } catch (error) {
      console.error('❌ Error aggregating commitments:', error);
      throw error;
    }
  }
  
  /**
   * Create Merkle tree from commitment hashes
   */
  private createMerkleTree(hashes: string[]): {
    root: string;
    leaves: string[];
    proofs: any[];
  } {
    if (hashes.length === 0) {
      return {
        root: '',
        leaves: [],
        proofs: []
      };
    }
    
    const leaves = [...hashes];
    const root = this.buildMerkleRoot(leaves);
    const proofs = leaves.map((leaf, index) => this.generateMerkleProof(leaves, index));
    
    return {
      root,
      leaves,
      proofs
    };
  }
  
  /**
   * Build Merkle root from leaves
   */
  private buildMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) return '';
    if (leaves.length === 1) return leaves[0];
    
    let currentLevel = [...leaves];
    
    while (currentLevel.length > 1) {
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
    }
    
    return currentLevel[0];
  }
  
  /**
   * Generate Merkle proof for a leaf
   */
  private generateMerkleProof(leaves: string[], leafIndex: number): any {
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
   * Verify aggregate commitment
   */
  async verifyAggregateCommitment(did: string): Promise<{
    verified: boolean;
    confidence: number;
    details: any;
  }> {
    try {
      const aggregateCommitment = this.commitmentStore.get(did);
      if (!aggregateCommitment) {
        throw new Error('Aggregate commitment not found');
      }
      
      console.log('🔍 Verifying aggregate commitment...');
      
      // Verify Merkle tree integrity
      const merkleRoot = this.buildMerkleRoot(aggregateCommitment.connectorCommitments.map(c => c.commitmentHash));
      const merkleIntegrity = merkleRoot === aggregateCommitment.merkleTree.root;
      
      // Verify individual commitments
      const connectorVerifications = await Promise.all(
        aggregateCommitment.connectorCommitments.map(async (commitment) => {
          // In a real implementation, would verify with the specific connector
          return {
            connectorType: commitment.connectorType,
            verified: true,
            confidence: commitment.credibilityScore
          };
        })
      );
      
      // Calculate overall confidence
      const averageConfidence = connectorVerifications.length > 0 ?
        connectorVerifications.reduce((sum, v) => sum + v.confidence, 0) / connectorVerifications.length : 0;
      
      const verifiedConnectors = connectorVerifications.filter(v => v.verified).length;
      const connectorDiversity = new Set(aggregateCommitment.connectorCommitments.map(c => c.connectorType)).size;
      
      // Boost confidence for cross-connector verification
      const diversityBonus = connectorDiversity >= 3 ? 0.1 : connectorDiversity >= 2 ? 0.05 : 0;
      const finalConfidence = Math.min(averageConfidence + diversityBonus, 0.99);
      
      const verified = merkleIntegrity && verifiedConnectors > 0 && finalConfidence >= 0.7;
      
      const details = {
        merkleIntegrity,
        verifiedConnectors,
        totalConnectors: aggregateCommitment.connectorCommitments.length,
        connectorDiversity,
        averageCredibility: aggregateCommitment.metadata.aggregateCredibilityScore,
        expiresAt: aggregateCommitment.metadata.expiresAt
      };
      
      console.log(`✅ Aggregate verification completed - Confidence: ${(finalConfidence * 100).toFixed(1)}%`);
      
      return {
        verified,
        confidence: finalConfidence,
        details
      };
      
    } catch (error) {
      console.error('❌ Error verifying aggregate commitment:', error);
      return {
        verified: false,
        confidence: 0,
        details: { error: getErrorMessage(error) }
      };
    }
  }
  
  /**
   * Get stored aggregate commitment
   */
  getAggregateCommitment(did: string): AggregateCommitment | null {
    return this.commitmentStore.get(did) || null;
  }
  
  /**
   * Refresh aggregate commitment
   */
  async refreshAggregateCommitment(did: string): Promise<AggregateCommitment> {
    console.log(`🔄 Refreshing aggregate commitment for DID: ${did}...`);
    return await this.aggregateCommitments(did);
  }
  
  /**
   * Get commitment statistics
   */
  getCommitmentStatistics(): {
    totalDIDs: number;
    totalCommitments: number;
    connectorUsage: { [key: string]: number };
    averageCredibility: number;
  } {
    const allCommitments = Array.from(this.commitmentStore.values());
    const totalDIDs = allCommitments.length;
    const totalCommitments = allCommitments.reduce((sum, ac) => sum + ac.connectorCommitments.length, 0);
    
    const connectorUsage: { [key: string]: number } = {};
    let totalCredibility = 0;
    let credibilityCount = 0;
    
    allCommitments.forEach(ac => {
      ac.connectorCommitments.forEach(cc => {
        connectorUsage[cc.connectorType] = (connectorUsage[cc.connectorType] || 0) + 1;
        totalCredibility += cc.credibilityScore;
        credibilityCount++;
      });
    });
    
    return {
      totalDIDs,
      totalCommitments,
      connectorUsage,
      averageCredibility: credibilityCount > 0 ? totalCredibility / credibilityCount : 0
    };
  }
}