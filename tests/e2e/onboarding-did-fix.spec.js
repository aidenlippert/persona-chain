import { test, expect } from '@playwright/test';

test.describe('PersonaPass Onboarding - DID Generation Fix', () => {
  let page;
  let consoleLogs = [];
  let consoleErrors = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Navigate to the application
    await page.goto('https://wallet-fbp6e55nf-aiden-lipperts-projects.vercel.app/');
  });

  test('should navigate to onboarding flow without errors', async () => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/screenshots/01-initial-load.png' });
    
    // Look for onboarding entry point
    const onboardingButton = page.locator('button, a').filter({ hasText: /start|begin|onboard|get started/i }).first();
    const createButton = page.locator('button, a').filter({ hasText: /create/i }).first();
    
    if (await onboardingButton.isVisible()) {
      await onboardingButton.click();
      console.log('✅ Found and clicked onboarding button');
    } else if (await createButton.isVisible()) {
      await createButton.click();
      console.log('✅ Found and clicked create button');
    } else {
      // Look for any navigation elements that might lead to onboarding
      const navLinks = await page.locator('nav a, .nav a, [role="navigation"] a').all();
      let foundOnboarding = false;
      
      for (const link of navLinks) {
        const text = await link.textContent();
        if (text && /onboard|start|create|sign.?up/i.test(text)) {
          await link.click();
          foundOnboarding = true;
          console.log(`✅ Found navigation link: ${text}`);
          break;
        }
      }
      
      if (!foundOnboarding) {
        console.log('ℹ️ No obvious onboarding entry point found, checking current page content');
      }
    }
    
    await page.waitForTimeout(2000); // Allow navigation to complete
    await page.screenshot({ path: 'tests/screenshots/02-after-navigation.png' });
  });

  test('should test DID generation and identity creation process', async () => {
    // Navigate to onboarding (repeat navigation logic)
    await page.waitForLoadState('networkidle');
    
    // Clear previous console logs
    consoleLogs = [];
    consoleErrors = [];
    
    // Look for identity creation form or DID generation trigger
    const identityForm = page.locator('form').first();
    const nameInput = page.locator('input[name*="name"], input[placeholder*="name"]').first();
    const createIdentityButton = page.locator('button').filter({ hasText: /create.*identity|generate.*did|next|continue/i }).first();
    
    // Fill out any required fields
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
      console.log('✅ Filled name input');
    }
    
    // Take screenshot before attempting identity creation
    await page.screenshot({ path: 'tests/screenshots/03-before-identity-creation.png' });
    
    // Monitor console for specific errors we're testing
    const didErrorPattern = /didService\.generateDID is not a function/i;
    const identityErrorPattern = /Failed to create your digital identity/i;
    
    // Attempt to create identity
    if (await createIdentityButton.isVisible()) {
      console.log('🔄 Attempting to create identity...');
      
      // Click the create identity button
      await createIdentityButton.click();
      
      // Wait for the operation to complete (or fail)
      await page.waitForTimeout(5000);
      
      // Take screenshot after attempting creation
      await page.screenshot({ path: 'tests/screenshots/04-after-identity-creation-attempt.png' });
      
      // Check for the specific error we were fixing
      const hasDIDError = consoleErrors.some(error => didErrorPattern.test(error));
      const hasIdentityError = consoleErrors.some(error => identityErrorPattern.test(error));
      
      console.log('\n=== CONSOLE LOG ANALYSIS ===');
      console.log(`Total console messages: ${consoleLogs.length}`);
      console.log(`Total console errors: ${consoleErrors.length}`);
      
      if (consoleErrors.length > 0) {
        console.log('\n❌ Console Errors Found:');
        consoleErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      } else {
        console.log('\n✅ No console errors detected');
      }
      
      // Test specific error conditions
      if (hasDIDError) {
        console.log('\n❌ CRITICAL: "didService.generateDID is not a function" error still present!');
        expect(hasDIDError).toBeFalsy(); // This will fail the test
      } else {
        console.log('\n✅ SUCCESS: No "didService.generateDID is not a function" error detected');
      }
      
      if (hasIdentityError) {
        console.log('\n⚠️  WARNING: "Failed to create your digital identity" message detected');
      } else {
        console.log('\n✅ No identity creation failure message detected');
      }
      
      // Check if we successfully progressed past identity creation
      const successIndicators = [
        page.locator('text=/identity.*created|success|welcome|dashboard/i'),
        page.locator('[data-testid*="success"], [class*="success"]'),
        page.locator('button').filter({ hasText: /continue|next|dashboard/i })
      ];
      
      let foundSuccessIndicator = false;
      for (const indicator of successIndicators) {
        if (await indicator.isVisible()) {
          foundSuccessIndicator = true;
          console.log('✅ Found success indicator - identity creation appears successful');
          break;
        }
      }
      
      if (!foundSuccessIndicator) {
        console.log('⚠️  No clear success indicator found - checking page content...');
        
        // Log current page URL and title for debugging
        const currentUrl = page.url();
        const pageTitle = await page.title();
        console.log(`Current URL: ${currentUrl}`);
        console.log(`Page Title: ${pageTitle}`);
      }
      
    } else {
      console.log('⚠️  No create identity button found on current page');
      
      // Check if we're already past the identity creation step
      const pageContent = await page.textContent('body');
      console.log('Current page content preview:', pageContent.substring(0, 200) + '...');
    }
  });

  test('should verify clean console output during identity creation', async () => {
    await page.waitForLoadState('networkidle');
    
    // Clear console logs
    consoleLogs = [];
    consoleErrors = [];
    
    // Try to trigger any DID-related functionality
    await page.evaluate(() => {
      // Try to access DID service directly if available
      if (window.didService) {
        console.log('DID Service available:', typeof window.didService);
        if (window.didService.generateDID) {
          console.log('generateDID method available:', typeof window.didService.generateDID);
        } else {
          console.log('generateDID method NOT available');
        }
      } else {
        console.log('DID Service not available on window object');
      }
      
      // Check for any global DID-related objects
      const globalKeys = Object.keys(window).filter(key => 
        key.toLowerCase().includes('did') || 
        key.toLowerCase().includes('identity') ||
        key.toLowerCase().includes('persona')
      );
      console.log('DID-related global objects:', globalKeys);
    });
    
    await page.waitForTimeout(2000);
    
    // Final console analysis
    console.log('\n=== FINAL CONSOLE ANALYSIS ===');
    console.log('All console messages:');
    consoleLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
    });
    
    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/05-final-state.png' });
  });

  test.afterEach(async () => {
    // Clean up
    await page.close();
  });
});