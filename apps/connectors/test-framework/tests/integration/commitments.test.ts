import { CommitmentService, CommitmentData } from '@shared/zk/commitmentService';
import { createMockDID, createMockCredential } from '../setup';

describe('Commitment Service Integration Tests', () => {
  let commitmentService: CommitmentService;
  const mockDID = createMockDID();
  
  beforeEach(() => {
    commitmentService = new CommitmentService();
  });
  
  describe('Commitment Generation', () => {
    it('should generate valid commitment for academic credentials', () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'academic',
        source: 'idme',
        verified: true,
        dataHash: 'academic-data-hash-12345',
        metadata: {
          degree: 'Bachelor of Science',
          gpa: 3.8,
          graduationYear: 2022,
          institution: 'University of California'
        },
        timestamp: Date.now()
      };
      
      const commitment = commitmentService.generateCommitment(commitmentData);
      
      expect(commitment).toBeValidCommitment();
      expect(commitment.credentialType).toBe('academic');
      expect(commitment.source).toBe('idme');
      expect(commitment.did).toBe(mockDID);
      expect(commitment.verified).toBe(true);
      expect(commitment.commitmentHash).toHaveLength(64); // SHA256 hex
      expect(commitment.nullifierHash).toHaveLength(64);
      expect(commitment.merkleRoot).toHaveLength(64);
    });
    
    it('should generate valid commitment for financial credentials', () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'financial',
        source: 'plaid',
        verified: true,
        dataHash: 'financial-data-hash-12345',
        metadata: {
          accountCount: 3,
          totalAssets: 50000,
          creditScore: 750,
          monthlyIncome: 8000
        },
        timestamp: Date.now()
      };
      
      const commitment = commitmentService.generateCommitment(commitmentData);
      
      expect(commitment).toBeValidCommitment();
      expect(commitment.credentialType).toBe('financial');
      expect(commitment.source).toBe('plaid');
      expect(commitment.expiresAt).toBeDefined();
      
      // Financial credentials should expire in 6 months
      const expirationDate = new Date(commitment.expiresAt!);
      const now = new Date();
      const monthsDiff = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      expect(monthsDiff).toBeCloseTo(6, 1);
    });
    
    it('should generate valid commitment for health credentials', () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'health',
        source: 'epic',
        verified: true,
        dataHash: 'health-data-hash-12345',
        metadata: {
          patientId: 'epic-patient-123',
          recordCount: 15,
          lastVisit: '2023-11-15',
          provider: 'Epic FHIR'
        },
        timestamp: Date.now()
      };
      
      const commitment = commitmentService.generateCommitment(commitmentData);
      
      expect(commitment).toBeValidCommitment();
      expect(commitment.credentialType).toBe('health');
      expect(commitment.source).toBe('epic');
      
      // Health credentials should expire in 3 months (sensitive data)
      const expirationDate = new Date(commitment.expiresAt!);
      const now = new Date();
      const monthsDiff = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      expect(monthsDiff).toBeCloseTo(3, 1);
    });
    
    it('should generate deterministic commitments for same input', () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'government',
        source: 'dmv',
        verified: true,
        dataHash: 'government-data-hash-12345',
        metadata: {
          licenseNumber: 'DL123456789',
          state: 'CA',
          verified: true
        },
        timestamp: 1234567890000 // Fixed timestamp
      };
      
      const commitment1 = commitmentService.generateCommitment(commitmentData);
      const commitment2 = commitmentService.generateCommitment(commitmentData);
      
      expect(commitment1.commitmentHash).toBe(commitment2.commitmentHash);
      expect(commitment1.nullifierHash).toBe(commitment2.nullifierHash);
      expect(commitment1.merkleRoot).toBe(commitment2.merkleRoot);
    });
    
    it('should generate different commitments for different inputs', () => {
      const baseData: CommitmentData = {
        did: mockDID,
        credentialType: 'social',
        source: 'linkedin',
        verified: true,
        dataHash: 'social-data-hash-12345',
        metadata: { connections: 500 },
        timestamp: Date.now()
      };
      
      const commitment1 = commitmentService.generateCommitment(baseData);
      
      const modifiedData = { ...baseData, dataHash: 'modified-data-hash' };
      const commitment2 = commitmentService.generateCommitment(modifiedData);
      
      expect(commitment1.commitmentHash).not.toBe(commitment2.commitmentHash);
      expect(commitment1.nullifierHash).not.toBe(commitment2.nullifierHash);
      expect(commitment1.merkleRoot).not.toBe(commitment2.merkleRoot);
    });
  });
  
  describe('Zero-Knowledge Proof Generation', () => {
    it('should generate valid ZK proof for commitment', async () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'academic',
        source: 'idme',
        verified: true,
        dataHash: 'test-data-hash',
        metadata: { test: true },
        timestamp: Date.now()
      };
      
      const commitment = commitmentService.generateCommitment(commitmentData);
      const secret = 'user-secret-key';
      
      const zkProof = await commitmentService.generateZKProof(commitment, secret);
      
      expect(zkProof.commitment).toBe(commitment.commitmentHash);
      expect(zkProof.nullifier).toBe(commitment.nullifierHash);
      expect(zkProof.proof).toBeDefined();
      expect(zkProof.publicSignals).toHaveLength(4);
      expect(zkProof.verificationKey).toBeDefined();
      
      // Parse and validate proof structure
      const proofData = JSON.parse(zkProof.proof);
      expect(proofData.protocol).toBe('groth16');
      expect(proofData.curve).toBe('bn128');
      expect(proofData.a).toHaveLength(2);
      expect(proofData.b).toHaveLength(2);
      expect(proofData.c).toHaveLength(2);
    });
    
    it('should verify valid ZK proofs', async () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'financial',
        source: 'plaid',
        verified: true,
        dataHash: 'test-data-hash',
        metadata: { test: true },
        timestamp: Date.now()
      };
      
      const commitment = commitmentService.generateCommitment(commitmentData);
      const zkProof = await commitmentService.generateZKProof(commitment, 'secret');
      
      const isValid = await commitmentService.verifyZKProof(zkProof);
      
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid ZK proofs', async () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'health',
        source: 'epic',
        verified: true,
        dataHash: 'test-data-hash',
        metadata: { test: true },
        timestamp: Date.now()
      };
      
      const commitment = commitmentService.generateCommitment(commitmentData);
      const zkProof = await commitmentService.generateZKProof(commitment, 'secret');
      
      // Tamper with the proof
      zkProof.proof = JSON.stringify({ invalid: 'proof' });
      
      const isValid = await commitmentService.verifyZKProof(zkProof);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('Batch Commitments', () => {
    it('should generate valid batch commitment for multiple credentials', () => {
      const commitmentData1: CommitmentData = {
        did: mockDID,
        credentialType: 'academic',
        source: 'idme',
        verified: true,
        dataHash: 'academic-hash',
        metadata: { degree: 'BS' },
        timestamp: Date.now()
      };
      
      const commitmentData2: CommitmentData = {
        did: mockDID,
        credentialType: 'financial',
        source: 'plaid',
        verified: true,
        dataHash: 'financial-hash',
        metadata: { income: 80000 },
        timestamp: Date.now()
      };
      
      const commitment1 = commitmentService.generateCommitment(commitmentData1);
      const commitment2 = commitmentService.generateCommitment(commitmentData2);
      
      const batchCommitment = commitmentService.generateBatchCommitment([commitment1, commitment2]);
      
      expect(batchCommitment).toBeValidCommitment();
      expect(batchCommitment.credentialType).toBe('batch_credential');
      expect(batchCommitment.source).toBe('multiple');
      expect(batchCommitment.verified).toBe(true); // Both individual commitments are verified
      expect(batchCommitment.did).toBe(mockDID);
    });
    
    it('should handle batch commitment with mixed verification status', () => {
      const verifiedData: CommitmentData = {
        did: mockDID,
        credentialType: 'academic',
        source: 'idme',
        verified: true,
        dataHash: 'verified-hash',
        metadata: {},
        timestamp: Date.now()
      };
      
      const unverifiedData: CommitmentData = {
        did: mockDID,
        credentialType: 'social',
        source: 'linkedin',
        verified: false,
        dataHash: 'unverified-hash',
        metadata: {},
        timestamp: Date.now()
      };
      
      const verifiedCommitment = commitmentService.generateCommitment(verifiedData);
      const unverifiedCommitment = commitmentService.generateCommitment(unverifiedData);
      
      const batchCommitment = commitmentService.generateBatchCommitment([verifiedCommitment, unverifiedCommitment]);
      
      expect(batchCommitment.verified).toBe(false); // Should be false if any credential is unverified
    });
  });
  
  describe('Commitment Validation', () => {
    it('should validate commitment integrity against original data', () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'government',
        source: 'census',
        verified: true,
        dataHash: 'census-data-hash',
        metadata: {
          address: '123 Main St',
          verified: true
        },
        timestamp: 1234567890000
      };
      
      const commitment = commitmentService.generateCommitment(commitmentData);
      const isValid = commitmentService.validateCommitment(commitment, commitmentData);
      
      expect(isValid).toBe(true);
    });
    
    it('should detect tampered commitments', () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'government',
        source: 'census',
        verified: true,
        dataHash: 'census-data-hash',
        metadata: { address: '123 Main St' },
        timestamp: 1234567890000
      };
      
      const commitment = commitmentService.generateCommitment(commitmentData);
      
      // Tamper with the commitment
      commitment.commitmentHash = 'tampered-hash';
      
      const isValid = commitmentService.validateCommitment(commitment, commitmentData);
      
      expect(isValid).toBe(false);
    });
    
    it('should detect data modifications', () => {
      const originalData: CommitmentData = {
        did: mockDID,
        credentialType: 'social',
        source: 'github',
        verified: true,
        dataHash: 'original-hash',
        metadata: { repos: 25 },
        timestamp: 1234567890000
      };
      
      const commitment = commitmentService.generateCommitment(originalData);
      
      // Modify the original data
      const modifiedData = { ...originalData, dataHash: 'modified-hash' };
      
      const isValid = commitmentService.validateCommitment(commitment, modifiedData);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('Blockchain Export', () => {
    it('should export commitment for blockchain storage', () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'academic',
        source: 'idme',
        verified: true,
        dataHash: 'test-hash',
        metadata: { test: true },
        timestamp: Date.now()
      };
      
      const commitment = commitmentService.generateCommitment(commitmentData);
      const blockchainData = commitmentService.exportForBlockchain(commitment);
      
      expect(blockchainData.commitmentHash).toBe(commitment.commitmentHash);
      expect(blockchainData.merkleRoot).toBe(commitment.merkleRoot);
      expect(blockchainData.nullifierHash).toBe(commitment.nullifierHash);
      expect(blockchainData.metadata).toBeDefined();
      
      // Verify metadata can be parsed
      const parsedMetadata = JSON.parse(blockchainData.metadata);
      expect(parsedMetadata.credentialType).toBe('academic');
      expect(parsedMetadata.source).toBe('idme');
      expect(parsedMetadata.verified).toBe(true);
    });
  });
  
  describe('Performance Tests', () => {
    it('should generate commitments efficiently', () => {
      const commitmentData: CommitmentData = {
        did: mockDID,
        credentialType: 'performance',
        source: 'test',
        verified: true,
        dataHash: 'performance-hash',
        metadata: { large: 'x'.repeat(1000) },
        timestamp: Date.now()
      };
      
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        commitmentService.generateCommitment({
          ...commitmentData,
          timestamp: Date.now() + i
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should generate 100 commitments in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
    
    it('should handle large batch commitments', () => {
      const commitments = [];
      
      for (let i = 0; i < 50; i++) {
        const commitmentData: CommitmentData = {
          did: mockDID,
          credentialType: 'batch_test',
          source: `source_${i}`,
          verified: true,
          dataHash: `hash_${i}`,
          metadata: { index: i },
          timestamp: Date.now() + i
        };
        
        commitments.push(commitmentService.generateCommitment(commitmentData));
      }
      
      const startTime = Date.now();
      const batchCommitment = commitmentService.generateBatchCommitment(commitments);
      const endTime = Date.now();
      
      expect(batchCommitment).toBeValidCommitment();
      expect(endTime - startTime).toBeLessThan(500); // Should complete in less than 500ms
    });
  });
});