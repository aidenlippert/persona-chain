/**
 * @file Enterprise Blockchain Infrastructure Tests
 * @description Comprehensive test suite for enterprise-grade blockchain features
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { TestingFramework } from './utils/testing-framework';
import { EnterpriseBlockchainTestHelper } from './utils/enterprise-test-helper';

// Test configuration
const TEST_CONFIG = {
  chainId: 'personachain-test-1',
  networkUrl: 'http://localhost:26657',
  apiUrl: 'http://localhost:1317',
  timeout: 30000,
  retries: 3,
  cleanup: true,
};

// Test data
const TEST_DATA = {
  testDID: 'did:key:z6MkHaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  testCircuitId: 'test-circuit-groth16',
  testCredentialId: 'test-credential-001',
  testProposalId: 1,
  testAccountAddress: 'persona1testaccountaddress',
  testValidatorAddress: 'personavaloper1testvalidatoraddress',
};

describe('Enterprise Blockchain Infrastructure Tests', () => {
  let framework: TestingFramework;
  let helper: EnterpriseBlockchainTestHelper;

  beforeAll(async () => {
    framework = new TestingFramework(TEST_CONFIG);
    helper = new EnterpriseBlockchainTestHelper(framework);
    
    // Initialize test environment
    await framework.initialize();
    await helper.setupTestAccounts();
    await helper.deployTestContracts();
  });

  afterAll(async () => {
    if (TEST_CONFIG.cleanup) {
      await helper.cleanup();
      await framework.cleanup();
    }
  });

  beforeEach(async () => {
    await helper.resetTestState();
  });

  describe('Smart Contract Enhancements', () => {
    describe('Advanced DID Registry', () => {
      it('should register DID with enterprise features', async () => {
        const didDocument = {
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: TEST_DATA.testDID,
          verificationMethod: [
            {
              id: `${TEST_DATA.testDID}#key-1`,
              type: 'Ed25519VerificationKey2020',
              controller: TEST_DATA.testDID,
              publicKeyMultibase: 'z6MkHaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
            },
          ],
          authentication: [`${TEST_DATA.testDID}#key-1`],
          assertionMethod: [`${TEST_DATA.testDID}#key-1`],
        };

        const result = await helper.registerDID({
          did: TEST_DATA.testDID,
          document: JSON.stringify(didDocument),
          expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24 hours
          metadataHash: '0x' + Buffer.from('test-metadata').toString('hex'),
          merkleRoot: '0x' + Buffer.from('test-merkle-root').toString('hex'),
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.transactionHash).toBeDefined();
        expect(result.events).toContain('DIDRegistered');
      });

      it('should update DID document with enhanced security', async () => {
        const updatedDocument = {
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: TEST_DATA.testDID,
          verificationMethod: [
            {
              id: `${TEST_DATA.testDID}#key-1`,
              type: 'Ed25519VerificationKey2020',
              controller: TEST_DATA.testDID,
              publicKeyMultibase: 'z6MkHaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
            },
            {
              id: `${TEST_DATA.testDID}#key-2`,
              type: 'Ed25519VerificationKey2020',
              controller: TEST_DATA.testDID,
              publicKeyMultibase: 'z6MkHbXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
            },
          ],
          authentication: [`${TEST_DATA.testDID}#key-1`, `${TEST_DATA.testDID}#key-2`],
          assertionMethod: [`${TEST_DATA.testDID}#key-1`],
        };

        const result = await helper.updateDID({
          did: TEST_DATA.testDID,
          document: JSON.stringify(updatedDocument),
          nonce: 1,
          newMerkleRoot: '0x' + Buffer.from('updated-merkle-root').toString('hex'),
          newMetadataHash: '0x' + Buffer.from('updated-metadata').toString('hex'),
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('DIDUpdated');
      });

      it('should batch register multiple DIDs efficiently', async () => {
        const batchSize = 10;
        const dids = Array.from({ length: batchSize }, (_, i) => ({
          did: `did:key:z6MkBatch${i.toString().padStart(3, '0')}`,
          document: JSON.stringify({
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: `did:key:z6MkBatch${i.toString().padStart(3, '0')}`,
          }),
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
          metadataHash: '0x' + Buffer.from(`batch-metadata-${i}`).toString('hex'),
        }));

        const result = await helper.batchRegisterDIDs({
          dids,
          merkleRoot: '0x' + Buffer.from('batch-merkle-root').toString('hex'),
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('BatchOperationProcessed');
        expect(result.processedCount).toBe(batchSize);
      });

      it('should handle delegate permissions correctly', async () => {
        const delegateAddress = 'persona1delegateaddress';
        const permission = 'CONTROLLER';

        const result = await helper.addDelegate({
          did: TEST_DATA.testDID,
          delegate: delegateAddress,
          permission,
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('DelegateAdded');

        // Verify delegate has permission
        const hasPermission = await helper.hasDelegate({
          did: TEST_DATA.testDID,
          delegate: delegateAddress,
          permission,
        });

        expect(hasPermission).toBe(true);
      });
    });

    describe('Enhanced ZK Verifier Contract', () => {
      it('should register circuit with enterprise features', async () => {
        const circuitData = {
          circuitId: TEST_DATA.testCircuitId,
          verificationKey: 'vk_test_key_' + Math.random().toString(36).substring(7),
          circuitType: 'groth16',
        };

        const result = await helper.registerCircuit(circuitData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('CircuitRegistered');
        expect(result.circuitId).toBe(TEST_DATA.testCircuitId);
      });

      it('should submit proof with performance tracking', async () => {
        const proofData = {
          circuitId: TEST_DATA.testCircuitId,
          publicInputs: ['123', '456', '789'],
          proof: JSON.stringify({
            pi_a: ['0x123'],
            pi_b: [['0x456']],
            pi_c: ['0x789'],
          }),
        };

        const result = await helper.submitProof(proofData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('ProofSubmitted');
        expect(result.verified).toBe(true);
        expect(result.verificationTime).toBeDefined();
        expect(result.gasUsed).toBeDefined();
      });

      it('should batch verify proofs efficiently', async () => {
        const batchSize = 5;
        const proofs = Array.from({ length: batchSize }, (_, i) => ({
          circuitId: TEST_DATA.testCircuitId,
          publicInputs: [i.toString(), (i + 1).toString()],
          proof: JSON.stringify({
            pi_a: [`0x${i.toString(16)}`],
            pi_b: [[`0x${(i + 1).toString(16)}`]],
            pi_c: [`0x${(i + 2).toString(16)}`],
          }),
        }));

        const result = await helper.batchSubmitProofs(proofs);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('BatchOperationProcessed');
        expect(result.verifiedCount).toBe(batchSize);
      });

      it('should handle emergency pause correctly', async () => {
        const result = await helper.emergencyPause();

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('EmergencyPauseActivated');

        // Verify operations are paused
        const proofData = {
          circuitId: TEST_DATA.testCircuitId,
          publicInputs: ['123'],
          proof: JSON.stringify({ pi_a: ['0x123'] }),
        };

        await expect(helper.submitProof(proofData)).rejects.toThrow('EmergencyPause');
      });
    });
  });

  describe('Cross-Chain Integration', () => {
    describe('IBC Protocol Implementation', () => {
      it('should establish IBC channel successfully', async () => {
        const channelConfig = {
          portId: 'did',
          channelId: 'channel-0',
          counterpartyPortId: 'did',
          counterpartyChannelId: 'channel-0',
          version: 'did-1',
          connectionHops: ['connection-0'],
        };

        const result = await helper.createIBCChannel(channelConfig);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('IBCChannelCreated');
        expect(result.channelId).toBe('channel-0');
      });

      it('should handle cross-chain DID resolution', async () => {
        const request = {
          did: TEST_DATA.testDID,
          sourceChain: 'personachain-test-1',
          targetChain: 'ethereum-testnet',
        };

        const result = await helper.submitCrossChainDIDResolution(request);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('CrossChainRequestSubmitted');
        expect(result.requestId).toBeDefined();
      });

      it('should verify cross-chain credentials', async () => {
        const request = {
          credentialId: TEST_DATA.testCredentialId,
          sourceChain: 'personachain-test-1',
          targetChain: 'polygon-testnet',
        };

        const result = await helper.submitCrossChainCredentialVerification(request);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('CrossChainVerificationSubmitted');
        expect(result.verificationId).toBeDefined();
      });

      it('should handle IBC packet timeouts gracefully', async () => {
        const packetData = {
          sequence: 1,
          sourcePort: 'did',
          sourceChannel: 'channel-0',
          destinationPort: 'did',
          destinationChannel: 'channel-0',
          timeoutHeight: 100,
          timeoutTimestamp: Math.floor(Date.now() / 1000) + 60,
        };

        const result = await helper.simulateIBCTimeout(packetData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('IBCPacketTimeout');
        expect(result.timeoutHandled).toBe(true);
      });
    });

    describe('Multi-Chain DID Resolution', () => {
      it('should resolve DID across multiple chains', async () => {
        const chains = ['ethereum', 'polygon', 'bsc'];
        const resolutions = await Promise.all(
          chains.map(chain => helper.resolveDIDOnChain(TEST_DATA.testDID, chain))
        );

        resolutions.forEach((resolution, index) => {
          expect(resolution).toBeDefined();
          expect(resolution.success).toBe(true);
          expect(resolution.chain).toBe(chains[index]);
          expect(resolution.didDocument).toBeDefined();
        });
      });

      it('should handle chain-specific DID formats', async () => {
        const chainDIDs = {
          ethereum: 'did:ethr:0x123...abc',
          polygon: 'did:polygon:0x456...def',
          bsc: 'did:bsc:0x789...ghi',
        };

        for (const [chain, did] of Object.entries(chainDIDs)) {
          const result = await helper.resolveDIDOnChain(did, chain);
          expect(result).toBeDefined();
          expect(result.success).toBe(true);
          expect(result.chain).toBe(chain);
        }
      });
    });

    describe('Bridge Contracts', () => {
      it('should deploy bridge contracts successfully', async () => {
        const bridgeConfig = {
          sourceChain: 'personachain-test-1',
          targetChain: 'ethereum-testnet',
          bridgeType: 'did-bridge',
          validators: [TEST_DATA.testValidatorAddress],
          threshold: 1,
        };

        const result = await helper.deployBridgeContract(bridgeConfig);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('BridgeContractDeployed');
        expect(result.bridgeAddress).toBeDefined();
      });

      it('should handle asset portability', async () => {
        const assetTransfer = {
          asset: 'DID-NFT',
          tokenId: '12345',
          from: TEST_DATA.testAccountAddress,
          to: '0x123...abc',
          sourceChain: 'personachain-test-1',
          targetChain: 'ethereum-testnet',
        };

        const result = await helper.transferAssetCrossChain(assetTransfer);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('AssetTransferInitiated');
        expect(result.transferId).toBeDefined();
      });
    });
  });

  describe('Performance Optimizations', () => {
    describe('Layer 2 Scaling Solutions', () => {
      it('should create state channel successfully', async () => {
        const channelConfig = {
          channelId: 'state-channel-001',
          participants: [TEST_DATA.testAccountAddress, 'persona1participant2'],
          initialState: Buffer.from('initial-state'),
          timeout: 3600,
          disputeTimeout: 86400,
        };

        const result = await helper.createStateChannel(channelConfig);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('StateChannelCreated');
        expect(result.channelId).toBe('state-channel-001');
      });

      it('should process optimistic rollup batch', async () => {
        const batchData = {
          rollupId: 'optimistic-rollup-001',
          transactions: Array.from({ length: 100 }, (_, i) => ({
            id: `tx-${i}`,
            from: TEST_DATA.testAccountAddress,
            to: 'persona1recipient',
            value: '1000',
            data: Buffer.from(`tx-data-${i}`),
            nonce: i,
          })),
          stateRoot: '0x' + Buffer.from('state-root').toString('hex'),
          prevStateRoot: '0x' + Buffer.from('prev-state-root').toString('hex'),
        };

        const result = await helper.submitOptimisticRollupBatch(batchData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('RollupBatchSubmitted');
        expect(result.batchId).toBeDefined();
      });

      it('should verify ZK rollup proofs', async () => {
        const zkBatchData = {
          rollupId: 'zk-rollup-001',
          transactions: Array.from({ length: 50 }, (_, i) => ({
            id: `zk-tx-${i}`,
            from: TEST_DATA.testAccountAddress,
            to: 'persona1recipient',
            value: '2000',
            data: Buffer.from(`zk-tx-data-${i}`),
            nonce: i,
          })),
          stateRoot: '0x' + Buffer.from('zk-state-root').toString('hex'),
          proofData: Buffer.from('zk-proof-data'),
        };

        const result = await helper.submitZKRollupBatch(zkBatchData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('ZKRollupBatchSubmitted');
        expect(result.verified).toBe(true);
      });

      it('should handle Plasma chain operations', async () => {
        const plasmaConfig = {
          chainId: 'plasma-chain-001',
          operator: TEST_DATA.testAccountAddress,
          validators: [TEST_DATA.testValidatorAddress],
          blockInterval: 60,
          challengeWindow: 86400,
        };

        const result = await helper.createPlasmaChain(plasmaConfig);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('PlasmaChainCreated');
        expect(result.chainId).toBe('plasma-chain-001');
      });
    });

    describe('Merkle Tree Optimizations', () => {
      it('should create and verify Merkle trees efficiently', async () => {
        const leaves = Array.from({ length: 1000 }, (_, i) => 
          Buffer.from(`leaf-${i}`)
        );

        const result = await helper.createMerkleTree({
          treeId: 'merkle-tree-001',
          leaves,
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('MerkleTreeCreated');
        expect(result.root).toBeDefined();
        expect(result.depth).toBeDefined();
      });

      it('should verify Merkle proofs correctly', async () => {
        const proofData = {
          root: '0x' + Buffer.from('merkle-root').toString('hex'),
          leaf: '0x' + Buffer.from('leaf-500').toString('hex'),
          proof: ['0x' + Buffer.from('proof-1').toString('hex')],
        };

        const result = await helper.verifyMerkleProof(proofData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Enterprise Features', () => {
    describe('Multi-Signature Governance', () => {
      it('should create multi-signature proposal', async () => {
        const proposalData = {
          title: 'Test Governance Proposal',
          description: 'A test proposal for multi-signature governance',
          proposalType: 'add_admin',
          threshold: 2,
          requiredSignatures: 2,
          executionData: JSON.stringify({
            address: 'persona1newadmin',
            role: 'ADMIN',
          }),
          expirationDuration: 86400,
        };

        const result = await helper.createMultisigProposal(proposalData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('MultisigProposalCreated');
        expect(result.proposalId).toBeDefined();
      });

      it('should handle multi-signature signing process', async () => {
        const proposalId = 1;
        const signers = [TEST_DATA.testAccountAddress, 'persona1signer2'];

        for (const signer of signers) {
          const result = await helper.signMultisigProposal({
            proposalId,
            signer,
            signature: Buffer.from(`signature-${signer}`),
            publicKey: Buffer.from(`pubkey-${signer}`),
          });

          expect(result).toBeDefined();
          expect(result.success).toBe(true);
          expect(result.events).toContain('MultisigProposalSigned');
        }
      });

      it('should execute multi-signature proposal', async () => {
        const proposalId = 1;
        const executor = TEST_DATA.testAccountAddress;

        const result = await helper.executeMultisigProposal({
          proposalId,
          executor,
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('MultisigProposalExecuted');
        expect(result.executionResult).toBeDefined();
      });
    });

    describe('Role-Based Access Control', () => {
      it('should create governance roles', async () => {
        const roleData = {
          roleId: 'TEST_ROLE',
          name: 'Test Role',
          description: 'A test role for RBAC',
          permissions: ['CREATE_PROPOSAL', 'VOTE_PROPOSAL'],
        };

        const result = await helper.createGovernanceRole(roleData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('GovernanceRoleCreated');
        expect(result.roleId).toBe('TEST_ROLE');
      });

      it('should assign roles to members', async () => {
        const assignmentData = {
          roleId: 'TEST_ROLE',
          member: TEST_DATA.testAccountAddress,
        };

        const result = await helper.assignRole(assignmentData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('RoleAssigned');
      });

      it('should check role permissions', async () => {
        const hasPermission = await helper.hasRolePermission({
          account: TEST_DATA.testAccountAddress,
          role: 'TEST_ROLE',
          permission: 'CREATE_PROPOSAL',
        });

        expect(hasPermission).toBe(true);
      });
    });

    describe('Audit Trail Mechanisms', () => {
      it('should create audit trail entries', async () => {
        const auditData = {
          eventType: 'test_event',
          actor: TEST_DATA.testAccountAddress,
          target: 'test_target',
          action: 'test_action',
          details: { key: 'value' },
        };

        const result = await helper.createAuditTrail(auditData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('AuditTrailCreated');
        expect(result.auditId).toBeDefined();
      });

      it('should query audit trail with filters', async () => {
        const filters = {
          eventType: 'test_event',
          actor: TEST_DATA.testAccountAddress,
          startTime: Math.floor(Date.now() / 1000) - 3600,
          endTime: Math.floor(Date.now() / 1000),
        };

        const result = await helper.queryAuditTrail(filters);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.entries).toBeDefined();
        expect(Array.isArray(result.entries)).toBe(true);
      });
    });

    describe('Compliance Frameworks', () => {
      it('should generate compliance reports', async () => {
        const reportConfig = {
          reportType: 'GDPR_COMPLIANCE',
          startTime: Math.floor(Date.now() / 1000) - 86400,
          endTime: Math.floor(Date.now() / 1000),
        };

        const result = await helper.generateComplianceReport(reportConfig);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.events).toContain('ComplianceReportGenerated');
        expect(result.reportId).toBeDefined();
      });

      it('should validate compliance rules', async () => {
        const ruleData = {
          ruleId: 'GDPR_DATA_RETENTION',
          ruleType: 'data_retention',
          parameters: {
            maxRetentionDays: 365,
            dataTypes: ['personal_data', 'biometric_data'],
          },
        };

        const result = await helper.validateComplianceRule(ruleData);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.valid).toBe(true);
        expect(result.complianceScore).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    describe('End-to-End Workflows', () => {
      it('should complete full identity lifecycle', async () => {
        // 1. Register DID
        const didResult = await helper.registerDID({
          did: TEST_DATA.testDID,
          document: JSON.stringify({
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: TEST_DATA.testDID,
          }),
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
        });

        expect(didResult.success).toBe(true);

        // 2. Issue credential
        const credentialResult = await helper.issueCredential({
          credentialId: TEST_DATA.testCredentialId,
          issuer: TEST_DATA.testDID,
          subject: TEST_DATA.testDID,
          credentialData: {
            type: 'VerifiableCredential',
            credentialSubject: {
              id: TEST_DATA.testDID,
              name: 'Test User',
            },
          },
        });

        expect(credentialResult.success).toBe(true);

        // 3. Generate ZK proof
        const proofResult = await helper.generateZKProof({
          circuitId: TEST_DATA.testCircuitId,
          credentialId: TEST_DATA.testCredentialId,
          publicInputs: ['test-input'],
        });

        expect(proofResult.success).toBe(true);

        // 4. Verify across chains
        const verificationResult = await helper.verifyCrossChain({
          proofId: proofResult.proofId,
          targetChain: 'ethereum-testnet',
        });

        expect(verificationResult.success).toBe(true);
      });

      it('should handle governance proposal lifecycle', async () => {
        // 1. Create proposal
        const proposalResult = await helper.createMultisigProposal({
          title: 'Integration Test Proposal',
          description: 'Test proposal for integration testing',
          proposalType: 'update_config',
          threshold: 2,
          requiredSignatures: 2,
          executionData: JSON.stringify({ key: 'value' }),
          expirationDuration: 86400,
        });

        expect(proposalResult.success).toBe(true);

        // 2. Sign proposal
        const signResult = await helper.signMultisigProposal({
          proposalId: proposalResult.proposalId,
          signer: TEST_DATA.testAccountAddress,
          signature: Buffer.from('test-signature'),
          publicKey: Buffer.from('test-pubkey'),
        });

        expect(signResult.success).toBe(true);

        // 3. Execute proposal
        const executeResult = await helper.executeMultisigProposal({
          proposalId: proposalResult.proposalId,
          executor: TEST_DATA.testAccountAddress,
        });

        expect(executeResult.success).toBe(true);
      });
    });

    describe('Performance Benchmarks', () => {
      it('should meet performance thresholds', async () => {
        const benchmarks = await helper.runPerformanceBenchmarks({
          testTypes: ['did_registration', 'proof_verification', 'governance_voting'],
          iterations: 100,
          concurrency: 10,
        });

        expect(benchmarks).toBeDefined();
        expect(benchmarks.didRegistration.avgTime).toBeLessThan(1000); // < 1s
        expect(benchmarks.proofVerification.avgTime).toBeLessThan(500); // < 500ms
        expect(benchmarks.governanceVoting.avgTime).toBeLessThan(200); // < 200ms
        expect(benchmarks.overall.throughput).toBeGreaterThan(100); // > 100 ops/s
      });

      it('should handle high load scenarios', async () => {
        const loadTest = await helper.runLoadTest({
          duration: 60000, // 1 minute
          rampUp: 10000, // 10 seconds
          maxUsers: 1000,
          operations: ['register_did', 'submit_proof', 'vote_proposal'],
        });

        expect(loadTest).toBeDefined();
        expect(loadTest.success).toBe(true);
        expect(loadTest.errorRate).toBeLessThan(0.01); // < 1% error rate
        expect(loadTest.avgResponseTime).toBeLessThan(2000); // < 2s
      });
    });

    describe('Security Tests', () => {
      it('should prevent unauthorized access', async () => {
        const unauthorizedAccount = 'persona1unauthorized';

        await expect(
          helper.executeMultisigProposal({
            proposalId: 1,
            executor: unauthorizedAccount,
          })
        ).rejects.toThrow('Unauthorized');
      });

      it('should handle malicious inputs safely', async () => {
        const maliciousInputs = [
          { did: '../../../etc/passwd' },
          { did: '<script>alert("xss")</script>' },
          { did: 'SELECT * FROM users' },
          { did: ''; DROP TABLE dids; --' },
        ];

        for (const input of maliciousInputs) {
          await expect(
            helper.registerDID({
              did: input.did,
              document: '{}',
            })
          ).rejects.toThrow('Invalid DID format');
        }
      });

      it('should validate cryptographic signatures', async () => {
        const invalidSignature = Buffer.from('invalid-signature');
        const validPublicKey = Buffer.from('valid-public-key');

        await expect(
          helper.signMultisigProposal({
            proposalId: 1,
            signer: TEST_DATA.testAccountAddress,
            signature: invalidSignature,
            publicKey: validPublicKey,
          })
        ).rejects.toThrow('Invalid signature');
      });
    });
  });

  describe('Monitoring and Observability', () => {
    it('should collect performance metrics', async () => {
      const metrics = await helper.getPerformanceMetrics({
        timeRange: 3600, // 1 hour
        metrics: ['transaction_count', 'block_time', 'gas_usage'],
      });

      expect(metrics).toBeDefined();
      expect(metrics.transactionCount).toBeGreaterThan(0);
      expect(metrics.blockTime).toBeGreaterThan(0);
      expect(metrics.gasUsage).toBeGreaterThan(0);
    });

    it('should generate health check reports', async () => {
      const healthCheck = await helper.performHealthCheck();

      expect(healthCheck).toBeDefined();
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.services).toBeDefined();
      expect(healthCheck.services.blockchain).toBe('healthy');
      expect(healthCheck.services.api).toBe('healthy');
      expect(healthCheck.services.database).toBe('healthy');
    });

    it('should detect anomalies in system behavior', async () => {
      const anomalyDetection = await helper.runAnomalyDetection({
        timeWindow: 3600,
        threshold: 0.95,
        metrics: ['transaction_rate', 'error_rate', 'response_time'],
      });

      expect(anomalyDetection).toBeDefined();
      expect(anomalyDetection.anomaliesDetected).toBe(false);
      expect(anomalyDetection.score).toBeGreaterThan(0.95);
    });
  });
});

// Helper function to run tests with retry logic
async function runWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = TEST_CONFIG.retries,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return runWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}