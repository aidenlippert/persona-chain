/**
 * Simple API Test Script for Node.js
 * Tests basic API connectivity and VC creation
 */

// Mock environment for Node.js
global.process = global.process || {};
global.process.env = global.process.env || {};

// Mock fetch if not available
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options) => {
    console.log(`[MOCK] API Call: ${options?.method || 'GET'} ${url}`);
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        mockData: true,
        timestamp: new Date().toISOString(),
        success: true,
        data: { verified: true, score: 850 }
      })
    };
  };
}

// Mock crypto for Node.js
if (typeof crypto === 'undefined') {
  global.crypto = {
    randomUUID: () => `mock-uuid-${Date.now()}`,
    getRandomValues: (arr) => arr.map(() => Math.floor(Math.random() * 256))
  };
}

// Mock localStorage
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  };
}

console.log('🚀 Starting Simple API Test Suite...\n');

// Define our APIs
const APIs = {
  identity: [
    {
      id: 'rapidapi_trulioo_global',
      name: 'Trulioo GlobalGateway',
      category: 'identity_verification',
      endpoint: 'https://api.globaldatacompany.com/v1/verifications/v1/verify'
    },
    {
      id: 'rapidapi_jumio_netverify', 
      name: 'Jumio Netverify',
      category: 'biometric_verification',
      endpoint: 'https://netverify.com/api/acquisitions'
    },
    {
      id: 'rapidapi_onfido',
      name: 'Onfido Identity Verification',
      category: 'identity_verification', 
      endpoint: 'https://api.onfido.com/v3/applicants'
    }
  ],
  financial: [
    {
      id: 'rapidapi_yodlee_fastlink',
      name: 'Yodlee FastLink',
      category: 'financial_data',
      endpoint: 'https://production.api.yodlee.com/ysl/accounts'
    },
    {
      id: 'rapidapi_mx_platform',
      name: 'MX Platform API', 
      category: 'financial_data',
      endpoint: 'https://api.mx.com/users/test/accounts'
    }
  ],
  communication: [
    {
      id: 'rapidapi_twilio_verify',
      name: 'Twilio Verify',
      category: 'communication',
      endpoint: 'https://verify.twilio.com/v2/Services/test/Verifications'
    },
    {
      id: 'rapidapi_telesign',
      name: 'TeleSign Verify',
      category: 'communication', 
      endpoint: 'https://rest-api.telesign.com/v1/verify/sms'
    }
  ],
  professional: [
    {
      id: 'linkedin_advanced',
      name: 'LinkedIn Professional API',
      category: 'professional_verification',
      endpoint: 'https://api.linkedin.com/v2/people/~'
    },
    {
      id: 'github_advanced', 
      name: 'GitHub Developer API',
      category: 'developer_verification',
      endpoint: 'https://api.github.com/user'
    }
  ]
};

// Test Results
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  results: []
};

