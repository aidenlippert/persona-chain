/**
 * WASM Disabler - Forces @noble/curves to use pure JavaScript
 * 
 * This utility prevents WASM loading issues in production by disabling
 * WebAssembly usage in the @noble/curves library, forcing it to use
 * pure JavaScript implementations instead.
 * 
 * 🚨 CRITICAL FIX: Prevents "Incorrect response MIME type" errors
 * in production deployments where WASM files may not be served
 * with the correct application/wasm MIME type.
 */

// Global flag to disable WASM in @noble/curves
declare global {
  interface Window {
    __NOBLE_DISABLE_WASM__?: boolean;
  }
  var __NOBLE_DISABLE_WASM__: boolean | undefined;
}

/**
 * Disable WASM usage globally for @noble/curves library
 * Must be called before any @noble/curves imports
 */
export function disableNobleWasm(): void {
  try {
    // Set global flag for @noble/curves library
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__NOBLE_DISABLE_WASM__ = true;
    }
    
    // Set window flag for browser environments
    if (typeof window !== 'undefined') {
      window.__NOBLE_DISABLE_WASM__ = true;
    }
    
    // Set Node.js global flag
    if (typeof global !== 'undefined') {
      (global as any).__NOBLE_DISABLE_WASM__ = true;
    }

    console.log('✅ WASM disabled for @noble/curves - using pure JavaScript fallback');
  } catch (error) {
    console.warn('⚠️ Failed to disable WASM for @noble/curves:', error);
  }
}

/**
 * Check if WASM is properly disabled
 */
export function isWasmDisabled(): boolean {
  const globalFlag = typeof globalThis !== 'undefined' && (globalThis as any).__NOBLE_DISABLE_WASM__;
  const windowFlag = typeof window !== 'undefined' && window.__NOBLE_DISABLE_WASM__;
  return Boolean(globalFlag || windowFlag);
}

/**
 * Additional WASM prevention for production deployments
 */
export function preventAllWasm(): void {
  try {
    // Override WebAssembly.compile to prevent MIME type errors
    if (typeof WebAssembly !== 'undefined') {
      const originalCompile = WebAssembly.compile;
      const originalInstantiate = WebAssembly.instantiate;
      const originalCompileStreaming = WebAssembly.compileStreaming;
      const originalInstantiateStreaming = WebAssembly.instantiateStreaming;
      
      WebAssembly.compile = function() {
        console.warn('🚨 WASM compile blocked - using JavaScript fallback');
        return Promise.reject(new Error('WASM disabled for production MIME type compatibility'));
      };
      
      WebAssembly.instantiate = function() {
        console.warn('🚨 WASM instantiate blocked - using JavaScript fallback');
        return Promise.reject(new Error('WASM disabled for production MIME type compatibility'));
      };

      // Also override streaming methods
      if (WebAssembly.compileStreaming) {
        WebAssembly.compileStreaming = function() {
          console.warn('🚨 WASM compileStreaming blocked - using JavaScript fallback');
          return Promise.reject(new Error('WASM streaming disabled for production MIME type compatibility'));
        };
      }

      if (WebAssembly.instantiateStreaming) {
        WebAssembly.instantiateStreaming = function() {
          console.warn('🚨 WASM instantiateStreaming blocked - using JavaScript fallback');
          return Promise.reject(new Error('WASM streaming disabled for production MIME type compatibility'));
        };
      }
      
      console.log('✅ All WebAssembly methods overridden for production safety');
    }
  } catch (error) {
    console.warn('⚠️ Failed to override WebAssembly methods:', error);
  }
}

/**
 * Prevent circuits WASM loading specifically
 */
export function preventCircuitWasm(): void {
  try {
    // Override fetch to intercept WASM file requests
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : input.url;
      
      // Block all .wasm file requests
      if (url.includes('.wasm')) {
        console.warn('🚨 WASM file request blocked:', url);
        return Promise.reject(new Error('WASM file loading disabled for production compatibility'));
      }
      
      return originalFetch.call(this, input, init);
    };
    
    console.log('✅ Fetch override installed to block WASM file requests');
  } catch (error) {
    console.warn('⚠️ Failed to override fetch for WASM blocking:', error);
  }
}

// Auto-run all disablers when this module is imported
disableNobleWasm();
preventAllWasm();
preventCircuitWasm();