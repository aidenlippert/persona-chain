/**
 * Comprehensive VC Integrations Test Suite
 * Tests GitHub, LinkedIn, and Plaid VC services with error handling and rate limiting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DIDService } from '../services/didService';
import { GitHubVCService } from '../services/githubVCService';
import { LinkedInVCService } from '../services/linkedinVCService';
import { PlaidVCService } from '../services/plaidVCService';
import { rateLimitService } from '../services/rateLimitService';
import { errorService, ErrorCategory, ErrorSeverity } from '../services/errorService';
import type { DID } from '../types/wallet';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto for DID generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn().mockReturnValue(new Uint8Array(32)),
  },
  writable: true,
});

// Test data - Generated dynamically, not hardcoded
const mockDID: DID = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'; // This is a well-known test DID from the DID spec
const mockPrivateKey = crypto.getRandomValues(new Uint8Array(32));
const mockGitHubToken = 'ghp_test' + Math.random().toString(36).substring(2, 15);
const mockLinkedInToken = 'linkedin_test' + Math.random().toString(36).substring(2, 15);
const mockPlaidToken = 'plaid_test' + Math.random().toString(36).substring(2, 15);

// Mock GitHub API responses
const mockGitHubProfile = {
  id: 12345,
  login: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  bio: 'Test developer',
  location: 'San Francisco',
  company: 'Test Company',
  blog: 'https://testblog.com',
  followers: 100,
  following: 50,
  public_repos: 25,
  public_gists: 5,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  avatar_url: 'https://github.com/avatar.jpg',
  html_url: 'https://github.com/testuser',
};

const mockGitHubRepos = [
  {
    id: 1,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    description: 'Test repository',
    language: 'TypeScript',
    stargazers_count: 10,
    forks_count: 5,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pushed_at: '2024-01-01T00:00:00Z',
    html_url: 'https://github.com/testuser/test-repo',
    topics: ['typescript', 'testing'],
    license: { name: 'MIT', spdx_id: 'MIT' },
  },
];

// Mock LinkedIn API responses
const mockLinkedInProfile = {
  id: 'linkedin123',
  firstName: { localized: { en_US: 'Test' } },
  lastName: { localized: { en_US: 'User' } },
  headline: { localized: { en_US: 'Software Engineer' } },
  summary: { localized: { en_US: 'Experienced developer' } },
  location: { country: 'US', region: 'CA' },
  industry: { localized: { en_US: 'Technology' } },
  profilePicture: { displayImage: 'https://linkedin.com/avatar.jpg' },
  publicProfileUrl: 'https://linkedin.com/in/testuser',
};

// Mock Plaid API responses
const mockPlaidIdentity = {
  accounts: [
    {
      account_id: 'acc_123',
      balances: {
        available: 1000,
        current: 1000,
        limit: null,
        iso_currency_code: 'USD',
      },
      mask: '0000',
      name: 'Checking',
      official_name: 'Primary Checking Account',
      subtype: 'checking',
      type: 'depository',
    },
  ],
  identity: {
    addresses: [
      {
        data: {
          street: '123 Main St',
          city: 'San Francisco',
          region: 'CA',
          postal_code: '94102',
          country: 'US',
        },
        primary: true,
      },
    ],
    emails: [
      {
        data: 'test@example.com',
        primary: true,
        type: 'primary',
      },
    ],
    names: ['Test User'],
    phone_numbers: [
      {
        data: '+1234567890',
        primary: true,
        type: 'home',
      },
    ],
  },
};

describe('VC Integrations Test Suite', () => {
  let gitHubService: GitHubVCService;
  let linkedInService: LinkedInVCService;
  let plaidService: PlaidVCService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset rate limiting
    rateLimitService.clearRateLimit(mockDID, 'credential-creation');
    rateLimitService.clearRateLimit(mockGitHubToken, 'github-api');
    rateLimitService.clearRateLimit(mockLinkedInToken, 'linkedin-api');
    rateLimitService.clearRateLimit(mockPlaidToken, 'plaid-api');

    // Initialize services
    gitHubService = new GitHubVCService();
    linkedInService = new LinkedInVCService();
    plaidService = new PlaidVCService('test_client_id', 'test_secret', 'sandbox');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GitHub VC Service', () => {
    beforeEach(() => {
      gitHubService.setAccessToken(mockGitHubToken);
    });

    describe('createDeveloperCredential', () => {
      it('should create a valid GitHub developer credential', async () => {
        // Mock successful API responses
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockGitHubProfile),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockGitHubRepos),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ total_contributions: 500 }),
          });

        const credential = await gitHubService.createDeveloperCredential(
          mockDID,
          mockPrivateKey,
        );

        expect(credential).toBeDefined();
        expect(credential.credential.type).toContain('GitHubCredential');
        expect(credential.credential.credentialSubject.id).toBe(mockDID);
        expect(credential.credential.credentialSubject.githubProfile.username).toBe(
          'testuser',
        );
        expect(credential.metadata.source).toBe('github');
      });

      it('should throw error when no access token is provided', async () => {
        const serviceWithoutToken = new GitHubVCService();

        await expect(
          serviceWithoutToken.createDeveloperCredential(mockDID, mockPrivateKey),
        ).rejects.toThrow('GitHub access token required');
      });

      it('should handle rate limiting', async () => {
        // Exhaust rate limit
        for (let i = 0; i < 16; i++) {
          rateLimitService.checkRateLimit(mockDID, 'credential-creation');
        }

        await expect(
          gitHubService.createDeveloperCredential(mockDID, mockPrivateKey),
        ).rejects.toThrow('Rate limit exceeded');
      });

      it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });

        await expect(
          gitHubService.createDeveloperCredential(mockDID, mockPrivateKey),
        ).rejects.toThrow('GitHub API unauthorized');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(
          gitHubService.createDeveloperCredential(mockDID, mockPrivateKey),
        ).rejects.toThrow('Network error');
      });
    });

    describe('Error Handling', () => {
      it('should handle 429 rate limit responses', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        });

        await expect(
          gitHubService.createDeveloperCredential(mockDID, mockPrivateKey),
        ).rejects.toThrow('Rate limit exceeded');
      });

      it('should handle 403 forbidden responses', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        });

        await expect(
          gitHubService.createDeveloperCredential(mockDID, mockPrivateKey),
        ).rejects.toThrow('GitHub API forbidden');
      });
    });
  });

  describe('LinkedIn VC Service', () => {
    beforeEach(() => {
      linkedInService.setAccessToken(mockLinkedInToken);
    });

    describe('createProfessionalCredential', () => {
      it('should create a valid LinkedIn professional credential', async () => {
        // Mock token validation
        vi.spyOn(linkedInService.getOAuthService(), 'validateToken').mockResolvedValue(
          true,
        );

        // Mock successful API responses
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockLinkedInProfile),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ elements: [] }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ elements: [] }),
          });

        const credential = await linkedInService.createProfessionalCredential(
          mockDID,
          mockPrivateKey,
        );

        expect(credential).toBeDefined();
        expect(credential.credential.type).toContain('LinkedInCredential');
        expect(credential.credential.credentialSubject.id).toBe(mockDID);
        expect(credential.metadata.source).toBe('linkedin');
      });

      it('should throw error when no access token is provided', async () => {
        const serviceWithoutToken = new LinkedInVCService();

        await expect(
          serviceWithoutToken.createProfessionalCredential(mockDID, mockPrivateKey),
        ).rejects.toThrow('LinkedIn access token required');
      });

      it('should handle invalid token', async () => {
        vi.spyOn(linkedInService.getOAuthService(), 'validateToken').mockResolvedValue(
          false,
        );

        await expect(
          linkedInService.createProfessionalCredential(mockDID, mockPrivateKey),
        ).rejects.toThrow('Invalid or expired LinkedIn access token');
      });

      it('should handle rate limiting', async () => {
        // Exhaust rate limit
        for (let i = 0; i < 16; i++) {
          rateLimitService.checkRateLimit(mockDID, 'credential-creation');
        }

        await expect(
          linkedInService.createProfessionalCredential(mockDID, mockPrivateKey),
        ).rejects.toThrow('Rate limit exceeded');
      });
    });
  });

  describe('Plaid VC Service', () => {
    beforeEach(() => {
      plaidService.setAccessToken(mockPlaidToken);
    });

    describe('createFinancialCredential', () => {
      it('should create a valid Plaid financial credential', async () => {
        // Mock successful API responses
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockPlaidIdentity),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              income: {
                income_streams: [],
                projected_yearly_income: 75000,
                number_of_income_streams: 1,
              },
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              accounts: [
                {
                  account_id: 'acc_123',
                  balances: { current: 1000, iso_currency_code: 'USD' },
                  days_available: 90,
                  historical_balances: [],
                  name: 'Checking',
                  official_name: 'Primary Checking',
                  type: 'depository',
                  subtype: 'checking',
                  owners: [],
                },
              ],
            }),
          });

        const credential = await plaidService.createFinancialCredential(
          mockDID,
          mockPrivateKey,
          mockPlaidToken,
        );

        expect(credential).toBeDefined();
        expect(credential.credential.type).toContain('FinancialCredential');
        expect(credential.credential.credentialSubject.id).toBe(mockDID);
        expect(credential.metadata.source).toBe('plaid');
      });

      it('should throw error when no access token is provided', async () => {
        await expect(
          plaidService.createFinancialCredential(mockDID, mockPrivateKey, ''),
        ).rejects.toThrow('Plaid access token required');
      });

      it('should handle rate limiting', async () => {
        // Exhaust rate limit
        for (let i = 0; i < 16; i++) {
          rateLimitService.checkRateLimit(mockDID, 'credential-creation');
        }

        await expect(
          plaidService.createFinancialCredential(
            mockDID,
            mockPrivateKey,
            mockPlaidToken,
          ),
        ).rejects.toThrow('Rate limit exceeded');
      });

      it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        });

        await expect(
          plaidService.createFinancialCredential(
            mockDID,
            mockPrivateKey,
            mockPlaidToken,
          ),
        ).rejects.toThrow('Plaid API error');
      });
    });
  });

  describe('Error Service Integration', () => {
    it('should create and report errors correctly', () => {
      const error = errorService.createError(
        'TEST_ERROR',
        'Test error message',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        errorService.createContext({ component: 'test' }),
        {
          retryable: true,
          userMessage: 'Test user message',
        },
      );

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toBe('Test user message');
    });

    it('should handle OAuth2 errors', () => {
      const oauthError = errorService.handleOAuth2Error(
        'GitHub',
        new Error('access_denied'),
        { component: 'github-oauth' },
      );

      expect(oauthError.code).toBe('OAUTH2_ACCESS_DENIED');
      expect(oauthError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(oauthError.retryable).toBe(true);
    });

    it('should handle API errors', () => {
      const apiError = errorService.handleAPIError(
        'GitHub',
        { status: 401, statusText: 'Unauthorized' },
        { component: 'github-api' },
      );

      expect(apiError.code).toBe('API_UNAUTHORIZED');
      expect(apiError.category).toBe(ErrorCategory.EXTERNAL_API);
      expect(apiError.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('Rate Limiting Service', () => {
    it('should allow requests within rate limits', () => {
      const result = rateLimitService.checkRateLimit('test-user', 'github-api');
      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBeLessThan(100);
    });

    it('should block requests exceeding rate limits', () => {
      // Exhaust rate limit
      for (let i = 0; i < 100; i++) {
        rateLimitService.checkRateLimit('test-user', 'github-api');
      }

      const result = rateLimitService.checkRateLimit('test-user', 'github-api');
      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should implement exponential backoff', () => {
      rateLimitService.recordFailedRequest('test-user', 'github-api');
      rateLimitService.recordFailedRequest('test-user', 'github-api');
      rateLimitService.recordFailedRequest('test-user', 'github-api');

      const shouldRetry = rateLimitService.shouldRetry('test-user', 'github-api');
      expect(shouldRetry).toBe(false); // Should be in backoff period
    });

    it('should provide rate limit statistics', () => {
      rateLimitService.checkRateLimit('test-user', 'github-api');
      rateLimitService.checkRateLimit('test-user', 'github-api');

      const stats = rateLimitService.getRateLimitStats('test-user', 'github-api');
      expect(stats.totalRequests).toBe(2);
      expect(stats.windowStart).toBeGreaterThan(0);
      expect(stats.windowEnd).toBeGreaterThan(0);
    });
  });

  describe('Integration Error Scenarios', () => {
    it('should handle concurrent rate limit exhaustion', async () => {
      const promises = [];
      
      // Create multiple concurrent requests
      for (let i = 0; i < 20; i++) {
        promises.push(
          rateLimitService.checkRateLimit('concurrent-user', 'credential-creation'),
        );
      }

      const results = await Promise.all(promises);
      const allowedCount = results.filter(r => r.allowed).length;
      const blockedCount = results.filter(r => !r.allowed).length;

      expect(allowedCount).toBeLessThanOrEqual(15); // Max for credential-creation
      expect(blockedCount).toBeGreaterThan(0);
    });

    it('should handle service unavailability gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      gitHubService.setAccessToken(mockGitHubToken);

      await expect(
        gitHubService.createDeveloperCredential(mockDID, mockPrivateKey),
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });

      gitHubService.setAccessToken(mockGitHubToken);

      await expect(
        gitHubService.createDeveloperCredential(mockDID, mockPrivateKey),
      ).rejects.toThrow();
    });
  });
});