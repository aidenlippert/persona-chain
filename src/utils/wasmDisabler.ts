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

// Auto-run the disabler when this module is imported
disableNobleWasm();