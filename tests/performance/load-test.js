#!/usr/bin/env node

/**
 * Load & Stress Testing for Persona Chain
 * Tests proof generation, transaction processing, and API response times at scale
 */

const axios = require('axios');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

const API_BASE = 'http://localhost:1317';
const FAUCET_BASE = 'http://localhost:8080';
const DEMO_BASE = 'http://localhost:8001';
const EXPLORER_BASE = 'http://localhost:3000';

class LoadTester {
  constructor() {
    this.results = {
      users: [],
      transactions: [],
      proofs: [],
      apiResponses: [],
      errors: []
    };
    this.startTime = Date.now();
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  generateMockUser(id) {
    // Generate valid persona address: persona1 + 32-39 alphanumeric chars
    // Current working format: persona1lzm7cr8qa47xegx764ufrjgsqaa2q966c20052 (46 chars total)
    const prefix = 'persona1';
    const paddedId = id.toString().padStart(6, '0'); // 6 chars
    
    // Generate enough random characters to fill 38 positions
    let randomPart = '';
    while (randomPart.length < 32) {
      randomPart += Math.random().toString(36).substr(2);
    }
    randomPart = randomPart.substr(0, 32); // Exactly 32 chars
    
    const addressSuffix = paddedId + randomPart; // 6 + 32 = 38 chars
    const address = prefix + addressSuffix; // Total: 8 + 38 = 46 chars
    
    return {
      id,
      address,
      did: `did:persona:loadtest${id}_${Date.now()}`,
      birthYear: 1990 + (id % 10), // Vary birth years
      credentialId: `loadtest-credential-${id}`,
      proofId: `loadtest-proof-${id}`
    };
  }

  async measureApiResponse(endpoint, method = 'GET', data = null) {
    const start = Date.now();
    try {
      const config = { method, url: `${API_BASE}${endpoint}` };
      if (data) {
        config.data = data;
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      const duration = Date.now() - start;
      
      this.results.apiResponses.push({
        endpoint,
        method,
        status: response.status,
        duration,
        timestamp: Date.now()
      });
      
      return { success: true, duration, data: response.data };
    } catch (error) {
      const duration = Date.now() - start;
      this.results.errors.push({
        endpoint,
        method,
        error: error.message,
        duration,
        timestamp: Date.now()
      });
      return { success: false, duration, error: error.message };
    }
  }

  async createUser(userId) {
    const user = this.generateMockUser(userId);
    const start = Date.now();
    
    try {
      // Step 1: Fund user via faucet
      await this.measureApiResponse('/health'); // Warm up
      
      const faucetResult = await axios.post(`${FAUCET_BASE}/faucet`, {
        address: user.address
      });
      
      // Step 2: Create DID
      const didTxData = {
        tx: {
          body: {
            messages: [{
              '@type': '/persona.did.v1.MsgCreateDid',
              creator: user.address,
              did_id: user.did,
              did_document: JSON.stringify({
                id: user.did,
                controller: user.address,
                created_at: Date.now()
              })
            }]
          }
        }
      };
      
      const didResult = await this.measureApiResponse('/cosmos/tx/v1beta1/txs', 'POST', didTxData);
      
      // Step 3: Issue VC
      const vcTxData = {
        tx: {
          body: {
            messages: [{
              '@type': '/persona.vc.v1.MsgIssueCredential',
              issuer: 'did:persona:testnet-issuer-authority',
              credential_id: user.credentialId,
              credential_type: 'ProofOfAge',
              subject: user.did,
              claims: JSON.stringify({
                birthYear: user.birthYear,
                isOver18: user.birthYear <= 2007
              })
            }]
          }
        }
      };
      
      const vcResult = await this.measureApiResponse('/cosmos/tx/v1beta1/txs', 'POST', vcTxData);
      
      // Step 4: Generate ZK Proof
      const proofData = {
        pi_a: [Math.random().toString(36), Math.random().toString(36), "1"],
        pi_b: [
          [Math.random().toString(36), Math.random().toString(36)],
          [Math.random().toString(36), Math.random().toString(36)],
          ["1", "0"]
        ],
        pi_c: [Math.random().toString(36), Math.random().toString(36), "1"],
        protocol: "groth16",
        curve: "bn128"
      };
      
      const proofTxData = {
        tx: {
          body: {
            messages: [{
              '@type': '/persona.zk.v1.MsgSubmitProof',
              creator: user.address,
              circuit_id: 'age_verification_v1',
              proof: Buffer.from(JSON.stringify(proofData)).toString('base64'),
              public_inputs: ['2025', '18'],
              metadata: JSON.stringify({
                credentialId: user.credentialId,
                didId: user.did,
                timestamp: new Date().toISOString()
              })
            }]
          }
        }
      };
      
      const proofResult = await this.measureApiResponse('/cosmos/tx/v1beta1/txs', 'POST', proofTxData);
      
      const totalDuration = Date.now() - start;
      
      const userResult = {
        ...user,
        success: true,
        duration: totalDuration,
        steps: {
          faucet: { success: faucetResult.status === 200 },
          did: didResult,
          vc: vcResult,
          proof: proofResult
        }
      };
      
      this.results.users.push(userResult);
      this.log(`✅ User ${userId} completed full workflow in ${totalDuration}ms`);
      
      return userResult;
    } catch (error) {
      const totalDuration = Date.now() - start;
      const errorResult = {
        ...user,
        success: false,
        duration: totalDuration,
        error: error.message
      };
      
      this.results.users.push(errorResult);
      this.results.errors.push({
        type: 'user_creation',
        userId,
        error: error.message,
        duration: totalDuration,
        timestamp: Date.now()
      });
      
      this.log(`❌ User ${userId} failed: ${error.message}`);
      return errorResult;
    }
  }

  async testConcurrentUsers(userCount, batchSize = 10) {
    this.log(`🚀 Starting load test with ${userCount} users (batch size: ${batchSize})`);
    
    const batches = [];
    for (let i = 0; i < userCount; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && (i + j) < userCount; j++) {
        batch.push(this.createUser(i + j + 1));
      }
      batches.push(batch);
    }
    
    this.log(`📦 Created ${batches.length} batches`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batchStart = Date.now();
      this.log(`⏳ Processing batch ${batchIndex + 1}/${batches.length}...`);
      
      try {
        await Promise.all(batches[batchIndex]);
        const batchDuration = Date.now() - batchStart;
        this.log(`✅ Batch ${batchIndex + 1} completed in ${batchDuration}ms`);
      } catch (error) {
        this.log(`❌ Batch ${batchIndex + 1} failed: ${error.message}`);
      }
      
      // Small delay between batches to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async testApiEndpoints() {
    this.log('🔍 Testing API endpoint performance...');
    
    const endpoints = [
      { path: '/health', method: 'GET' },
      { path: '/status', method: 'GET' },
      { path: '/persona/did/v1beta1/did_documents', method: 'GET' },
      { path: '/persona/zk/v1beta1/proofs', method: 'GET' },
      { path: '/persona/zk/v1beta1/circuits', method: 'GET' },
      { path: '/persona/vc/v1beta1/credentials', method: 'GET' }
    ];
    
    // Test each endpoint multiple times
    for (const endpoint of endpoints) {
      for (let i = 0; i < 10; i++) {
        await this.measureApiResponse(endpoint.path, endpoint.method);
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
      }
    }
  }

  async measureSystemResources() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      timestamp: Date.now()
    };
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    console.log('\n📊 LOAD TESTING REPORT');
    console.log('=====================\n');
    
    // User Statistics
    const successfulUsers = this.results.users.filter(u => u.success);
    const failedUsers = this.results.users.filter(u => !u.success);
    
    console.log(`👥 USER STATISTICS:`);
    console.log(`   Total Users: ${this.results.users.length}`);
    console.log(`   ✅ Successful: ${successfulUsers.length}`);
    console.log(`   ❌ Failed: ${failedUsers.length}`);
    console.log(`   📈 Success Rate: ${((successfulUsers.length / this.results.users.length) * 100).toFixed(2)}%`);
    
    if (successfulUsers.length > 0) {
      const durations = successfulUsers.map(u => u.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      
      console.log(`   ⏱️  Average Duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`   🚀 Fastest User: ${minDuration}ms`);
      console.log(`   🐌 Slowest User: ${maxDuration}ms`);
    }
    
    // API Performance
    console.log(`\n🌐 API PERFORMANCE:`);
    console.log(`   Total API Calls: ${this.results.apiResponses.length}`);
    
    if (this.results.apiResponses.length > 0) {
      const apiDurations = this.results.apiResponses.map(r => r.duration);
      const avgApiDuration = apiDurations.reduce((a, b) => a + b, 0) / apiDurations.length;
      const minApiDuration = Math.min(...apiDurations);
      const maxApiDuration = Math.max(...apiDurations);
      
      console.log(`   ⏱️  Average Response: ${avgApiDuration.toFixed(2)}ms`);
      console.log(`   🚀 Fastest Response: ${minApiDuration}ms`);
      console.log(`   🐌 Slowest Response: ${maxApiDuration}ms`);
      
      // Endpoint breakdown
      const endpointStats = {};
      this.results.apiResponses.forEach(response => {
        const key = `${response.method} ${response.endpoint}`;
        if (!endpointStats[key]) {
          endpointStats[key] = { count: 0, totalDuration: 0 };
        }
        endpointStats[key].count++;
        endpointStats[key].totalDuration += response.duration;
      });
      
      console.log(`\n   📋 ENDPOINT BREAKDOWN:`);
      Object.entries(endpointStats).forEach(([endpoint, stats]) => {
        const avgDuration = stats.totalDuration / stats.count;
        console.log(`      ${endpoint}: ${stats.count} calls, avg ${avgDuration.toFixed(2)}ms`);
      });
    }
    
    // Error Analysis
    console.log(`\n❌ ERROR ANALYSIS:`);
    console.log(`   Total Errors: ${this.results.errors.length}`);
    
    if (this.results.errors.length > 0) {
      const errorTypes = {};
      this.results.errors.forEach(error => {
        const key = error.type || 'api_error';
        errorTypes[key] = (errorTypes[key] || 0) + 1;
      });
      
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} errors`);
      });
    }
    
