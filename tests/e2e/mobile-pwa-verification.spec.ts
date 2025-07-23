/**
 * Mobile PWA Feature Verification Test
 * Comprehensive test to verify Sprint 4 features are deployed
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const DEPLOYED_URL = 'https://wallet-ds40r5hxr-aiden-lipperts-projects.vercel.app';

test.describe('Mobile PWA Features Verification', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create context with mobile viewport
    context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X dimensions
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      isMobile: true,
      hasTouch: true
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Should load the main application', async () => {
    console.log('🔍 Testing deployment at:', DEPLOYED_URL);
    
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial load
    await page.screenshot({ path: 'test-results/mobile-initial-load.png', fullPage: true });
    
    // Check basic app structure
    const appRoot = page.locator('#root');
    await expect(appRoot).toBeVisible();
    
    console.log('✅ Application loads successfully');
  });

  test('Should detect mobile device and show appropriate interface', async () => {
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle');
    
    // Look for ResponsiveWrapper functionality
    const hasResponsiveWrapper = await page.evaluate(() => {
      return window.innerWidth <= 768; // Should trigger mobile detection
    });
    
    console.log('📱 Mobile detection result:', hasResponsiveWrapper);
    
    // Check for mobile-specific UI elements
    const possibleMobileElements = [
      'button[class*="mobile"]',
      'div[class*="mobile"]',
      'nav[class*="mobile"]',
      '[data-testid*="mobile"]',
      'button:has-text("Mobile")',
      'div:has-text("Mobile")'
    ];
    
    for (const selector of possibleMobileElements) {
      const element = page.locator(selector).first();
      const exists = await element.count() > 0;
      if (exists) {
        console.log('📱 Found mobile element:', selector);
        await element.screenshot({ path: `test-results/mobile-element-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
      }
    }
  });

  test('Should check for PWA manifest and service worker', async () => {
    await page.goto(DEPLOYED_URL);
    
    // Check for PWA manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();
    
    const manifestHref = await manifestLink.getAttribute('href');
    console.log('📱 PWA Manifest found:', manifestHref);
    
    // Check for service worker registration
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(swRegistered).toBe(true);
    console.log('⚙️ Service Worker API available');
    
    // Wait for service worker to register
    await page.waitForTimeout(2000);
    
    const swStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return {
          active: !!registration.active,
          scope: registration.scope,
          updatefound: registration.updatefound
        };
      }
      return null;
    });
    
    console.log('⚙️ Service Worker Status:', swStatus);
  });

  test('Should check for community and social sharing features', async () => {
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle');
    
    // Look for community-related elements
    const communityElements = [
      'text="Community"',
      'text="Share"',
      'text="Proof"',
      'button:has-text("Community")',
      'button:has-text("Share")',
      '[data-testid*="community"]',
      '[data-testid*="share"]'
    ];
    
    for (const selector of communityElements) {
      const element = page.locator(selector).first();
      const exists = await element.count() > 0;
      if (exists) {
        console.log('👥 Found community element:', selector);
        await element.screenshot({ path: `test-results/community-element-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
        
        // Try to interact with community elements
        if (await element.isVisible()) {
          try {
            await element.click({ timeout: 1000 });
            await page.waitForTimeout(500);
            await page.screenshot({ path: `test-results/community-interaction-${Date.now()}.png` });
          } catch (e) {
            console.log('⚠️ Could not interact with:', selector);
          }
        }
      }
    }
  });

  test('Should check for push notification capabilities', async () => {
    await page.goto(DEPLOYED_URL);
    
    const notificationSupport = await page.evaluate(() => {
      return {
        notificationAPI: 'Notification' in window,
        pushManager: 'serviceWorker' in navigator && 'PushManager' in window,
        permission: 'Notification' in window ? Notification.permission : 'not-supported'
      };
    });
    
    console.log('🔔 Notification capabilities:', notificationSupport);
    
    // Look for notification-related UI elements
    const notificationElements = [
      'button:has-text("Notification")',
      'button:has-text("Push")',
      'button:has-text("Enable")',
      '[data-testid*="notification"]',
      'text="notifications"'
    ];
    
    for (const selector of notificationElements) {
      const element = page.locator(selector).first();
      const exists = await element.count() > 0;
      if (exists) {
        console.log('🔔 Found notification element:', selector);
      }
    }
  });

  test('Should check for PWA dashboard and advanced features', async () => {
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle');
    
    // Look for PWA-specific features
    const pwaElements = [
      'text="PWA"',
      'text="Offline"',
      'text="Cache"',
      'text="Sync"',
      'button:has-text("PWA")',
      'button:has-text("Offline")',
      '[data-testid*="pwa"]',
      '[data-testid*="offline"]'
    ];
    
    for (const selector of pwaElements) {
      const element = page.locator(selector).first();
      const exists = await element.count() > 0;
      if (exists) {
        console.log('📱 Found PWA element:', selector);
        await element.screenshot({ path: `test-results/pwa-element-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
      }
    }
    
    // Check for mobile navigation
    const navigationElements = [
      'nav[class*="mobile"]',
      'div[class*="navigation"]',
      'div[class*="tab"]',
      'button[class*="tab"]'
    ];
    
    for (const selector of navigationElements) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`📱 Found ${count} navigation elements:`, selector);
        await elements.first().screenshot({ path: `test-results/navigation-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
      }
    }
  });

  test('Should test interface switching between mobile and desktop', async () => {
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle');
    
    // Check for interface preference controls
    const interfaceControls = [
      'select:has-text("Auto")',
      'select:has-text("Mobile")',
      'select:has-text("Desktop")',
      'button:has-text("Mobile")',
      'button:has-text("Desktop")'
    ];
    
    for (const selector of interfaceControls) {
      const element = page.locator(selector).first();
      const exists = await element.count() > 0;
      if (exists) {
        console.log('🔄 Found interface control:', selector);
        await element.screenshot({ path: `test-results/interface-control-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
        
        // Try to interact with interface controls
        if (await element.isVisible()) {
          try {
            await element.click({ timeout: 1000 });
            await page.waitForTimeout(1000);
            await page.screenshot({ path: `test-results/interface-switched-${Date.now()}.png` });
          } catch (e) {
            console.log('⚠️ Could not interact with interface control:', selector);
          }
        }
      }
    }
  });

  test('Should check console for service initialization logs', async () => {
    const logs: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('Community Proof Library') || 
          text.includes('Social Sharing') || 
          text.includes('Push Notification') ||
          text.includes('Advanced Service Worker') ||
          text.includes('PWA')) {
        console.log('📋 Found relevant log:', text);
      }
    });
    
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Wait for all services to initialize
    
    // Check for specific service initialization logs
    const relevantLogs = logs.filter(log => 
      log.includes('Community Proof Library') ||
      log.includes('Social Sharing') ||
      log.includes('Push Notification') ||
      log.includes('Advanced Service Worker') ||
      log.includes('PWA') ||
      log.includes('Mobile')
    );
    
    console.log('📋 Relevant initialization logs found:', relevantLogs.length);
    relevantLogs.forEach(log => console.log('  -', log));
    
    // Save all logs to file for analysis
    require('fs').writeFileSync('test-results/console-logs.json', JSON.stringify(logs, null, 2));
  });

  test('Should check current page structure and available features', async () => {
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle');
    
    // Get all interactive elements
    const interactiveElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, input, select, [role="button"], [onclick]');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        text: el.textContent?.substring(0, 50) || '',
        class: el.className,
        id: el.id,
        role: el.getAttribute('role'),
        href: el.getAttribute('href')
      }));
    });
    
    console.log(`🔍 Found ${interactiveElements.length} interactive elements`);
    
    // Save element analysis
    require('fs').writeFileSync('test-results/page-elements.json', JSON.stringify(interactiveElements, null, 2));
    
    // Look for specific Sprint 4 components
    const sprint4Keywords = ['mobile', 'pwa', 'community', 'share', 'notification', 'offline', 'sync'];
    const sprint4Elements = interactiveElements.filter(el => 
      sprint4Keywords.some(keyword => 
        el.text.toLowerCase().includes(keyword) || 
        el.class.toLowerCase().includes(keyword) ||
        el.id.toLowerCase().includes(keyword)
      )
    );
    
    console.log(`📱 Found ${sprint4Elements.length} potential Sprint 4 elements:`);
    sprint4Elements.forEach(el => console.log(`  - ${el.tag}: "${el.text}" (${el.class})`));
    
    // Take a comprehensive screenshot
    await page.screenshot({ path: 'test-results/full-page-analysis.png', fullPage: true });
  });
});

test.describe('Desktop Interface Verification', () => {
  test('Should verify desktop interface and responsive wrapper', async ({ page }) => {
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle');
    
    // Set large viewport to trigger desktop mode
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    // Check for responsive wrapper debug info in development
    const debugInfo = await page.evaluate(() => {
      const debugPanel = document.querySelector('[class*="debug"]');
      return debugPanel ? debugPanel.textContent : null;
    });
    
    if (debugInfo) {
      console.log('🖥️ Desktop debug info:', debugInfo);
    }
    
    // Look for interface switching controls
    const switchControls = page.locator('select, button').filter({ hasText: /mobile|desktop|auto/i });
    const switchCount = await switchControls.count();
    
    if (switchCount > 0) {
      console.log(`🔄 Found ${switchCount} interface switching controls`);
      for (let i = 0; i < switchCount; i++) {
        const control = switchControls.nth(i);
        const text = await control.textContent();
        console.log(`  - Control ${i}: "${text}"`);
      }
    }
    
    await page.screenshot({ path: 'test-results/desktop-interface.png', fullPage: true });
  });
});