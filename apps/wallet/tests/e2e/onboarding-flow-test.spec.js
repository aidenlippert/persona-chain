import { test, expect } from '@playwright/test';

test.describe('PersonaPass Onboarding Flow - Identity Creation', () => {
  test('should test the complete onboarding flow for identity creation', async ({ page }) => {
    let consoleMessages = [];
    let consoleErrors = [];

    // Capture console activity
    page.on('console', msg => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      consoleMessages.push(message);
      
      if (msg.type() === 'error') {
        consoleErrors.push(message);
      }
      
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
      consoleErrors.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    console.log('🚀 Testing PersonaPass onboarding flow...');
    
    // Navigate to the application
    await page.goto('https://wallet-fbp6e55nf-aiden-lipperts-projects.vercel.app/');
    await page.waitForLoadState('networkidle');
    
    console.log('📱 Application loaded, starting onboarding...');

    // Click Get Started to begin onboarding
    await page.locator('button:has-text("Get Started")').first().click();
    await page.waitForTimeout(2000);
    
    console.log('🎯 Entered onboarding flow, looking for identity creation...');
    await page.screenshot({ 
      path: 'tests/screenshots/onboarding-01-start.png',
      fullPage: true 
    });

    // Look for wallet connection or identity creation options
    const walletOptions = await page.locator('button, .wallet-option, [data-testid*="wallet"]').all();
    console.log(`Found ${walletOptions.length} wallet/identity options`);

    // Try to find identity creation flow
    const identityOptions = [
      page.locator('button:has-text("Create New Identity")'),
      page.locator('button:has-text("Create Identity")'),
      page.locator('button:has-text("New Identity")'),
      page.locator('button:has-text("Generate")'),
      page.locator('text="Create a new decentralized identity"'),
      page.locator('[data-testid*="create"], [data-testid*="identity"]')
    ];

    let foundIdentityCreation = false;
    for (const option of identityOptions) {
      try {
        if (await option.isVisible()) {
          const text = await option.textContent();
          console.log(`📋 Found identity option: ${text}`);
          await option.click();
          foundIdentityCreation = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (error) {
        // Continue checking other options
      }
    }

    if (!foundIdentityCreation) {
      console.log('⚠️  No direct identity creation found, checking for wallet-based flow...');
      
      // Check if we need to interact with wallet connection first
      const walletButton = page.locator('button').filter({ hasText: /connect|wallet|keplr|metamask/i }).first();
      if (await walletButton.isVisible()) {
        console.log('🔗 Found wallet connection option, trying to proceed...');
        const walletText = await walletButton.textContent();
        console.log(`Wallet button text: ${walletText}`);
        
        // For testing purposes, we'll click but expect it might not complete
        // since we don't have actual wallets installed
        await walletButton.click();
        await page.waitForTimeout(3000);
      }
    }

    await page.screenshot({ 
      path: 'tests/screenshots/onboarding-02-identity-step.png',
      fullPage: true 
    });

    // Look for identity form fields
    const identityFormElements = [
      page.locator('input[placeholder*="name"]'),
      page.locator('input[placeholder*="identity"]'),
      page.locator('input[type="text"]'),
      page.locator('form input')
    ];

    let foundForm = false;
    for (const element of identityFormElements) {
      try {
        if (await element.isVisible()) {
          console.log('📝 Found identity form field, filling it out...');
          await element.fill('Test User Identity');
          foundForm = true;
          break;
        }
      } catch (error) {
        // Continue checking
      }
    }

    // Look for create/generate buttons after form fill
    if (foundForm) {
      const createButtons = [
        page.locator('button:has-text("Create")'),
        page.locator('button:has-text("Generate")'),
        page.locator('button:has-text("Continue")'),
        page.locator('button:has-text("Next")'),
        page.locator('button[type="submit"]')
      ];

      for (const button of createButtons) {
        try {
          if (await button.isVisible()) {
            const buttonText = await button.textContent();
            console.log(`🔄 Attempting to create identity with button: ${buttonText}`);
            
            // Monitor for the specific error before clicking
            const errorsBefore = consoleErrors.length;
            
            await button.click();
            await page.waitForTimeout(5000); // Wait for DID generation process
            
            const errorsAfter = consoleErrors.length;
            console.log(`Console errors before: ${errorsBefore}, after: ${errorsAfter}`);
            
            break;
          }
        } catch (error) {
          console.log(`Button click failed: ${error.message}`);
        }
      }
    }

    await page.screenshot({ 
      path: 'tests/screenshots/onboarding-03-after-creation.png',
      fullPage: true 
    });

    // Check for success or error states
    const successIndicators = [
      page.locator('text=/success|created|welcome|dashboard/i'),
      page.locator('.success, .complete, .done'),
      page.locator('button:has-text("Continue to Dashboard")')
    ];

    const errorIndicators = [
      page.locator('text=/error|failed|problem/i'),
      page.locator('.error, .warning, .alert-error'),
      page.locator('text="Failed to create your digital identity"')
    ];

    let foundSuccess = false;
    let foundError = false;

    for (const indicator of successIndicators) {
      if (await indicator.isVisible()) {
        const text = await indicator.textContent();
        console.log(`✅ Success indicator found: ${text}`);
        foundSuccess = true;
        break;
      }
    }

    for (const indicator of errorIndicators) {
      if (await indicator.isVisible()) {
        const text = await indicator.textContent();
        console.log(`❌ Error indicator found: ${text}`);
        foundError = true;
        break;
      }
    }

    // Analyze console for specific DID errors
    console.log('\n=== ONBOARDING FLOW ANALYSIS ===');
    
    const didFunctionError = consoleErrors.find(error => 
      error.text && error.text.includes('didService.generateDID is not a function')
    );
    
    const identityFailureError = consoleErrors.find(error =>
      error.text && error.text.includes('Failed to create your digital identity')
    );

    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total console errors: ${consoleErrors.length}`);
    
    if (didFunctionError) {
      console.log('❌ CRITICAL: Found "didService.generateDID is not a function" error!');
      console.log('Error details:', didFunctionError);
    } else {
      console.log('✅ No "didService.generateDID is not a function" error detected');
    }

    if (identityFailureError) {
      console.log('⚠️  Found "Failed to create your digital identity" error');
      console.log('Error details:', identityFailureError);
    } else {
      console.log('✅ No identity creation failure message detected');
    }

    if (consoleErrors.length > 0) {
      console.log('\n🐛 All Console Errors During Onboarding:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.type}] ${error.text}`);
      });
    } else {
      console.log('\n✅ No console errors detected during onboarding flow');
    }

    // Check current page state
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log(`\nFinal state - URL: ${currentUrl}`);
    console.log(`Final state - Title: ${pageTitle}`);

    // Final runtime check for DID service
    const finalDIDCheck = await page.evaluate(() => {
      return {
        didServiceExists: typeof window.didService !== 'undefined',
        didServiceProperties: window.didService ? Object.keys(window.didService) : [],
        hasGenerateDID: window.didService?.generateDID !== undefined,
        generateDIDType: typeof window.didService?.generateDID
      };
    });

    console.log('\n=== FINAL DID SERVICE STATE ===');
    console.log('DID Service exists:', finalDIDCheck.didServiceExists);
    console.log('DID Service properties:', finalDIDCheck.didServiceProperties);
    console.log('Has generateDID method:', finalDIDCheck.hasGenerateDID);
    console.log('generateDID type:', finalDIDCheck.generateDIDType);

    await page.screenshot({ 
      path: 'tests/screenshots/onboarding-04-final.png',
      fullPage: true 
    });

    // The main assertion - the critical error should NOT be present
    expect(didFunctionError).toBeUndefined();
  });
});