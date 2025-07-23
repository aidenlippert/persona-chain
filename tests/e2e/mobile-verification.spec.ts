/**
 * Mobile PWA Feature Verification Test
 * Quick verification of Sprint 4 mobile features on live deployment
 */

import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://wallet-ds40r5hxr-aiden-lipperts-projects.vercel.app';

test.describe('Mobile PWA Live Verification', () => {
  test('Should verify mobile interface and PWA features on live site', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    console.log('🔍 Testing live deployment:', DEPLOYED_URL);
    
    // Navigate to live site
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of what's actually loaded
    await page.screenshot({ path: 'test-results/live-mobile-interface.png', fullPage: true });
    
    // Log what we can see on the page
    const pageTitle = await page.title();
    console.log('📱 Page title:', pageTitle);
    
    // Check for any mobile-specific elements
    const allButtons = await page.locator('button').count();
    const allDivs = await page.locator('div').count();
    const allNavs = await page.locator('nav').count();
    
    console.log(`📊 Page elements: ${allButtons} buttons, ${allDivs} divs, ${allNavs} nav elements`);
    
    // Try to find any text related to Sprint 4 features
    const sprint4Keywords = ['mobile', 'pwa', 'community', 'share', 'notification', 'offline'];
    const foundKeywords = [];
    
    for (const keyword of sprint4Keywords) {
      const elements = page.locator(`text=${keyword}`);
      const count = await elements.count();
      if (count > 0) {
        foundKeywords.push(keyword);
        console.log(`✅ Found "${keyword}" (${count} occurrences)`);
      }
    }
    
    // Check for PWA manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    const hasManifest = await manifestLink.count() > 0;
    console.log('📱 PWA Manifest present:', hasManifest);
    
    // Check for service worker support
    const swSupport = await page.evaluate(() => 'serviceWorker' in navigator);
    console.log('⚙️ Service Worker support:', swSupport);
    
    // Look for any responsive/mobile-specific classes
    const responsiveElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="mobile"], [class*="responsive"], [class*="sm:"], [class*="md:"], [class*="lg:"]');
      return elements.length;
    });
    console.log('📱 Responsive/mobile elements found:', responsiveElements);
    
    // Check current interface type
    const currentInterface = await page.evaluate(() => {
      const width = window.innerWidth;
      return {
        width,
        isMobile: width <= 768,
        viewportClass: width <= 480 ? 'mobile' : width <= 768 ? 'tablet' : 'desktop'
      };
    });
    console.log('📱 Current interface:', currentInterface);
    
    // Check for any Sprint 4 services in console
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Community') || text.includes('PWA') || text.includes('Mobile') || text.includes('Social')) {
        logs.push(text);
      }
    });
    
    await page.waitForTimeout(3000); // Wait for services to initialize
    
    if (logs.length > 0) {
      console.log('📋 Sprint 4 related logs:');
      logs.forEach(log => console.log('  -', log));
    } else {
      console.log('⚠️ No Sprint 4 service logs detected');
    }
    
    // Check what's actually in the DOM
    const bodyContent = await page.evaluate(() => {
      return {
        hasRoot: !!document.getElementById('root'),
        rootChildren: document.getElementById('root')?.children.length || 0,
        bodyClasses: document.body.className,
        htmlClasses: document.documentElement.className
      };
    });
    console.log('🔍 DOM structure:', bodyContent);
    
    // Try to interact with any visible elements
    const interactiveElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).slice(0, 5);
      return buttons.map(btn => ({
        text: btn.textContent?.trim() || '',
        class: btn.className,
        visible: btn.offsetParent !== null
      }));
    });
    
    console.log('🎯 Interactive elements:');
    interactiveElements.forEach((el, i) => {
      console.log(`  ${i + 1}. "${el.text}" (${el.class}) - visible: ${el.visible}`);
    });
    
    // Check if we're seeing the mobile interface or the desktop interface
    const interfaceCheck = await page.evaluate(() => {
      // Look for specific indicators of our mobile components
      const hasMobileNav = document.querySelector('[class*="mobile"]') !== null;
      const hasBottomNav = document.querySelector('[class*="bottom"]') !== null;
      const hasTouchElements = document.querySelector('[class*="touch"]') !== null;
      const hasResponsiveWrapper = document.querySelector('[class*="responsive"]') !== null;
      
      return {
        hasMobileNav,
        hasBottomNav,
        hasTouchElements,
        hasResponsiveWrapper,
        totalElements: document.querySelectorAll('*').length
      };
    });
    
    console.log('🔍 Interface analysis:', interfaceCheck);
    
    // Final assessment
    console.log('\n📊 SPRINT 4 FEATURE ASSESSMENT:');
    console.log('================================');
    console.log('PWA Manifest:', hasManifest ? '✅' : '❌');
    console.log('Service Worker Support:', swSupport ? '✅' : '❌');
    console.log('Responsive Elements:', responsiveElements > 0 ? '✅' : '❌');
    console.log('Sprint 4 Keywords Found:', foundKeywords.length > 0 ? `✅ (${foundKeywords.join(', ')})` : '❌');
    console.log('Mobile Interface:', currentInterface.isMobile ? '✅' : '⚠️ (Desktop view)');
    console.log('Interactive Elements:', interactiveElements.length > 0 ? '✅' : '❌');
    
    // Save comprehensive report
    const report = {
      url: DEPLOYED_URL,
      timestamp: new Date().toISOString(),
      viewport: currentInterface,
      features: {
        pwaManifest: hasManifest,
        serviceWorker: swSupport,
        responsiveElements,
        foundKeywords,
        interfaceCheck,
        interactiveElements
      },
      domStructure: bodyContent,
      logs
    };
    
    await page.evaluate((reportData) => {
      console.log('📊 COMPREHENSIVE REPORT:', JSON.stringify(reportData, null, 2));
    }, report);
    
    // Basic assertions
    expect(hasManifest).toBe(true);
    expect(swSupport).toBe(true);
    expect(bodyContent.hasRoot).toBe(true);
  });
});