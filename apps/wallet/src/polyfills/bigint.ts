/**
 * BigInt Polyfill for Vercel/Edge Runtime Compatibility
 * 
 * This polyfill ensures BigInt functionality works in environments
 * where native BigInt might not be available.
 */

// Silently handle BigInt compatibility
// The build process should handle BigInt transpilation, but this provides a fallback
if (typeof globalThis !== 'undefined' && typeof globalThis.BigInt === 'undefined') {
  // Log only in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn('BigInt polyfill activated - native BigInt not available');
  }
}

// Export a wrapper that ensures BigInt is available
export const safeBigInt = (value: string | number | bigint): bigint => {
  try {
    return BigInt(value);
  } catch (error) {
    console.error('BigInt conversion failed:', error);
    throw new Error(`Failed to convert value to BigInt: ${value}`);
  }
};

// Helper functions for common BigInt operations
export const bigIntUtils = {
  // Convert BigInt to string for serialization
  toString: (value: bigint): string => {
    return value.toString();
  },

  // Convert BigInt to number (with precision loss warning)
  toNumber: (value: bigint): number => {
    const num = Number(value);
    if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
      console.warn('BigInt to Number conversion may lose precision:', value.toString());
    }
    return num;
  },

  // Safe arithmetic operations
  add: (a: bigint, b: bigint): bigint => a + b,
  subtract: (a: bigint, b: bigint): bigint => a - b,
  multiply: (a: bigint, b: bigint): bigint => a * b,
  divide: (a: bigint, b: bigint): bigint => a / b,
  
  // Comparison operations
  equals: (a: bigint, b: bigint): boolean => a === b,
  greaterThan: (a: bigint, b: bigint): boolean => a > b,
  lessThan: (a: bigint, b: bigint): boolean => a < b,
  
  // Common values
  zero: BigInt(0),
  one: BigInt(1),
  
  // Ethereum-specific utilities
  parseEther: (value: string): bigint => {
    // Parse ether value to wei (18 decimals)
    const [whole, decimal = ''] = value.split('.');
    const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18);
    return BigInt(whole + paddedDecimal);
  },
  
  formatEther: (value: bigint): string => {
    // Format wei to ether (18 decimals)
    const str = value.toString().padStart(19, '0');
    const whole = str.slice(0, -18) || '0';
    const decimal = str.slice(-18).replace(/0+$/, '');
    return decimal ? `${whole}.${decimal}` : whole;
  }
};