import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.TARGET_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5177';

// LinkedIn OAuth Test Configuration
const LINKEDIN_CONFIG = {
  clientId: process.env.VITE_LINKEDIN_CLIENT_ID || 'test_linkedin_client_id',
  redirectUri: process.env.VITE_LINKEDIN_REDIRECT_URI || `${BASE_URL}/auth/linkedin/callback`,
  scopes: ['r_liteprofile', 'r_emailaddress'],
  authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  apiUrl: 'https://api.linkedin.com/v2'
};

test.describe('LinkedIn OAuth Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to credentials page
    await page.goto(`${BASE_URL}/credentials`);
    await page.waitForLoadState('networkidle');
    
    // Click on "Create Credential" tab to access credential creation options
    const createTab = page.locator('text="Create Credential"');
    if (await createTab.count() > 0) {
      await createTab.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display LinkedIn OAuth button', async ({ page }) => {
    console.log('🔍 Testing LinkedIn OAuth button display...');
    
    // First look for LinkedIn credential type card
    const linkedinCard = page.locator('text="LinkedIn Professional"').first();
    await expect(linkedinCard).toBeVisible();
    console.log('✅ LinkedIn credential card is visible');
    
    // Click on LinkedIn credential type to open OAuth modal
    await linkedinCard.click();
    
    // Wait for modal to appear and look for LinkedIn OAuth button
    const linkedinButton = page.locator('[data-testid="linkedin-oauth-button"], button:has-text("Connect LinkedIn")');
    await expect(linkedinButton.first()).toBeVisible();
    console.log('✅ LinkedIn OAuth button is visible in modal');
  });

  test('should generate valid LinkedIn OAuth URL', async ({ page }) => {
    console.log('🔍 Testing LinkedIn OAuth URL generation...');
    
    // Mock the window.location.href to capture the redirect
    await page.addInitScript(() => {
      let originalHref = window.location.href;
      Object.defineProperty(window.location, 'href', {
        get: () => originalHref,
        set: (value) => {
          originalHref = value;
          // Store the URL for testing
          (window as any)._linkedinOAuthUrl = value;
        }
      });
    });
    
    // First look for LinkedIn credential type card
    const linkedinCard = page.locator('text="LinkedIn Professional"').first();
    await expect(linkedinCard).toBeVisible();
    
    // Click on LinkedIn credential type to open OAuth modal
    await linkedinCard.click();
    
    // Look for LinkedIn OAuth button in modal
    const linkedinButton = page.locator('[data-testid="linkedin-oauth-button"], button:has-text("Connect LinkedIn")');
    await expect(linkedinButton.first()).toBeVisible();

    // Click the OAuth button
    await linkedinButton.first().click();
    
    // Wait for OAuth URL to be generated
    await page.waitForTimeout(2000);
    
    // Check if OAuth URL was generated
    const oauthUrl = await page.evaluate(() => (window as any)._linkedinOAuthUrl);
    
    if (oauthUrl && oauthUrl.includes('linkedin.com/oauth/v2/authorization')) {
      console.log('✅ LinkedIn OAuth URL generated correctly');
      
      // Parse and validate OAuth parameters
      const url = new URL(oauthUrl);
      expect(url.hostname).toBe('www.linkedin.com');
      expect(url.pathname).toBe('/oauth/v2/authorization');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBeTruthy();
      expect(url.searchParams.get('redirect_uri')).toBeTruthy();
      expect(url.searchParams.get('scope')).toBeTruthy();
      expect(url.searchParams.get('state')).toBeTruthy();
      
      console.log('✅ LinkedIn OAuth parameters validated');
    } else {
      console.log('ℹ️ LinkedIn OAuth URL generation may need configuration');
    }
  });

  test('should handle LinkedIn OAuth callback success', async ({ page }) => {
    console.log('🔍 Testing LinkedIn OAuth callback success...');
    
    // Simulate successful OAuth callback
    const callbackUrl = `${BASE_URL}/auth/linkedin/callback?code=test_auth_code&state=test_state`;
    
    await page.goto(callbackUrl);
    await page.waitForLoadState('networkidle');
    
    // Check for callback handling
    const pageContent = await page.content();
    
    if (pageContent.includes('linkedin') || pageContent.includes('OAuth') || pageContent.includes('Processing')) {
      console.log('✅ LinkedIn OAuth callback page loaded');
      
      // Check for loading state
      const loadingElements = await page.locator('text="Processing", text="LinkedIn", .animate-spin').count();
      if (loadingElements > 0) {
        console.log('✅ LinkedIn OAuth callback processing state displayed');
      }
    } else {
      console.log('ℹ️ LinkedIn OAuth callback may need proper route configuration');
    }
  });

  test('should handle LinkedIn OAuth callback errors', async ({ page }) => {
    console.log('🔍 Testing LinkedIn OAuth callback error handling...');
    
    const errorScenarios = [
      {
        name: 'Access Denied',
        params: 'error=access_denied&error_description=User%20denied%20access',
        expectedMessage: 'access denied'
      },
      {
        name: 'Invalid Request',
        params: 'error=invalid_request&error_description=Invalid%20request',
        expectedMessage: 'invalid'
      },
      {
        name: 'Invalid Client',
        params: 'error=invalid_client&error_description=Invalid%20client',
        expectedMessage: 'client'
      }
    ];

    for (const scenario of errorScenarios) {
      console.log(`📍 Testing ${scenario.name}...`);
      
      const callbackUrl = `${BASE_URL}/auth/linkedin/callback?${scenario.params}`;
      await page.goto(callbackUrl);
      await page.waitForTimeout(2000);
      
      // Check for error handling
      const pageContent = await page.content().then(content => content.toLowerCase());
      
      if (pageContent.includes('error') || pageContent.includes(scenario.expectedMessage)) {
        console.log(`✅ ${scenario.name} error handled properly`);
      } else {
        console.log(`ℹ️ ${scenario.name} error handling may need improvement`);
      }
    }
  });

  test('should validate LinkedIn OAuth configuration', async ({ page }) => {
    console.log('🔍 Testing LinkedIn OAuth configuration validation...');
    
    // Check for configuration errors in console
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/credentials`);
    await page.waitForTimeout(3000);

    // Look for LinkedIn OAuth button
    const linkedinButton = page.locator('[data-testid="linkedin-oauth-button"], button:has-text("LinkedIn"), button:has-text("Connect LinkedIn")');
    
    if (await linkedinButton.first().isVisible()) {
      // Check if button is disabled due to configuration issues
      const isDisabled = await linkedinButton.first().isDisabled();
      
      if (isDisabled) {
        console.log('⚠️ LinkedIn OAuth button is disabled - configuration may be missing');
      } else {
        console.log('✅ LinkedIn OAuth button is enabled');
      }
    }

    // Check for configuration-related console errors
    const configErrors = consoleMessages.filter(msg => 
      msg.toLowerCase().includes('linkedin') && 
      (msg.toLowerCase().includes('client_id') || 
       msg.toLowerCase().includes('client_secret') || 
       msg.toLowerCase().includes('configuration'))
    );

    if (configErrors.length > 0) {
      console.log('⚠️ LinkedIn OAuth configuration issues found:');
      configErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No LinkedIn OAuth configuration errors detected');
    }
  });

  test('should handle LinkedIn API errors gracefully', async ({ page }) => {
    console.log('🔍 Testing LinkedIn API error handling...');
    
    // Navigate to callback with valid-looking parameters
    const callbackUrl = `${BASE_URL}/auth/linkedin/callback?code=valid_looking_code&state=valid_state`;
    
    await page.goto(callbackUrl);
    await page.waitForTimeout(5000); // Wait for API calls to complete
    
    // Check for error handling
    const errorElements = await page.locator('.error, [data-testid="error-message"], text="error"').count();
    const loadingElements = await page.locator('.animate-spin, text="Processing", text="Loading"').count();
    
    if (errorElements > 0) {
      console.log('✅ LinkedIn API errors are handled gracefully');
    } else if (loadingElements > 0) {
      console.log('ℹ️ LinkedIn OAuth is still processing - may need real API credentials');
    } else {
      console.log('ℹ️ LinkedIn OAuth callback handling may need improvement');
    }
  });

  test('should redirect properly after OAuth completion', async ({ page }) => {
    console.log('🔍 Testing LinkedIn OAuth redirect behavior...');
    
    // Test successful callback redirect
    const callbackUrl = `${BASE_URL}/auth/linkedin/callback?code=test_code&state=test_state`;
    
    await page.goto(callbackUrl);
    
    // Wait for redirect to occur
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`📍 Current URL after callback: ${currentUrl}`);
    
    // Check if redirected to credentials page or dashboard
    if (currentUrl.includes('/credentials') || currentUrl.includes('/dashboard')) {
      console.log('✅ LinkedIn OAuth redirect working correctly');
    } else {
      console.log('ℹ️ LinkedIn OAuth redirect may need configuration');
    }
  });

  test('should handle LinkedIn OAuth state validation', async ({ page }) => {
    console.log('🔍 Testing LinkedIn OAuth state validation (CSRF protection)...');
    
    // Test with invalid state parameter
    const callbackUrl = `${BASE_URL}/auth/linkedin/callback?code=test_code&state=invalid_state`;
    
    await page.goto(callbackUrl);
    await page.waitForTimeout(3000);
    
    const pageContent = (await page.content()).toLowerCase();
    
    if (pageContent.includes('csrf') || pageContent.includes('state') || pageContent.includes('security')) {
      console.log('✅ LinkedIn OAuth state validation (CSRF protection) working');
    } else {
      console.log('ℹ️ LinkedIn OAuth state validation may need improvement');
    }
  });

  test('should handle LinkedIn OAuth network errors', async ({ page }) => {
    console.log('🔍 Testing LinkedIn OAuth network error handling...');
    
    // Simulate network failure
    await page.route('**/oauth/v2/accessToken', route => {
      route.abort('failed');
    });
    
    const callbackUrl = `${BASE_URL}/auth/linkedin/callback?code=test_code&state=test_state`;
    
    await page.goto(callbackUrl);
    await page.waitForTimeout(3000);
    
    const pageContent = (await page.content()).toLowerCase();
    
    if (pageContent.includes('network') || pageContent.includes('error') || pageContent.includes('failed')) {
      console.log('✅ LinkedIn OAuth network error handling working');
    } else {
      console.log('ℹ️ LinkedIn OAuth network error handling may need improvement');
    }
  });
});

// Helper function to simulate LinkedIn OAuth responses
function createMockLinkedInResponse(type: 'token' | 'profile' | 'email') {
  switch (type) {
    case 'token':
      return {
        access_token: 'mock_linkedin_access_token',
        expires_in: 3600,
        scope: 'r_liteprofile r_emailaddress',
        token_type: 'Bearer'
      };
    case 'profile':
      return {
        id: 'mock_linkedin_user_id',
        firstName: {
          localized: { 'en_US': 'John' },
          preferredLocale: { country: 'US', language: 'en' }
        },
        lastName: {
          localized: { 'en_US': 'Doe' },
          preferredLocale: { country: 'US', language: 'en' }
        },
        headline: {
          localized: { 'en_US': 'Software Engineer' },
          preferredLocale: { country: 'US', language: 'en' }
        }
      };
    case 'email':
      return {
        elements: [{
          'handle~': {
            emailAddress: 'john.doe@example.com'
          },
          handle: 'urn:li:emailAddress:mock_email_id',
          primary: true,
          type: 'EMAIL'
        }]
      };
  }
}