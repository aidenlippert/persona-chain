import { test, expect } from '@playwright/test';

test.describe('PersonaPass Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the PersonaPass application
    await page.goto('https://personapass.xyz');
  });

  test('should display landing page correctly', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/PersonaPass/);
    
    // Check for key elements on the landing page
    await expect(page.getByRole('heading', { name: /PersonaPass/i })).toBeVisible();
    await expect(page.getByText(/Digital Identity Verification/i)).toBeVisible();
    
    // Check for call-to-action buttons
    await expect(page.getByRole('button', { name: /Get Started/i })).toBeVisible();
  });

  test('should navigate to onboarding flow', async ({ page }) => {
    // Click on Get Started button
    await page.getByRole('button', { name: /Get Started/i }).click();
    
    // Should navigate to onboarding
    await expect(page).toHaveURL(/onboarding/);
    
    // Check for onboarding content
    await expect(page.getByText(/Welcome to PersonaPass/i)).toBeVisible();
  });

  test('should complete onboarding and access dashboard', async ({ page }) => {
    // Start onboarding
    await page.getByRole('button', { name: /Get Started/i }).click();
    
    // Complete onboarding steps (mocked)
    await page.getByRole('button', { name: /Create Identity/i }).click();
    
    // Wait for wallet creation
    await page.waitForTimeout(2000);
    
    // Should navigate to dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Check dashboard elements
    await expect(page.getByText(/Professional Identity Dashboard/i)).toBeVisible();
    await expect(page.getByRole('tab', { name: /Overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Verification/i })).toBeVisible();
  });

  test('should display verification dashboard', async ({ page }) => {
    // Navigate directly to dashboard (assuming user is authenticated)
    await page.goto('https://personapass.xyz/dashboard');
    
    // Click on Verification tab
    await page.getByRole('tab', { name: /Verification/i }).click();
    
    // Check verification dashboard elements
    await expect(page.getByText(/Identity Verification/i)).toBeVisible();
    await expect(page.getByText(/Complete your identity verification/i)).toBeVisible();
    
    // Check for verification cards
    await expect(page.getByText(/Government ID Verification/i)).toBeVisible();
    await expect(page.getByText(/Bank Account Verification/i)).toBeVisible();
    await expect(page.getByText(/Income Verification/i)).toBeVisible();
    
    // Check for progress indicators
    await expect(page.getByText(/Verification Progress/i)).toBeVisible();
  });

  test('should start Stripe Identity verification', async ({ page }) => {
    // Navigate to verification dashboard
    await page.goto('https://personapass.xyz/dashboard');
    await page.getByRole('tab', { name: /Verification/i }).click();
    
    // Find and click on Government ID Verification
    const idVerificationCard = page.locator('[data-testid="stripe_identity"]').first();
    await idVerificationCard.getByRole('button', { name: /Start Verification/i }).click();
    
    // Check if verification modal opens
    await expect(page.getByText(/Government ID Verification/i)).toBeVisible();
    await expect(page.getByText(/government-issued documents/i)).toBeVisible();
    
    // Check for verification form
    await expect(page.getByRole('button', { name: /Start Identity Verification/i })).toBeVisible();
  });

  test('should start Plaid bank verification', async ({ page }) => {
    // Navigate to verification dashboard
    await page.goto('https://personapass.xyz/dashboard');
    await page.getByRole('tab', { name: /Verification/i }).click();
    
    // Find and click on Bank Account Verification
    const bankVerificationCard = page.locator('[data-testid="plaid_banking"]').first();
    await bankVerificationCard.getByRole('button', { name: /Start Verification/i }).click();
    
    // Check if verification modal opens
    await expect(page.getByText(/Connect Your Bank Account/i)).toBeVisible();
    await expect(page.getByText(/Securely connect your bank account/i)).toBeVisible();
    
    // Check for security information
    await expect(page.getByText(/Secure & Private/i)).toBeVisible();
    await expect(page.getByText(/bank-level security/i)).toBeVisible();
    
    // Check for connect button
    await expect(page.getByRole('button', { name: /Connect Bank Account/i })).toBeVisible();
  });

  test('should complete Plaid bank verification flow', async ({ page }) => {
    // Navigate to verification dashboard
    await page.goto('https://personapass.xyz/dashboard');
    await page.getByRole('tab', { name: /Verification/i }).click();
    
    // Start bank verification
    const bankVerificationCard = page.locator('[data-testid="plaid_banking"]').first();
    await bankVerificationCard.getByRole('button', { name: /Start Verification/i }).click();
    
    // Click connect button
    await page.getByRole('button', { name: /Connect Bank Account/i }).click();
    
    // Wait for connection process (mocked)
    await page.waitForTimeout(3000);
    
    // Check for success message
    await expect(page.getByText(/Connection Successful/i)).toBeVisible();
    await expect(page.getByText(/successfully connected and verified/i)).toBeVisible();
    
    // Check for connected institution
    await expect(page.getByText(/Connected Institution/i)).toBeVisible();
    await expect(page.getByText(/Chase Bank/i)).toBeVisible();
  });

  test('should display verification progress correctly', async ({ page }) => {
    // Navigate to verification dashboard
    await page.goto('https://personapass.xyz/dashboard');
    await page.getByRole('tab', { name: /Verification/i }).click();
    
    // Check initial progress (should be 0/5)
    await expect(page.getByText(/0\/5/i)).toBeVisible();
    
    // Check statistics
    await expect(page.getByText(/Completed/).first()).toBeVisible();
    await expect(page.getByText(/In Progress/).first()).toBeVisible();
    await expect(page.getByText(/Failed/).first()).toBeVisible();
    await expect(page.getByText(/Remaining/).first()).toBeVisible();
  });

  test('should navigate between dashboard tabs', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('https://personapass.xyz/dashboard');
    
    // Test all tabs
    const tabs = ['Overview', 'Verification', 'Identity', 'Credentials', 'ZK Proofs', 'Settings'];
    
    for (const tabName of tabs) {
      await page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click();
      
      // Check that tab is active
      const activeTab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
      await expect(activeTab).toHaveClass(/border-blue-600/);
      
      // Wait a bit for content to load
      await page.waitForTimeout(500);
    }
  });

  test('should handle verification errors gracefully', async ({ page }) => {
    // Navigate to verification dashboard
    await page.goto('https://personapass.xyz/dashboard');
    await page.getByRole('tab', { name: /Verification/i }).click();
    
    // Mock a failed verification by intercepting API calls
    await page.route('**/api/plaid/create-link-token', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Service unavailable' })
      });
    });
    
    // Start bank verification
    const bankVerificationCard = page.locator('[data-testid="plaid_banking"]').first();
    await bankVerificationCard.getByRole('button', { name: /Start Verification/i }).click();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Check for error message
    await expect(page.getByText(/Connection Failed/i)).toBeVisible();
    await expect(page.getByText(/error connecting/i)).toBeVisible();
    
    // Check for retry button
    await expect(page.getByRole('button', { name: /Try Again/i })).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to dashboard
    await page.goto('https://personapass.xyz/dashboard');
    
    // Check that header is responsive
    await expect(page.getByText(/PersonaPass/i)).toBeVisible();
    
    // Check that tabs are accessible (may be in a dropdown or scrollable)
    await expect(page.getByRole('tab', { name: /Overview/i })).toBeVisible();
    
    // Navigate to verification
    await page.getByRole('tab', { name: /Verification/i }).click();
    
    // Check that verification cards are stacked vertically
    const verificationCards = page.locator('[data-testid*="verification_card"]');
    await expect(verificationCards.first()).toBeVisible();
  });

  test('should handle webhook notifications', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('https://personapass.xyz/dashboard');
    
    // Listen for webhook notification (mock)
    page.on('console', msg => {
      if (msg.text().includes('Plaid webhook received')) {
        console.log('Webhook received:', msg.text());
      }
    });
    
    // Simulate webhook by making API call
    await page.evaluate(() => {
      fetch('/api/plaid/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'SYNC_UPDATES_AVAILABLE',
          item_id: 'test_item_id'
        })
      });
    });
    
    // Wait for webhook processing
    await page.waitForTimeout(1000);
  });

  test('should display verification details modal', async ({ page }) => {
    // Navigate to verification dashboard
    await page.goto('https://personapass.xyz/dashboard');
    await page.getByRole('tab', { name: /Verification/i }).click();
    
    // Look for a completed verification (if any)
    const viewDetailsButton = page.getByRole('button', { name: /View Details/i }).first();
    
    if (await viewDetailsButton.isVisible()) {
      await viewDetailsButton.click();
      
      // Check modal content
      await expect(page.getByText(/Verification Details/i)).toBeVisible();
      await expect(page.getByText(/Verification Type/i)).toBeVisible();
      await expect(page.getByText(/Provider/i)).toBeVisible();
      await expect(page.getByText(/Status/i)).toBeVisible();
      
      // Close modal
      await page.getByRole('button', { name: /Close/i }).click();
    }
  });

  test('should validate API endpoints', async ({ page }) => {
    // Test API endpoints directly
    const endpoints = [
      '/api/test',
      '/api/plaid/webhook',
      '/api/stripe/webhook',
      '/api/plaid/create-link-token',
      '/api/stripe/create-verification-session'
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(`https://personapass.xyz${endpoint}`);
      
      // Should not return 404
      expect(response.status()).not.toBe(404);
      
      // Should return valid JSON for most endpoints
      if (response.headers()['content-type']?.includes('application/json')) {
        const json = await response.json();
        expect(json).toBeDefined();
      }
    }
  });
});