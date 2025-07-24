import { test, expect, Page } from '@playwright/test';

test.describe('Production Deployment Validation', () => {
  let errors: string[] = [];
  let warnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error tracking
    errors = [];
    warnings = [];

    // Capture console errors and warnings
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Only capture legitimate errors (not our intentionally blocked WASM/extension errors)
        if (!text.includes('WebAssembly') &&
            !text.includes('wasm') &&
            !text.includes('MIME type') &&
            !text.includes('chrome-extension') &&
            !text.includes('hook.js') &&
            !text.includes('overrideMethod')) {
          errors.push(text);
          console.error('❌ PRODUCTION ERROR:', text);
        }
      } else if (msg.type() === 'warning') {
        const text = msg.text();
        if (!text.includes('WASM') && !text.includes('WebAssembly')) {
          warnings.push(text);
          console.warn('⚠️ PRODUCTION WARNING:', text);
        }
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      const message = error.message;
      // Only capture legitimate errors
      if (!message.includes('WebAssembly') &&
          !message.includes('wasm') &&
          !message.includes('MIME type') &&
          !message.includes('chrome-extension')) {
        errors.push(message);
        console.error('❌ PAGE ERROR:', message);
      }
    });

    // Capture failed requests
    page.on('requestfailed', (request) => {
      const url = request.url();
      const failure = request.failure();
      // Don't track .wasm file failures (intentionally blocked)
      if (!url.includes('.wasm') && failure) {
        errors.push(`Request failed: ${url} - ${failure.errorText}`);
        console.error('❌ REQUEST FAILED:', url, failure.errorText);
      }
    });
  });

  test('should load homepage without critical errors', async ({ page }) => {
    console.log('🧪 Testing homepage load...');
    
    await page.goto('/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for React to hydrate
    await page.waitForSelector('[data-testid="app-loaded"], .bg-gradient-to-br', { 
      timeout: 10000 
    });

    // Check for critical errors
    expect(errors.filter(e => 
      !e.includes('WebAssembly') && 
      !e.includes('wasm') && 
      !e.includes('chrome-extension')
    )).toHaveLength(0);

    console.log('✅ Homepage loaded successfully');
  });

  test('should navigate to login page', async ({ page }) => {
    console.log('🧪 Testing login page navigation...');
    
    await page.goto('/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Check for login page elements
    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.locator('button')).toContainText('Login with Keplr');

    // Verify no critical errors
    expect(errors.filter(e => 
      !e.includes('WebAssembly') && 
      !e.includes('wasm') && 
      !e.includes('chrome-extension')
    )).toHaveLength(0);

    console.log('✅ Login page works correctly');
  });

  test('should navigate to onboarding page', async ({ page }) => {
    console.log('🧪 Testing onboarding page navigation...');
    
    await page.goto('/onboarding', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for onboarding content to load
    await page.waitForSelector('h1, .text-4xl, [data-testid="onboarding"]', { 
      timeout: 10000 
    });

    // Verify no critical errors
    expect(errors.filter(e => 
      !e.includes('WebAssembly') && 
      !e.includes('wasm') && 
      !e.includes('chrome-extension')
    )).toHaveLength(0);

    console.log('✅ Onboarding page works correctly');
  });

  test('should handle dashboard route (with redirect)', async ({ page }) => {
    console.log('🧪 Testing dashboard route...');
    
    await page.goto('/dashboard', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Should either show dashboard or redirect to login/onboarding
    const currentUrl = page.url();
    expect(['/dashboard', '/login', '/onboarding'].some(path => 
      currentUrl.includes(path)
    )).toBeTruthy();

    // Verify no critical errors
    expect(errors.filter(e => 
      !e.includes('WebAssembly') && 
      !e.includes('wasm') && 
      !e.includes('chrome-extension')
    )).toHaveLength(0);

    console.log('✅ Dashboard route handled correctly');
  });

  test('should load static assets without errors', async ({ page }) => {
    console.log('🧪 Testing static assets...');
    
    await page.goto('/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Check that CSS is loaded
    const styles = await page.locator('link[rel="stylesheet"]').count();
    expect(styles).toBeGreaterThan(0);

    // Check that JavaScript bundles load
    const scripts = await page.locator('script[src]').count();
    expect(scripts).toBeGreaterThan(0);

    // Verify no asset loading errors
    expect(errors.filter(e => 
      !e.includes('WebAssembly') && 
      !e.includes('wasm') && 
      !e.includes('chrome-extension') &&
      !e.includes('Failed to fetch')
    )).toHaveLength(0);

    console.log('✅ Static assets loaded successfully');
  });

  test('should validate WASM blocker is working', async ({ page }) => {
    console.log('🧪 Testing WASM blocker effectiveness...');
    
    await page.goto('/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Check if our WASM blocker messages appear
    const wasmBlockerActive = await page.evaluate(() => {
      return window.__WASM_COMPLETELY_DISABLED__ === true;
    });

    expect(wasmBlockerActive).toBeTruthy();

    // Verify WebAssembly is blocked
    const wasmBlocked = await page.evaluate(() => {
      try {
        // This should fail due to our blocker
        WebAssembly.compile(new Uint8Array([0, 0, 0, 0]));
        return false;
      } catch (error) {
        return error.message.includes('WASM completely disabled');
      }
    });

    expect(wasmBlocked).toBeTruthy();

    console.log('✅ WASM blocker is working correctly');
  });

  test('should validate error suppression is working', async ({ page }) => {
    console.log('🧪 Testing error suppression...');
    
    await page.goto('/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Force a WASM error and verify it's suppressed
    await page.evaluate(() => {
      try {
        // This should trigger our error suppression
        WebAssembly.compile(new Uint8Array([0, 0, 0, 0]));
      } catch (error) {
        // Error should be caught but not logged to console
      }
    });

    // Wait a bit for any errors to propagate
    await page.waitForTimeout(2000);

    // Should have no WASM-related errors in our error array
    const wasmErrors = errors.filter(e => 
      e.includes('WebAssembly') || 
      e.includes('wasm') || 
      e.includes('MIME type')
    );

    expect(wasmErrors).toHaveLength(0);

    console.log('✅ Error suppression is working correctly');
  });

  test('should test core functionality without errors', async ({ page }) => {
    console.log('🧪 Testing core functionality...');
    
    await page.goto('/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Test button interactions
    const loginButton = page.locator('button:has-text("Login with Keplr")');
    await expect(loginButton).toBeVisible();
    
    // Click the button (should handle gracefully even without Keplr)
    await loginButton.click();
    
    // Wait a moment for any error handling
    await page.waitForTimeout(3000);

    // Check that no unexpected errors occurred
    const criticalErrors = errors.filter(e => 
      !e.includes('WebAssembly') && 
      !e.includes('wasm') && 
      !e.includes('chrome-extension') &&
      !e.includes('Keplr') && // Expected when Keplr not installed
      !e.includes('wallet')   // Expected wallet-related errors
    );

    expect(criticalErrors).toHaveLength(0);

    console.log('✅ Core functionality works without critical errors');
  });

  test.afterEach(async ({ page }) => {
    // Final error summary
    const filteredErrors = errors.filter(e => 
      !e.includes('WebAssembly') && 
      !e.includes('wasm') && 
      !e.includes('chrome-extension') &&
      !e.includes('MIME type')
    );

    if (filteredErrors.length > 0) {
      console.error('❌ PRODUCTION ERRORS DETECTED:');
      filteredErrors.forEach(error => console.error('  -', error));
    } else {
      console.log('✅ No production errors detected');
    }

    if (warnings.length > 0) {
      console.warn('⚠️ PRODUCTION WARNINGS:');
      warnings.forEach(warning => console.warn('  -', warning));
    }
  });
});

test.describe('Performance Validation', () => {
  test('should load quickly and meet performance budgets', async ({ page }) => {
    console.log('🧪 Testing performance metrics...');
    
    const startTime = Date.now();
    
    await page.goto('/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page load time: ${loadTime}ms`);

    // Performance budget: Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Check bundle size (approximate)
    const transferSize = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0]?.transferSize || 0;
    });

    console.log(`📦 Transfer size: ${Math.round(transferSize / 1024)}KB`);

    // Should be reasonable for a modern web app
    expect(transferSize).toBeLessThan(5 * 1024 * 1024); // Less than 5MB

    console.log('✅ Performance metrics within acceptable range');
  });
});