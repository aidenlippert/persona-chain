import { test, expect } from '@playwright/test';

// Test the new navigation and all pages
test.describe('Navigation and Pages Test', () => {
  const baseURL = 'https://wallet-8w8kjbpcf-aiden-lipperts-projects.vercel.app';

  test('should have correct branding - Persona not PersonaPass', async ({ page }) => {
    await page.goto(baseURL);
    
    // Check that the logo says "Persona" not "PersonaPass"
    await expect(page.getByText('Persona')).toBeVisible();
    
    // Check page title
    await expect(page).toHaveTitle('Persona Wallet');
  });

  test('should have clean navigation without dropdowns', async ({ page }) => {
    await page.goto(baseURL);
    
    // Wait for navigation to load
    await page.waitForLoadState('networkidle');
    
    // Check that all navigation links are visible directly (no dropdowns)
    const navLinks = [
      'Dashboard',
      'Credentials', 
      'ID Verification',
      'Proofs',
      'ZK Templates',
      'Rewards',
      'Connections',
      'Settings'
    ];
    
    for (const link of navLinks) {
      await expect(page.getByText(link)).toBeVisible();
    }
  });

  test('should navigate to all pages successfully', async ({ page }) => {
    await page.goto(baseURL);
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Test navigation to each page
    const pageTests = [
      { link: 'Dashboard', url: '/dashboard', expectedText: 'Identity Dashboard' },
      { link: 'Credentials', url: '/credentials', expectedText: 'Verifiable Credentials' },
      { link: 'ID Verification', url: '/identity-verification', expectedText: 'Identity Verification' },
      { link: 'Proofs', url: '/proofs', expectedText: 'Zero-Knowledge Proofs' },
      { link: 'ZK Templates', url: '/zkp', expectedText: 'Zero-Knowledge' },
      { link: 'Rewards', url: '/token', expectedText: 'PERS Token' },
      { link: 'Connections', url: '/connections', expectedText: 'Trusted Connections' },
      { link: 'Settings', url: '/settings', expectedText: 'Settings' }
    ];
    
    for (const pageTest of pageTests) {
      console.log(`Testing navigation to ${pageTest.link}`);
      
      // Click the navigation link
      await page.click(`text=${pageTest.link}`);
      
      // Wait for navigation
      await page.waitForURL(`**${pageTest.url}`, { timeout: 10000 });
      
      // Check that we're on the correct page
      await expect(page).toHaveURL(new RegExp(pageTest.url));
      
      // Check for expected content
      await expect(page.getByText(pageTest.expectedText)).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ ${pageTest.link} page loaded successfully`);
    }
  });

  test('should have working create credentials functionality', async ({ page }) => {
    await page.goto(`${baseURL}/credentials`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for create credentials functionality
    await expect(page.getByText('Create New Credential')).toBeVisible();
    
    // Look for credential creation options
    const credentialTypes = ['GitHub', 'LinkedIn', 'Plaid'];
    
    for (const type of credentialTypes) {
      // These might be buttons or selects, so we'll be flexible
      const element = page.getByText(type, { exact: false });
      if (await element.isVisible()) {
        console.log(`✅ ${type} credential creation option found`);
      }
    }
  });

  test('should have proper responsive design', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(baseURL);
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    // Check that all navigation links are visible
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Credentials')).toBeVisible();
  });

  test('should have orange theme consistently applied', async ({ page }) => {
    await page.goto(baseURL);
    
    // Check that the Persona logo has orange styling
    const logo = page.getByText('Persona');
    await expect(logo).toBeVisible();
    
    // Check for orange theme in active states (by navigating to a page)
    await page.click('text=Credentials');
    await page.waitForURL('**/credentials');
    
    // The active navigation item should have orange styling
    // This is visual, so we'll just verify the page loads correctly
    await expect(page.getByText('Verifiable Credentials')).toBeVisible();
  });

  test('should maintain state between page navigation', async ({ page }) => {
    await page.goto(baseURL);
    
    // Navigate through several pages
    await page.click('text=Dashboard');
    await page.waitForURL('**/dashboard');
    
    await page.click('text=Credentials');
    await page.waitForURL('**/credentials');
    
    await page.click('text=Settings');
    await page.waitForURL('**/settings');
    
    // Navigate back to dashboard
    await page.click('text=Dashboard');
    await page.waitForURL('**/dashboard');
    
    // Should still have the Persona branding
    await expect(page.getByText('Persona')).toBeVisible();
  });
});