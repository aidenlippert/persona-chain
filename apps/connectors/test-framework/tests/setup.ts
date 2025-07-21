import { config } from 'dotenv';
import nock from 'nock';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(() => {
  console.log('🧪 Setting up PersonaPass Connector Test Suite...');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Setup nock for HTTP mocking
  nock.cleanAll();
  
  console.log('✅ Test environment initialized');
});

beforeEach(() => {
  // Clear all HTTP mocks before each test
  nock.cleanAll();
  
  // Reset any global state
  jest.clearAllMocks();
});

afterEach(() => {
  // Verify all nock interceptors were used
  if (!nock.isDone()) {
    console.warn('⚠️ Unused nock interceptors:', nock.pendingMocks());
    nock.cleanAll();
  }
});

afterAll(() => {
  // Final cleanup
  nock.cleanAll();
  nock.restore();
  
  console.log('🧹 Test suite cleanup completed');
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCommitment(): R;
      toBeValidOAuthToken(): R;
      toBeValidCredential(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidCommitment(received) {
    const pass = received && 
                 typeof received.commitmentHash === 'string' &&
                 typeof received.merkleRoot === 'string' &&
                 typeof received.nullifierHash === 'string' &&
                 typeof received.credentialId === 'string' &&
                 typeof received.did === 'string' &&
                 typeof received.verified === 'boolean';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid commitment`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid commitment`,
        pass: false,
      };
    }
  },
  
  toBeValidOAuthToken(received) {
    const pass = received && 
                 typeof received.accessToken === 'string' &&
                 typeof received.expiresAt === 'number' &&
                 typeof received.provider === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid OAuth token`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid OAuth token`,
        pass: false,
      };
    }
  },
  
  toBeValidCredential(received) {
    const pass = received && 
                 typeof received.id === 'string' &&
                 typeof received.did === 'string' &&
                 typeof received.verified === 'boolean' &&
                 typeof received.commitment === 'string' &&
                 typeof received.createdAt === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid credential`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid credential`,
        pass: false,
      };
    }
  }
});

// Test data factories
export const createMockDID = (): string => {
  return `did:persona:test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

export const createMockAccessToken = (provider: string) => {
  return {
    accessToken: `mock_${provider}_token_${Date.now()}`,
    refreshToken: `mock_${provider}_refresh_${Date.now()}`,
    expiresAt: Date.now() + 3600000, // 1 hour
    scope: 'read write',
    tokenType: 'Bearer',
    provider
  };
};

export const createMockCredential = (type: string, source: string) => {
  const did = createMockDID();
  return {
    id: `${source}_${type}_${did}_${Date.now()}`,
    did,
    type,
    source,
    verified: true,
    data: { mockData: true },
    commitment: `commitment_${Date.now()}`,
    rawDataHash: `hash_${Date.now()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  };
};

// Mock API responses
export const mockAPIResponses = {
  linkedin: {
    profile: {
      id: 'mock-linkedin-id',
      firstName: { localized: { en_US: 'John' } },
      lastName: { localized: { en_US: 'Doe' } },
      headline: { localized: { en_US: 'Software Engineer' } }
    },
    email: {
      elements: [{
        'handle~': {
          emailAddress: 'john.doe@example.com'
        }
      }]
    }
  },
  
  twitter: {
    user: {
      id: 'mock-twitter-id',
      username: 'johndoe',
      name: 'John Doe',
      public_metrics: {
        followers_count: 1000,
        following_count: 500,
        tweet_count: 2000
      }
    }
  },
  
  github: {
    user: {
      id: 12345,
      login: 'johndoe',
      name: 'John Doe',
      email: 'john.doe@example.com',
      public_repos: 25,
      followers: 100,
      following: 75
    },
    repos: [
      {
        id: 1,
        name: 'awesome-project',
        stargazers_count: 50,
        language: 'TypeScript',
        updated_at: '2023-12-01T10:00:00Z'
      }
    ]
  },
  
  plaid: {
    accounts: [{
      account_id: 'mock-account-id',
      name: 'Checking Account',
      type: 'depository',
      subtype: 'checking',
      balances: {
        available: 1000.50,
        current: 1200.75
      }
    }],
    transactions: [{
      transaction_id: 'mock-transaction-id',
      account_id: 'mock-account-id',
      amount: 25.50,
      date: '2023-12-01',
      name: 'Coffee Shop',
      category: ['Food and Drink', 'Restaurants']
    }]
  },
  
  epic: {
    patient: {
      id: 'mock-patient-id',
      name: [{ given: ['John'], family: 'Doe' }],
      gender: 'male',
      birthDate: '1990-01-15'
    },
    observations: {
      entry: [{
        resource: {
          id: 'mock-observation-id',
          status: 'final',
          code: {
            coding: [{ code: '8480-6', display: 'Systolic blood pressure' }]
          },
          valueQuantity: { value: 120, unit: 'mmHg' }
        }
      }]
    }
  },
  
  census: {
    geocoding: {
      result: {
        addressMatches: [{
          matchedAddress: '123 Main St, Anytown, CA 12345',
          coordinates: { x: -122.4194, y: 37.7749 },
          addressComponents: {
            streetNumber: '123',
            streetName: 'Main',
            suffixType: 'St',
            city: 'Anytown',
            state: 'CA',
            zip: '12345'
          }
        }]
      }
    }
  },
  
  dmv: {
    licenseVerification: {
      verified: true,
      license_status: 'valid',
      license_class: 'C',
      issued_date: '2020-03-15',
      expiration_date: '2025-03-15',
      confidence: 0.95
    }
  }
};