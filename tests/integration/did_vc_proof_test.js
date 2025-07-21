const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const axios = require('axios');
const { spawn } = require('child_process');

describe('Persona Chain Integration Tests', () => {
  let blockchainProcess;
  let apiServiceProcess;
  let dbServiceProcess;
  
  const API_BASE_URL = 'http://localhost:3001/api';
  const DB_BASE_URL = 'http://localhost:3002/api';
  const MCP_API_URL = `${API_BASE_URL}/mcp/tools`;
  const MCP_DB_URL = `${DB_BASE_URL}/mcp/tools`;

  beforeAll(async () => {
    // Start blockchain node
    blockchainProcess = spawn('./build/persona-chaind', [
      'start',
      '--minimum-gas-prices=0stake',
      '--rpc.laddr=tcp://0.0.0.0:26657'
    ], { detached: true });

    // Start API service
    apiServiceProcess = spawn('npm', ['start'], {
      cwd: './services/api-service',
      env: { ...process.env, PORT: '3001' },
      detached: true
    });

    // Start DB service
    dbServiceProcess = spawn('npm', ['start'], {
      cwd: './services/db-service',
      env: { ...process.env, PORT: '3002' },
      detached: true
    });

    // Wait for services to start
    await new Promise(resolve => setTimeout(resolve, 15000));
  }, 30000);

  afterAll(async () => {
    // Clean up processes
    if (blockchainProcess) {
      process.kill(-blockchainProcess.pid);
    }
    if (apiServiceProcess) {
      process.kill(-apiServiceProcess.pid);
    }
    if (dbServiceProcess) {
      process.kill(-dbServiceProcess.pid);
    }
  });

  describe('DID → VC → Proof Flow', () => {
    let issuerDid, subjectDid, vcId, circuitId, proofId;

    test('1. Generate Issuer DID', async () => {
      const response = await axios.post(`${MCP_API_URL}/generate-did`, {
        method: 'persona',
        keyType: 'Ed25519',
        controller: 'cosmos1testissuer'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.result.did).toMatch(/^did:persona:/);
      
      issuerDid = response.data.result.did;
      
      // Verify DID was created on blockchain
      expect(response.data.result.txHash).toBeDefined();
    });

    test('2. Generate Subject DID', async () => {
      const response = await axios.post(`${MCP_API_URL}/generate-did`, {
        method: 'persona',
        keyType: 'Ed25519',
        controller: 'cosmos1testsubject'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.result.did).toMatch(/^did:persona:/);
      
      subjectDid = response.data.result.did;
    });

    test('3. Issue Verifiable Credential', async () => {
      const credentialData = {
        name: 'John Doe',
        dateOfBirth: '1990-01-01',
        email: 'john@example.com',
        age: 33
      };

      const response = await axios.post(`${MCP_API_URL}/issue-vc`, {
        issuerDid,
        subjectDid,
        credentialSubject: credentialData,
        credentialSchema: 'https://schema.org/Person',
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.result.vcId).toBeDefined();
      expect(response.data.result.credential).toBeDefined();
      expect(response.data.result.txHash).toBeDefined();
      
      vcId = response.data.result.vcId;
    });

    test('4. Save VC Record to Database', async () => {
      const response = await axios.post(`${MCP_DB_URL}/saveVcRecord`, {
        vcId,
        issuerDid,
        subjectDid,
        credentialSchema: 'https://schema.org/Person',
        credentialData: {
          name: 'John Doe',
          dateOfBirth: '1990-01-01',
          email: 'john@example.com',
          age: 33
        },
        proof: { type: 'Ed25519Signature2020' },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { test: true }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.result.vcId).toBe(vcId);
    });

    test('5. Compile Age Verification Circuit', async () => {
      const circuitCode = `
        pragma circom 2.0.0;
        
        template AgeVerification() {
            signal input birthYear;
            signal input currentYear;
            signal input minAge;
            signal output valid;
            
            component gte = GreaterEqualThan(8);
            gte.in[0] <== currentYear - birthYear;
            gte.in[1] <== minAge;
            
            valid <== gte.out;
        }
        
        component main = AgeVerification();
      `;

      const response = await axios.post(`${MCP_API_URL}/compile-circuit`, {
        circuitCode,
        circuitName: 'Age Verification Test',
        description: 'Proves age without revealing birth year'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.result.id).toBeDefined();
      expect(response.data.result.wasmCode).toBeDefined();
      expect(response.data.result.verificationKey).toBeDefined();
      expect(response.data.result.txHash).toBeDefined();
      
      circuitId = response.data.result.id;
    });

    test('6. Generate Zero-Knowledge Proof', async () => {
      const response = await axios.post(`${MCP_API_URL}/submit-proof`, {
        circuitId,
        publicInputs: [2023, 18], // currentYear, minAge
        proofData: JSON.stringify({
          pi_a: ["0x123", "0x456", "1"],
          pi_b: [["0x789", "0xabc"], ["0xdef", "0x012"], ["1", "0"]],
          pi_c: ["0x345", "0x678", "1"],
          protocol: "groth16",
          curve: "bn128"
        })
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.result.proofId).toBeDefined();
      expect(response.data.result.verified).toBe(true);
      expect(response.data.result.txHash).toBeDefined();
      
      proofId = response.data.result.proofId;
    });

    test('7. Query VC Records by Issuer', async () => {
      const response = await axios.post(`${MCP_DB_URL}/getVcRecordsByIssuer`, {
        issuerDid,
        limit: 10,
        offset: 0,
        includeRevoked: false
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.result)).toBe(true);
      expect(response.data.result.length).toBeGreaterThan(0);
      
      const vcRecord = response.data.result.find(vc => vc.vcId === vcId);
      expect(vcRecord).toBeDefined();
      expect(vcRecord.issuerDid).toBe(issuerDid);
      expect(vcRecord.subjectDid).toBe(subjectDid);
    });

    test('8. Query VC Records by Subject', async () => {
      const response = await axios.post(`${MCP_DB_URL}/getVcRecordsBySubject`, {
        subjectDid,
        limit: 10,
        offset: 0,
        includeRevoked: false
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.result)).toBe(true);
      expect(response.data.result.length).toBeGreaterThan(0);
      
      const vcRecord = response.data.result.find(vc => vc.vcId === vcId);
      expect(vcRecord).toBeDefined();
    });

    test('9. Get Test DIDs from Database', async () => {
      const response = await axios.post(`${MCP_DB_URL}/getTestDids`, {
        limit: 5,
        offset: 0,
        includeInactive: false
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.result)).toBe(true);
    });

    test('10. Get Analytics Data', async () => {
      const response = await axios.post(`${MCP_DB_URL}/getAnalytics`, {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        metrics: ['did_count', 'vc_count', 'proof_count'],
        groupBy: 'day'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.result).toBeDefined();
    });

    test('11. Search Records', async () => {
      const response = await axios.post(`${MCP_DB_URL}/searchRecords`, {
        query: 'John',
        type: 'vc',
        limit: 10,
        offset: 0
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.result)).toBe(true);
    });
  });

  describe('Guardian Recovery Flow', () => {
    let protectedDid, guardianAddress1, guardianAddress2, proposalId;

    test('1. Create DID with Guardian Protection', async () => {
      const response = await axios.post(`${MCP_API_URL}/generate-did`, {
        method: 'persona',
        keyType: 'Ed25519',
        controller: 'cosmos1protected'
      });

      expect(response.status).toBe(200);
      protectedDid = response.data.result.did;
    });

    test('2. Add First Guardian', async () => {
      guardianAddress1 = 'cosmos1guardian1';
      
      const response = await axios.post(`${MCP_API_URL}/add-guardian`, {
        didId: protectedDid,
        guardianAddress: guardianAddress1,
        publicKey: 'guardian1_public_key',
        controller: 'cosmos1protected'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.result.txHash).toBeDefined();
    });

    test('3. Add Second Guardian', async () => {
      guardianAddress2 = 'cosmos1guardian2';
      
      const response = await axios.post(`${MCP_API_URL}/add-guardian`, {
        didId: protectedDid,
        guardianAddress: guardianAddress2,
        publicKey: 'guardian2_public_key',
        controller: 'cosmos1protected'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    // Note: Guardian recovery flow would require more complex setup
    // with actual guardian signatures and threshold verification
    // This is a simplified test to verify the API endpoints work
  });

  describe('Health Checks', () => {
    test('API Service Health Check', async () => {
      const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ok');
    });

    test('DB Service Health Check', async () => {
      const response = await axios.get(`${DB_BASE_URL.replace('/api', '')}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ok');
    });

    test('MCP Tool Manifests', async () => {
      const apiManifest = await axios.get(`${MCP_API_URL}/manifest`);
      const dbManifest = await axios.get(`${MCP_DB_URL}/manifest`);
      
      expect(apiManifest.status).toBe(200);
      expect(Array.isArray(apiManifest.data.tools)).toBe(true);
      expect(apiManifest.data.tools.length).toBeGreaterThan(0);
      
      expect(dbManifest.status).toBe(200);
      expect(Array.isArray(dbManifest.data.tools)).toBe(true);
      expect(dbManifest.data.tools.length).toBeGreaterThan(0);
    });
  });
});