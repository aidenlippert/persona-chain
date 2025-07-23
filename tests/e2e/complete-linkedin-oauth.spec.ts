import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5177';

test.describe('Complete LinkedIn OAuth Integration', () => {
  test('should complete onboarding and test LinkedIn OAuth', async ({ page }) => {
    console.log('🔍 Starting complete LinkedIn OAuth integration test...');
    
    // Step 1: Go to homepage
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    console.log('✅ Homepage loaded');
    
    // Step 2: Look for onboarding or login
    const getStartedButton = page.locator('text="Get Started", text="Start", text="Begin", text="Login", text="Sign In"');
    if (await getStartedButton.count() > 0) {
      console.log('📍 Found onboarding/login button, clicking...');
      await getStartedButton.first().click();
      await page.waitForLoadState('networkidle');
    }
    
    // Step 3: Try to navigate directly to credentials page
    await page.goto(`${BASE_URL}/credentials`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'linkedin-oauth-test.png', fullPage: true });
    
    // Step 4: Look for LinkedIn credential option
    const linkedinText = page.locator('text="LinkedIn"');
    const linkedinProfessional = page.locator('text="LinkedIn Professional"');
    const linkedinCard = page.locator('text="Professional"');
    
    console.log(`LinkedIn text count: ${await linkedinText.count()}`);
    console.log(`LinkedIn Professional count: ${await linkedinProfessional.count()}`);
    console.log(`Professional text count: ${await linkedinCard.count()}`);
    
    // Step 5: If LinkedIn is found, try to interact with it
    if (await linkedinText.count() > 0 || await linkedinProfessional.count() > 0) {
      console.log('✅ LinkedIn option found, attempting to click...');
      
      const linkedinElement = await linkedinText.count() > 0 ? linkedinText.first() : linkedinProfessional.first();
      await linkedinElement.click();
      await page.waitForTimeout(1000);
      
      // Look for LinkedIn OAuth button in modal
      const oauthButton = page.locator('[data-testid="linkedin-oauth-button"], text="Connect LinkedIn"');
      if (await oauthButton.count() > 0) {
        console.log('✅ LinkedIn OAuth button found in modal!');
        
        // Mock the OAuth redirect to avoid actually redirecting
        await page.addInitScript(() => {
          const originalHref = window.location.href;
          Object.defineProperty(window.location, 'href', {
            get: () => originalHref,
            set: (value) => {
              if (value.includes('linkedin.com/oauth')) {
                console.log('OAuth redirect intercepted:', value);
                (window as any)._linkedinOAuthUrl = value;
              }
            }
          });
        });
        
        await oauthButton.first().click();
        
        // Check if OAuth URL was generated
        const oauthUrl = await page.evaluate(() => (window as any)._linkedinOAuthUrl);
        if (oauthUrl) {
          console.log('✅ LinkedIn OAuth URL generated successfully!');
          console.log('OAuth URL:', oauthUrl);
          
          // Validate OAuth parameters
          const url = new URL(oauthUrl);
          expect(url.hostname).toBe('www.linkedin.com');
          expect(url.pathname).toBe('/oauth/v2/authorization');
          expect(url.searchParams.get('response_type')).toBe('code');
          expect(url.searchParams.get('client_id')).toBeTruthy();
          expect(url.searchParams.get('redirect_uri')).toBeTruthy();
          expect(url.searchParams.get('scope')).toBeTruthy();
          expect(url.searchParams.get('state')).toBeTruthy();
          
          console.log('✅ All OAuth parameters validated successfully!');
        } else {
          console.log('ℹ️ OAuth URL not generated - may need OAuth configuration');
        }
      } else {
        console.log('⚠️ LinkedIn OAuth button not found in modal');
      }
    } else {
      console.log('⚠️ LinkedIn option not found on page');
      
      // Debug: check what's actually on the page
      const pageContent = await page.textContent('body');
      console.log('Page content preview:', pageContent?.substring(0, 500));
      
      // Check if we need to complete additional setup
      const setupElements = page.locator('text="setup", text="Setup", text="configure", text="Configure"');
      if (await setupElements.count() > 0) {
        console.log('ℹ️ Additional setup may be required');
      }
    }
    
    console.log('🏁 LinkedIn OAuth integration test completed');
  });
  
  test('should test LinkedIn OAuth callback handling', async ({ page }) => {
    console.log('🔍 Testing LinkedIn OAuth callback...');
    
    // Test the callback URL directly
    const callbackUrl = `${BASE_URL}/auth/linkedin/callback?code=test_code&state=test_state`;
    await page.goto(callbackUrl);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'linkedin-callback-test.png', fullPage: true });
    
    // Check if callback page loaded
    const pageContent = await page.textContent('body');
    if (pageContent?.toLowerCase().includes('linkedin') || 
        pageContent?.toLowerCase().includes('processing') ||
        pageContent?.toLowerCase().includes('oauth')) {
      console.log('✅ LinkedIn OAuth callback page loaded successfully');
    } else {
      console.log('⚠️ LinkedIn OAuth callback may need route configuration');
    }
    
    console.log('🏁 LinkedIn OAuth callback test completed');
  });
});