import { test, expect, Page } from '@playwright/test';

const WALLET_URL = 'http://localhost:5173';
const TEST_USER_TOKEN = 'test-auth-token-12345';

// Helper to setup authenticated session
async function setupAuthenticatedSession(page: Page) {
  await page.goto(WALLET_URL);
  
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('wallet_initialized', 'true');
    
    // Mock some existing credentials
    const mockCredentials = [
      {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:github-cred-123',
        type: ['VerifiableCredential', 'GitHubIdentityCredential'],
        issuer: { id: 'did:personachain:issuer:github', name: 'GitHub' },
        issuanceDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        credentialSubject: {
          id: 'did:personachain:user:test',
          username: 'testuser',
          email: 'test@example.com',
          platform: 'github',
          followers: 150,
          repositories: 42
        },
        proof: {
          type: 'Ed25519Signature2020',
          created: new Date(Date.now() - 86400000).toISOString()
        }
      },
      {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:linkedin-cred-456',
        type: ['VerifiableCredential', 'LinkedInIdentityCredential'],
        issuer: { id: 'did:personachain:issuer:linkedin', name: 'LinkedIn' },
        issuanceDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        credentialSubject: {
          id: 'did:personachain:user:test',
          name: 'Test User',
          headline: 'Software Developer',
          platform: 'linkedin',
          connections: 500
        }
      }
    ];
    
    localStorage.setItem('credentials', JSON.stringify(mockCredentials));
  }, TEST_USER_TOKEN);
  
  await page.goto(`${WALLET_URL}/credentials`);
  await page.waitForLoadState('networkidle');
}

