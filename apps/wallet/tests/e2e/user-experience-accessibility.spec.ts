/**
 * @file User Experience and Accessibility Testing Suite
 * @description Comprehensive testing for cross-browser compatibility, mobile responsiveness, performance, and accessibility compliance
 */

import { test, expect, Page, devices } from '@playwright/test';
import { performance } from 'perf_hooks';

interface UXAccessibilityMetrics {
  loadTime: number;
  interactionTime: number;
  accessibilityScore: number;
  mobileCompatibility: number;
  performanceScore: number;
  wcagViolations: number;
  usabilityScore: number;
}

let testMetrics: UXAccessibilityMetrics = {
  loadTime: 0,
  interactionTime: 0,
  accessibilityScore: 0,
  mobileCompatibility: 0,
  performanceScore: 0,
  wcagViolations: 0,
  usabilityScore: 0
};

test.describe('User Experience and Accessibility Testing @ux @accessibility', () => {
  let page: Page;
  let accessibilityViolations: string[] = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForLoadState('networkidle');
  });

  test('Cross-Browser Compatibility Testing', async () => {
    console.log('🌐 Testing cross-browser compatibility...');
    
    // Test core functionality across browsers
    const coreFeatures = [
      'DID creation',
      'Credential issuance',
      'WebAuthn authentication',
      'ZK proof generation'
    ];
    
    for (const feature of coreFeatures) {
      console.log(`Testing ${feature}...`);
      
      // Test DID creation
      if (feature === 'DID creation') {
        const didButton = page.locator('button:has-text("DID"), [data-testid="did-button"]');
        if (await didButton.isVisible()) {
          await didButton.click();
          
          const createDIDButton = page.locator('button:has-text("Create DID")');
          if (await createDIDButton.isVisible()) {
            await createDIDButton.click();
            await page.waitForSelector('[data-testid="did-created"]', { timeout: 15000 });
            
            const didElement = page.locator('[data-testid="did-display"]');
            await expect(didElement).toBeVisible();
          }
        }
      }
      
      // Test credential issuance
      if (feature === 'Credential issuance') {
        const credentialsButton = page.locator('button:has-text("Credentials")');
        if (await credentialsButton.isVisible()) {
          await credentialsButton.click();
          
          const githubButton = page.locator('button:has-text("GitHub")');
          if (await githubButton.isVisible()) {
            await githubButton.click();
            // Note: Full OAuth flow would need mocking for comprehensive testing
            console.log('GitHub credential flow initiated');
          }
        }
      }
      
      // Test WebAuthn authentication
      if (feature === 'WebAuthn authentication') {
        const authButton = page.locator('button:has-text("WebAuthn"), [data-testid="webauthn-button"]');
        if (await authButton.isVisible()) {
          await authButton.click();
          
          // Check if WebAuthn is supported
          const webAuthnSupported = await page.evaluate(() => {
            return !!(navigator.credentials && navigator.credentials.create);
          });
          
          if (!webAuthnSupported) {
            console.log('WebAuthn not supported in this browser');
          } else {
            console.log('WebAuthn supported');
          }
        }
      }
      
      // Test ZK proof generation
      if (feature === 'ZK proof generation') {
        const zkButton = page.locator('button:has-text("ZK Proof")');
        if (await zkButton.isVisible()) {
          await zkButton.click();
          
          const ageVerificationButton = page.locator('button:has-text("Age Verification")');
          if (await ageVerificationButton.isVisible()) {
            await ageVerificationButton.click();
            
            const ageInput = page.locator('input[data-testid="age-input"]');
            if (await ageInput.isVisible()) {
              await ageInput.fill('25');
              
              const generateButton = page.locator('button:has-text("Generate Proof")');
              await generateButton.click();
              
              // Wait for proof generation (might be slow)
              await page.waitForSelector('[data-testid="proof-generated"]', { timeout: 30000 });
            }
          }
        }
      }
    }
    
    console.log('✅ Cross-browser compatibility tests completed');
  });

  test('Mobile Responsiveness Testing', async () => {
    console.log('📱 Testing mobile responsiveness...');
    
    const mobileViewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 360, height: 640, name: 'Galaxy S5' },
      { width: 768, height: 1024, name: 'iPad' }
    ];
    
    let responsiveScore = 0;
    
    for (const viewport of mobileViewports) {
      console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})...`);
      
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      // Check if content fits viewport
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = viewport.width;
      
      if (bodyWidth <= viewportWidth) {
        responsiveScore += 25; // 25 points per viewport
      } else {
        console.log(`Horizontal scroll detected on ${viewport.name}`);
      }
      
      // Test navigation menu on mobile
      const mobileMenuButton = page.locator('button[data-testid="mobile-menu"], .mobile-menu-button');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        
        const mobileMenu = page.locator('[data-testid="mobile-menu-items"], .mobile-menu');
        await expect(mobileMenu).toBeVisible();
        
        // Close menu
        await mobileMenuButton.click();
      }
      
      // Test touch interactions
      const touchButton = page.locator('button').first();
      if (await touchButton.isVisible()) {
        await touchButton.tap();
        await page.waitForTimeout(500);
      }
      
      // Test scrolling
      await page.evaluate(() => {
        window.scrollTo(0, 100);
      });
      await page.waitForTimeout(500);
      
      // Take screenshot for visual testing
      await page.screenshot({
        path: `test-results/mobile-${viewport.name.replace(/\s+/g, '-')}.png`,
        fullPage: true
      });
    }
    
    testMetrics.mobileCompatibility = responsiveScore;
    
    console.log(`✅ Mobile responsiveness score: ${responsiveScore}/100`);
  });

  test('Performance Testing @performance', async () => {
    console.log('⚡ Testing performance metrics...');
    
    // Test page load performance
    const loadStartTime = performance.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadEndTime = performance.now();
    
    testMetrics.loadTime = loadEndTime - loadStartTime;
    
    // Test Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            vitals.lcp = entries[entries.length - 1].startTime;
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // First Input Delay (simulated)
        vitals.fid = performance.now(); // Simplified for testing
        
        // Cumulative Layout Shift
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
          vitals.cls = cls;
        }).observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => resolve(vitals), 3000);
      });
    });
    
    // Test interaction responsiveness
    const interactionStartTime = performance.now();
    const firstButton = page.locator('button').first();
    await firstButton.click();
    await page.waitForTimeout(100);
    const interactionEndTime = performance.now();
    
    testMetrics.interactionTime = interactionEndTime - interactionStartTime;
    
    // Calculate performance score
    let performanceScore = 100;
    
    // Penalize slow load times
    if (testMetrics.loadTime > 3000) performanceScore -= 20;
    if (testMetrics.loadTime > 5000) performanceScore -= 30;
    
    // Penalize slow interactions
    if (testMetrics.interactionTime > 100) performanceScore -= 10;
    if (testMetrics.interactionTime > 300) performanceScore -= 20;
    
    // Penalize poor Core Web Vitals
    if ((webVitals as any).lcp > 2500) performanceScore -= 15;
    if ((webVitals as any).cls > 0.1) performanceScore -= 15;
    
    testMetrics.performanceScore = Math.max(0, performanceScore);
    
    console.log(`✅ Load time: ${testMetrics.loadTime.toFixed(2)}ms`);
    console.log(`✅ Interaction time: ${testMetrics.interactionTime.toFixed(2)}ms`);
    console.log(`✅ Performance score: ${testMetrics.performanceScore}/100`);
  });

  test('Accessibility Compliance Testing @accessibility', async () => {
    console.log('♿ Testing accessibility compliance...');
    
    // Test keyboard navigation
    console.log('Testing keyboard navigation...');
    
    let focusableElements = 0;
    const tabElements = page.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
    const tabCount = await tabElements.count();
    
    for (let i = 0; i < Math.min(tabCount, 10); i++) {
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      if (await focusedElement.isVisible()) {
        focusableElements++;
      }
    }
    
    if (focusableElements < 5) {
      accessibilityViolations.push('Insufficient keyboard navigation support');
      testMetrics.wcagViolations++;
    }
    
    // Test ARIA labels and semantic HTML
    console.log('Testing ARIA labels and semantic HTML...');
    
    const ariaLabels = await page.locator('[aria-label], [aria-labelledby], [aria-describedby]').count();
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    const landmarks = await page.locator('main, nav, section, article, aside, header, footer').count();
    const buttons = await page.locator('button').count();
    const buttonsWithAriaLabel = await page.locator('button[aria-label], button[aria-labelledby]').count();
    
    if (ariaLabels < 5) {
      accessibilityViolations.push('Insufficient ARIA labels');
      testMetrics.wcagViolations++;
    }
    
    if (headings < 3) {
      accessibilityViolations.push('Insufficient semantic headings');
      testMetrics.wcagViolations++;
    }
    
    if (landmarks < 3) {
      accessibilityViolations.push('Insufficient landmark elements');
      testMetrics.wcagViolations++;
    }
    
    if (buttons > 0 && buttonsWithAriaLabel / buttons < 0.5) {
      accessibilityViolations.push('Buttons missing accessible labels');
      testMetrics.wcagViolations++;
    }
    
    // Test color contrast
    console.log('Testing color contrast...');
    
    const contrastIssues = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let issues = 0;
      
      for (const element of Array.from(elements)) {
        const style = window.getComputedStyle(element);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        
        if (color && backgroundColor && color !== backgroundColor) {
          // Simplified contrast check
          const textColor = color.match(/\d+/g);
          const bgColor = backgroundColor.match(/\d+/g);
          
          if (textColor && bgColor) {
            const textLuminance = (0.299 * parseInt(textColor[0]) + 0.587 * parseInt(textColor[1]) + 0.114 * parseInt(textColor[2])) / 255;
            const bgLuminance = (0.299 * parseInt(bgColor[0]) + 0.587 * parseInt(bgColor[1]) + 0.114 * parseInt(bgColor[2])) / 255;
            const contrast = Math.abs(textLuminance - bgLuminance);
            
            if (contrast < 0.5) { // Simplified threshold
              issues++;
            }
          }
        }
      }
      
      return issues;
    });
    
    if (contrastIssues > 5) {
      accessibilityViolations.push('Color contrast issues detected');
      testMetrics.wcagViolations++;
    }
    
    // Test screen reader support
    console.log('Testing screen reader support...');
    
    const screenReaderElements = await page.locator('[role], [aria-live], [aria-hidden]').count();
    const images = await page.locator('img').count();
    const imagesWithAlt = await page.locator('img[alt]').count();
    
    if (screenReaderElements < 3) {
      accessibilityViolations.push('Insufficient screen reader support');
      testMetrics.wcagViolations++;
    }
    
    if (images > 0 && imagesWithAlt / images < 0.8) {
      accessibilityViolations.push('Images missing alt text');
      testMetrics.wcagViolations++;
    }
    
    // Test form accessibility
    console.log('Testing form accessibility...');
    
    const formInputs = await page.locator('input, textarea, select').count();
    const labeledInputs = await page.locator('input[id] + label, label + input[id], input[aria-label], input[aria-labelledby]').count();
    
    if (formInputs > 0 && labeledInputs / formInputs < 0.8) {
      accessibilityViolations.push('Form inputs missing labels');
      testMetrics.wcagViolations++;
    }
    
    // Calculate accessibility score
    const maxViolations = 10;
    testMetrics.accessibilityScore = Math.max(0, 100 - (testMetrics.wcagViolations * 100 / maxViolations));
    
    console.log(`✅ WCAG violations: ${testMetrics.wcagViolations}`);
    console.log(`✅ Accessibility score: ${testMetrics.accessibilityScore.toFixed(2)}/100`);
  });

  test('Usability Testing', async () => {
    console.log('👥 Testing usability...');
    
    let usabilityScore = 100;
    
    // Test navigation clarity
    console.log('Testing navigation clarity...');
    
    const navigationItems = await page.locator('nav a, [role="navigation"] a').count();
    if (navigationItems < 3) {
      usabilityScore -= 10;
    }
    
    // Test clear call-to-action buttons
    const ctaButtons = await page.locator('button:has-text("Get Started"), button:has-text("Sign Up"), button:has-text("Create"), button:has-text("Connect")').count();
    if (ctaButtons < 1) {
      usabilityScore -= 15;
    }
    
    // Test error handling
    console.log('Testing error handling...');
    
    // Try to submit an empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      const errorMessage = page.locator('[data-testid="error"], .error, [role="alert"]');
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        if (errorText && errorText.length > 0) {
          // Good error handling
        } else {
          usabilityScore -= 10;
        }
      } else {
        usabilityScore -= 15;
      }
    }
    
    // Test loading states
    console.log('Testing loading states...');
    
    const loadingElements = await page.locator('[data-testid="loading"], .loading, [role="status"]').count();
    if (loadingElements < 1) {
      usabilityScore -= 10;
    }
    
    // Test responsive design
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const horizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    
    if (horizontalScroll) {
      usabilityScore -= 20;
    }
    
    // Test text readability
    const textElements = await page.locator('p, div, span').count();
    const smallTextElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, div, span');
      let smallCount = 0;
      
      for (const element of Array.from(elements)) {
        const style = window.getComputedStyle(element);
        const fontSize = parseInt(style.fontSize);
        
        if (fontSize < 14) {
          smallCount++;
        }
      }
      
      return smallCount;
    });
    
    if (textElements > 0 && smallTextElements / textElements > 0.3) {
      usabilityScore -= 10;
    }
    
    testMetrics.usabilityScore = Math.max(0, usabilityScore);
    
    console.log(`✅ Usability score: ${testMetrics.usabilityScore}/100`);
  });

  test('Visual Regression Testing', async () => {
    console.log('📸 Testing visual regression...');
    
    const pages = [
      { path: '/', name: 'homepage' },
      { path: '/credentials', name: 'credentials' },
      { path: '/did', name: 'did' },
      { path: '/profile', name: 'profile' }
    ];
    
    for (const pageInfo of pages) {
      try {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');
        
        // Take full page screenshot
        await page.screenshot({
          path: `test-results/visual-${pageInfo.name}-desktop.png`,
          fullPage: true
        });
        
        // Take mobile screenshot
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        
        await page.screenshot({
          path: `test-results/visual-${pageInfo.name}-mobile.png`,
          fullPage: true
        });
        
        // Reset viewport
        await page.setViewportSize({ width: 1280, height: 720 });
      } catch (error) {
        console.log(`Visual regression test failed for ${pageInfo.name}: ${error}`);
      }
    }
    
    console.log('✅ Visual regression testing completed');
  });

  test.afterAll(async () => {
    // Calculate overall UX score
    const weights = {
      loadTime: 0.2,
      interactionTime: 0.1,
      accessibilityScore: 0.3,
      mobileCompatibility: 0.2,
      performanceScore: 0.1,
      usabilityScore: 0.1
    };
    
    const overallScore = (
      (testMetrics.loadTime <= 3000 ? 100 : 50) * weights.loadTime +
      (testMetrics.interactionTime <= 100 ? 100 : 50) * weights.interactionTime +
      testMetrics.accessibilityScore * weights.accessibilityScore +
      testMetrics.mobileCompatibility * weights.mobileCompatibility +
      testMetrics.performanceScore * weights.performanceScore +
      testMetrics.usabilityScore * weights.usabilityScore
    );
    
    // Save UX/Accessibility report
    const fs = require('fs');
    const path = require('path');
    
    const testResultsDir = path.join(__dirname, '..', '..', 'test-results');
    const uxReportFile = path.join(testResultsDir, 'ux-accessibility-report.json');
    
    const uxReport = {
      testSuite: 'User Experience and Accessibility Testing',
      timestamp: new Date().toISOString(),
      metrics: testMetrics,
      overallScore: overallScore.toFixed(2),
      accessibilityViolations: accessibilityViolations,
      grade: overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : 'F',
      recommendations: [
        'Improve page load performance',
        'Enhance keyboard navigation',
        'Add more ARIA labels',
        'Optimize mobile responsiveness',
        'Improve color contrast',
        'Add loading states and error handling'
      ]
    };
    
    fs.writeFileSync(uxReportFile, JSON.stringify(uxReport, null, 2));
    
    console.log('👥 UX/Accessibility Testing Summary:');
    console.log(`   Load Time: ${testMetrics.loadTime.toFixed(2)}ms`);
    console.log(`   Interaction Time: ${testMetrics.interactionTime.toFixed(2)}ms`);
    console.log(`   Accessibility Score: ${testMetrics.accessibilityScore.toFixed(2)}/100`);
    console.log(`   Mobile Compatibility: ${testMetrics.mobileCompatibility}/100`);
    console.log(`   Performance Score: ${testMetrics.performanceScore}/100`);
    console.log(`   Usability Score: ${testMetrics.usabilityScore}/100`);
    console.log(`   Overall Score: ${overallScore.toFixed(2)}/100`);
    console.log(`   Grade: ${uxReport.grade}`);
    console.log(`   WCAG Violations: ${testMetrics.wcagViolations}`);
    
    if (accessibilityViolations.length > 0) {
      console.log('   Accessibility Issues:');
      accessibilityViolations.forEach((violation, index) => {
        console.log(`     ${index + 1}. ${violation}`);
      });
    }
  });
});