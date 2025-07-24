/**
 * ULTRA-EARLY WASM BLOCKER
 * This script runs BEFORE React and all other JavaScript to prevent WASM loading
 */

// Ultra-aggressive WASM prevention - must run first
(function() {
  'use strict';
  
  console.log('🚨 ULTRA-EARLY WASM BLOCKER ACTIVATED');
  
  // Block WebAssembly before any library can use it
  if (typeof WebAssembly !== 'undefined') {
    const blockWasm = function() {
      console.warn('🚨 WASM BLOCKED BY ULTRA-EARLY BLOCKER');
      return Promise.reject(new Error('WASM completely disabled for production MIME type compatibility'));
    };
    
    // Silent blocking functions
    const silentBlockWasm = function() {
      return Promise.reject(new Error('WASM_SILENTLY_BLOCKED'));
    };
    
    WebAssembly.compile = silentBlockWasm;
    WebAssembly.instantiate = silentBlockWasm;
    
    if (WebAssembly.compileStreaming) {
      WebAssembly.compileStreaming = silentBlockWasm;
    }
    
    if (WebAssembly.instantiateStreaming) {
      WebAssembly.instantiateStreaming = silentBlockWasm;
    }
    
    console.log('✅ WebAssembly completely blocked by ultra-early script');
  }
  
  // Set global flags before any library loads
  if (typeof globalThis !== 'undefined') {
    globalThis.__NOBLE_DISABLE_WASM__ = true;
    globalThis.__WASM_COMPLETELY_DISABLED__ = true;
  }
  
  if (typeof window !== 'undefined') {
    window.__NOBLE_DISABLE_WASM__ = true;
    window.__WASM_COMPLETELY_DISABLED__ = true;
  }
  
  // Override fetch to block .wasm files EARLY
  if (typeof fetch !== 'undefined') {
    const originalFetch = fetch;
    fetch = function(input, init) {
      const url = typeof input === 'string' ? input : input.url;
      
      if (url && url.includes('.wasm')) {
        // Silently block WASM files without logging
        return Promise.reject(new Error('WASM_SILENTLY_BLOCKED'));
      }
      
      return originalFetch.call(this, input, init);
    };
  }
  
  console.log('✅ ULTRA-EARLY WASM BLOCKER INSTALLATION COMPLETE');
})();