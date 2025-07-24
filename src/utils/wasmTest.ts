/**
 * WASM Functionality Test - Verify WASM loading works correctly
 * 
 * This utility tests that WASM functionality has been properly restored
 * and can be used for legitimate cryptographic operations.
 */

export interface WASMTestResult {
  wasmSupported: boolean;
  nobleLibraryWorking: boolean;
  circuitWasmAccessible: boolean;
  errors: string[];
  timestamp: number;
}

/**
 * Test basic WASM functionality
 */
export async function testWASMFunctionality(): Promise<WASMTestResult> {
  const result: WASMTestResult = {
    wasmSupported: false,
    nobleLibraryWorking: false,
    circuitWasmAccessible: false,
    errors: [],
    timestamp: Date.now()
  };

  try {
    // Test 1: Check if WebAssembly is available and working
    if (typeof WebAssembly !== 'undefined') {
      try {
        // Try to compile a minimal WASM module
        const wasmCode = new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, // Magic number
          0x01, 0x00, 0x00, 0x00, // Version
        ]);
        
        await WebAssembly.compile(wasmCode);
        result.wasmSupported = true;
        console.log('✅ WebAssembly compilation test passed');
      } catch (error) {
        result.errors.push(`WebAssembly compile test failed: ${error}`);
        console.error('❌ WebAssembly compile test failed:', error);
      }
    } else {
      result.errors.push('WebAssembly not available in this environment');
      console.error('❌ WebAssembly not available');
    }

    // Test 2: Check @noble/curves WASM functionality
    try {
      const { ed25519 } = await import('@noble/curves/ed25519');
      
      // Test key generation (this will use WASM if available)
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = ed25519.getPublicKey(privateKey);
      
      // Test signing
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const signature = ed25519.sign(message, privateKey);
      
      // Test verification
      const isValid = ed25519.verify(signature, message, publicKey);
      
      if (isValid) {
        result.nobleLibraryWorking = true;
        console.log('✅ @noble/curves working correctly (with WASM if available)');
      } else {
        result.errors.push('@noble/curves signature verification failed');
        console.error('❌ @noble/curves signature verification failed');
      }
    } catch (error) {
      result.errors.push(`@noble/curves test failed: ${error}`);
      console.error('❌ @noble/curves test failed:', error);
    }

    // Test 3: Check if circuit WASM files are accessible
    try {
      const response = await fetch('/circuits/build/age_verification_js/age_verification.wasm');
      if (response.ok) {
        result.circuitWasmAccessible = true;
        console.log('✅ Circuit WASM files are accessible');
      } else {
        result.errors.push(`Circuit WASM file not accessible: ${response.status} ${response.statusText}`);
        console.warn('⚠️ Circuit WASM file not accessible (this may be expected if circuits are not built)');
      }
    } catch (error) {
      result.errors.push(`Circuit WASM access test failed: ${error}`);
      console.warn('⚠️ Circuit WASM access test failed (this may be expected if circuits are not built):', error);
    }

  } catch (error) {
    result.errors.push(`WASM test failed: ${error}`);
    console.error('❌ WASM test failed:', error);
  }

  return result;
}

/**
 * Check if WASM is enabled for @noble/curves
 */
export function checkNobleWASMStatus(): { enabled: boolean; globalFlag: boolean } {
  const globalFlag = typeof globalThis !== 'undefined' && 
                    (globalThis as any).__NOBLE_DISABLE_WASM__ === false;
  
  // Try to detect if WASM is actually being used (this is approximate)
  let enabled = false;
  try {
    // Check if the global flag allows WASM
    enabled = !Boolean((globalThis as any).__NOBLE_DISABLE_WASM__);
  } catch (error) {
    console.warn('Could not determine @noble/curves WASM status:', error);
  }

  return { enabled, globalFlag };
}

/**
 * Log WASM status for debugging
 */
export function logWASMStatus(): void {
  console.log('🔍 WASM Status Check:');
  console.log('- WebAssembly available:', typeof WebAssembly !== 'undefined');
  console.log('- WebAssembly.compile available:', typeof WebAssembly?.compile === 'function');
  console.log('- WebAssembly.instantiate available:', typeof WebAssembly?.instantiate === 'function');
  
  const nobleStatus = checkNobleWASMStatus();
  console.log('- @noble/curves WASM enabled:', nobleStatus.enabled);
  console.log('- Global __NOBLE_DISABLE_WASM__ flag:', (globalThis as any).__NOBLE_DISABLE_WASM__);
  
  // Run the full test
  testWASMFunctionality().then(result => {
    console.log('📊 WASM Functionality Test Results:', result);
    
    if (result.errors.length === 0) {
      console.log('🎉 All WASM functionality tests passed!');
    } else {
      console.warn('⚠️ Some WASM tests failed:', result.errors);
    }
  }).catch(error => {
    console.error('❌ WASM test execution failed:', error);
  });
}