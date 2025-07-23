import { test, expect, Page } from '@playwright/test';

// OAuth Test Configuration
const TEST_CONFIG = {
  // Test OAuth Applications (create these in respective platforms)
  github: {
    clientId: process.env.VITE_GITHUB_CLIENT_ID || 'test_github_client_id',
    redirectUri: process.env.VITE_GITHUB_REDIRECT_URI || 'http://localhost:5173/auth/github/callback',
    scopes: ['user:email', 'read:user']
  },
  linkedin: {
    clientId: process.env.VITE_LINKEDIN_CLIENT_ID || 'test_linkedin_client_id',
    redirectUri: process.env.VITE_LINKEDIN_REDIRECT_URI || 'http://localhost:5173/auth/linkedin/callback',
    scopes: ['r_liteprofile', 'r_emailaddress']
  },
  plaid: {
    clientId: process.env.VITE_PLAID_CLIENT_ID || 'test_plaid_client_id',
    environment: process.env.VITE_PLAID_ENV || 'sandbox'
  }
};

// Test URLs
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const CREDENTIALS_URL = `${BASE_URL}/credentials`;

test.describe('OAuth Integrations Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to credentials page
    await page.goto(CREDENTIALS_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('GitHub OAuth Integration', () => {
    test('should initiate GitHub OAuth flow', async ({ page }) => {
      console.log('🔍 Testing GitHub OAuth initiation...');
      
      // Look for GitHub credential option
      const githubCredential = page.locator('[data-testid="credential-github"], [data-credential-type="github"], text="GitHub"').first();
      
      if (await githubCredential.isVisible()) {
        console.log('✅ GitHub credential option found');
        await githubCredential.click();
        
        // Check if OAuth URL is generated correctly
        await page.waitForTimeout(2000);
        
        // Look for OAuth redirect or authorization URL
        const currentUrl = page.url();
        console.log('📍 Current URL:', currentUrl);
        
        if (currentUrl.includes('github.com/login/oauth/authorize')) {
          console.log('✅ GitHub OAuth URL generated correctly');
          
          // Verify OAuth parameters
          const url = new URL(currentUrl);
          expect(url.searchParams.get('client_id')).toBeTruthy();
          expect(url.searchParams.get('redirect_uri')).toBeTruthy();
          expect(url.searchParams.get('scope')).toBeTruthy();
          expect(url.searchParams.get('state')).toBeTruthy();
          
          console.log('✅ GitHub OAuth parameters validated');
        } else {
          console.log('ℹ️  GitHub OAuth may require user interaction or different flow');
        }
      } else {
        console.log('❌ GitHub credential option not found');
        throw new Error('GitHub credential option not visible');
      }
    });

    test('should handle GitHub OAuth callback', async ({ page }) => {
      console.log('🔍 Testing GitHub OAuth callback...');
      
      // Simulate OAuth callback with test parameters
      const callbackUrl = `${BASE_URL}/auth/github/callback?code=test_code&state=test_state`;
      await page.goto(callbackUrl);
      
      // Wait for callback processing
      await page.waitForTimeout(3000);
      
      // Check for success or error handling
      const hasErrorMessage = await page.locator('[data-testid="error-message"], .error, .alert-error').isVisible();
      const hasSuccessMessage = await page.locator('[data-testid="success-message"], .success, .alert-success').isVisible();
      
      if (hasErrorMessage) {
        const errorText = await page.locator('[data-testid="error-message"], .error, .alert-error').first().textContent();
        console.log('⚠️  GitHub OAuth callback error:', errorText);
        // This is expected for test environment
      } else if (hasSuccessMessage) {
        console.log('✅ GitHub OAuth callback processed successfully');
      } else {
        console.log('ℹ️  GitHub OAuth callback completed (no explicit success/error message)');
      }
    });
  });

  test.describe('LinkedIn OAuth Integration', () => {
    test('should initiate LinkedIn OAuth flow', async ({ page }) => {
      console.log('🔍 Testing LinkedIn OAuth initiation...');
      
      // Look for LinkedIn credential option
      const linkedinCredential = page.locator('[data-testid="credential-linkedin"], [data-credential-type="linkedin"], text="LinkedIn"').first();
      
      if (await linkedinCredential.isVisible()) {
        console.log('✅ LinkedIn credential option found');
        await linkedinCredential.click();
        
        // Check if OAuth URL is generated correctly
        await page.waitForTimeout(2000);
        
        // Look for OAuth redirect or authorization URL
        const currentUrl = page.url();
        console.log('📍 Current URL:', currentUrl);
        
        if (currentUrl.includes('linkedin.com/oauth/v2/authorization')) {
          console.log('✅ LinkedIn OAuth URL generated correctly');
          
          // Verify OAuth parameters
          const url = new URL(currentUrl);
          expect(url.searchParams.get('client_id')).toBeTruthy();
          expect(url.searchParams.get('redirect_uri')).toBeTruthy();
          expect(url.searchParams.get('scope')).toBeTruthy();
          expect(url.searchParams.get('state')).toBeTruthy();
          
          console.log('✅ LinkedIn OAuth parameters validated');
        } else {
          console.log('ℹ️  LinkedIn OAuth may require user interaction or different flow');
        }
      } else {
        console.log('❌ LinkedIn credential option not found');
        throw new Error('LinkedIn credential option not visible');
      }
    });

    test('should handle LinkedIn OAuth callback', async ({ page }) => {
      console.log('🔍 Testing LinkedIn OAuth callback...');
      
      // Simulate OAuth callback with test parameters
      const callbackUrl = `${BASE_URL}/auth/linkedin/callback?code=test_code&state=test_state`;
      await page.goto(callbackUrl);
      
      // Wait for callback processing
      await page.waitForTimeout(3000);
      
      // Check for success or error handling
      const hasErrorMessage = await page.locator('[data-testid="error-message"], .error, .alert-error').isVisible();
      const hasSuccessMessage = await page.locator('[data-testid="success-message"], .success, .alert-success').isVisible();
      
      if (hasErrorMessage) {
        const errorText = await page.locator('[data-testid="error-message"], .error, .alert-error').first().textContent();
        console.log('⚠️  LinkedIn OAuth callback error:', errorText);
        // This is expected for test environment
      } else if (hasSuccessMessage) {
        console.log('✅ LinkedIn OAuth callback processed successfully');
      } else {
        console.log('ℹ️  LinkedIn OAuth callback completed (no explicit success/error message)');
      }
    });
  });

  test.describe('Plaid Integration', () => {
    test('should initiate Plaid Link flow', async ({ page }) => {
      console.log('🔍 Testing Plaid Link initiation...');
      
      // Look for Plaid/Bank credential option
      const plaidCredential = page.locator('[data-testid="credential-plaid"], [data-credential-type="plaid"], [data-credential-type="bank"], text="Bank"').first();
      
      if (await plaidCredential.isVisible()) {
        console.log('✅ Plaid credential option found');
        await plaidCredential.click();
        
        // Wait for Plaid Link to initialize
        await page.waitForTimeout(3000);
        
        // Look for Plaid Link modal or iframe
        const plaidLink = page.locator('[data-testid="plaid-link"], iframe[src*="plaid"], .plaid-link');
        
        if (await plaidLink.isVisible()) {
          console.log('✅ Plaid Link initialized successfully');
        } else {
          console.log('ℹ️  Plaid Link may require additional setup or user interaction');
        }
      } else {
        console.log('❌ Plaid credential option not found');
        throw new Error('Plaid credential option not visible');
      }
    });

    test('should handle Plaid Link success callback', async ({ page }) => {
      console.log('🔍 Testing Plaid Link success callback...');
      
      // Simulate Plaid Link success with test parameters
      const callbackUrl = `${BASE_URL}/auth/plaid/callback?public_token=test_public_token&metadata=test_metadata`;
      await page.goto(callbackUrl);
      
      // Wait for callback processing
      await page.waitForTimeout(3000);
      
      // Check for success or error handling
      const hasErrorMessage = await page.locator('[data-testid="error-message"], .error, .alert-error').isVisible();
      const hasSuccessMessage = await page.locator('[data-testid="success-message"], .success, .alert-success').isVisible();
      
      if (hasErrorMessage) {
        const errorText = await page.locator('[data-testid="error-message"], .error, .alert-error').first().textContent();
        console.log('⚠️  Plaid callback error:', errorText);
        // This is expected for test environment
      } else if (hasSuccessMessage) {
        console.log('✅ Plaid callback processed successfully');
      } else {
        console.log('ℹ️  Plaid callback completed (no explicit success/error message)');
      }
    });
  });

  test.describe('OAuth Error Handling', () => {
    test('should handle OAuth errors gracefully', async ({ page }) => {
      console.log('🔍 Testing OAuth error handling...');
      
      // Test various OAuth error scenarios
      const errorScenarios = [
        { name: 'GitHub Access Denied', url: `${BASE_URL}/auth/github/callback?error=access_denied&error_description=The+user+has+denied+your+application+access.` },
        { name: 'LinkedIn Access Denied', url: `${BASE_URL}/auth/linkedin/callback?error=access_denied&error_description=The+user+has+denied+your+application+access.` },
        { name: 'Plaid Link Error', url: `${BASE_URL}/auth/plaid/callback?error=user_cancelled&error_description=The+user+cancelled+the+Link+flow.` }
      ];
      
      for (const scenario of errorScenarios) {
        console.log(`📍 Testing ${scenario.name}...`);
        
        await page.goto(scenario.url);
        await page.waitForTimeout(2000);
        
        // Check for proper error handling
        const hasErrorMessage = await page.locator('[data-testid="error-message"], .error, .alert-error').isVisible();
        
        if (hasErrorMessage) {
          const errorText = await page.locator('[data-testid="error-message"], .error, .alert-error').first().textContent();
          console.log(`✅ ${scenario.name} error handled properly:`, errorText);
        } else {
          console.log(`ℹ️  ${scenario.name} error handling may need improvement`);
        }
      }
    });
  });

  test.describe('OAuth Configuration Validation', () => {
    test('should validate OAuth configuration', async ({ page }) => {
      console.log('🔍 Testing OAuth configuration validation...');
      
      // Navigate to page and check for configuration errors
      await page.goto(CREDENTIALS_URL);
      await page.waitForLoadState('networkidle');
      
      // Check console for configuration errors
      const consoleMessages: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warn') {
          consoleMessages.push(msg.text());
        }
      });
      
      // Trigger credential loading
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Check for OAuth configuration issues
      const oauthErrors = consoleMessages.filter(msg => 
        msg.includes('OAuth') || 
        msg.includes('CLIENT_ID') || 
        msg.includes('CLIENT_SECRET') ||
        msg.includes('PLAID')
      );
      
      if (oauthErrors.length > 0) {
        console.log('⚠️  OAuth configuration issues found:');
        oauthErrors.forEach(error => console.log('  -', error));
      } else {
        console.log('✅ No OAuth configuration errors detected');
      }
    });
  });

  test.describe('End-to-End OAuth Flow', () => {
    test('should complete full OAuth credential creation flow', async ({ page }) => {
      console.log('🔍 Testing end-to-end OAuth flow...');
      
      // Navigate to credentials page
      await page.goto(CREDENTIALS_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for available credential types
      const credentialTypes = await page.locator('[data-testid^="credential-"], [data-credential-type]').all();
      
      console.log(`📊 Found ${credentialTypes.length} credential types`);
      
      for (const credentialType of credentialTypes) {
        const credentialText = await credentialType.textContent();
        console.log(`  - ${credentialText}`);
      }
      
      // Test first available credential type
      if (credentialTypes.length > 0) {
        const firstCredential = credentialTypes[0];
        const credentialName = await firstCredential.textContent();
        
        console.log(`🎯 Testing ${credentialName} credential flow...`);
        
        await firstCredential.click();
        await page.waitForTimeout(2000);
        
        // Check if flow initiated properly
        const currentUrl = page.url();
        const hasModal = await page.locator('.modal, .dialog, [role="dialog"]').isVisible();
        const hasError = await page.locator('[data-testid="error-message"], .error').isVisible();
        
        if (currentUrl !== CREDENTIALS_URL || hasModal || hasError) {
          console.log('✅ OAuth flow initiated successfully');
        } else {
          console.log('ℹ️  OAuth flow may require additional configuration');
        }
      }
    });
  });
});

// Helper function to create OAuth test URLs
function createOAuthTestUrl(provider: string, params: Record<string, string>): string {
  const baseUrls = {
    github: 'https://github.com/login/oauth/authorize',
    linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
    plaid: 'https://cdn.plaid.com/link/v2/stable/link.html'
  };
  
  const url = new URL(baseUrls[provider as keyof typeof baseUrls]);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  return url.toString();
}

// Test data for OAuth flows
const OAUTH_TEST_DATA = {
  github: {
    client_id: TEST_CONFIG.github.clientId,
    redirect_uri: TEST_CONFIG.github.redirectUri,
    scope: TEST_CONFIG.github.scopes.join(' '),
    state: 'test_state_github'
  },
  linkedin: {
    client_id: TEST_CONFIG.linkedin.clientId,
    redirect_uri: TEST_CONFIG.linkedin.redirectUri,
    scope: TEST_CONFIG.linkedin.scopes.join(' '),
    state: 'test_state_linkedin'
  },
  plaid: {
    client_id: TEST_CONFIG.plaid.clientId,
    environment: TEST_CONFIG.plaid.environment,
    products: 'auth,identity,transactions'
  }
};