import { test, expect, Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

const CONNECTOR_API_URL = process.env.CONNECTOR_API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Mock OAuth providers for testing
const mockOAuthProviders = {
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfo: {
      login: 'testuser',
      id: 12345,
      name: 'Test User',
      email: 'test@example.com',
      public_repos: 42,
      followers: 100,
      following: 50,
      created_at: '2020-01-01T00:00:00Z'
    }
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfo: {
      id: 'linkedin123',
      email: 'test@example.com',
      firstName: { localized: { en_US: 'Test' } },
      lastName: { localized: { en_US: 'User' } },
      headline: { localized: { en_US: 'Senior Developer' } }
    }
  }
};

// Helper to generate test JWT
function generateTestJWT(userId: string): string {
  return jwt.sign(
    { userId, did: `did:key:${userId}` },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

test.describe('OAuth Connector Flow', () => {
  let authToken: string;
  let userId: string;

  test.beforeAll(async () => {
    userId = 'test-user-' + Date.now();
    authToken = generateTestJWT(userId);
  });

  test.describe('GitHub Connector', () => {
    test('should initiate OAuth flow', async ({ request }) => {
      const response = await request.post(`${CONNECTOR_API_URL}/api/v1/github/auth`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: { userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data).toHaveProperty('authUrl');
      expect(data).toHaveProperty('sessionId');
      expect(data).toHaveProperty('expiresIn');
      
      expect(data.authUrl).toContain('github.com/login/oauth/authorize');
      expect(data.authUrl).toContain('client_id=');
      expect(data.authUrl).toContain('state=');
      expect(data.authUrl).toContain('scope=read%3Auser+user%3Aemail');
    });

    test('should handle OAuth callback', async ({ page, context }) => {
      // First initiate the OAuth flow
      const initResponse = await page.request.post(`${CONNECTOR_API_URL}/api/v1/github/auth`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: { userId }
      });

      const { sessionId } = await initResponse.json();

      // Mock the OAuth provider response
      await context.route('**/github.com/login/oauth/authorize', async route => {
        const url = new URL(route.request().url());
        const state = url.searchParams.get('state');
        const redirectUri = url.searchParams.get('redirect_uri');
        
        // Simulate user authorization and redirect back with code
        await route.fulfill({
          status: 302,
          headers: {
            'Location': `${redirectUri}?code=test-code-123&state=${state}`
          }
        });
      });

      // Mock token exchange
      await context.route('**/github.com/login/oauth/access_token', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'test-access-token',
            token_type: 'bearer',
            scope: 'read:user user:email'
          })
        });
      });

      // Mock user info API
      await context.route('**/api.github.com/user', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockOAuthProviders.github.userInfo)
        });
      });

      // Navigate to callback URL
      const callbackUrl = `${CONNECTOR_API_URL}/api/v1/github/callback?code=test-code-123&state=${sessionId}`;
      await page.goto(callbackUrl);

      // Should redirect to success page
      await expect(page).toHaveURL(`${FRONTEND_URL}/connect/success?platform=github`);
    });

    test('should retrieve stored credential', async ({ request }) => {
      // Wait a bit for credential to be stored
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request.get(`${CONNECTOR_API_URL}/api/v1/github/credential/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data).toHaveProperty('credential');
      expect(data).toHaveProperty('zkCommitment');
      
      const { credential } = data;
      expect(credential['@context']).toContain('https://www.w3.org/ns/credentials/v2');
      expect(credential.type).toContain('VerifiableCredential');
      expect(credential.type).toContain('GitHubCredential');
      expect(credential.credentialSubject.username).toBe('testuser');
      expect(credential.credentialSubject.publicRepos).toBe(42);
    });

    test('should generate selective disclosure proof', async ({ request }) => {
      const response = await request.post(`${CONNECTOR_API_URL}/api/v1/github/proof/generate`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          userId,
          disclosureRequest: {
            fields: ['username', 'publicRepos'],
            predicates: [
              {
                field: 'publicRepos',
                operator: 'gt',
                value: 10
              }
            ]
          }
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data).toHaveProperty('proof');
      // In a real implementation, this would contain the ZK proof
    });

    test('should revoke credential', async ({ request }) => {
      const response = await request.delete(`${CONNECTOR_API_URL}/api/v1/github/credential/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.message).toBe('Credential revoked successfully');

      // Verify credential is deleted
      const getResponse = await request.get(`${CONNECTOR_API_URL}/api/v1/github/credential/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Frontend Integration', () => {
    test('should display connector grid', async ({ page }) => {
      // Mock authentication
      await page.goto(FRONTEND_URL);
      await page.evaluate((token) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_id', 'test-user');
      }, authToken);

      await page.goto(`${FRONTEND_URL}/credentials`);

      // Check connector buttons are displayed
      await expect(page.locator('text=GitHub')).toBeVisible();
      await expect(page.locator('text=LinkedIn')).toBeVisible();
      await expect(page.locator('text=ORCID')).toBeVisible();
      await expect(page.locator('text=Plaid Identity')).toBeVisible();
      await expect(page.locator('text=Twitter/X')).toBeVisible();
      await expect(page.locator('text=Stack Exchange')).toBeVisible();

      // Check privacy notice
      await expect(page.locator('text=Your credentials are encrypted and stored locally')).toBeVisible();
    });

    test('should handle connection flow', async ({ page, context }) => {
      // Mock API response
      await context.route(`${CONNECTOR_API_URL}/api/v1/github/auth`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authUrl: 'https://github.com/login/oauth/authorize?client_id=test',
            sessionId: 'test-session',
            expiresIn: 600
          })
        });
      });

      await page.goto(`${FRONTEND_URL}/credentials`);
      
      // Click GitHub connect button
      const githubButton = page.locator('button:has-text("Connect GitHub")');
      await githubButton.click();

      // Should store session and redirect
      const sessionId = await page.evaluate(() => sessionStorage.getItem('oauth_session_github'));
      expect(sessionId).toBe('test-session');
    });

    test('should display imported credentials', async ({ page, context }) => {
      // Mock credential retrieval
      await context.route(`${CONNECTOR_API_URL}/api/v1/*/credential/*`, async route => {
        const platform = route.request().url().match(/\/api\/v1\/(\w+)\/credential/)?.[1];
        
        if (platform === 'github') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              credential: {
                id: 'urn:uuid:test-123',
                type: ['VerifiableCredential', 'GitHubCredential'],
                issuer: { id: 'did:web:personapass.io', name: 'PersonaPass' },
                issuanceDate: new Date().toISOString(),
                credentialSubject: {
                  id: 'did:key:test-user',
                  username: 'testuser',
                  publicRepos: 42,
                  followers: 100
                }
              },
              zkCommitment: {
                commitment: '0x123...',
                nullifier: '0x456...'
              }
            })
          });
        } else {
          await route.fulfill({ status: 404 });
        }
      });

      await page.goto(`${FRONTEND_URL}/credentials`);
      
      // Check credential card is displayed
      await expect(page.locator('text=testuser')).toBeVisible();
      await expect(page.locator('text=GitHubCredential')).toBeVisible();
      await expect(page.locator('text=42').first()).toBeVisible(); // repos
      await expect(page.locator('text=100').first()).toBeVisible(); // followers

      // Check privacy indicator
      await expect(page.locator('[title="Privacy-enabled"]')).toBeVisible();
    });
  });

  test.describe('Security Tests', () => {
    test('should reject unauthorized requests', async ({ request }) => {
      const response = await request.post(`${CONNECTOR_API_URL}/api/v1/github/auth`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: { userId: 'unauthorized-user' }
      });

      expect(response.status()).toBe(401);
    });

    test('should validate CSRF protection', async ({ request }) => {
      // Create two sessions
      const session1 = await request.post(`${CONNECTOR_API_URL}/api/v1/github/auth`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: { userId }
      });

      const { sessionId: sessionId1 } = await session1.json();

      const session2 = await request.post(`${CONNECTOR_API_URL}/api/v1/github/auth`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: { userId: userId + '-2' }
      });

      const { sessionId: sessionId2 } = await session2.json();

      // Try to use session1's state with session2's callback
      const callbackUrl = `${CONNECTOR_API_URL}/api/v1/github/callback?code=test&state=${sessionId1}`;
      const response = await request.get(callbackUrl);

      // Should reject due to state mismatch
      expect(response.url()).toContain('error=invalid_request');
    });

    test('should enforce rate limiting', async ({ request }) => {
      const requests = [];
      
      // Make 100 requests rapidly
      for (let i = 0; i < 105; i++) {
        requests.push(
          request.get(`${CONNECTOR_API_URL}/api/v1/github/schema`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status() === 429);
      
      // Should have some rate limited responses
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.headers()['x-ratelimit-limit']).toBeDefined();
      expect(lastResponse.headers()['x-ratelimit-remaining']).toBeDefined();
    });
  });
});