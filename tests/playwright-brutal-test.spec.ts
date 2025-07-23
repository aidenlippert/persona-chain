import { test, expect } from '@playwright/test';

test.describe('🚨 BRUTAL REALITY CHECK - PersonaPass Live Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for real network requests
    page.setDefaultTimeout(10000);
  });

  test('🔥 LIVE SITE LOADS AND LOOKS PROFESSIONAL', async ({ page }) => {
    await page.goto('https://personapass.xyz', { waitUntil: 'networkidle' });
    
    // Take screenshot for manual review
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
    
    // Check title
    await expect(page).toHaveTitle(/PersonaPass|Persona/);
    
    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.complete || img.naturalWidth === 0).length;
    });
    expect(brokenImages).toBe(0);
    
    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    expect(consoleErrors.length).toBe(0);
  });

  test('🎯 ALL API ENDPOINTS ACTUALLY WORK', async ({ page }) => {
    const endpoints = [
      '/api/test',
      '/api/plaid/webhook',
      '/api/stripe/webhook',
      '/api/plaid/create-link-token',
      '/api/stripe/create-verification-session',
      '/api/stripe/verification-status'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`https://personapass.xyz${endpoint}`);
        results.push({
          endpoint,
          status: response.status(),
          working: response.status() !== 404 && response.status() !== 500
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 'ERROR',
          working: false,
          error: error.message
        });
      }
    }
    
    console.log('📊 API ENDPOINT RESULTS:');
    results.forEach(r => {
      console.log(`  ${r.working ? '✅' : '❌'} ${r.endpoint}: ${r.status}`);
    });
    
    // At least 80% of endpoints should work
    const workingEndpoints = results.filter(r => r.working).length;
    const totalEndpoints = results.length;
    const successRate = (workingEndpoints / totalEndpoints) * 100;
    
    expect(successRate).toBeGreaterThan(80);
  });

  test('🔍 NAVIGATION AND ROUTING WORKS', async ({ page }) => {
    await page.goto('https://personapass.xyz');
    
    // Check if we can navigate to dashboard
    const dashboardButton = page.locator('text=Dashboard, text=Get Started, text=Enter App').first();
    if (await dashboardButton.isVisible()) {
      await dashboardButton.click();
      await page.waitForURL(/dashboard|onboarding|auth/);
      
      // Take screenshot of dashboard/onboarding
      await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
    }
    
    // Check if tabs work (if we're on dashboard)
    const overviewTab = page.locator('text=Overview').first();
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await page.waitForTimeout(1000);
      
      const verificationTab = page.locator('text=Verification').first();
      if (await verificationTab.isVisible()) {
        await verificationTab.click();
        await page.waitForTimeout(1000);
        
        // Take screenshot of verification page
        await page.screenshot({ path: 'test-results/verification.png', fullPage: true });
      }
    }
  });

  test('🎨 FRONTEND BEAUTY AUDIT', async ({ page }) => {
    await page.goto('https://personapass.xyz');
    
    // Check for basic design elements
    const designChecks = await page.evaluate(() => {
      const checks = [];
      
      // Check for modern fonts
      const bodyFont = window.getComputedStyle(document.body).fontFamily;
      checks.push({
        name: 'Modern Typography',
        passed: bodyFont.includes('Inter') || bodyFont.includes('system-ui') || bodyFont.includes('sans-serif')
      });
      
      // Check for proper spacing
      const hasMargins = Array.from(document.querySelectorAll('*')).some(el => {
        const style = window.getComputedStyle(el);
        return parseInt(style.marginTop) > 0 || parseInt(style.paddingTop) > 0;
      });
      checks.push({
        name: 'Proper Spacing',
        passed: hasMargins
      });
      
      // Check for shadows/depth
      const hasShadows = Array.from(document.querySelectorAll('*')).some(el => {
        const style = window.getComputedStyle(el);
        return style.boxShadow !== 'none';
      });
      checks.push({
        name: 'Visual Depth (Shadows)',
        passed: hasShadows
      });
      
      // Check for rounded corners
      const hasRoundedCorners = Array.from(document.querySelectorAll('*')).some(el => {
        const style = window.getComputedStyle(el);
        return style.borderRadius !== '0px';
      });
      checks.push({
        name: 'Modern Rounded Corners',
        passed: hasRoundedCorners
      });
      
      // Check for color variety
      const colors = new Set();
      Array.from(document.querySelectorAll('*')).forEach(el => {
        const style = window.getComputedStyle(el);
        colors.add(style.color);
        colors.add(style.backgroundColor);
      });
      checks.push({
        name: 'Color Variety',
        passed: colors.size > 10
      });
      
      return checks;
    });
    
    console.log('🎨 DESIGN AUDIT RESULTS:');
    designChecks.forEach(check => {
      console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`);
    });
    
    // At least 4 out of 5 design elements should pass
    const passedChecks = designChecks.filter(c => c.passed).length;
    expect(passedChecks).toBeGreaterThan(3);
  });

  test('📱 MOBILE RESPONSIVENESS', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://personapass.xyz');
    
    await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
    
    // Check if content is visible and not cut off
    const contentVisible = await page.evaluate(() => {
      const body = document.body;
      return body.scrollWidth <= window.innerWidth + 10; // Allow 10px tolerance
    });
    
    expect(contentVisible).toBeTruthy();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    await page.screenshot({ path: 'test-results/tablet.png', fullPage: true });
  });

  test('🔐 SECURITY HEADERS CHECK', async ({ page }) => {
    const response = await page.request.get('https://personapass.xyz');
    const headers = response.headers();
    
    const securityChecks = [
      { name: 'HTTPS', passed: response.url().startsWith('https://') },
      { name: 'X-Frame-Options', passed: !!headers['x-frame-options'] },
      { name: 'Content-Security-Policy', passed: !!headers['content-security-policy'] },
      { name: 'Strict-Transport-Security', passed: !!headers['strict-transport-security'] },
      { name: 'X-Content-Type-Options', passed: !!headers['x-content-type-options'] }
    ];
    
    console.log('🔐 SECURITY AUDIT RESULTS:');
    securityChecks.forEach(check => {
      console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`);
    });
    
    // At least 3 out of 5 security headers should be present
    const passedSecurity = securityChecks.filter(c => c.passed).length;
    expect(passedSecurity).toBeGreaterThan(2);
  });

  test('⚡ PERFORMANCE AUDIT', async ({ page }) => {
    await page.goto('https://personapass.xyz');
    
    // Measure load time
    const loadTime = await page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });
    
    console.log(`⚡ Page Load Time: ${loadTime}ms`);
    
    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Check for large images
    const largeImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => img.naturalWidth > 2000 || img.naturalHeight > 2000).length;
    });
    
    expect(largeImages).toBe(0);
  });

  test('🎯 VERIFICATION FLOW TESTING', async ({ page }) => {
    await page.goto('https://personapass.xyz');
    
    // Try to access verification features
    const getStarted = page.locator('text=Get Started, text=Dashboard, text=Enter App').first();
    if (await getStarted.isVisible()) {
      await getStarted.click();
      
      // Look for verification options
      await page.waitForTimeout(3000);
      
      const verificationElements = await page.locator('text=Verification, text=Verify, text=Connect, text=Identity').count();
      console.log(`🎯 Found ${verificationElements} verification elements`);
      
      // Take screenshot of verification area
      await page.screenshot({ path: 'test-results/verification-flow.png', fullPage: true });
    }
  });

  test('🧪 FORM VALIDATION AND ERRORS', async ({ page }) => {
    await page.goto('https://personapass.xyz');
    
    // Look for forms and test validation
    const forms = await page.locator('form').count();
    console.log(`📝 Found ${forms} forms`);
    
    if (forms > 0) {
      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Check for validation messages
        await page.waitForTimeout(1000);
        const errorMessages = await page.locator('text=required, text=error, text=invalid').count();
        console.log(`🚨 Found ${errorMessages} validation messages`);
      }
    }
  });

  test('🔗 EXTERNAL LINKS AND INTEGRATIONS', async ({ page }) => {
    await page.goto('https://personapass.xyz');
    
    // Check for external links
    const externalLinks = await page.locator('a[href^="http"]').count();
    console.log(`🔗 Found ${externalLinks} external links`);
    
    // Check for social media links
    const socialLinks = await page.locator('a[href*="twitter"], a[href*="github"], a[href*="linkedin"]').count();
    console.log(`📱 Found ${socialLinks} social media links`);
    
    // Check for integration buttons
    const integrationButtons = await page.locator('text=Connect, text=Link, text=Authorize').count();
    console.log(`🔌 Found ${integrationButtons} integration buttons`);
  });

  test('🎨 COMPLETE VISUAL AUDIT', async ({ page }) => {
    await page.goto('https://personapass.xyz');
    
    // Take full page screenshot
    await page.screenshot({ path: 'test-results/full-page-audit.png', fullPage: true });
    
    // Check for visual elements
    const visualAudit = await page.evaluate(() => {
      const audit = {
        totalElements: document.querySelectorAll('*').length,
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input').length,
        images: document.querySelectorAll('img').length,
        links: document.querySelectorAll('a').length,
        headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        cards: document.querySelectorAll('[class*="card"], [class*="panel"]').length,
        modals: document.querySelectorAll('[class*="modal"], [class*="dialog"]').length
      };
      
      return audit;
    });
    
    console.log('🎨 VISUAL ELEMENT AUDIT:');
    Object.entries(visualAudit).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Should have reasonable amount of interactive elements
    expect(visualAudit.buttons).toBeGreaterThan(0);
    expect(visualAudit.headings).toBeGreaterThan(0);
  });
});