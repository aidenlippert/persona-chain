// Jest setup for E2E tests
const axios = require('axios');

// Global setup for all tests
beforeAll(async () => {
  // Wait for testnet to be ready
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await axios.get('http://localhost:1317/health', { timeout: 1000 });
      console.log('✅ Mock testnet is ready');
      break;
    } catch (error) {
      retries++;
      if (retries === maxRetries) {
        throw new Error('Mock testnet failed to start within timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
});

// Global teardown
afterAll(async () => {
  // Clean up any resources
  console.log('🧹 Cleaning up E2E test resources');
});

// Extend Jest matchers for blockchain testing
expect.extend({
  toBeValidTxHash(received) {
    // Support both real tx hashes (0x...) and mock tx hashes (mock_tx_... or tx_...)
    const isRealTx = typeof received === 'string' && received.startsWith('0x') && received.length === 66;
    const isMockTx = typeof received === 'string' && (received.startsWith('mock_tx_') || received.startsWith('tx_'));
    const pass = isRealTx || isMockTx;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid transaction hash`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid transaction hash (0x... or mock_tx_...)`,
        pass: false,
      };
    }
  },
  
  toBeValidDID(received) {
    const pass = typeof received === 'string' && received.startsWith('did:persona:');
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid DID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid DID (format: did:persona:*)`,
        pass: false,
      };
    }
  }
});