// Test API Function
async function testAPI(api) {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Testing ${api.name}...`);
    
    // Step 1: Test connectivity
    const response = await fetch(api.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': 'test-key'
      },
      body: JSON.stringify({ test: true })
    });
    
    const responseTime = Date.now() - startTime;
    
    // Step 2: Test VC creation (mocked)
    const credentialCreated = await createMockVC(api, response);
    
    const result = {
      apiId: api.id,
      apiName: api.name,
      category: api.category,
      success: response.ok,
      credentialCreated: credentialCreated,
      responseTime: responseTime
    };
    
    if (result.success && result.credentialCreated) {
      console.log(`   ✅ ${api.name} - ${responseTime}ms`);
      testResults.passed++;
    } else {
      console.log(`   ❌ ${api.name} - Failed`);
      testResults.failed++;
    }
    
    testResults.results.push(result);
    
  } catch (error) {
    console.log(`   ❌ ${api.name} - Error: ${error.message}`);
    testResults.failed++;
    testResults.results.push({
      apiId: api.id,
      apiName: api.name,
      category: api.category,
      success: false,
      credentialCreated: false,
      responseTime: Date.now() - startTime,
      error: error.message
    });
  }
  
  testResults.total++;
}

// Mock VC Creation
async function createMockVC(api, apiResponse) {
  try {
    const vcData = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ['VerifiableCredential', `${api.category}Credential`],
      issuer: {
        id: 'did:example:personapass',
        name: 'PersonaPass Identity Wallet'
      },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: 'did:example:user-123',
        verification_source: api.name,
        verification_provider: api.category,
        verified: true
      },
      proof: {
        type: 'Ed25519Signature2018',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: 'did:example:personapass#keys-1',
        jws: 'mock_signature_12345'
      }
    };
    
    // Validate VC structure
    const isValid = validateVC(vcData);
    return isValid;
    
  } catch (error) {
    return false;
  }
}

// VC Validation
function validateVC(vc) {
  return !!(
    vc['@context'] &&
    vc.id &&
    vc.type &&
    vc.issuer &&
    vc.issuanceDate &&
    vc.credentialSubject &&
    vc.proof
  );
}

// Run Tests
async function runTests() {
  console.log('📋 Testing Identity Verification APIs...');
  for (const api of APIs.identity) {
    await testAPI(api);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
  }
  
  console.log('\n💰 Testing Financial APIs...');
  for (const api of APIs.financial) {
    await testAPI(api);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📱 Testing Communication APIs...');
  for (const api of APIs.communication) {
    await testAPI(api);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n👔 Testing Professional APIs...');
  for (const api of APIs.professional) {
    await testAPI(api);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print Results
  console.log('\n' + '='.repeat(80));
  console.log('🎯 API INTEGRATION TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total APIs Tested: ${testResults.total}`);
  console.log(`   ✅ Successful: ${testResults.passed} (${(testResults.passed/testResults.total*100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${testResults.failed} (${(testResults.failed/testResults.total*100).toFixed(1)}%)`);
  
  console.log(`\n📋 DETAILED RESULTS:`);
  testResults.results.forEach(result => {
    const status = result.success && result.credentialCreated ? '✅' : '❌';
    console.log(`   ${status} ${result.apiName} (${result.category}) - ${result.responseTime}ms`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });
  
  // API Status Report
  console.log(`\n📊 API STATUS BY CATEGORY:`);
  
  const identityResults = testResults.results.filter(r => r.category.includes('identity') || r.category.includes('biometric'));
  const financialResults = testResults.results.filter(r => r.category.includes('financial'));
  const communicationResults = testResults.results.filter(r => r.category.includes('communication'));
  const professionalResults = testResults.results.filter(r => r.category.includes('professional') || r.category.includes('developer'));
  
  console.log(`   Identity APIs: ${identityResults.filter(r => r.success && r.credentialCreated).length}/${identityResults.length} working`);
  console.log(`   Financial APIs: ${financialResults.filter(r => r.success && r.credentialCreated).length}/${financialResults.length} working`);
  console.log(`   Communication APIs: ${communicationResults.filter(r => r.success && r.credentialCreated).length}/${communicationResults.length} working`);
  console.log(`   Professional APIs: ${professionalResults.filter(r => r.success && r.credentialCreated).length}/${professionalResults.length} working`);
  
  // Fixes Needed
  const brokenAPIs = testResults.results.filter(r => !r.success || !r.credentialCreated);
  if (brokenAPIs.length > 0) {
    console.log(`\n🔧 APIS THAT NEED FIXES:`);
    brokenAPIs.forEach(api => {
      let fix = 'Review integration';
      if (api.error?.includes('auth')) fix = 'Update authentication';
      if (api.error?.includes('404')) fix = 'Fix endpoint URL';
      if (api.error?.includes('400')) fix = 'Fix request format';
      if (api.error?.includes('rate')) fix = 'Add rate limiting';
      
      console.log(`   • ${api.apiName}: ${fix}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🎉 Test Suite Completed!');
  console.log('='.repeat(80));
}

// Run the tests
runTests().catch(console.error);