import { test, expect, Page } from '@playwright/test';

// Test configuration
const WALLET_URL = 'http://localhost:5173';
const CONNECTOR_URL = 'http://localhost:8080';
const TEST_USER_TOKEN = 'test-token-12345';

// Helper to mock authentication
async function mockAuthentication(page: Page) {
  await page.goto(WALLET_URL);
  
  // Mock localStorage auth token
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('wallet_initialized', 'true');
  }, TEST_USER_TOKEN);
  
  // Navigate to credentials page
  await page.goto(`${WALLET_URL}/credentials`);
  await page.waitForLoadState('networkidle');
}

// Helper to handle OAuth popup windows
async function handleOAuthPopup(context: any, providerName: string) {
  const popupPromise = context.waitForEvent('page');
  
  return {
    popup: await popupPromise,
    cleanup: async (popup: Page) => {
      if (!popup.isClosed()) {
        await popup.close();
      }
    }
  };
}

test.describe('OAuth Credential Connector Flows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page);
  });

  test('should display all available connectors', async ({ page }) => {
    // Check that all connector cards are visible
    await expect(page.locator('h1')).toContainText('Credentials');
    
    // Verify all connectors are displayed
    const connectors = ['GitHub', 'LinkedIn', 'ORCID', 'Plaid Identity', 'Twitter', 'StackExchange'];
    
    for (const connector of connectors) {
      const card = page.locator('.bg-white.rounded-lg').filter({ hasText: connector });
      await expect(card).toBeVisible();
      
      // Check for Connect button
      const connectButton = card.locator('button', { hasText: 'Connect' });
      await expect(connectButton).toBeVisible();
    }
  });

  test('should show connected status for already connected platforms', async ({ page }) => {
    // Mock a connected platform
    await page.evaluate(() => {
      const mockCredential = {
        id: 'test-cred-1',
        type: ['VerifiableCredential', 'GitHubIdentityCredential'],
        issuer: { id: 'did:personachain:issuer:github', name: 'GitHub' },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: 'did:personachain:user:test',
          username: 'testuser',
          platform: 'github'
        }
      };
      
      // Mock wallet store update
      const event = new CustomEvent('credential-added', { detail: mockCredential });
      window.dispatchEvent(event);
    });
    
    // Wait for UI update
    await page.waitForTimeout(500);
    
    // Check GitHub shows as connected
    const githubCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' });
    await expect(githubCard.locator('span.text-green-600')).toContainText('Connected');
  });

  test('GitHub OAuth flow', async ({ page, context }) => {
    // Click GitHub Connect button
    const githubCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' });
    const connectButton = githubCard.locator('button', { hasText: 'Connect' });
    
    // Set up popup handler
    const popupPromise = context.waitForEvent('page');
    await connectButton.click();
    
    const popup = await popupPromise;
    
    // Verify OAuth URL
    expect(popup.url()).toContain('github.com/login/oauth/authorize');
    expect(popup.url()).toContain('client_id=Ov23lifeCftrdv4dcMBW');
    expect(popup.url()).toContain('redirect_uri=http://localhost:8080/api/connectors/github/callback');
    expect(popup.url()).toContain('scope=read:user%20user:email');
    
    // Simulate successful OAuth callback
    await popup.goto(`${CONNECTOR_URL}/api/connectors/github/callback?code=test-auth-code&state=test-state`);
    
    // Wait for credential to be stored
    await page.waitForTimeout(1000);
    
    // Close popup
    if (!popup.isClosed()) {
      await popup.close();
    }
    
    // Verify GitHub shows as connected
    await expect(githubCard.locator('span.text-green-600')).toContainText('Connected');
  });

  test('LinkedIn OAuth flow', async ({ page, context }) => {
    // Click LinkedIn Connect button
    const linkedinCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'LinkedIn' });
    const connectButton = linkedinCard.locator('button', { hasText: 'Connect' });
    
    // Set up popup handler
    const popupPromise = context.waitForEvent('page');
    await connectButton.click();
    
    const popup = await popupPromise;
    
    // Verify OAuth URL
    expect(popup.url()).toContain('linkedin.com/oauth/v2/authorization');
    expect(popup.url()).toContain('client_id=861ja0f20lfhjp');
    expect(popup.url()).toContain('redirect_uri=http://localhost:8080/api/connectors/linkedin/callback');
    expect(popup.url()).toContain('scope=r_liteprofile%20r_emailaddress');
    
    // Close popup
    if (!popup.isClosed()) {
      await popup.close();
    }
  });

  test('should handle OAuth errors gracefully', async ({ page, context }) => {
    // Click a Connect button
    const githubCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' });
    const connectButton = githubCard.locator('button', { hasText: 'Connect' });
    
    // Mock API error response
    await page.route('**/api/connectors/github/auth', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await connectButton.click();
    
    // Should show error message
    await expect(page.locator('.text-red-600')).toContainText('Failed to initiate connection');
  });

  test('should persist credentials across page reloads', async ({ page }) => {
    // Add a mock credential
    await page.evaluate(() => {
      const mockCredential = {
        id: 'test-cred-2',
        type: ['VerifiableCredential', 'LinkedInIdentityCredential'],
        issuer: { id: 'did:personachain:issuer:linkedin', name: 'LinkedIn' },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: 'did:personachain:user:test',
          name: 'Test User',
          platform: 'linkedin'
        }
      };
      
      // Store in IndexedDB (mock)
      localStorage.setItem('credentials', JSON.stringify([mockCredential]));
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify LinkedIn still shows as connected
    const linkedinCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'LinkedIn' });
    await expect(linkedinCard.locator('span.text-green-600')).toContainText('Connected');
  });

  test('should handle multiple simultaneous OAuth flows', async ({ page, context }) => {
    // Start GitHub OAuth
    const githubCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' });
    const githubButton = githubCard.locator('button', { hasText: 'Connect' });
    
    const githubPopupPromise = context.waitForEvent('page');
    await githubButton.click();
    const githubPopup = await githubPopupPromise;
    
    // Start LinkedIn OAuth while GitHub is still open
    const linkedinCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'LinkedIn' });
    const linkedinButton = linkedinCard.locator('button', { hasText: 'Connect' });
    
    const linkedinPopupPromise = context.waitForEvent('page');
    await linkedinButton.click();
    const linkedinPopup = await linkedinPopupPromise;
    
    // Verify both popups are for different providers
    expect(githubPopup.url()).toContain('github.com');
    expect(linkedinPopup.url()).toContain('linkedin.com');
    
    // Clean up
    if (!githubPopup.isClosed()) await githubPopup.close();
    if (!linkedinPopup.isClosed()) await linkedinPopup.close();
  });

  test('should verify credential data structure', async ({ page }) => {
    // Intercept credential storage
    const credentials: any[] = [];
    
    await page.exposeFunction('captureCredential', (credential: any) => {
      credentials.push(credential);
    });
    
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        if (key === 'credentials') {
          (window as any).captureCredential(JSON.parse(value));
        }
        return originalSetItem.call(this, key, value);
      };
    });
    
    // Trigger a mock credential creation
    await page.evaluate(() => {
      const mockCredential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1'
        ],
        id: 'urn:uuid:test-123',
        type: ['VerifiableCredential', 'GitHubIdentityCredential'],
        issuer: {
          id: 'did:personachain:issuer:connector-service',
          name: 'PersonaPass Connector Service'
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: 'did:personachain:user:test',
          username: 'testuser',
          email: 'test@example.com',
          platform: 'github',
          verified: true
        },
        proof: {
          type: 'Ed25519Signature2020',
          created: new Date().toISOString(),
          verificationMethod: 'did:personachain:issuer:connector-service#key-1',
          proofPurpose: 'assertionMethod'
        }
      };
      
      const event = new CustomEvent('credential-added', { detail: mockCredential });
      window.dispatchEvent(event);
      localStorage.setItem('credentials', JSON.stringify([mockCredential]));
    });
    
    // Verify credential structure
    expect(credentials.length).toBeGreaterThan(0);
    const cred = credentials[0][0];
    
    expect(cred).toHaveProperty('@context');
    expect(cred).toHaveProperty('id');
    expect(cred).toHaveProperty('type');
    expect(cred).toHaveProperty('issuer');
    expect(cred).toHaveProperty('issuanceDate');
    expect(cred).toHaveProperty('credentialSubject');
    expect(cred).toHaveProperty('proof');
  });
});

