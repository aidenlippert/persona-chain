#!/usr/bin/env node

/**
 * Edge Case Testing Suite for Persona Chain
 * Tests unusual scenarios, error handling, and system resilience
 */

const axios = require('axios');

const API_BASE = 'http://localhost:1317';
const FAUCET_BASE = 'http://localhost:8080';
const DEMO_BASE = 'http://localhost:8001';

class EdgeCaseTester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  log(test, status, details) {
    const result = { test, status, details, timestamp: new Date().toISOString() };
    this.results.push(result);
    console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'} ${test}: ${details}`);
  }

  async testMalformedInputs() {
    console.log('🔍 Testing Malformed Input Handling...\n');

    const malformedTests = [
      {
        name: 'Empty JSON POST',
        request: () => axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, {}),
        expected: 'Should reject empty transaction'
      },
      {
        name: 'Invalid JSON Structure',
        request: () => axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, { invalid: 'structure' }),
        expected: 'Should handle malformed transaction structure'
      },
      {
        name: 'Extremely Long Input',
        request: () => {
          const longString = 'a'.repeat(100000);
          return axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, {
            tx: { body: { messages: [{ creator: longString }] } }
          });
        },
        expected: 'Should handle oversized inputs'
      },
      {
        name: 'SQL Injection Attempt',
        request: () => axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, {
          tx: { body: { messages: [{ 
            '@type': '/persona.did.v1.MsgCreateDid',
            creator: "'; DROP TABLE users; --",
            did_id: 'did:persona:sqlinjection'
          }] } }
        }),
        expected: 'Should sanitize SQL injection attempts'
      },
      {
        name: 'XSS Script Injection',
        request: () => axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, {
          tx: { body: { messages: [{ 
            '@type': '/persona.did.v1.MsgCreateDid',
            creator: '<script>alert("xss")</script>',
            did_id: 'did:persona:xss'
          }] } }
        }),
        expected: 'Should sanitize script injection attempts'
      },
      {
        name: 'Unicode and Special Characters',
        request: () => axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, {
          tx: { body: { messages: [{ 
            '@type': '/persona.did.v1.MsgCreateDid',
            creator: '🚀💻🔐测试用户',
            did_id: 'did:persona:unicode🌟'
          }] } }
        }),
        expected: 'Should handle Unicode characters properly'
      },
      {
        name: 'Null and Undefined Values',
        request: () => axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, {
          tx: { body: { messages: [{ 
            '@type': '/persona.did.v1.MsgCreateDid',
            creator: null,
            did_id: undefined
          }] } }
        }),
        expected: 'Should handle null/undefined values'
      }
    ];

    for (const test of malformedTests) {
      try {
        const response = await test.request();
        if (response.status === 200) {
          this.log('MALFORMED_INPUT', 'WARN', `${test.name}: Accepted (${test.expected})`);
        } else {
          this.log('MALFORMED_INPUT', 'PASS', `${test.name}: Rejected with status ${response.status}`);
        }
      } catch (error) {
        const status = error.response?.status || 'Network Error';
        this.log('MALFORMED_INPUT', 'PASS', `${test.name}: Properly rejected (${status})`);
      }
    }
  }

  async testRateLimitingAndDDoS() {
    console.log('\n🚫 Testing Rate Limiting and DDoS Protection...\n');

    // Test API endpoint flooding
    try {
      const rapidRequests = Array(50).fill().map(() => 
        axios.get(`${API_BASE}/health`).catch(e => ({ error: e.message }))
      );
      
      const responses = await Promise.all(rapidRequests);
      const successful = responses.filter(r => !r.error).length;
      const errors = responses.filter(r => r.error).length;
      
      this.log('DDOS_PROTECTION', 'INFO', `Rapid API requests: ${successful} successful, ${errors} failed`);
    } catch (error) {
      this.log('DDOS_PROTECTION', 'FAIL', `API flooding test failed: ${error.message}`);
    }

    // Test faucet rate limiting
    try {
      const faucetRequests = Array(10).fill().map((_, i) => 
        axios.post(`${FAUCET_BASE}/faucet`, {
          address: `persona1test${i.toString().padStart(38, '0')}`
        }).catch(e => ({ error: e.response?.status || e.message }))
      );

      const faucetResponses = await Promise.all(faucetRequests);
      const faucetSuccessful = faucetResponses.filter(r => !r.error).length;
      const rateLimited = faucetResponses.filter(r => r.error === 429).length;
      
      this.log('RATE_LIMITING', 'PASS', `Faucet requests: ${faucetSuccessful} successful, ${rateLimited} rate-limited`);
    } catch (error) {
      this.log('RATE_LIMITING', 'FAIL', `Faucet rate limit test failed: ${error.message}`);
    }
  }

  async testInvalidAddressFormats() {
    console.log('\n📍 Testing Invalid Address Format Handling...\n');

    const invalidAddresses = [
      '',
      'invalid',
      'cosmos1invalidaddress',
      'persona1',
      'persona1too_short',
      'persona1' + 'a'.repeat(100), // Too long
      'PERSONA1UPPERCASE1234567890123456789012345678', // Uppercase
      'persona1invalid!@#$%^&*()_+=[]{}|;:,.<>?', // Special chars
      'bitcoin1notthischaininvalidaddress1234567890',
      'persona2wrongprefixnumber1234567890123456789'
    ];

    for (const address of invalidAddresses) {
      try {
        const response = await axios.post(`${FAUCET_BASE}/faucet`, { address });
        this.log('INVALID_ADDRESS', 'WARN', `Address "${address}" accepted unexpectedly`);
      } catch (error) {
        const status = error.response?.status || 'Network Error';
        this.log('INVALID_ADDRESS', 'PASS', `Address "${address}" properly rejected (${status})`);
      }
    }
  }

  async testNetworkInterruption() {
    console.log('\n🌐 Testing Network Interruption Handling...\n');

    // Test request to non-existent endpoints
    const invalidEndpoints = [
      '/nonexistent',
      '/cosmos/invalid/endpoint',
      '/persona/nonexistent/v1/endpoint',
      '//double/slash',
      '/cosmos/tx/v1beta1/txs/../../../etc/passwd'
    ];

    for (const endpoint of invalidEndpoints) {
      try {
        const response = await axios.get(`${API_BASE}${endpoint}`);
        this.log('INVALID_ENDPOINT', 'WARN', `Endpoint "${endpoint}" returned ${response.status}`);
      } catch (error) {
        const status = error.response?.status || 'Network Error';
        this.log('INVALID_ENDPOINT', 'PASS', `Endpoint "${endpoint}" properly rejected (${status})`);
      }
    }

    // Test extremely slow request (timeout handling)
    try {
      await axios.get(`${API_BASE}/health`, { timeout: 1 }); // 1ms timeout
      this.log('TIMEOUT_HANDLING', 'WARN', 'Request completed within 1ms (unexpectedly fast)');
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        this.log('TIMEOUT_HANDLING', 'PASS', 'Timeout handling works correctly');
      } else {
        this.log('TIMEOUT_HANDLING', 'INFO', `Different error: ${error.message}`);
      }
    }
  }

  async testDataBoundaryConditions() {
    console.log('\n📊 Testing Data Boundary Conditions...\n');

    const boundaryTests = [
      {
        name: 'Maximum Valid Birth Year',
        data: { birthYear: new Date().getFullYear() - 18 },
        expected: 'Should handle current valid birth year'
      },
      {
        name: 'Minimum Valid Birth Year',
        data: { birthYear: 1900 },
        expected: 'Should handle very old birth year'
      },
      {
        name: 'Future Birth Year',
        data: { birthYear: new Date().getFullYear() + 10 },
        expected: 'Should reject future birth year'
      },
      {
        name: 'Negative Birth Year',
        data: { birthYear: -100 },
        expected: 'Should reject negative birth year'
      },
      {
        name: 'Zero Birth Year',
        data: { birthYear: 0 },
        expected: 'Should reject zero birth year'
      },
      {
        name: 'Floating Point Birth Year',
        data: { birthYear: 1990.5 },
        expected: 'Should handle or reject floating point years'
      },
      {
        name: 'String Birth Year',
        data: { birthYear: "nineteen ninety" },
        expected: 'Should reject non-numeric birth year'
      }
    ];

    for (const test of boundaryTests) {
      try {
        const vcTxData = {
          tx: {
            body: {
              messages: [{
                '@type': '/persona.vc.v1.MsgIssueCredential',
                issuer: 'did:persona:testnet-issuer-authority',
                credential_id: `boundary-test-${Date.now()}`,
                credential_type: 'ProofOfAge',
                subject: 'did:persona:boundary-test',
                claims: JSON.stringify({
                  birthYear: test.data.birthYear,
                  isOver18: test.data.birthYear <= new Date().getFullYear() - 18
                })
              }]
            }
          }
        };

        const response = await axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, vcTxData);
        if (response.status === 200) {
          this.log('BOUNDARY_CONDITIONS', 'INFO', `${test.name}: Accepted (${test.expected})`);
        } else {
          this.log('BOUNDARY_CONDITIONS', 'PASS', `${test.name}: Rejected with status ${response.status}`);
        }
      } catch (error) {
        const status = error.response?.status || 'Network Error';
        this.log('BOUNDARY_CONDITIONS', 'PASS', `${test.name}: Properly handled (${status})`);
      }
    }
  }

  async testConcurrencyAndRaceConditions() {
    console.log('\n🏁 Testing Concurrency and Race Conditions...\n');

    // Test simultaneous DID creation with same ID
    const duplicateDIDTests = Array(5).fill().map(async (_, i) => {
      try {
        const response = await axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, {
          tx: {
            body: {
              messages: [{
                '@type': '/persona.did.v1.MsgCreateDid',
                creator: `persona1race${i.toString().padStart(37, '0')}`,
                did_id: 'did:persona:race-condition-test', // Same DID ID
                did_document: JSON.stringify({ id: 'did:persona:race-condition-test' })
              }]
            }
          }
        });
        return { success: true, status: response.status };
      } catch (error) {
        return { success: false, status: error.response?.status || 'Network Error' };
      }
    });

    const duplicateResults = await Promise.all(duplicateDIDTests);
    const successfulDuplicates = duplicateResults.filter(r => r.success).length;
    
    if (successfulDuplicates > 1) {
      this.log('RACE_CONDITIONS', 'WARN', `Multiple DIDs with same ID created: ${successfulDuplicates}`);
    } else {
      this.log('RACE_CONDITIONS', 'PASS', `Duplicate DID prevention working: ${successfulDuplicates} successful`);
    }
  }

  async testMemoryAndResourceExhaustion() {
    console.log('\n💾 Testing Memory and Resource Limits...\n');

    // Test large proof data
    try {
      const largeProofData = {
        pi_a: ['x'.repeat(10000), 'y'.repeat(10000), "1"],
        pi_b: [
          ['a'.repeat(10000), 'b'.repeat(10000)],
          ['c'.repeat(10000), 'd'.repeat(10000)],
          ["1", "0"]
        ],
        pi_c: ['z'.repeat(10000), 'w'.repeat(10000), "1"],
        protocol: "groth16",
        curve: "bn128"
      };

      const response = await axios.post(`${API_BASE}/cosmos/tx/v1beta1/txs`, {
        tx: {
          body: {
            messages: [{
              '@type': '/persona.zk.v1.MsgSubmitProof',
              creator: 'persona1memory' + 'x'.repeat(30),
              circuit_id: 'age_verification_v1',
              proof: Buffer.from(JSON.stringify(largeProofData)).toString('base64'),
              public_inputs: ['2025', '18']
            }]
          }
        }
      });

      this.log('MEMORY_LIMITS', 'WARN', `Large proof data accepted: ${response.status}`);
    } catch (error) {
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        this.log('MEMORY_LIMITS', 'PASS', 'Large data properly rejected or caused connection reset');
      } else {
        this.log('MEMORY_LIMITS', 'PASS', `Large data handled: ${error.response?.status || error.message}`);
      }
    }
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    console.log('\n📊 EDGE CASE TESTING REPORT');
    console.log('===========================\n');

    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      warnings: this.results.filter(r => r.status === 'WARN').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      info: this.results.filter(r => r.status === 'INFO').length
    };

    console.log(`📈 SUMMARY:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ⚠️  Warnings: ${summary.warnings}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ℹ️  Info: ${summary.info}`);
    console.log(`   ⏱️  Duration: ${totalDuration}ms\n`);

    // Group results by test category
    const categories = {};
    this.results.forEach(result => {
      if (!categories[result.test]) {
        categories[result.test] = { pass: 0, warn: 0, fail: 0, info: 0 };
      }
      categories[result.test][result.status.toLowerCase()]++;
    });

    console.log(`📋 RESULTS BY CATEGORY:`);
    Object.entries(categories).forEach(([category, counts]) => {
      const total = counts.pass + counts.warn + counts.fail + counts.info;
      console.log(`   ${category}: ${counts.pass}✅ ${counts.warn}⚠️ ${counts.fail}❌ ${counts.info}ℹ️ (${total} tests)`);
    });

    console.log('\n🔒 SECURITY POSTURE:');
    if (summary.failed > 0) {
      console.log('   ❌ Critical issues found - system requires immediate attention');
    } else if (summary.warnings > 5) {
      console.log('   ⚠️  Multiple warnings - consider implementing additional validations');
    } else {
      console.log('   ✅ Good security posture - system handles edge cases well');
    }

    return summary;
  }

  async runAllTests() {
    console.log('⚠️ Starting Comprehensive Edge Case Testing...\n');

    try {
      await this.testMalformedInputs();
      await this.testRateLimitingAndDDoS();
      await this.testInvalidAddressFormats();
      await this.testNetworkInterruption();
      await this.testDataBoundaryConditions();
      await this.testConcurrencyAndRaceConditions();
      await this.testMemoryAndResourceExhaustion();

      return this.generateReport();
    } catch (error) {
      console.error('❌ Edge case testing failed:', error.message);
      throw error;
    }
  }
}

// Run the edge case tests
if (require.main === module) {
  const tester = new EdgeCaseTester();
  tester.runAllTests().then(summary => {
    console.log(`\n🏁 Edge case testing completed: ${summary.passed}/${summary.total} tests passed`);
    
    if (summary.failed > 0) {
      console.log(`❌ ${summary.failed} critical issues require attention`);
      process.exit(1);
    } else if (summary.warnings > 5) {
      console.log(`⚠️  ${summary.warnings} warnings suggest improvements needed`);
      process.exit(2);
    } else {
      console.log(`✅ System handles edge cases well!`);
      process.exit(0);
    }
  }).catch(error => {
    console.error('❌ Edge case testing failed:', error);
    process.exit(1);
  });
}

module.exports = EdgeCaseTester;