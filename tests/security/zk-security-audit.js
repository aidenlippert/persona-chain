#!/usr/bin/env node

/**
 * ZK Security Audit Script
 * Tests for common vulnerabilities in zero-knowledge proof systems
 */

const axios = require('axios');
const crypto = require('crypto');

const API_BASE = 'http://localhost:1317';
const CHAIN_ID = 'persona-testnet-1';

class SecurityAuditor {
  constructor() {
    this.testResults = [];
    this.validProof = null;
    this.validTxHash = null;
  }

  log(test, status, details) {
    const result = {
      test,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'} ${test}: ${details}`);
  }

  async setup() {
    console.log('🔒 Starting ZK Security Audit...\n');
    
    // First, generate a valid proof to use in tests
    await this.generateValidProof();
  }

  async generateValidProof() {
    console.log('📝 Setting up valid proof for testing...');
    
    try {
      // Generate mock valid proof data
      const validProofData = {
        pi_a: ["0x12345", "0x67890", "1"],
        pi_b: [["0xabcde", "0xfghij"], ["0xklmno", "0xpqrst"], ["1", "0"]],
        pi_c: ["0xuvwxy", "0xz1234", "1"],
        protocol: "groth16",
        curve: "bn128"
      };

      const txData = {
        tx: {
          body: {
            messages: [{
              '@type': '/persona.zk.v1.MsgSubmitProof',
              creator: 'persona1test1234567890123456789012345678',
              circuit_id: 'age_verification_v1',
              proof: Buffer.from(JSON.stringify(validProofData)).toString('base64'),
              public_inputs: ['2025', '18'],
              metadata: JSON.stringify({
                credentialId: 'test-credential-123',
                didId: 'did:persona:test123',
                timestamp: new Date().toISOString()
              })
            }]
          }
        }
      };

      const response = await axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, txData);
      
      if (response.status === 200 && response.data.txhash) {
        this.validProof = validProofData;
        this.validTxHash = response.data.txhash;
        this.log('SETUP', 'PASS', `Valid proof generated with tx hash: ${this.validTxHash}`);
      } else {
        throw new Error('Failed to generate valid proof');
      }
    } catch (error) {
      this.log('SETUP', 'FAIL', `Setup failed: ${error.message}`);
      throw error;
    }
  }

