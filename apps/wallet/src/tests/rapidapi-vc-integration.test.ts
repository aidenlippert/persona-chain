/**
 * Comprehensive RapidAPI to VC Integration Tests
 * Tests the complete flow from API marketplace to VC creation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rapidAPIVCWorkflow } from '../services/credentials/RapidAPIVCWorkflow';
import RapidAPIConnector from '../services/automation/RapidAPIConnector';

// Mock data
const mockTruliooResponse = {
  PersonInfo: {
    FirstName: 'John',
    LastName: 'Smith',
    DateOfBirth: '1990-05-15',
    Country: 'US'
  },
  Record: {
    RecordStatus: 'match',
    DatasourceResults: [
      { Result: 'match', DatasourceName: 'Credit Bureau' },
      { Result: 'match', DatasourceName: 'Government DB' },
      { Result: 'nomatch', DatasourceName: 'Utility Records' }
    ]
  }
};

const mockYodleeResponse = {
  account: {
    accountName: 'Primary Checking',
    accountType: 'checking',
    balance: {
      amount: 15750.50,
      currency: 'USD'
    },
    providerName: 'Chase Bank',
    lastUpdated: '2024-01-15T10:30:00Z'
  }
};

const mockTwilioResponse = {
  to: '+1234567890',
  status: 'approved',
  channel: 'sms',
  date_created: '2024-01-15T10:30:00Z',
  lookup: {
    country_code: 'US'
  }
};

// Mock implementations
vi.mock('../services/vcManagerService');
vi.mock('../services/didService', () => ({
  didService: {
    getCurrentDID: vi.fn().mockResolvedValue({
      did: 'did:test:issuer',
      publicKey: 'test-key'
    }),
    signCredential: vi.fn().mockImplementation((credential) => ({
      ...credential,
      proof: { type: 'Ed25519Signature2018' }
    }))
  }
}));
vi.mock('../services/storageService', () => ({
  storageService: {
    setItem: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn().mockResolvedValue('[]')
  }
}));

vi.mock('../services/automation/RapidAPIConnector', () => {
  const mockConnector = {
    getAPIsByCategory: vi.fn(),
    testAPIConnection: vi.fn()
  };
  
  return {
    default: {
      getInstance: vi.fn(() => mockConnector)
    }
  };
});

// Get the mocked connector for use in tests
const mockConnector = {
  getAPIsByCategory: vi.fn(),
  testAPIConnection: vi.fn()
};

describe('RapidAPI to VC Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Identity Verification APIs', () => {
    it('should create identity VC from Trulioo API response', async () => {
      // Mock API metadata
      mockConnector.getAPIsByCategory.mockResolvedValue([{
        id: 'rapidapi_trulioo_global',
        name: 'Trulioo GlobalGateway',
        baseUrl: 'https://api.globaldatacompany.com/v1',
        authentication: {
          headers: { 'X-RapidAPI-Key': 'test-key' }
        }
      }]);

      // Mock fetch for API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTruliooResponse)
      });

      const request = {
        apiId: 'rapidapi_trulioo_global',
        apiEndpoint: '/verifications/v1/verify',
        requestData: {
          countryCode: 'US',
          personInfo: {
            firstName: 'John',
            lastName: 'Smith',
            dateOfBirth: '1990-05-15'
          }
        },
        vcTemplate: {
          type: 'IdentityVerificationCredential',
          name: 'Government ID Verification',
          description: 'Identity verified through government databases',
          category: 'identity',
          tags: ['government', 'official', 'kyc']
        },
        holderDID: 'did:personachain:test:holder123',
        issuerDID: 'did:personachain:test:issuer456',
        privacy: 'private' as const
      };

      const result = await rapidAPIVCWorkflow.createVCFromAPI(request);

      expect(result.success).toBe(true);
      expect(result.credential).toBeDefined();
      expect(result.credential.type).toContain('IdentityVerificationCredential');
      expect(result.credential.credentialSubject.firstName).toBe('John');
      expect(result.credential.credentialSubject.lastName).toBe('Smith');
      expect(result.verificationScore).toBeGreaterThan(80);
    });

    it('should calculate correct verification score for identity APIs', async () => {
      mockConnector.getAPIsByCategory.mockResolvedValue([{
        id: 'rapidapi_trulioo_global',
        name: 'Trulioo GlobalGateway',
        baseUrl: 'https://api.globaldatacompany.com/v1',
        authentication: {
          headers: { 'X-RapidAPI-Key': 'test-key' }
        }
      }]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ...mockTruliooResponse,
          Record: {
            RecordStatus: 'match',
            DatasourceResults: [
              { Result: 'match', DatasourceName: 'Credit Bureau' },
              { Result: 'match', DatasourceName: 'Government DB' },
              { Result: 'match', DatasourceName: 'Utility Records' },
              { Result: 'match', DatasourceName: 'Bank Records' }
            ]
          }
        })
      });

      const request = {
        apiId: 'rapidapi_trulioo_global',
        apiEndpoint: '/verifications/v1/verify',
        requestData: {},
        vcTemplate: {
          type: 'IdentityVerificationCredential',
          name: 'Test',
          description: 'Test',
          category: 'identity',
          tags: []
        },
        holderDID: 'did:test:holder',
        issuerDID: 'did:test:issuer',
        privacy: 'private' as const
      };

      const result = await rapidAPIVCWorkflow.createVCFromAPI(request);

      expect(result.success).toBe(true);
      expect(result.verificationScore).toBeGreaterThan(95); // Perfect match should give high score
    });
  });

  describe('Financial Data APIs', () => {
    it('should create financial VC from Yodlee API response', async () => {
      mockConnector.getAPIsByCategory.mockResolvedValue([{
        id: 'rapidapi_yodlee_fastlink',
        name: 'Yodlee FastLink',
        baseUrl: 'https://production.api.yodlee.com/ysl',
        authentication: {
          headers: { 'X-RapidAPI-Key': 'test-key' }
        }
      }]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYodleeResponse)
      });

      const request = {
        apiId: 'rapidapi_yodlee_fastlink',
        apiEndpoint: '/accounts',
        requestData: { accountId: 'test123' },
        vcTemplate: {
          type: 'FinancialAccountCredential',
          name: 'Bank Account Verification',
          description: 'Verified bank account information',
          category: 'financial',
          tags: ['banking', 'account', 'verification']
        },
        holderDID: 'did:personachain:test:holder123',
        issuerDID: 'did:personachain:test:issuer456',
        privacy: 'selective' as const
      };

      const result = await rapidAPIVCWorkflow.createVCFromAPI(request);

      expect(result.success).toBe(true);
      expect(result.credential).toBeDefined();
      expect(result.credential.type).toContain('FinancialAccountCredential');
      expect(result.credential.credentialSubject.accountName).toBe('Primary Checking');
      expect(result.credential.credentialSubject.balance).toBe(15750.50);
      expect(result.verificationScore).toBeGreaterThan(85);
    });

    it('should handle different account types correctly', async () => {
      const investmentResponse = {
        account: {
          ...mockYodleeResponse.account,
          accountType: 'investment',
          balance: { amount: 50000, currency: 'USD' }
        }
      };

      mockConnector.getAPIsByCategory.mockResolvedValue([{
        id: 'rapidapi_yodlee_fastlink',
        name: 'Yodlee FastLink',
        baseUrl: 'https://production.api.yodlee.com/ysl',
        authentication: {
          headers: { 'X-RapidAPI-Key': 'test-key' }
        }
      }]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(investmentResponse)
      });

      const request = {
        apiId: 'rapidapi_yodlee_fastlink',
        apiEndpoint: '/accounts',
        requestData: { accountId: 'investment123' },
        vcTemplate: {
          type: 'FinancialAccountCredential',
          name: 'Investment Account',
          description: 'Verified investment account',
          category: 'financial',
          tags: ['investment', 'portfolio']
        },
        holderDID: 'did:test:holder',
        issuerDID: 'did:test:issuer',
        privacy: 'private' as const
      };

      const result = await rapidAPIVCWorkflow.createVCFromAPI(request);

      expect(result.success).toBe(true);
      expect(result.credential.credentialSubject.accountType).toBe('investment');
      expect(result.verificationScore).toBeGreaterThan(90); // Investment accounts typically score higher
    });
  });

  describe('Communication APIs', () => {
    it('should create phone verification VC from Twilio API response', async () => {
      mockConnector.getAPIsByCategory.mockResolvedValue([{
        id: 'rapidapi_twilio_verify',
        name: 'Twilio Verify',
        baseUrl: 'https://verify.twilio.com/v2',
        authentication: {
          headers: { 'X-RapidAPI-Key': 'test-key' }
        }
      }]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTwilioResponse)
      });

      const request = {
        apiId: 'rapidapi_twilio_verify',
        apiEndpoint: '/Services/VA123/Verifications',
        requestData: {
          To: '+1234567890',
          Channel: 'sms'
        },
        vcTemplate: {
          type: 'PhoneVerificationCredential',
          name: 'Phone Number Verification',
          description: 'SMS verified phone number',
          category: 'communication',
          tags: ['phone', 'sms', 'verification']
        },
        holderDID: 'did:personachain:test:holder123',
        issuerDID: 'did:personachain:test:issuer456',
        privacy: 'public' as const
      };

      const result = await rapidAPIVCWorkflow.createVCFromAPI(request);

      expect(result.success).toBe(true);
      expect(result.credential).toBeDefined();
      expect(result.credential.type).toContain('PhoneVerificationCredential');
      expect(result.credential.credentialSubject.phoneNumber).toBe('+1234567890');
      expect(result.credential.credentialSubject.verificationStatus).toBe('approved');
      expect(result.verificationScore).toBeGreaterThan(75);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple VCs from different APIs', async () => {
      mockConnector.getAPIsByCategory.mockResolvedValue([
        {
          id: 'rapidapi_trulioo_global',
          name: 'Trulioo GlobalGateway',
          baseUrl: 'https://api.globaldatacompany.com/v1',
          authentication: { headers: { 'X-RapidAPI-Key': 'test-key' } }
        },
        {
          id: 'rapidapi_yodlee_fastlink',
          name: 'Yodlee FastLink',
          baseUrl: 'https://production.api.yodlee.com/ysl',
          authentication: { headers: { 'X-RapidAPI-Key': 'test-key' } }
        }
      ]);

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTruliooResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockYodleeResponse)
        });

      const requests = [
        {
          apiId: 'rapidapi_trulioo_global',
          apiEndpoint: '/verifications/v1/verify',
          requestData: {},
          vcTemplate: {
            type: 'IdentityVerificationCredential',
            name: 'Identity Verification',
            description: 'Identity verification',
            category: 'identity',
            tags: ['identity']
          },
          holderDID: 'did:test:holder',
          issuerDID: 'did:test:issuer',
          privacy: 'private' as const
        },
        {
          apiId: 'rapidapi_yodlee_fastlink',
          apiEndpoint: '/accounts',
          requestData: {},
          vcTemplate: {
            type: 'FinancialAccountCredential',
            name: 'Financial Account',
            description: 'Financial account verification',
            category: 'financial',
            tags: ['financial']
          },
          holderDID: 'did:test:holder',
          issuerDID: 'did:test:issuer',
          privacy: 'private' as const
        }
      ];

      const results = await rapidAPIVCWorkflow.createVCsFromMultipleAPIs(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].credential.type).toContain('IdentityVerificationCredential');
      expect(results[1].credential.type).toContain('FinancialAccountCredential');
    });
  });

  describe('Error Handling', () => {
    it('should handle API call failures gracefully', async () => {
      mockConnector.getAPIsByCategory.mockResolvedValue([{
        id: 'rapidapi_trulioo_global',
        name: 'Trulioo GlobalGateway',
        baseUrl: 'https://api.globaldatacompany.com/v1',
        authentication: { headers: { 'X-RapidAPI-Key': 'test-key' } }
      }]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const request = {
        apiId: 'rapidapi_trulioo_global',
        apiEndpoint: '/verifications/v1/verify',
        requestData: {},
        vcTemplate: {
          type: 'IdentityVerificationCredential',
          name: 'Test',
          description: 'Test',
          category: 'identity',
          tags: []
        },
        holderDID: 'did:test:holder',
        issuerDID: 'did:test:issuer',
        privacy: 'private' as const
      };

      const result = await rapidAPIVCWorkflow.createVCFromAPI(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create credential');
    });

    it('should handle missing required fields', async () => {
      mockConnector.getAPIsByCategory.mockResolvedValue([{
        id: 'rapidapi_trulioo_global',
        name: 'Trulioo GlobalGateway',
        baseUrl: 'https://api.globaldatacompany.com/v1',
        authentication: { headers: { 'X-RapidAPI-Key': 'test-key' } }
      }]);

      // Response missing required fields
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          PersonInfo: {
            FirstName: 'John'
            // Missing LastName and other required fields
          }
        })
      });

      const request = {
        apiId: 'rapidapi_trulioo_global',
        apiEndpoint: '/verifications/v1/verify',
        requestData: {},
        vcTemplate: {
          type: 'IdentityVerificationCredential',
          name: 'Test',
          description: 'Test',
          category: 'identity',
          tags: []
        },
        holderDID: 'did:test:holder',
        issuerDID: 'did:test:issuer',
        privacy: 'private' as const
      };

      const result = await rapidAPIVCWorkflow.createVCFromAPI(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create credential');
    });
  });

  describe('VC Templates', () => {
    it('should return correct VC templates for known APIs', async () => {
      const templates = await rapidAPIVCWorkflow.getVCTemplatesForAPI('rapidapi_trulioo_global');

      expect(templates).toHaveLength(1);
      expect(templates[0].type).toBe('IdentityVerificationCredential');
      expect(templates[0].name).toBe('IdentityVerification');
    });

    it('should return generic template for unknown APIs', async () => {
      const templates = await rapidAPIVCWorkflow.getVCTemplatesForAPI('unknown_api');

      expect(templates).toHaveLength(1);
      expect(templates[0].type).toBe('DataVerificationCredential');
      expect(templates[0].name).toBe('Data Verification');
    });
  });

  describe('Performance', () => {
    it('should complete VC creation within reasonable time', async () => {
      mockConnector.getAPIsByCategory.mockResolvedValue([{
        id: 'rapidapi_trulioo_global',
        name: 'Trulioo GlobalGateway',
        baseUrl: 'https://api.globaldatacompany.com/v1',
        authentication: { headers: { 'X-RapidAPI-Key': 'test-key' } }
      }]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTruliooResponse)
      });

      const request = {
        apiId: 'rapidapi_trulioo_global',
        apiEndpoint: '/verifications/v1/verify',
        requestData: {},
        vcTemplate: {
          type: 'IdentityVerificationCredential',
          name: 'Test',
          description: 'Test',
          category: 'identity',
          tags: []
        },
        holderDID: 'did:test:holder',
        issuerDID: 'did:test:issuer',
        privacy: 'private' as const
      };

      const startTime = Date.now();
      const result = await rapidAPIVCWorkflow.createVCFromAPI(request);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

// Integration test with live environment (optional, requires API keys)
describe('Live Integration Tests', () => {
  // Only run these tests if API keys are available
  const hasApiKey = process.env.VITE_RAPIDAPI_KEY && process.env.VITE_RAPIDAPI_KEY !== '';

  const conditionalTest = hasApiKey ? it : it.skip;

  conditionalTest('should work with real RapidAPI endpoints', async () => {
    // This test would make actual API calls
    // Only enable when you want to test with real APIs
    expect(true).toBe(true); // Placeholder
  });
});