import { test, expect } from '@playwright/test';

test.describe('Basic UI Verification', () => {
  test('should load the beautiful PersonaPass site', async ({ page }) => {
    await page.goto('https://wallet-75r5ikjdn-aiden-lipperts-projects.vercel.app/');
    
    // Wait for the page to load
    await page.waitForTimeout(5000);
    
    // Check if the page loaded successfully
    await expect(page).toHaveTitle(/PersonaPass|Persona/);
    
    // Take a screenshot of the homepage
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
  });

  test('should navigate to identity verification page', async ({ page }) => {
    await page.goto('https://wallet-75r5ikjdn-aiden-lipperts-projects.vercel.app/identity-verification');
    
    // Wait for the page to load
    await page.waitForTimeout(5000);
    
    // Check if the page loaded
    const body = await page.locator('body');
    await expect(body).toBeVisible();
    
    // Take a screenshot of the identity verification page
    await page.screenshot({ path: 'test-results/identity-verification.png', fullPage: true });
  });

  test('should check for navigation elements', async ({ page }) => {
    await page.goto('https://wallet-75r5ikjdn-aiden-lipperts-projects.vercel.app/');
    
    // Wait for navigation to load
    await page.waitForTimeout(3000);
    
    // Check for any navigation elements
    const navElements = page.locator('nav, [role="navigation"]');
    const hasNav = await navElements.count() > 0;
    
    if (hasNav) {
      await expect(navElements.first()).toBeVisible();
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/navigation.png' });
  });
});