  async testReplayAttack() {
    console.log('\n🔁 Testing Replay Attack Protection...');
    
    if (!this.validProof || !this.validTxHash) {
      this.log('REPLAY_ATTACK', 'SKIP', 'No valid proof available for replay test');
      return;
    }

    try {
      // Attempt to resubmit the exact same proof
      const replayTxData = {
        tx: {
          body: {
            messages: [{
              '@type': '/persona.zk.v1.MsgSubmitProof',
              creator: 'persona1test1234567890123456789012345678',
              circuit_id: 'age_verification_v1',
              proof: Buffer.from(JSON.stringify(this.validProof)).toString('base64'),
              public_inputs: ['2025', '18'],
              metadata: JSON.stringify({
                credentialId: 'test-credential-123',
                didId: 'did:persona:test123',
                timestamp: new Date().toISOString()
              })
            }]
          }
        }
      };

      const response = await axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, replayTxData);
      
      // In a secure system, this should fail or return a different result
      if (response.status === 200) {
        // For now, our mock accepts all proofs - this would be flagged in a real system
        this.log('REPLAY_ATTACK', 'WARN', 'Replay attack succeeded - mock system accepts duplicate proofs');
      } else {
        this.log('REPLAY_ATTACK', 'PASS', 'Replay attack properly rejected');
      }
    } catch (error) {
      this.log('REPLAY_ATTACK', 'PASS', `Replay attack properly rejected: ${error.response?.status || error.message}`);
    }
  }

  async testForgedProof() {
    console.log('\n🚫 Testing Forged Proof Rejection...');
    
    try {
      // Create obviously invalid proof data
      const forgedProofData = {
        pi_a: ["0x00000", "0x00000", "1"],
        pi_b: [["0x00000", "0x00000"], ["0x00000", "0x00000"], ["1", "0"]],
        pi_c: ["0x00000", "0x00000", "1"],
        protocol: "groth16",
        curve: "bn128"
      };

      const txData = {
        tx: {
          body: {
            messages: [{
              '@type': '/persona.zk.v1.MsgSubmitProof',
              creator: 'persona1attacker1234567890123456789012345',
              circuit_id: 'age_verification_v1',
              proof: Buffer.from(JSON.stringify(forgedProofData)).toString('base64'),
              public_inputs: ['2025', '18'],
              metadata: JSON.stringify({
                credentialId: 'forged-credential',
                didId: 'did:persona:attacker',
                timestamp: new Date().toISOString()
              })
            }]
          }
        }
      };

      const response = await axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, txData);
      
      if (response.status === 200) {
        // Mock system accepts all - in real system this should be rejected by verifier
        this.log('FORGED_PROOF', 'WARN', 'Forged proof accepted by mock system - would be rejected by real verifier');
      } else {
        this.log('FORGED_PROOF', 'PASS', 'Forged proof properly rejected');
      }
    } catch (error) {
      this.log('FORGED_PROOF', 'PASS', `Forged proof properly rejected: ${error.response?.status || error.message}`);
    }
  }

  async testMalformedInputs() {
    console.log('\n⚠️ Testing Malformed Input Handling...');
    
    const malformedTests = [
      {
        name: 'Invalid Circuit ID',
        data: { circuit_id: 'non_existent_circuit' }
      },
      {
        name: 'Invalid Public Inputs',
        data: { public_inputs: ['invalid', 'not_numbers'] }
      },
      {
        name: 'Malformed Proof Data',
        data: { proof: 'not_base64_data!!!' }
      },
      {
        name: 'Missing Required Fields',
        data: { creator: '', circuit_id: '', proof: '' }
      }
    ];

    for (const test of malformedTests) {
      try {
        const baseProofData = {
          pi_a: ["0x12345", "0x67890", "1"],
          pi_b: [["0xabcde", "0xfghij"], ["0xklmno", "0xpqrst"], ["1", "0"]],
          pi_c: ["0xuvwxy", "0xz1234", "1"],
          protocol: "groth16",
          curve: "bn128"
        };

        const txData = {
          tx: {
            body: {
              messages: [{
                '@type': '/persona.zk.v1.MsgSubmitProof',
                creator: 'persona1test1234567890123456789012345678',
                circuit_id: 'age_verification_v1',
                proof: Buffer.from(JSON.stringify(baseProofData)).toString('base64'),
                public_inputs: ['2025', '18'],
                metadata: JSON.stringify({ test: true }),
                ...test.data
              }]
            }
          }
        };

        const response = await axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, txData);
        
        if (response.status === 200) {
          this.log('MALFORMED_INPUT', 'WARN', `${test.name}: Accepted by mock system`);
        } else {
          this.log('MALFORMED_INPUT', 'PASS', `${test.name}: Properly rejected`);
        }
      } catch (error) {
        this.log('MALFORMED_INPUT', 'PASS', `${test.name}: Properly rejected (${error.response?.status || error.message})`);
      }
    }
  }

  async testTimestampAttack() {
    console.log('\n⏰ Testing Timestamp Manipulation...');
    
    try {
      // Try to submit proof with future timestamp
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // +1 day
      
      const proofData = {
        pi_a: ["0x12345", "0x67890", "1"],
        pi_b: [["0xabcde", "0xfghij"], ["0xklmno", "0xpqrst"], ["1", "0"]],
        pi_c: ["0xuvwxy", "0xz1234", "1"],
        protocol: "groth16",
        curve: "bn128"
      };

      const txData = {
        tx: {
          body: {
            messages: [{
              '@type': '/persona.zk.v1.MsgSubmitProof',
              creator: 'persona1test1234567890123456789012345678',
              circuit_id: 'age_verification_v1',
              proof: Buffer.from(JSON.stringify(proofData)).toString('base64'),
              public_inputs: ['2030', '18'], // Future year
              metadata: JSON.stringify({
                credentialId: 'test-credential-future',
                didId: 'did:persona:test123',
                timestamp: futureDate
              })
            }]
          }
        }
      };

      const response = await axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, txData);
      
      if (response.status === 200) {
        this.log('TIMESTAMP_ATTACK', 'WARN', 'Future timestamp accepted by mock system');
      } else {
        this.log('TIMESTAMP_ATTACK', 'PASS', 'Future timestamp properly rejected');
      }
    } catch (error) {
      this.log('TIMESTAMP_ATTACK', 'PASS', `Timestamp attack properly rejected: ${error.response?.status || error.message}`);
    }
  }

  async testCredentialTampering() {
    console.log('\n📝 Testing Credential Tampering Detection...');
    
    try {
      // Test with mismatched credential data
      const proofData = {
        pi_a: ["0x12345", "0x67890", "1"],
        pi_b: [["0xabcde", "0xfghij"], ["0xklmno", "0xpqrst"], ["1", "0"]],
        pi_c: ["0xuvwxy", "0xz1234", "1"],
        protocol: "groth16",
        curve: "bn128"
      };

      const txData = {
        tx: {
          body: {
            messages: [{
              '@type': '/persona.zk.v1.MsgSubmitProof',
              creator: 'persona1test1234567890123456789012345678',
              circuit_id: 'age_verification_v1',
              proof: Buffer.from(JSON.stringify(proofData)).toString('base64'),
              public_inputs: ['2025', '21'], // Changed minimum age
              metadata: JSON.stringify({
                credentialId: 'tampered-credential-456',
                didId: 'did:persona:different-did', // Different DID
                timestamp: new Date().toISOString()
              })
            }]
          }
        }
      };

      const response = await axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, txData);
      
      if (response.status === 200) {
        this.log('CREDENTIAL_TAMPERING', 'WARN', 'Tampered credential accepted by mock system');
      } else {
        this.log('CREDENTIAL_TAMPERING', 'PASS', 'Tampered credential properly rejected');
      }
    } catch (error) {
      this.log('CREDENTIAL_TAMPERING', 'PASS', `Credential tampering properly detected: ${error.response?.status || error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 SECURITY AUDIT REPORT');
    console.log('========================\n');
    
    const summary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'PASS').length,
      warnings: this.testResults.filter(r => r.status === 'WARN').length,
      failed: this.testResults.filter(r => r.status === 'FAIL').length,
      skipped: this.testResults.filter(r => r.status === 'SKIP').length
    };

    console.log(`📈 SUMMARY:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ⚠️  Warnings: ${summary.warnings}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⏭️  Skipped: ${summary.skipped}\n`);

    console.log(`🔍 DETAILED RESULTS:`);
    this.testResults.forEach(result => {
      console.log(`   ${result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'} ${result.test}: ${result.details}`);
    });

    console.log('\n🔒 SECURITY RECOMMENDATIONS:');
    if (summary.warnings > 0) {
      console.log('   ⚠️  Mock system accepts all proofs - implement actual ZK verification');
      console.log('   ⚠️  Add proof uniqueness tracking to prevent replay attacks');
      console.log('   ⚠️  Implement timestamp validation for public inputs');
      console.log('   ⚠️  Add credential integrity checks');
    } else {
      console.log('   ✅ All security tests passed!');
    }

    return summary;
  }

  async runAllTests() {
    try {
      await this.setup();
      await this.testReplayAttack();
      await this.testForgedProof();
      await this.testMalformedInputs();
      await this.testTimestampAttack();
      await this.testCredentialTampering();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the security audit
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runAllTests().then(summary => {
    console.log(`\n🏁 Security audit completed with ${summary.passed}/${summary.total} tests passing`);
    
    // Exit with appropriate code
    if (summary.failed > 0) {
      process.exit(1);
    } else if (summary.warnings > 0) {
      process.exit(2); // Warnings
    } else {
      process.exit(0); // All good
    }
  });
}

module.exports = SecurityAuditor;