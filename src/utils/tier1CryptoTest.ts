/**
 * 🧪 TIER-1 CRYPTO TESTING SUITE
 * Comprehensive testing for military-grade hybrid crypto architecture
 */

import { errorService } from '../services/errorService';

interface CryptoTestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface CryptoTestSuite {
  webCryptoAPI: CryptoTestResult[];
  nobleLibraries: CryptoTestResult[];
  hybridOperations: CryptoTestResult[];
  overallSuccess: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

/**
 * 🧪 Test Web Crypto API functionality
 */
async function testWebCryptoAPI(): Promise<CryptoTestResult[]> {
  const results: CryptoTestResult[] = [];

  // Test 1: ECDSA Key Generation
  try {
    const start = Date.now();
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign', 'verify']
    );
    
    results.push({
      testName: 'Web Crypto ECDSA Key Generation',
      success: !!keyPair.privateKey && !!keyPair.publicKey,
      duration: Date.now() - start
    });
  } catch (error) {
    results.push({
      testName: 'Web Crypto ECDSA Key Generation',
      success: false,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: AES-GCM Encryption
  try {
    const start = Date.now();
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const data = new TextEncoder().encode('test data');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decryptedText = new TextDecoder().decode(decrypted);
    
    results.push({
      testName: 'Web Crypto AES-GCM',
      success: decryptedText === 'test data',
      duration: Date.now() - start
    });
  } catch (error) {
    results.push({
      testName: 'Web Crypto AES-GCM',
      success: false,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

/**
 * 🧪 Test Noble libraries (without WASM)
 */
async function testNobleLibraries(): Promise<CryptoTestResult[]> {
  const results: CryptoTestResult[] = [];

  // Test 1: secp256k1 operations
  try {
    const start = Date.now();
    const { secp256k1 } = await import('@noble/curves/secp256k1');
    
    const privateKey = secp256k1.utils.randomPrivateKey();
    const publicKey = secp256k1.getPublicKey(privateKey);
    const message = new Uint8Array([1, 2, 3, 4, 5]);
    const signature = secp256k1.sign(message, privateKey);
    const isValid = secp256k1.verify(signature, message, publicKey);
    
    results.push({
      testName: 'Noble secp256k1',
      success: isValid,
      duration: Date.now() - start,
      details: { wasmUsed: false }
    });
  } catch (error) {
    results.push({
      testName: 'Noble secp256k1',
      success: false,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

/**
 * 🧪 Test hybrid operations
 */
async function testHybridOperations(): Promise<CryptoTestResult[]> {
  const results: CryptoTestResult[] = [];

  // Test 1: Simple hybrid test
  try {
    const start = Date.now();
    
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const data = new TextEncoder().encode('hybrid test');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decryptedText = new TextDecoder().decode(decrypted);
    
    results.push({
      testName: 'Basic Hybrid Operation',
      success: decryptedText === 'hybrid test',
      duration: Date.now() - start
    });
  } catch (error) {
    results.push({
      testName: 'Basic Hybrid Operation',
      success: false,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

/**
 * 🚀 Run comprehensive crypto test suite
 */
export async function runTier1CryptoTests(): Promise<CryptoTestSuite> {
  console.log('[TIER1-CRYPTO-TEST] 🚀 Starting comprehensive crypto test suite...');
  
  const webCryptoResults = await testWebCryptoAPI();
  const nobleResults = await testNobleLibraries();
  const hybridResults = await testHybridOperations();
  
  const allResults = [...webCryptoResults, ...nobleResults, ...hybridResults];
  const passedTests = allResults.filter(r => r.success).length;
  const failedTests = allResults.filter(r => !r.success).length;
  const overallSuccess = failedTests === 0;
  
  const suite: CryptoTestSuite = {
    webCryptoAPI: webCryptoResults,
    nobleLibraries: nobleResults,
    hybridOperations: hybridResults,
    overallSuccess,
    totalTests: allResults.length,
    passedTests,
    failedTests
  };
  
  // Log results
  console.log(`[TIER1-CRYPTO-TEST] 📊 Test Results: ${passedTests}/${allResults.length} passed`);
  
  if (overallSuccess) {
    console.log('[TIER1-CRYPTO-TEST] ✅ All crypto tests passed!');
  } else {
    console.warn(`[TIER1-CRYPTO-TEST] ⚠️ ${failedTests} tests failed:`);
    allResults.filter(r => !r.success).forEach(result => {
      console.warn(`[TIER1-CRYPTO-TEST] ❌ ${result.testName}: ${result.error}`);
    });
  }
  
  return suite;
}

/**
 * 🎯 Quick crypto validation
 */
export async function validateCryptoSetup(): Promise<boolean> {
  try {
    const suite = await runTier1CryptoTests();
    return suite.overallSuccess;
  } catch (error) {
    console.error('[TIER1-CRYPTO-TEST] ❌ Crypto validation failed:', error);
    errorService.logError('Crypto validation failed', error);
    return false;
  }
}