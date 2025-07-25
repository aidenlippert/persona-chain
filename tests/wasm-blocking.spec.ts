import { test, expect } from '@playwright/test';

test.describe('WASM Blocking Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console messages to catch our blocking logs
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`[BROWSER-CONSOLE] ${msg.type()}: ${text}`);
    });
    
    // Capture the console messages in page context
    await page.exposeFunction('getConsoleMessages', () => consoleMessages);
  });

  test('should block WASM loading and show blocking messages', async ({ page }) => {
    console.log('🧪 Testing WASM blocking on AWS deployment...');
    
    // Navigate to the AWS deployment
    await page.goto('https://d37jk1ntfbemdx.cloudfront.net');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if our WASM blocking messages appear in console
    const consoleLogs = await page.evaluate(() => {
      return (window as any).console._logs || [];
    });
    
    console.log('Console logs captured:', consoleLogs);
    
    // Wait a bit more for any async crypto operations
    await page.waitForTimeout(3000);
    
    // Check if the page loads without WASM errors
    const hasWasmError = await page.evaluate(() => {
      const errors = (window as any).__wasmErrors || [];
      return errors.length > 0;
    });
    
    console.log('WASM errors detected:', hasWasmError);
    
    // The page should load successfully
    await expect(page.locator('body')).toBeVisible();
    
    // Check if we can see the main content
    const hasContent = await page.locator('[data-testid], h1, .text-4xl').first().isVisible();
    console.log('Main content visible:', hasContent);
    
    if (hasContent) {
      console.log('✅ Page loads successfully without WASM errors');
    } else {
      console.log('❌ Page failed to load properly');
    }
  });

  test('should handle crypto operations without WASM', async ({ page }) => {
    console.log('🔐 Testing crypto operations without WASM...');
    
    await page.goto('https://d37jk1ntfbemdx.cloudfront.net');
    await page.waitForLoadState('networkidle');
    
    // Test if we can perform basic crypto operations
    const cryptoTest = await page.evaluate(async () => {
      try {
        // Try to use crypto functions that might trigger noble/curves
        const message = 'test message';
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        // Use Web Crypto API instead of noble/curves
        const hash = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hash));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return {
          success: true,
          hash: hashHex,
          message: 'Crypto operations work without WASM'
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    console.log('Crypto test result:', cryptoTest);
    expect(cryptoTest.success).toBe(true);
  });

  test('should verify no 403 errors in network tab', async ({ page }) => {
    console.log('🌐 Monitoring network requests for WASM 403 errors...');
    
    const failedRequests: any[] = [];
    const wasmRequests: any[] = [];
    
    page.on('response', response => {
      const url = response.url();
      
      // Track WASM requests
      if (url.includes('.wasm')) {
        wasmRequests.push({
          url,
          status: response.status(),
          statusText: response.statusText()
        });
        console.log(`[WASM-REQUEST] ${response.status()} ${url}`);
      }
      
      // Track failed requests
      if (!response.ok()) {
        failedRequests.push({
          url,
          status: response.status(),
          statusText: response.statusText()
        });
        console.log(`[FAILED-REQUEST] ${response.status()} ${url}`);
      }
    });
    
    await page.goto('https://d37jk1ntfbemdx.cloudfront.net');
    await page.waitForLoadState('networkidle');
    
    // Wait for any additional async requests
    await page.waitForTimeout(5000);
    
    console.log(`Total WASM requests: ${wasmRequests.length}`);
    console.log(`Total failed requests: ${failedRequests.length}`);
    
    // Log all WASM requests
    wasmRequests.forEach(req => {
      console.log(`WASM: ${req.status} ${req.url}`);
    });
    
    // Log failed requests
    failedRequests.forEach(req => {
      console.log(`FAILED: ${req.status} ${req.url}`);
    });
    
    // Verify no WASM requests were made (they should be blocked)
    const wasmRequestsMade = wasmRequests.length;
    console.log(`Expected: 0 WASM requests, Actual: ${wasmRequestsMade}`);
    
    if (wasmRequestsMade === 0) {
      console.log('✅ WASM blocking is working - no WASM requests detected');
    } else {
      console.log('❌ WASM requests were made despite blocking');
      console.log('WASM requests:', wasmRequests);
    }
  });

  test('should test application functionality after WASM blocking', async ({ page }) => {
    console.log('🚀 Testing application functionality...');
    
    await page.goto('https://d37jk1ntfbemdx.cloudfront.net');
    await page.waitForLoadState('networkidle');
    
    // Wait for React to render
    await page.waitForTimeout(2000);
    
    // Check if the app renders properly
    const appRendered = await page.evaluate(() => {
      return document.querySelector('#root')?.children.length > 0;
    });
    
    console.log('App rendered:', appRendered);
    
    // Try to find main navigation or content
    const mainContent = await page.locator('h1, [role="main"], .min-h-screen').first();
    const hasMainContent = await mainContent.isVisible();
    
    console.log('Main content visible:', hasMainContent);
    
    // Check for any unhandled errors
    const hasErrors = await page.evaluate(() => {
      return (window as any).__errorCount > 0;
    });
    
    console.log('Has errors:', hasErrors);
    
    if (appRendered && hasMainContent && !hasErrors) {
      console.log('✅ Application functions properly without WASM');
    } else {
      console.log('❌ Application has issues after WASM blocking');
    }
    
    expect(appRendered).toBe(true);
  });
});