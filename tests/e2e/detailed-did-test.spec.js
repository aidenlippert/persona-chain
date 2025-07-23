import { test, expect } from '@playwright/test';

test.describe('Detailed DID Service Testing', () => {
  test('should thoroughly test DID service functionality and error detection', async ({ page }) => {
    let consoleMessages = [];
    let consoleErrors = [];
    let networkRequests = [];
    let networkResponses = [];

    // Capture all console activity
    page.on('console', msg => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };
      consoleMessages.push(message);
      
      if (msg.type() === 'error') {
        consoleErrors.push(message);
      }
      
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      const errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      consoleErrors.push(errorInfo);
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Capture network activity for API calls
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    });

    page.on('response', response => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      });
    });

    console.log('🚀 Starting detailed DID service test...');
    
    // Navigate to the application
    await page.goto('https://wallet-fbp6e55nf-aiden-lipperts-projects.vercel.app/');
    await page.waitForLoadState('networkidle');
    
    console.log('📱 Application loaded, checking for onboarding entry points...');

    // Take initial screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/detailed-01-landing.png',
      fullPage: true 
    });

    // Look for Get Started or similar buttons (use .first() to handle multiple matches)
    const getStartedButtons = [
      page.locator('button:has-text("Get Started")').first(),
      page.locator('a:has-text("Get Started")').first(),
      page.locator('button:has-text("Start")').first(),
      page.locator('button:has-text("Create")').first(),
      page.locator('button:has-text("Sign Up")').first(),
      page.locator('[data-testid*="start"], [data-testid*="create"]').first(),
      page.locator('.cta-button, .primary-button, .get-started').first()
    ];

    let foundEntry = false;
    for (const button of getStartedButtons) {
      try {
        if (await button.isVisible()) {
          const buttonText = await button.textContent();
          console.log(`✅ Found entry button: ${buttonText}`);
          await button.click();
          foundEntry = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️  Button check failed: ${error.message}`);
      }
    }

    if (!foundEntry) {
      console.log('⚠️  No obvious entry point found, checking page content...');
      const pageText = await page.textContent('body');
      console.log('Page content preview:', pageText.substring(0, 500));
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'tests/screenshots/detailed-02-after-click.png',
      fullPage: true 
    });

    // Look for DID-related elements and functionality
    console.log('🔍 Searching for DID-related functionality...');
    
    // Check if there are any DID-related elements visible
    const didElements = [
      page.locator('text=/DID|digital.?identity|decentralized/i'),
      page.locator('[data-testid*="did"], [class*="did"]'),
      page.locator('button:has-text("Create Identity")'),
      page.locator('button:has-text("Generate DID")'),
      page.locator('input[placeholder*="identity"], input[placeholder*="name"]')
    ];

    for (const element of didElements) {
      if (await element.isVisible()) {
        const text = await element.textContent().catch(() => 'N/A');
        console.log(`📋 Found DID element: ${text}`);
      }
    }

    // Try to trigger DID generation if possible
    const identityForm = page.locator('form').first();
    const nameInput = page.locator('input[type="text"]').first();
    const createButton = page.locator('button').filter({ hasText: /create|generate|continue|next/i }).first();

    if (await nameInput.isVisible()) {
      console.log('📝 Filling out identity form...');
      await nameInput.fill('Test User for DID Generation');
    }

    if (await createButton.isVisible()) {
      console.log('🔄 Attempting to trigger identity creation...');
      await createButton.click();
      
      // Wait for any DID generation process
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: 'tests/screenshots/detailed-03-after-creation-attempt.png',
        fullPage: true 
      });
    }

    // Check browser console for the specific error we're looking for
    console.log('\n=== DID SERVICE ERROR ANALYSIS ===');
    
    const didServiceError = consoleErrors.find(error => 
      error.message && error.message.includes('didService.generateDID is not a function')
    );
    
    const identityCreationError = consoleErrors.find(error =>
      error.message && error.message.includes('Failed to create your digital identity')
    );

    if (didServiceError) {
      console.log('❌ CRITICAL ERROR DETECTED: didService.generateDID is not a function');
      console.log('Error details:', didServiceError);
    } else {
      console.log('✅ No "didService.generateDID is not a function" error detected');
    }

    if (identityCreationError) {
      console.log('⚠️  Identity creation error detected:', identityCreationError.message);
    } else {
      console.log('✅ No identity creation failure detected');
    }

    // Check for JavaScript runtime availability
    const runtimeCheck = await page.evaluate(() => {
      const results = {
        didServiceExists: typeof window.didService !== 'undefined',
        didServiceType: typeof window.didService,
        hasGenerateDID: window.didService?.generateDID !== undefined,
        generateDIDType: typeof window.didService?.generateDID,
        globalKeys: Object.keys(window).filter(key => 
          key.toLowerCase().includes('did') || 
          key.toLowerCase().includes('identity')
        ),
        errors: []
      };

      // Try to call DID service if it exists
      if (window.didService) {
        try {
          if (typeof window.didService.generateDID === 'function') {
            results.generateDIDCallable = true;
          } else {
            results.generateDIDCallable = false;
            results.errors.push('generateDID is not a function');
          }
        } catch (error) {
          results.errors.push(`Error accessing generateDID: ${error.message}`);
        }
      }

      return results;
    });

    console.log('\n=== RUNTIME DID SERVICE CHECK ===');
    console.log('DID Service exists:', runtimeCheck.didServiceExists);
    console.log('DID Service type:', runtimeCheck.didServiceType);
    console.log('Has generateDID method:', runtimeCheck.hasGenerateDID);
    console.log('generateDID type:', runtimeCheck.generateDIDType);
    console.log('DID-related globals:', runtimeCheck.globalKeys);
    console.log('Runtime errors:', runtimeCheck.errors);

    // Final analysis
    console.log('\n=== COMPREHENSIVE TEST RESULTS ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Network requests made: ${networkRequests.length}`);

    // Check for specific error patterns
    const hasTargetError = consoleErrors.some(error => 
      error.message && error.message.includes('didService.generateDID is not a function')
    );

    if (hasTargetError) {
      console.log('\n❌ FAILURE: The "didService.generateDID is not a function" error is still present!');
    } else {
      console.log('\n✅ SUCCESS: No "didService.generateDID is not a function" error detected!');
    }

    // Log all errors for debugging
    if (consoleErrors.length > 0) {
      console.log('\n🐛 All Console Errors:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message || error.text}`);
      });
    }

    // Take final screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/detailed-04-final.png',
      fullPage: true 
    });

    // Assert that the critical error is NOT present
    expect(hasTargetError).toBeFalsy();
  });
});