test.describe('Credential Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('should display credential details on hover/click', async ({ page }) => {
    // Find GitHub credential card
    const githubCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' });
    
    // Hover to see details tooltip
    await githubCard.hover();
    
    // Click to expand details
    await githubCard.click();
    
    // Verify credential details are shown
    await expect(page.locator('text=Username: testuser')).toBeVisible();
    await expect(page.locator('text=Repositories: 42')).toBeVisible();
    await expect(page.locator('text=Followers: 150')).toBeVisible();
  });

  test('should allow credential revocation', async ({ page }) => {
    // Find LinkedIn credential
    const linkedinCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'LinkedIn' });
    
    // Click revoke button
    const revokeButton = linkedinCard.locator('button', { hasText: 'Revoke' });
    await revokeButton.click();
    
    // Confirm revocation
    await page.locator('button', { hasText: 'Confirm Revoke' }).click();
    
    // Wait for UI update
    await page.waitForTimeout(500);
    
    // Verify LinkedIn shows as disconnected
    await expect(linkedinCard.locator('button', { hasText: 'Connect' })).toBeVisible();
  });

  test('should show credential issuance date and expiry', async ({ page }) => {
    const githubCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' });
    
    // Click to expand
    await githubCard.click();
    
    // Check for issuance date
    await expect(page.locator('text=/Issued:.*ago/')).toBeVisible();
    
    // Add expiring credential
    await page.evaluate(() => {
      const expiringCred = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:expiring-cred',
        type: ['VerifiableCredential', 'PlaidIdentityCredential'],
        issuer: { id: 'did:personachain:issuer:plaid', name: 'Plaid' },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 86400000).toISOString(), // Expires in 1 day
        credentialSubject: {
          id: 'did:personachain:user:test',
          platform: 'plaid',
          verified: true
        }
      };
      
      const creds = JSON.parse(localStorage.getItem('credentials') || '[]');
      creds.push(expiringCred);
      localStorage.setItem('credentials', JSON.stringify(creds));
      location.reload();
    });
    
    await page.waitForLoadState('networkidle');
    
    // Check for expiry warning
    const plaidCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'Plaid' });
    await expect(plaidCard.locator('text=/Expires in/')).toBeVisible();
  });

  test('should support credential refresh', async ({ page }) => {
    // Find GitHub credential with refresh option
    const githubCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' });
    
    // Mock refresh endpoint
    await page.route('**/api/connectors/github/refresh', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          credential: {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            id: 'urn:uuid:github-cred-refreshed',
            type: ['VerifiableCredential', 'GitHubIdentityCredential'],
            issuer: { id: 'did:personachain:issuer:github', name: 'GitHub' },
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
              id: 'did:personachain:user:test',
              username: 'testuser',
              email: 'test@example.com',
              platform: 'github',
              followers: 155, // Updated data
              repositories: 45
            }
          }
        })
      });
    });
    
    // Click refresh button
    const refreshButton = githubCard.locator('button[title="Refresh credential"]');
    await refreshButton.click();
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Verify updated data
    await githubCard.click();
    await expect(page.locator('text=Repositories: 45')).toBeVisible();
    await expect(page.locator('text=Followers: 155')).toBeVisible();
  });

  test('should handle zero-knowledge proof generation', async ({ page }) => {
    // Find a credential
    const githubCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' });
    
    // Click to expand
    await githubCard.click();
    
    // Click "Generate Proof" button
    const proofButton = page.locator('button', { hasText: 'Generate Proof' });
    await proofButton.click();
    
    // Select fields to disclose
    await page.locator('input[name="disclose-username"]').check();
    await page.locator('input[name="disclose-repositories"]').check();
    // Don't disclose email or followers
    
    // Generate proof
    await page.locator('button', { hasText: 'Create Proof' }).click();
    
    // Verify proof generation
    await expect(page.locator('text=Proof generated successfully')).toBeVisible();
    await expect(page.locator('text=Disclosed: username, repositories')).toBeVisible();
    await expect(page.locator('text=Hidden: email, followers')).toBeVisible();
  });

  test('should export credentials as backup', async ({ page }) => {
    // Mock download
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.locator('button', { hasText: 'Export Credentials' }).click();
    
    // Confirm export
    await page.locator('button', { hasText: 'Export All' }).click();
    
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('personapass-credentials');
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('should import credentials from backup', async ({ page }) => {
    // Create file input handler
    const fileInput = page.locator('input[type="file"]');
    
    // Click import button
    await page.locator('button', { hasText: 'Import Credentials' }).click();
    
    // Create mock backup file
    const backupData = {
      version: '1.0',
      exported: new Date().toISOString(),
      credentials: [
        {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          id: 'urn:uuid:imported-cred',
          type: ['VerifiableCredential', 'TwitterIdentityCredential'],
          issuer: { id: 'did:personachain:issuer:twitter', name: 'Twitter' },
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: 'did:personachain:user:test',
            username: '@testuser',
            platform: 'twitter',
            verified: true
          }
        }
      ]
    };
    
    const buffer = Buffer.from(JSON.stringify(backupData));
    
    // Set file input
    await fileInput.setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer
    });
    
    // Wait for import
    await page.waitForTimeout(1000);
    
    // Verify Twitter credential appears
    const twitterCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'Twitter' });
    await expect(twitterCard.locator('span.text-green-600')).toContainText('Connected');
  });

  test('should filter credentials by platform', async ({ page }) => {
    // Check filter dropdown
    const filterSelect = page.locator('select[name="platform-filter"]');
    
    // Filter to show only GitHub
    await filterSelect.selectOption('github');
    
    // Verify only GitHub is visible
    await expect(page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' })).toBeVisible();
    await expect(page.locator('.bg-white.rounded-lg').filter({ hasText: 'LinkedIn' })).not.toBeVisible();
    
    // Clear filter
    await filterSelect.selectOption('all');
    
    // Verify all are visible again
    await expect(page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' })).toBeVisible();
    await expect(page.locator('.bg-white.rounded-lg').filter({ hasText: 'LinkedIn' })).toBeVisible();
  });

  test('should search credentials', async ({ page }) => {
    // Use search input
    const searchInput = page.locator('input[placeholder="Search credentials..."]');
    
    await searchInput.fill('github');
    await searchInput.press('Enter');
    
    // Only GitHub should be visible
    await expect(page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' })).toBeVisible();
    await expect(page.locator('.bg-white.rounded-lg').filter({ hasText: 'LinkedIn' })).not.toBeVisible();
    
    // Clear search
    await searchInput.clear();
    await searchInput.press('Enter');
    
    // All should be visible
    await expect(page.locator('.bg-white.rounded-lg').filter({ hasText: 'GitHub' })).toBeVisible();
    await expect(page.locator('.bg-white.rounded-lg').filter({ hasText: 'LinkedIn' })).toBeVisible();
  });
});