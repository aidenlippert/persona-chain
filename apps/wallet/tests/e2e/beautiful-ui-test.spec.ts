import { test, expect } from '@playwright/test';

test.describe('Beautiful UI Verification', () => {
  test('should display gorgeous verification dashboard', async ({ page }) => {
    await page.goto('https://wallet-75r5ikjdn-aiden-lipperts-projects.vercel.app/identity-verification');
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Check for the beautiful gradient background
    const gradientBackground = page.locator('.bg-gradient-to-br');
    await expect(gradientBackground).toBeVisible();
    
    // Check for the stunning header
    const headerText = page.locator('h1');
    await expect(headerText).toContainText('Identity Verification');
    
    // Check for glass morphism cards
    const glassMorphismCards = page.locator('.backdrop-blur-xl');
    await expect(glassMorphismCards.first()).toBeVisible();
    
    // Check for beautiful buttons
    const beautifulButtons = page.locator('button');
    await expect(beautifulButtons.first()).toBeVisible();
    
    // Take a screenshot of the beautiful verification dashboard
    await page.screenshot({ path: 'test-results/beautiful-verification-dashboard.png', fullPage: true });
  });

  test('should display gorgeous dropdown navigation', async ({ page }) => {
    await page.goto('https://wallet-75r5ikjdn-aiden-lipperts-projects.vercel.app/');
    
    // Wait for navigation to load
    await page.waitForTimeout(2000);
    
    // Check for the PersonaPass logo
    const logo = page.locator('text=PersonaPass');
    await expect(logo).toBeVisible();
    
    // Check for sparkles icon
    const sparklesIcon = page.locator('svg').first();
    await expect(sparklesIcon).toBeVisible();
    
    // Check for gradient effects
    const gradientText = page.locator('.bg-gradient-to-r');
    await expect(gradientText.first()).toBeVisible();
    
    // Take a screenshot of the beautiful navigation
    await page.screenshot({ path: 'test-results/beautiful-navigation.png' });
  });

  test('should display stunning animations', async ({ page }) => {
    await page.goto('https://wallet-75r5ikjdn-aiden-lipperts-projects.vercel.app/identity-verification');
    
    // Wait for animations to load
    await page.waitForTimeout(3000);
    
    // Check for floating animations
    const floatingElements = page.locator('.animate-float');
    await expect(floatingElements.first()).toBeVisible();
    
    // Check for gradient animations
    const gradientAnimations = page.locator('.animate-gradient-x');
    await expect(gradientAnimations.first()).toBeVisible();
    
    // Take a screenshot of the animated elements
    await page.screenshot({ path: 'test-results/beautiful-animations.png', fullPage: true });
  });

  test('should have beautiful interactive elements', async ({ page }) => {
    await page.goto('https://wallet-75r5ikjdn-aiden-lipperts-projects.vercel.app/identity-verification');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check for hover effects on cards
    const cards = page.locator('.hover\\:scale-\\[1\\.02\\]');
    if (await cards.count() > 0) {
      await cards.first().hover();
      await page.waitForTimeout(500);
    }
    
    // Check for beautiful status indicators
    const statusIndicators = page.locator('.bg-gradient-to-r');
    await expect(statusIndicators.first()).toBeVisible();
    
    // Take a screenshot of interactive elements
    await page.screenshot({ path: 'test-results/beautiful-interactive.png', fullPage: true });
  });

  test('should display masterful card components', async ({ page }) => {
    await page.goto('https://wallet-75r5ikjdn-aiden-lipperts-projects.vercel.app/credentials');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check for beautiful card layouts
    const cards = page.locator('.rounded-2xl');
    await expect(cards.first()).toBeVisible();
    
    // Check for shadow effects
    const shadowCards = page.locator('.shadow-xl');
    await expect(shadowCards.first()).toBeVisible();
    
    // Take a screenshot of the beautiful cards
    await page.screenshot({ path: 'test-results/beautiful-cards.png', fullPage: true });
  });
});