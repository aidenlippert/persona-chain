import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5177';

test('Debug credentials page content', async ({ page }) => {
  console.log('🔍 Debugging credentials page...');
  
  await page.goto(`${BASE_URL}/credentials`);
  await page.waitForLoadState('networkidle');
  
  // Take screenshot
  await page.screenshot({ path: 'debug-credentials.png', fullPage: true });
  
  // Get page content
  const content = await page.content();
  console.log('Page title:', await page.title());
  console.log('URL:', page.url());
  
  // Check if we're redirected to a different page
  if (page.url() !== `${BASE_URL}/credentials`) {
    console.log(`⚠️ Redirected to: ${page.url()}`);
  }
  
  // Check for error messages
  const errorMessages = await page.locator('text*="error", text*="Error", text*="not found", text*="404"').count();
  if (errorMessages > 0) {
    console.log(`⚠️ Found ${errorMessages} error messages`);
  }
  
  // Check for loading states
  const loadingElements = await page.locator('text*="loading", text*="Loading", .animate-spin').count();
  console.log(`Found ${loadingElements} loading elements`);
  
  // Check for navigation elements
  const navElements = await page.locator('nav, [role="navigation"]').count();
  console.log(`Found ${navElements} navigation elements`);
  
  // Check for main content container
  const mainContent = await page.locator('main, #root > div, .app').count();
  console.log(`Found ${mainContent} main content containers`);
  
  // Check for specific react components
  const componentIndicators = [
    'Enhanced',
    'Credential', 
    'Manager',
    'Dashboard',
    'Layout'
  ];
  
  for (const indicator of componentIndicators) {
    const count = await page.locator(`text*="${indicator}"`).count();
    console.log(`"${indicator}": ${count} occurrences`);
  }
  
  // Check if we need to complete onboarding first
  const onboardingElements = await page.locator('text*="onboard", text*="Onboard", text*="welcome", text*="Welcome"').count();
  if (onboardingElements > 0) {
    console.log('⚠️ Onboarding may be required');
  }
});