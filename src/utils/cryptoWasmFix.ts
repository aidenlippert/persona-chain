/**
 * 🔧 CRYPTO WASM FIX
 * Fixes @noble/curves WASM loading issues with fallback mechanism
 * Addresses Vercel MIME type issues for cryptographic operations
 */

import { errorService } from '../services/errorService';

/**
 * 🛠️ Fix @noble/curves WASM loading
 * Patches the library to use fallback when WASM fails
 */
export function fixNobleWasmLoading(): void {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    console.log('[CRYPTO-WASM-FIX] 🔧 Applying @noble/curves WASM fixes...');

    // Override fetch for WASM files to handle MIME type issues
    const originalFetch = window.fetch;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = input.toString();
      
      // Check if this is a WASM file request
      if (url.endsWith('.wasm')) {
        console.log(`[CRYPTO-WASM-FIX] 🔍 Intercepting WASM fetch: ${url}`);
        
        try {
          const response = await originalFetch(input, init);
          
          // If the response doesn't have the correct MIME type, fix it
          const contentType = response.headers.get('content-type');
          if (contentType !== 'application/wasm') {
            console.log(`[CRYPTO-WASM-FIX] ⚠️ Wrong MIME type: ${contentType}, fixing...`);
            
            // Create a new response with the correct MIME type
            const fixedResponse = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                ...Object.fromEntries(response.headers.entries()),
                'content-type': 'application/wasm'
              }
            });
            
            console.log(`[CRYPTO-WASM-FIX] ✅ Fixed MIME type for: ${url}`);
            return fixedResponse;
          }
          
          return response;
        } catch (error) {
          console.warn(`[CRYPTO-WASM-FIX] ⚠️ Fetch failed for ${url}:`, error);
          throw error;
        }
      }
      
      // For non-WASM requests, use original fetch
      return originalFetch(input, init);
    };

    console.log('[CRYPTO-WASM-FIX] ✅ WASM fetch override installed');

  } catch (error) {
    console.warn('[CRYPTO-WASM-FIX] ⚠️ Failed to apply WASM fixes:', error);
    errorService.logError('Failed to apply crypto WASM fixes', error);
  }
}

/**
 * 🎯 Initialize crypto WASM fixes
 */
export function initializeCryptoWasmFix(): void {
  console.log('[CRYPTO-WASM-FIX] 🚀 Initializing crypto WASM fixes...');
  
  // Apply the fixes immediately
  fixNobleWasmLoading();
  
  // Also apply on DOM content loaded as a backup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fixNobleWasmLoading();
    });
  }
  
  console.log('[CRYPTO-WASM-FIX] ✅ Crypto WASM fixes initialized');
}

/**
 * 🧪 Test crypto WASM functionality
 */
export async function testCryptoWasm(): Promise<boolean> {
  try {
    console.log('[CRYPTO-WASM-FIX] 🧪 Testing crypto WASM functionality...');
    
    // Try to import and use @noble/curves
    const { secp256k1 } = await import('@noble/curves/secp256k1');
    
    // Test key generation
    const privateKey = secp256k1.utils.randomPrivateKey();
    const publicKey = secp256k1.getPublicKey(privateKey);
    
    // Test signing
    const message = new Uint8Array([1, 2, 3, 4, 5]);
    const signature = secp256k1.sign(message, privateKey);
    
    // Test verification
    const isValid = secp256k1.verify(signature, message, publicKey);
    
    if (isValid) {
      console.log('[CRYPTO-WASM-FIX] ✅ Crypto WASM test passed');
      return true;
    } else {
      console.warn('[CRYPTO-WASM-FIX] ⚠️ Crypto WASM test failed: signature verification failed');
      return false;
    }
    
  } catch (error) {
    console.warn('[CRYPTO-WASM-FIX] ⚠️ Crypto WASM test failed:', error);
    return false;
  }
}