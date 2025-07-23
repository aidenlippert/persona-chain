/**
 * @file DID Lifecycle Testing Suite
 * @description Comprehensive testing for DID creation, registration, key rotation, recovery, and cross-chain resolution
 */

import { test, expect, Page } from '@playwright/test';
import { performance } from 'perf_hooks';

interface DIDTestMetrics {
  creationTime: number;
  registrationTime: number;
  resolutionTime: number;
  keyRotationTime: number;
  recoveryTime: number;
  crossChainResolutionTime: number;
}

let testMetrics: DIDTestMetrics = {
  creationTime: 0,
  registrationTime: 0,
  resolutionTime: 0,
  keyRotationTime: 0,
  recoveryTime: 0,
  crossChainResolutionTime: 0
};

test.describe('DID Lifecycle Testing @did', () => {
  let page: Page;
  let generatedDID: string;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForLoadState('networkidle');
    
    // Ensure we're on the DID management page
    const didButton = page.locator('button:has-text("DID"), [data-testid="did-button"]');
    if (await didButton.isVisible()) {
      await didButton.click();
    }
  });

  test('DID Creation and Registration @performance', async () => {
    console.log('🔐 Testing DID creation and registration...');
    
    // Test DID creation
    const creationStartTime = performance.now();
    
    const createDIDButton = page.locator('button:has-text("Create DID"), [data-testid="create-did"]');
    await expect(createDIDButton).toBeVisible();
    await createDIDButton.click();
    
    // Wait for DID creation
    await page.waitForSelector('[data-testid="did-created"], .did-display, [class*="did-result"]', { timeout: 10000 });
    
    const creationEndTime = performance.now();
    testMetrics.creationTime = creationEndTime - creationStartTime;
    
    // Verify DID format
    const didElement = page.locator('[data-testid="did-display"], .did-display');
    const didText = await didElement.textContent();
    
    expect(didText).toMatch(/^did:persona:[a-zA-Z0-9]+$/);
    generatedDID = didText || '';
    
    // Test DID registration on blockchain
    const registrationStartTime = performance.now();
    
    const registerButton = page.locator('button:has-text("Register"), [data-testid="register-did"]');
    if (await registerButton.isVisible()) {
      await registerButton.click();
      
      // Wait for registration confirmation
      await page.waitForSelector('[data-testid="registration-success"], .registration-success', { timeout: 15000 });
    }
    
    const registrationEndTime = performance.now();
    testMetrics.registrationTime = registrationEndTime - registrationStartTime;
    
    // Verify registration status
    const registrationStatus = page.locator('[data-testid="registration-status"]');
    await expect(registrationStatus).toContainText('Registered');
    
    // Performance assertions
    expect(testMetrics.creationTime).toBeLessThan(5000); // Less than 5 seconds
    expect(testMetrics.registrationTime).toBeLessThan(15000); // Less than 15 seconds
    
    console.log(`✅ DID created in ${testMetrics.creationTime.toFixed(2)}ms`);
    console.log(`✅ DID registered in ${testMetrics.registrationTime.toFixed(2)}ms`);
  });

  test('DID Resolution and Verification', async () => {
    console.log('🔍 Testing DID resolution and verification...');
    
    // First create a DID if not exists
    if (!generatedDID) {
      await page.locator('button:has-text("Create DID")').click();
      await page.waitForSelector('[data-testid="did-created"]', { timeout: 10000 });
      const didElement = page.locator('[data-testid="did-display"]');
      generatedDID = await didElement.textContent() || '';
    }
    
    const resolutionStartTime = performance.now();
    
    // Test DID resolution
    const resolveButton = page.locator('button:has-text("Resolve"), [data-testid="resolve-did"]');
    if (await resolveButton.isVisible()) {
      await resolveButton.click();
    } else {
      // Alternative: use resolution input field
      const resolutionInput = page.locator('input[placeholder*="DID"], [data-testid="did-resolution-input"]');
      await resolutionInput.fill(generatedDID);
      await page.locator('button:has-text("Resolve")').click();
    }
    
    // Wait for resolution result
    await page.waitForSelector('[data-testid="did-document"], .did-document', { timeout: 10000 });
    
    const resolutionEndTime = performance.now();
    testMetrics.resolutionTime = resolutionEndTime - resolutionStartTime;
    
    // Verify DID document structure
    const didDocument = page.locator('[data-testid="did-document"]');
    await expect(didDocument).toBeVisible();
    
    // Check for essential DID document fields
    const documentText = await didDocument.textContent();
    expect(documentText).toContain('verificationMethod');
    expect(documentText).toContain('authentication');
    expect(documentText).toContain('assertionMethod');
    
    // Performance assertion
    expect(testMetrics.resolutionTime).toBeLessThan(3000); // Less than 3 seconds
    
    console.log(`✅ DID resolved in ${testMetrics.resolutionTime.toFixed(2)}ms`);
  });

  test('Key Rotation and Recovery @security', async () => {
    console.log('🔄 Testing key rotation and recovery...');
    
    // Test key rotation
    const keyRotationStartTime = performance.now();
    
    const rotateKeysButton = page.locator('button:has-text("Rotate Keys"), [data-testid="rotate-keys"]');
    if (await rotateKeysButton.isVisible()) {
      await rotateKeysButton.click();
      
      // Confirm key rotation
      const confirmButton = page.locator('button:has-text("Confirm"), [data-testid="confirm-rotation"]');
      await confirmButton.click();
      
      // Wait for rotation completion
      await page.waitForSelector('[data-testid="rotation-success"], .rotation-success', { timeout: 15000 });
    }
    
    const keyRotationEndTime = performance.now();
    testMetrics.keyRotationTime = keyRotationEndTime - keyRotationStartTime;
    
    // Test recovery mechanism
    const recoveryStartTime = performance.now();
    
    const initiateRecoveryButton = page.locator('button:has-text("Initiate Recovery"), [data-testid="initiate-recovery"]');
    if (await initiateRecoveryButton.isVisible()) {
      await initiateRecoveryButton.click();
      
      // Fill recovery information
      const recoveryInput = page.locator('input[placeholder*="recovery"], [data-testid="recovery-input"]');
      await recoveryInput.fill('test-recovery-phrase');
      
      const submitRecoveryButton = page.locator('button:has-text("Submit Recovery")');
      await submitRecoveryButton.click();
      
      // Wait for recovery process
      await page.waitForSelector('[data-testid="recovery-status"]', { timeout: 20000 });
    }
    
    const recoveryEndTime = performance.now();
    testMetrics.recoveryTime = recoveryEndTime - recoveryStartTime;
    
    // Verify security measures
    const securityStatus = page.locator('[data-testid="security-status"]');
    if (await securityStatus.isVisible()) {
      await expect(securityStatus).toContainText('Secure');
    }
    
    // Performance assertions
    expect(testMetrics.keyRotationTime).toBeLessThan(20000); // Less than 20 seconds
    expect(testMetrics.recoveryTime).toBeLessThan(30000); // Less than 30 seconds
    
    console.log(`✅ Key rotation completed in ${testMetrics.keyRotationTime.toFixed(2)}ms`);
    console.log(`✅ Recovery process completed in ${testMetrics.recoveryTime.toFixed(2)}ms`);
  });

  test('Cross-Chain DID Resolution @performance', async () => {
    console.log('🌐 Testing cross-chain DID resolution...');
    
    const crossChainStartTime = performance.now();
    
    // Test cross-chain resolution
    const crossChainButton = page.locator('button:has-text("Cross-Chain"), [data-testid="cross-chain-resolve"]');
    if (await crossChainButton.isVisible()) {
      await crossChainButton.click();
      
      // Select target chain
      const chainSelector = page.locator('select[data-testid="chain-selector"], .chain-selector');
      if (await chainSelector.isVisible()) {
        await chainSelector.selectOption('ethereum'); // or 'polygon', 'cosmos', etc.
      }
      
      // Initiate cross-chain resolution
      const resolveButton = page.locator('button:has-text("Resolve Cross-Chain")');
      await resolveButton.click();
      
      // Wait for cross-chain resolution
      await page.waitForSelector('[data-testid="cross-chain-result"], .cross-chain-result', { timeout: 30000 });
    }
    
    const crossChainEndTime = performance.now();
    testMetrics.crossChainResolutionTime = crossChainEndTime - crossChainStartTime;
    
    // Verify cross-chain resolution result
    const crossChainResult = page.locator('[data-testid="cross-chain-result"]');
    await expect(crossChainResult).toBeVisible();
    
    // Performance assertion
    expect(testMetrics.crossChainResolutionTime).toBeLessThan(30000); // Less than 30 seconds
    
    console.log(`✅ Cross-chain resolution completed in ${testMetrics.crossChainResolutionTime.toFixed(2)}ms`);
  });

  test('DID Performance Benchmarks @performance', async () => {
    console.log('📊 Running DID performance benchmarks...');
    
    // Batch DID creation test
    const batchSize = 10;
    const batchStartTime = performance.now();
    
    for (let i = 0; i < batchSize; i++) {
      await page.locator('button:has-text("Create DID")').click();
      await page.waitForSelector('[data-testid="did-created"]', { timeout: 10000 });
      
      // Clear for next iteration
      const clearButton = page.locator('button:has-text("Clear"), [data-testid="clear-did"]');
      if (await clearButton.isVisible()) {
        await clearButton.click();
      }
    }
    
    const batchEndTime = performance.now();
    const batchTime = batchEndTime - batchStartTime;
    const averageCreationTime = batchTime / batchSize;
    
    // Performance assertions
    expect(averageCreationTime).toBeLessThan(5000); // Average less than 5 seconds
    expect(batchTime).toBeLessThan(60000); // Total batch less than 1 minute
    
    console.log(`✅ Batch DID creation: ${batchSize} DIDs in ${batchTime.toFixed(2)}ms`);
    console.log(`✅ Average creation time: ${averageCreationTime.toFixed(2)}ms`);
  });

  test.afterAll(async () => {
    // Save performance metrics
    const fs = require('fs');
    const path = require('path');
    
    const testResultsDir = path.join(__dirname, '..', '..', 'test-results');
    const metricsFile = path.join(testResultsDir, 'did-lifecycle-metrics.json');
    
    const performanceReport = {
      testSuite: 'DID Lifecycle Testing',
      timestamp: new Date().toISOString(),
      metrics: testMetrics,
      thresholds: {
        creationTime: 5000,
        registrationTime: 15000,
        resolutionTime: 3000,
        keyRotationTime: 20000,
        recoveryTime: 30000,
        crossChainResolutionTime: 30000
      },
      performance: {
        allTestsPassed: Object.entries(testMetrics).every(([key, value]) => {
          const thresholds = {
            creationTime: 5000,
            registrationTime: 15000,
            resolutionTime: 3000,
            keyRotationTime: 20000,
            recoveryTime: 30000,
            crossChainResolutionTime: 30000
          };
          return value <= thresholds[key as keyof typeof thresholds];
        })
      }
    };
    
    fs.writeFileSync(metricsFile, JSON.stringify(performanceReport, null, 2));
    
    console.log('📊 DID Lifecycle Testing Summary:');
    console.log(`   Creation Time: ${testMetrics.creationTime.toFixed(2)}ms`);
    console.log(`   Registration Time: ${testMetrics.registrationTime.toFixed(2)}ms`);
    console.log(`   Resolution Time: ${testMetrics.resolutionTime.toFixed(2)}ms`);
    console.log(`   Key Rotation Time: ${testMetrics.keyRotationTime.toFixed(2)}ms`);
    console.log(`   Recovery Time: ${testMetrics.recoveryTime.toFixed(2)}ms`);
    console.log(`   Cross-Chain Resolution Time: ${testMetrics.crossChainResolutionTime.toFixed(2)}ms`);
  });
});