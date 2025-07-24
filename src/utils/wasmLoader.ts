/**
 * 🚀 ROBUST WASM LOADER
 * Handles WebAssembly loading with MIME type fallback for Vercel deployment
 * Fixes "Incorrect response MIME type. Expected 'application/wasm'" errors
 */

import { errorService } from '../services/errorService';

export interface WasmLoadResult {
  instance: WebAssembly.Instance;
  module: WebAssembly.Module;
  success: boolean;
  method: 'streaming' | 'fallback' | 'failed';
  error?: Error;
}

/**
 * 🔄 Load WebAssembly with automatic fallback
 * Tries instantiateStreaming first (optimal), falls back to instantiate if MIME type fails
 */
export async function loadWasm(wasmUrl: string, imports?: any): Promise<WasmLoadResult> {
  try {
    console.log(`[WASM-LOADER] Loading WebAssembly from: ${wasmUrl}`);
    
    // If we're on Vercel production, use the proxy API to ensure correct MIME type
    if (window.location.hostname === 'personapass.xyz' || 
        window.location.hostname.includes('vercel.app')) {
      // Extract the file path from the URL
      const urlPath = new URL(wasmUrl, window.location.origin).pathname;
      const proxyUrl = `/api/wasm-proxy?file=${encodeURIComponent(urlPath)}`;
      
      console.log(`[WASM-LOADER] Using proxy API for Vercel deployment: ${proxyUrl}`);
      wasmUrl = proxyUrl;
    }
    
    // Method 1: Try streaming compilation (optimal performance)
    try {
      const response = await fetch(wasmUrl);
      
      // Check if response is OK
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
      }
      
      // Check MIME type (but don't fail if it's wrong)
      const contentType = response.headers.get('content-type');
      console.log(`[WASM-LOADER] Response Content-Type: ${contentType}`);
      
      // Try streaming compilation
      const result = await WebAssembly.instantiateStreaming(response, imports);
      
      console.log(`[WASM-LOADER] ✅ Successfully loaded WASM using streaming method`);
      return {
        instance: result.instance,
        module: result.module,
        success: true,
        method: 'streaming'
      };
      
    } catch (streamingError) {
      console.warn(`[WASM-LOADER] ⚠️ Streaming failed: ${streamingError.message}`);
      
      // Method 2: Fallback to instantiate from ArrayBuffer
      console.log(`[WASM-LOADER] 🔄 Trying fallback method...`);
      
      const response = await fetch(wasmUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
      }
      
      const wasmBytes = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(wasmBytes, imports);
      
      console.log(`[WASM-LOADER] ✅ Successfully loaded WASM using fallback method`);
      return {
        instance: result.instance,
        module: result.module,
        success: true,
        method: 'fallback'
      };
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WASM-LOADER] ❌ Failed to load WASM from ${wasmUrl}:`, errorMessage);
    
    errorService.logError(`WASM loading failed for ${wasmUrl}`, error);
    
    return {
      instance: null as any,
      module: null as any,
      success: false,
      method: 'failed',
      error: error instanceof Error ? error : new Error(errorMessage)
    };
  }
}

/**
 * 🔍 Validate WebAssembly support
 */
export function validateWasmSupport(): boolean {
  try {
    if (typeof WebAssembly === 'object' && 
        typeof WebAssembly.instantiate === 'function') {
      console.log('[WASM-LOADER] ✅ WebAssembly is supported');
      return true;
    }
  } catch (error) {
    console.warn('[WASM-LOADER] ⚠️ WebAssembly is not supported:', error);
  }
  
  console.warn('[WASM-LOADER] ❌ WebAssembly is not supported in this environment');
  return false;
}

/**
 * 🧪 Test WebAssembly loading with a minimal WASM module
 */
export async function testWasmLoading(): Promise<boolean> {
  if (!validateWasmSupport()) {
    return false;
  }
  
  try {
    // Minimal WASM module that exports an add function
    const minimalWasm = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x07, 0x01, 0x60,
      0x02, 0x7f, 0x7f, 0x01, 0x7f, 0x03, 0x02, 0x01, 0x00, 0x07, 0x07, 0x01,
      0x03, 0x61, 0x64, 0x64, 0x00, 0x00, 0x0a, 0x09, 0x01, 0x07, 0x00, 0x20,
      0x00, 0x20, 0x01, 0x6a, 0x0b
    ]);
    
    const result = await WebAssembly.instantiate(minimalWasm);
    const addFunction = result.instance.exports.add as Function;
    const testResult = addFunction(2, 3);
    
    if (testResult === 5) {
      console.log('[WASM-LOADER] ✅ WebAssembly test passed');
      return true;
    } else {
      console.warn('[WASM-LOADER] ⚠️ WebAssembly test failed: unexpected result');
      return false;
    }
    
  } catch (error) {
    console.warn('[WASM-LOADER] ⚠️ WebAssembly test failed:', error);
    return false;
  }
}

/**
 * 🔧 Initialize WASM loader
 */
export async function initializeWasmLoader(): Promise<void> {
  console.log('[WASM-LOADER] 🚀 Initializing WebAssembly loader...');
  
  const isSupported = validateWasmSupport();
  if (!isSupported) {
    console.warn('[WASM-LOADER] ⚠️ WebAssembly not supported, some features may be disabled');
    return;
  }
  
  const testPassed = await testWasmLoading();
  if (testPassed) {
    console.log('[WASM-LOADER] ✅ WebAssembly loader ready');
  } else {
    console.warn('[WASM-LOADER] ⚠️ WebAssembly loader test failed, fallback mode enabled');
  }
}