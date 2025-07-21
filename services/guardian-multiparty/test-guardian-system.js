/**
 * Guardian Multi-Party Control System Test
 * Comprehensive test suite for all guardian services
 */

import winston from 'winston';

// Import all services
import GovernanceService from './services/GovernanceService.js';
import ThresholdSignatureService from './services/ThresholdSignatureService.js';
import ApprovalWorkflowService from './services/ApprovalWorkflowService.js';
import GuardianManagementService from './services/GuardianManagementService.js';
import PolicyEngineService from './services/PolicyEngineService.js';
import AuditService from './services/AuditService.js';
import NotificationService from './services/NotificationService.js';
import EncryptionService from './services/EncryptionService.js';

// Test configuration
const testConfig = {
    environment: 'test',
    threshold: {
        defaultThreshold: 3,
        maxGuardians: 10,
        minGuardians: 3
    },
    governance: {
        votingPeriod: 5 * 60 * 1000, // 5 minutes for testing
        quorumThreshold: 0.6,
        approvalThreshold: 0.5
    },
    notifications: {
        email: {
            from: 'test@persona-chain.com'
        }
    },
    encryption: {
        algorithm: 'aes-256-gcm',
        keySize: 32
    }
};

// Logger for testing
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class GuardianSystemTester {
    constructor() {
        this.services = {};
        this.testResults = [];
        this.logger = logger;
    }
    
    async initializeServices() {
        try {
            this.logger.info('🚀 Initializing Guardian Multi-Party Control Services...');
            
            // Initialize all services
            this.services.governance = new GovernanceService(testConfig, logger);
            this.services.thresholdSignature = new ThresholdSignatureService(testConfig, logger);
            this.services.approvalWorkflow = new ApprovalWorkflowService(testConfig, logger);
            this.services.guardianManagement = new GuardianManagementService(testConfig, logger);
            this.services.policyEngine = new PolicyEngineService(testConfig, logger);
            this.services.audit = new AuditService(testConfig, logger);
            this.services.notification = new NotificationService(testConfig, logger);
            this.services.encryption = new EncryptionService(testConfig, logger);
            
            this.logger.info('✅ All services initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize services', { error: error.message });
            return false;
        }
    }
    
    async runComprehensiveTests() {
        try {
            this.logger.info('🧪 Starting comprehensive Guardian system tests...');
            
            // Run individual service tests
            await this.testEncryptionService();
            await this.testGuardianManagement();
            await this.testPolicyEngine();
            await this.testAuditService();
            await this.testNotificationService();
            await this.testThresholdSignatures();
            await this.testGovernanceWorkflow();
            await this.testApprovalWorkflow();
            
            // Run integration tests
            await this.testEndToEndWorkflow();
            
            // Run health checks
            await this.testHealthChecks();
            
            this.printTestSummary();
            
        } catch (error) {
            this.logger.error('❌ Test suite failed', { error: error.message });
        }
    }
    
    async testEncryptionService() {
        try {
            this.logger.info('🔐 Testing Encryption Service...');
            
            const encryption = this.services.encryption;
            
            // Test data encryption
            const testData = { 
                sensitive: 'guardian-credentials',
                secret: 'threshold-key-share',
                guardianId: 'guardian_test_1'
            };
            
            const encrypted = await encryption.encryptData(testData);
            this.addTestResult('Encryption Service', 'Data Encryption', true);
            
            const decrypted = await encryption.decryptData(encrypted);
            const dataMatches = JSON.stringify(decrypted) === JSON.stringify(testData);
            this.addTestResult('Encryption Service', 'Data Decryption', dataMatches);
            
            // Test key generation
            const key = await encryption.generateKey();
            this.addTestResult('Encryption Service', 'Key Generation', !!key.id);
            
            // Test key derivation
            const derivedKey = await encryption.deriveKey('test-password');
            this.addTestResult('Encryption Service', 'Key Derivation', !!derivedKey.id);
            
            this.logger.info('✅ Encryption Service tests completed');
            
        } catch (error) {
            this.logger.error('❌ Encryption Service tests failed', { error: error.message });
            this.addTestResult('Encryption Service', 'General Test', false, error.message);
        }
    }
    
    async testGuardianManagement() {
        try {
            this.logger.info('👥 Testing Guardian Management Service...');
            
            const guardianMgmt = this.services.guardianManagement;
            
            // Test guardian creation
            const newGuardian = await guardianMgmt.createGuardian({
                name: 'Test Guardian',
                email: 'test@guardian.com',
                role: 'GUARDIAN',
                contactInfo: {
                    phone: '+1234567890'
                },
                createdBy: 'system'
            });
            
            this.addTestResult('Guardian Management', 'Guardian Creation', !!newGuardian.guardian.id);
            
            // Test guardian authentication
            const authResult = await guardianMgmt.authenticateGuardian({
                email: 'test@guardian.com',
                password: newGuardian.onboarding.tempPassword,
                mfaToken: '123456', // Mock MFA token
                ipAddress: '127.0.0.1'
            });
            
            this.addTestResult('Guardian Management', 'Guardian Authentication', !!authResult.guardian);
            
            // Test getting all guardians
            const allGuardians = await guardianMgmt.getAllGuardians();
            this.addTestResult('Guardian Management', 'Get All Guardians', allGuardians.length > 0);
            
            this.logger.info('✅ Guardian Management tests completed');
            
        } catch (error) {
            this.logger.error('❌ Guardian Management tests failed', { error: error.message });
            this.addTestResult('Guardian Management', 'General Test', false, error.message);
        }
    }
    
    async testPolicyEngine() {
        try {
            this.logger.info('📋 Testing Policy Engine Service...');
            
            const policyEngine = this.services.policyEngine;
            
            // Test policy creation
            const newPolicy = await policyEngine.createPolicy({
                name: 'Test Threshold Policy',
                type: 'threshold',
                description: 'Test policy for threshold validation',
                rules: [{
                    id: 'test_rule',
                    name: 'Test Rule',
                    condition: {
                        type: 'min_threshold',
                        value: 2
                    },
                    action: 'reject',
                    severity: 'error'
                }],
                conditions: [],
                actions: [],
                createdBy: 'system'
            });
            
            this.addTestResult('Policy Engine', 'Policy Creation', !!newPolicy.id);
            
            // Test policy activation
            const activatedPolicy = await policyEngine.activatePolicy(newPolicy.id, 'system');
            this.addTestResult('Policy Engine', 'Policy Activation', activatedPolicy.status === 'active');
            
            // Test signing request validation
            const validationResult = await policyEngine.validateSigningRequest({
                credentialData: {
                    type: 'IdentityCredential',
                    subject: 'test-subject'
                },
                threshold: 3,
                guardians: ['guardian1', 'guardian2', 'guardian3'],
                requester: 'system'
            });
            
            this.addTestResult('Policy Engine', 'Signing Request Validation', !!validationResult);
            
            this.logger.info('✅ Policy Engine tests completed');
            
        } catch (error) {
            this.logger.error('❌ Policy Engine tests failed', { error: error.message });
            this.addTestResult('Policy Engine', 'General Test', false, error.message);
        }
    }
    
    async testAuditService() {
        try {
            this.logger.info('📊 Testing Audit Service...');
            
            const audit = this.services.audit;
            
            // Test audit logging
            const auditResult = await audit.logEvent({
                type: 'guardian_created',
                actor: 'system',
                resource: 'guardian',
                resourceId: 'test-guardian-id',
                action: 'create',
                outcome: 'success',
                metadata: {
                    guardianName: 'Test Guardian'
                }
            });
            
            this.addTestResult('Audit Service', 'Event Logging', !!auditResult.auditId);
            
            // Test log retrieval
            const logs = await audit.getLogs({
                limit: 10,
                filters: {
                    type: 'guardian_created'
                }
            });
            
            this.addTestResult('Audit Service', 'Log Retrieval', logs.logs.length > 0);
            
            // Test compliance report generation
            const complianceReport = await audit.generateComplianceReport('soc2', {
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            });
            
            this.addTestResult('Audit Service', 'Compliance Report', !!complianceReport.id);
            
            this.logger.info('✅ Audit Service tests completed');
            
        } catch (error) {
            this.logger.error('❌ Audit Service tests failed', { error: error.message });
            this.addTestResult('Audit Service', 'General Test', false, error.message);
        }
    }
    
    async testNotificationService() {
        try {
            this.logger.info('📧 Testing Notification Service...');
            
            const notification = this.services.notification;
            
            // Test guardian notification
            const notificationResult = await notification.notifyGuardians(
                'proposal_created',
                {
                    proposalId: 'test-proposal-id',
                    title: 'Test Proposal',
                    type: 'guardian_addition'
                },
                {
                    guardians: ['guardian1', 'guardian2'],
                    channels: ['email'],
                    priority: 'normal'
                }
            );
            
            this.addTestResult('Notification Service', 'Guardian Notification', 
                notificationResult.notificationsCreated > 0);
            
            // Test security alert
            const alertResult = await notification.sendSecurityAlert({
                alertType: 'login_anomaly',
                severity: 'high',
                description: 'Unusual login pattern detected',
                affectedSystems: ['guardian-system'],
                recommendedActions: ['Review login logs', 'Check guardian access']
            });
            
            this.addTestResult('Notification Service', 'Security Alert', 
                alertResult.notificationsCreated > 0);
            
            // Test notification statistics
            const stats = await notification.getNotificationStatistics('1h');
            this.addTestResult('Notification Service', 'Statistics', !!stats.totalNotifications);
            
            this.logger.info('✅ Notification Service tests completed');
            
        } catch (error) {
            this.logger.error('❌ Notification Service tests failed', { error: error.message });
            this.addTestResult('Notification Service', 'General Test', false, error.message);
        }
    }
    
    async testThresholdSignatures() {
        try {
            this.logger.info('🔐 Testing Threshold Signature Service...');
            
            const thresholdSig = this.services.thresholdSignature;
            
            // Test threshold key generation
            const keys = await thresholdSig.generateThresholdKeys(3, 5, 'ED25519');
            this.addTestResult('Threshold Signatures', 'Key Generation', !!keys.keySetId);
            
            // Test signing session initiation
            const signingSession = await thresholdSig.initiateSigning({
                credentialData: {
                    type: 'IdentityCredential',
                    subject: 'test-subject'
                },
                threshold: 3,
                guardians: ['guardian1', 'guardian2', 'guardian3'],
                metadata: {
                    scheme: 'ED25519',
                    keySetId: keys.keySetId
                },
                requester: 'system',
                sessionId: 'test-session-1'
            });
            
            this.addTestResult('Threshold Signatures', 'Signing Session', !!signingSession.id);
            
            // Test partial signature addition (mock)
            const partialSigResult = await thresholdSig.addPartialSignature('test-session-1', {
                guardianId: 'guardian1',
                partialSignature: 'mock-signature-1',
                nonce: 'mock-nonce-1'
            });
            
            this.addTestResult('Threshold Signatures', 'Partial Signature', 
                partialSigResult.success);
            
            this.logger.info('✅ Threshold Signature tests completed');
            
        } catch (error) {
            this.logger.error('❌ Threshold Signature tests failed', { error: error.message });
            this.addTestResult('Threshold Signatures', 'General Test', false, error.message);
        }
    }
    
    async testGovernanceWorkflow() {
        try {
            this.logger.info('🏛️ Testing Governance Service...');
            
            const governance = this.services.governance;
            
            // Test proposal creation
            const proposal = await governance.createProposal({
                title: 'Add New Guardian Test',
                description: 'Test proposal for adding a new guardian',
                type: 'GUARDIAN_ADDITION',
                actions: [{
                    type: 'add_guardian',
                    target: 'guardian_system',
                    parameters: {
                        guardianId: 'new-guardian-test',
                        name: 'New Test Guardian',
                        permissions: ['vote', 'sign']
                    }
                }],
                proposer: 'system'
            });
            
            this.addTestResult('Governance', 'Proposal Creation', !!proposal.id);
            
            // Test voting
            const voteResult = await governance.recordVote(proposal.id, {
                guardianId: 'guardian1',
                vote: 'approve',
                signature: 'mock-signature',
                comments: 'Test vote'
            });
            
            this.addTestResult('Governance', 'Vote Recording', !!voteResult.id);
            
            // Test proposal retrieval
            const retrievedProposal = await governance.getProposal(proposal.id);
            this.addTestResult('Governance', 'Proposal Retrieval', 
                retrievedProposal.id === proposal.id);
            
            // Test voting statistics
            const votingStats = await governance.getVotingStatistics(proposal.id);
            this.addTestResult('Governance', 'Voting Statistics', !!votingStats.proposalId);
            
            this.logger.info('✅ Governance tests completed');
            
        } catch (error) {
            this.logger.error('❌ Governance tests failed', { error: error.message });
            this.addTestResult('Governance', 'General Test', false, error.message);
        }
    }
    
    async testApprovalWorkflow() {
        try {
            this.logger.info('⚡ Testing Approval Workflow Service...');
            
            const approvalWorkflow = this.services.approvalWorkflow;
            
            // Test workflow execution
            const workflowResult = await approvalWorkflow.executeProposal('test-proposal-id');
            this.addTestResult('Approval Workflow', 'Proposal Execution', !!workflowResult.workflowId);
            
            // Test workflow status
            const workflowStatus = await approvalWorkflow.getWorkflowStatus(workflowResult.workflowId);
            this.addTestResult('Approval Workflow', 'Status Retrieval', !!workflowStatus);
            
            // Test execution history
            const history = await approvalWorkflow.getExecutionHistory();
            this.addTestResult('Approval Workflow', 'Execution History', 
                history.workflows.length > 0);
            
            this.logger.info('✅ Approval Workflow tests completed');
            
        } catch (error) {
            this.logger.error('❌ Approval Workflow tests failed', { error: error.message });
            this.addTestResult('Approval Workflow', 'General Test', false, error.message);
        }
    }
    
    async testEndToEndWorkflow() {
        try {
            this.logger.info('🔄 Testing End-to-End Guardian Workflow...');
            
            // Simulate complete guardian governance workflow
            const governance = this.services.governance;
            const audit = this.services.audit;
            const notification = this.services.notification;
            
            // 1. Create proposal
            const proposal = await governance.createProposal({
                title: 'E2E Test Proposal',
                description: 'End-to-end test proposal',
                type: 'POLICY_UPDATE',
                actions: [{
                    type: 'update_policy',
                    target: 'policy_system',
                    parameters: {
                        policyId: 'test-policy',
                        changes: { threshold: 4 }
                    }
                }],
                proposer: 'system'
            });
            
            // 2. Audit log the proposal creation
            await audit.logEvent({
                type: 'proposal_created',
                actor: 'system',
                resource: 'proposal',
                resourceId: proposal.id,
                metadata: { title: proposal.title }
            });
            
            // 3. Notify guardians
            await notification.notifyGuardians('proposal_created', {
                proposalId: proposal.id,
                title: proposal.title,
                type: proposal.type
            }, {
                guardians: ['guardian1', 'guardian2', 'guardian3'],
                channels: ['email']
            });
            
            // 4. Record votes
            const guardians = ['guardian1', 'guardian2', 'guardian3'];
            for (const guardianId of guardians) {
                await governance.recordVote(proposal.id, {
                    guardianId,
                    vote: 'approve',
                    signature: `mock-signature-${guardianId}`,
                    comments: 'E2E test vote'
                });
                
                await audit.logEvent({
                    type: 'vote_cast',
                    actor: guardianId,
                    resource: 'proposal',
                    resourceId: proposal.id,
                    metadata: { vote: 'approve' }
                });
            }
            
            this.addTestResult('End-to-End', 'Complete Workflow', true);
            this.logger.info('✅ End-to-End workflow test completed');
            
        } catch (error) {
            this.logger.error('❌ End-to-End workflow test failed', { error: error.message });
            this.addTestResult('End-to-End', 'Complete Workflow', false, error.message);
        }
    }
    
    async testHealthChecks() {
        try {
            this.logger.info('🏥 Testing Service Health Checks...');
            
            const healthResults = {};
            
            for (const [serviceName, service] of Object.entries(this.services)) {
                try {
                    const health = await service.healthCheck();
                    healthResults[serviceName] = health.status === 'healthy';
                    this.addTestResult('Health Checks', serviceName, health.status === 'healthy');
                } catch (error) {
                    healthResults[serviceName] = false;
                    this.addTestResult('Health Checks', serviceName, false, error.message);
                }
            }
            
            const allHealthy = Object.values(healthResults).every(healthy => healthy);
            this.logger.info(allHealthy ? '✅ All services healthy' : '⚠️ Some services unhealthy');
            
        } catch (error) {
            this.logger.error('❌ Health check tests failed', { error: error.message });
        }
    }
    
    addTestResult(service, test, passed, error = null) {
        this.testResults.push({
            service,
            test,
            passed,
            error,
            timestamp: new Date().toISOString()
        });
    }
    
    printTestSummary() {
        this.logger.info('\n📋 TEST SUMMARY');
        this.logger.info('='.repeat(50));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        this.logger.info(`Total Tests: ${totalTests}`);
        this.logger.info(`Passed: ${passedTests} ✅`);
        this.logger.info(`Failed: ${failedTests} ❌`);
        this.logger.info(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
        
        if (failedTests > 0) {
            this.logger.info('\n❌ FAILED TESTS:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(result => {
                    this.logger.error(`${result.service} - ${result.test}: ${result.error || 'Unknown error'}`);
                });
        }
        
        this.logger.info('\n🎉 Guardian Multi-Party Control System Test Complete!');
    }
}

// Run the tests
async function runTests() {
    const tester = new GuardianSystemTester();
    
    const initialized = await tester.initializeServices();
    if (!initialized) {
        logger.error('❌ Failed to initialize services. Exiting.');
        process.exit(1);
    }
    
    await tester.runComprehensiveTests();
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(error => {
        logger.error('❌ Test execution failed', { error: error.message });
        process.exit(1);
    });
}

export default GuardianSystemTester;