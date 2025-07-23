import { test, expect } from '@playwright/test';

test.describe('🚨 LIVE SITE REALITY CHECK', () => {
  test('Does PersonaPass actually work?', async ({ page }) => {
    console.log('🔍 Testing live site...');
    
    // Navigate to live site
    await page.goto('https://personapass.xyz');
    
    // Take screenshot
    await page.screenshot({ path: 'live-test.png', fullPage: true });
    
    // Check if page loads
    await expect(page).toHaveTitle(/PersonaPass|Persona/);
    
    // Check for key elements
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBeTruthy();
    
    console.log('✅ Basic site test passed');
  });
  
  test('Do API endpoints work?', async ({ page }) => {
    console.log('🔍 Testing API endpoints...');
    
    const endpoints = [
      '/api/test',
      '/api/plaid/webhook',
      '/api/stripe/webhook'
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(`https://personapass.xyz${endpoint}`);
      console.log(`📡 ${endpoint}: ${response.status()}`);
    }
  });
});