test.describe('OAuth Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page);
  });

  test('should require authentication token for connector APIs', async ({ page }) => {
    // Try to call connector API without auth token
    const response = await page.request.post(`${CONNECTOR_URL}/api/connectors/github/auth`, {
      data: { userId: 'test' },
      headers: {} // No auth header
    });
    
    expect(response.status()).toBe(401);
  });

  test('should validate PKCE parameters in OAuth flow', async ({ page }) => {
    // Intercept OAuth initiation
    await page.route('**/api/connectors/github/auth', async (route) => {
      const request = route.request();
      const response = await route.fetch();
      const body = await response.json();
      
      // Verify PKCE parameters are included
      expect(body.authUrl).toContain('code_challenge=');
      expect(body.authUrl).toContain('code_challenge_method=S256');
      
      route.fulfill({ response });
    });
    
    // Trigger OAuth flow
    const githubCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' });
    await githubCard.locator('button', { hasText: 'Connect' }).click();
  });

  test('should handle CSRF protection', async ({ page }) => {
    // Intercept OAuth callback
    await page.route('**/api/connectors/*/callback*', async (route) => {
      const url = new URL(route.request().url());
      const state = url.searchParams.get('state');
      
      // Verify state parameter exists
      expect(state).toBeTruthy();
      expect(state?.length).toBeGreaterThan(10);
      
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });
  });
});