    // Overall Performance
    console.log(`\n⚡ OVERALL PERFORMANCE:`);
    console.log(`   Total Test Duration: ${totalDuration}ms`);
    console.log(`   Throughput: ${(this.results.users.length / (totalDuration / 1000)).toFixed(2)} users/second`);
    
    const totalTransactions = this.results.users.length * 3; // DID + VC + Proof per user
    console.log(`   Transaction Throughput: ${(totalTransactions / (totalDuration / 1000)).toFixed(2)} tx/second`);
    
    return {
      users: {
        total: this.results.users.length,
        successful: successfulUsers.length,
        failed: failedUsers.length,
        successRate: (successfulUsers.length / this.results.users.length) * 100
      },
      performance: {
        totalDuration,
        userThroughput: this.results.users.length / (totalDuration / 1000),
        transactionThroughput: totalTransactions / (totalDuration / 1000)
      },
      errors: this.results.errors.length
    };
  }

  async runLoadTest(userCount = 50, batchSize = 10) {
    this.log(`🚀 Starting comprehensive load test...`);
    this.log(`   Target Users: ${userCount}`);
    this.log(`   Batch Size: ${batchSize}`);
    this.log(`   CPU Cores: ${os.cpus().length}`);
    this.log(`   Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB\n`);
    
    try {
      // Test API endpoints first
      await this.testApiEndpoints();
      
      // Run concurrent user tests
      await this.testConcurrentUsers(userCount, batchSize);
      
      // Generate final report
      return this.generateReport();
    } catch (error) {
      this.log(`❌ Load test failed: ${error.message}`);
      throw error;
    }
  }
}

// Run the load test
if (require.main === module) {
  const userCount = parseInt(process.argv[2]) || 25;
  const batchSize = parseInt(process.argv[3]) || 5;
  
  const tester = new LoadTester();
  tester.runLoadTest(userCount, batchSize).then(summary => {
    console.log(`\n🏁 Load test completed: ${summary.users.successful}/${summary.users.total} users successful`);
    console.log(`📈 System handled ${summary.performance.transactionThroughput.toFixed(2)} transactions/second`);
    
    if (summary.errors > 0) {
      console.log(`⚠️  ${summary.errors} errors encountered during testing`);
      process.exit(1);
    } else {
      console.log(`✅ All systems performed well under load!`);
      process.exit(0);
    }
  }).catch(error => {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  });
}

module.exports = LoadTester;