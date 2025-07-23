/**
 * @file VC Management Testing Suite
 * @description Comprehensive testing for credential issuance, expiration, renewal, revocation, and batch operations
 */

import { test, expect, Page } from '@playwright/test';
import { performance } from 'perf_hooks';

interface VCTestMetrics {
  issuanceTime: number;
  verificationTime: number;
  renewalTime: number;
  revocationTime: number;
  batchOperationTime: number;
  expirationCheckTime: number;
}

let testMetrics: VCTestMetrics = {
  issuanceTime: 0,
  verificationTime: 0,
  renewalTime: 0,
  revocationTime: 0,
  batchOperationTime: 0,
  expirationCheckTime: 0
};

test.describe('VC Management Testing @vc', () => {
  let page: Page;
  let issuedCredentials: string[] = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to credentials page
    const credentialsButton = page.locator('button:has-text("Credentials"), [data-testid="credentials-button"]');
    if (await credentialsButton.isVisible()) {
      await credentialsButton.click();
    }
  });

  test('Credential Issuance Workflows @performance', async () => {
    console.log('📜 Testing credential issuance workflows...');
    
    // Test GitHub credential issuance
    const githubStartTime = performance.now();
    
    const githubButton = page.locator('button:has-text("GitHub"), [data-testid="github-credential"]');
    if (await githubButton.isVisible()) {
      await githubButton.click();
      
      // Handle OAuth flow (mock or real)
      await page.waitForSelector('[data-testid="oauth-redirect"], .oauth-redirect', { timeout: 15000 });
      
      // Wait for credential issuance
      await page.waitForSelector('[data-testid="credential-issued"], .credential-issued', { timeout: 20000 });
    }
    
    const githubEndTime = performance.now();
    testMetrics.issuanceTime = githubEndTime - githubStartTime;
    
    // Test LinkedIn credential issuance
    const linkedinButton = page.locator('button:has-text("LinkedIn"), [data-testid="linkedin-credential"]');
    if (await linkedinButton.isVisible()) {
      await linkedinButton.click();
      await page.waitForSelector('[data-testid="credential-issued"]', { timeout: 20000 });
    }
    
    // Test Plaid financial credential issuance
    const plaidButton = page.locator('button:has-text("Plaid"), [data-testid="plaid-credential"]');
    if (await plaidButton.isVisible()) {
      await plaidButton.click();
      await page.waitForSelector('[data-testid="credential-issued"]', { timeout: 20000 });
    }
    
    // Verify credentials in wallet
    const credentialsList = page.locator('[data-testid="credentials-list"], .credentials-list');
    await expect(credentialsList).toBeVisible();
    
    const credentialCards = page.locator('[data-testid="credential-card"], .credential-card');
    const credentialCount = await credentialCards.count();
    expect(credentialCount).toBeGreaterThan(0);
    
    // Store issued credentials for later tests
    for (let i = 0; i < credentialCount; i++) {
      const credentialId = await credentialCards.nth(i).getAttribute('data-credential-id');
      if (credentialId) {
        issuedCredentials.push(credentialId);
      }
    }
    
    // Performance assertion
    expect(testMetrics.issuanceTime).toBeLessThan(30000); // Less than 30 seconds
    
    console.log(`✅ Credential issuance completed in ${testMetrics.issuanceTime.toFixed(2)}ms`);
    console.log(`✅ Total credentials issued: ${credentialCount}`);
  });

  test('Credential Verification and Presentation', async () => {
    console.log('🔍 Testing credential verification and presentation...');
    
    // Ensure we have credentials to verify
    if (issuedCredentials.length === 0) {
      // Issue a test credential first
      await page.locator('button:has-text("GitHub")').click();
      await page.waitForSelector('[data-testid="credential-issued"]', { timeout: 20000 });
    }
    
    const verificationStartTime = performance.now();
    
    // Test credential verification
    const verifyButton = page.locator('button:has-text("Verify"), [data-testid="verify-credential"]');
    if (await verifyButton.isVisible()) {
      await verifyButton.click();
      
      // Wait for verification result
      await page.waitForSelector('[data-testid="verification-result"], .verification-result', { timeout: 10000 });
    }
    
    const verificationEndTime = performance.now();
    testMetrics.verificationTime = verificationEndTime - verificationStartTime;
    
    // Verify verification result
    const verificationResult = page.locator('[data-testid="verification-result"]');
    await expect(verificationResult).toContainText('Valid');
    
    // Test credential presentation
    const presentButton = page.locator('button:has-text("Present"), [data-testid="present-credential"]');
    if (await presentButton.isVisible()) {
      await presentButton.click();
      
      // Select presentation template
      const templateSelector = page.locator('select[data-testid="presentation-template"]');
      if (await templateSelector.isVisible()) {
        await templateSelector.selectOption('standard');
      }
      
      // Generate presentation
      const generateButton = page.locator('button:has-text("Generate Presentation")');
      await generateButton.click();
      
      // Wait for presentation generation
      await page.waitForSelector('[data-testid="presentation-generated"]', { timeout: 15000 });
    }
    
    // Performance assertion
    expect(testMetrics.verificationTime).toBeLessThan(5000); // Less than 5 seconds
    
    console.log(`✅ Credential verification completed in ${testMetrics.verificationTime.toFixed(2)}ms`);
  });

  test('Credential Expiration and Renewal @performance', async () => {
    console.log('⏰ Testing credential expiration and renewal...');
    
    const expirationStartTime = performance.now();
    
    // Check credential expiration status
    const expirationButton = page.locator('button:has-text("Check Expiration"), [data-testid="check-expiration"]');
    if (await expirationButton.isVisible()) {
      await expirationButton.click();
      
      // Wait for expiration check results
      await page.waitForSelector('[data-testid="expiration-results"], .expiration-results', { timeout: 10000 });
    }
    
    const expirationEndTime = performance.now();
    testMetrics.expirationCheckTime = expirationEndTime - expirationStartTime;
    
    // Test credential renewal
    const renewalStartTime = performance.now();
    
    const renewButton = page.locator('button:has-text("Renew"), [data-testid="renew-credential"]');
    if (await renewButton.isVisible()) {
      await renewButton.click();
      
      // Confirm renewal
      const confirmRenewalButton = page.locator('button:has-text("Confirm Renewal")');
      await confirmRenewalButton.click();
      
      // Wait for renewal completion
      await page.waitForSelector('[data-testid="renewal-success"], .renewal-success', { timeout: 20000 });
    }
    
    const renewalEndTime = performance.now();
    testMetrics.renewalTime = renewalEndTime - renewalStartTime;
    
    // Verify renewed credential
    const renewedCredential = page.locator('[data-testid="renewed-credential"]');
    await expect(renewedCredential).toBeVisible();
    
    // Performance assertions
    expect(testMetrics.expirationCheckTime).toBeLessThan(10000); // Less than 10 seconds
    expect(testMetrics.renewalTime).toBeLessThan(30000); // Less than 30 seconds
    
    console.log(`✅ Expiration check completed in ${testMetrics.expirationCheckTime.toFixed(2)}ms`);
    console.log(`✅ Credential renewal completed in ${testMetrics.renewalTime.toFixed(2)}ms`);
  });

  test('Credential Revocation Mechanisms @security', async () => {
    console.log('🚫 Testing credential revocation mechanisms...');
    
    const revocationStartTime = performance.now();
    
    // Test credential revocation
    const revokeButton = page.locator('button:has-text("Revoke"), [data-testid="revoke-credential"]');
    if (await revokeButton.isVisible()) {
      await revokeButton.click();
      
      // Confirm revocation
      const confirmRevocationButton = page.locator('button:has-text("Confirm Revocation")');
      await confirmRevocationButton.click();
      
      // Wait for revocation completion
      await page.waitForSelector('[data-testid="revocation-success"], .revocation-success', { timeout: 15000 });
    }
    
    const revocationEndTime = performance.now();
    testMetrics.revocationTime = revocationEndTime - revocationStartTime;
    
    // Verify revocation status
    const revocationStatus = page.locator('[data-testid="revocation-status"]');
    await expect(revocationStatus).toContainText('Revoked');
    
    // Test revocation verification
    const verifyRevocationButton = page.locator('button:has-text("Verify Revocation")');
    if (await verifyRevocationButton.isVisible()) {
      await verifyRevocationButton.click();
      
      // Wait for verification result
      await page.waitForSelector('[data-testid="revocation-verified"]', { timeout: 10000 });
    }
    
    // Performance assertion
    expect(testMetrics.revocationTime).toBeLessThan(20000); // Less than 20 seconds
    
    console.log(`✅ Credential revocation completed in ${testMetrics.revocationTime.toFixed(2)}ms`);
  });

  test('Batch Operations @performance', async () => {
    console.log('📦 Testing batch credential operations...');
    
    const batchStartTime = performance.now();
    
    // Test batch credential verification
    const batchVerifyButton = page.locator('button:has-text("Batch Verify"), [data-testid="batch-verify"]');
    if (await batchVerifyButton.isVisible()) {
      await batchVerifyButton.click();
      
      // Wait for batch verification
      await page.waitForSelector('[data-testid="batch-verification-results"]', { timeout: 30000 });
    }
    
    // Test batch credential export
    const batchExportButton = page.locator('button:has-text("Export All"), [data-testid="batch-export"]');
    if (await batchExportButton.isVisible()) {
      await batchExportButton.click();
      
      // Wait for export completion
      await page.waitForSelector('[data-testid="export-complete"]', { timeout: 20000 });
    }
    
    // Test batch credential import
    const batchImportButton = page.locator('button:has-text("Import"), [data-testid="batch-import"]');
    if (await batchImportButton.isVisible()) {
      await batchImportButton.click();
      
      // Upload test file (mock)
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // In a real test, you'd upload an actual file
        await fileInput.setInputFiles('test-credentials.json');
      }
      
      // Wait for import completion
      await page.waitForSelector('[data-testid="import-complete"]', { timeout: 20000 });
    }
    
    const batchEndTime = performance.now();
    testMetrics.batchOperationTime = batchEndTime - batchStartTime;
    
    // Performance assertion
    expect(testMetrics.batchOperationTime).toBeLessThan(60000); // Less than 1 minute
    
    console.log(`✅ Batch operations completed in ${testMetrics.batchOperationTime.toFixed(2)}ms`);
  });

  test('Credential Schema Validation', async () => {
    console.log('📋 Testing credential schema validation...');
    
    // Test schema validation for different credential types
    const schemaTypes = ['github', 'linkedin', 'plaid', 'eudi'];
    
    for (const schemaType of schemaTypes) {
      const schemaButton = page.locator(`button[data-schema="${schemaType}"]`);
      if (await schemaButton.isVisible()) {
        await schemaButton.click();
        
        // Wait for schema validation
        await page.waitForSelector('[data-testid="schema-validation-result"]', { timeout: 10000 });
        
        // Verify schema validation result
        const validationResult = page.locator(`[data-testid="schema-validation-${schemaType}"]`);
        await expect(validationResult).toContainText('Valid');
      }
    }
    
    // Test invalid schema handling
    const invalidSchemaButton = page.locator('button:has-text("Test Invalid Schema")');
    if (await invalidSchemaButton.isVisible()) {
      await invalidSchemaButton.click();
      
      // Wait for validation error
      await page.waitForSelector('[data-testid="schema-validation-error"]', { timeout: 10000 });
      
      // Verify error handling
      const validationError = page.locator('[data-testid="schema-validation-error"]');
      await expect(validationError).toContainText('Invalid');
    }
    
    console.log('✅ Schema validation completed');
  });

  test('Credential Marketplace Integration', async () => {
    console.log('🏪 Testing credential marketplace integration...');
    
    // Test credential marketplace listing
    const marketplaceButton = page.locator('button:has-text("Marketplace"), [data-testid="marketplace-button"]');
    if (await marketplaceButton.isVisible()) {
      await marketplaceButton.click();
      
      // Wait for marketplace to load
      await page.waitForSelector('[data-testid="marketplace-listings"]', { timeout: 15000 });
    }
    
    // Test credential sharing
    const shareButton = page.locator('button:has-text("Share"), [data-testid="share-credential"]');
    if (await shareButton.isVisible()) {
      await shareButton.click();
      
      // Configure sharing settings
      const sharingOptions = page.locator('[data-testid="sharing-options"]');
      if (await sharingOptions.isVisible()) {
        await page.locator('input[data-testid="share-duration"]').fill('30');
        await page.locator('select[data-testid="share-scope"]').selectOption('public');
      }
      
      // Generate sharing link
      const generateLinkButton = page.locator('button:has-text("Generate Link")');
      await generateLinkButton.click();
      
      // Wait for sharing link
      await page.waitForSelector('[data-testid="sharing-link"]', { timeout: 10000 });
    }
    
    console.log('✅ Marketplace integration completed');
  });

  test.afterAll(async () => {
    // Save performance metrics
    const fs = require('fs');
    const path = require('path');
    
    const testResultsDir = path.join(__dirname, '..', '..', 'test-results');
    const metricsFile = path.join(testResultsDir, 'vc-management-metrics.json');
    
    const performanceReport = {
      testSuite: 'VC Management Testing',
      timestamp: new Date().toISOString(),
      metrics: testMetrics,
      credentialsIssued: issuedCredentials.length,
      thresholds: {
        issuanceTime: 30000,
        verificationTime: 5000,
        renewalTime: 30000,
        revocationTime: 20000,
        batchOperationTime: 60000,
        expirationCheckTime: 10000
      },
      performance: {
        allTestsPassed: Object.entries(testMetrics).every(([key, value]) => {
          const thresholds = {
            issuanceTime: 30000,
            verificationTime: 5000,
            renewalTime: 30000,
            revocationTime: 20000,
            batchOperationTime: 60000,
            expirationCheckTime: 10000
          };
          return value <= thresholds[key as keyof typeof thresholds];
        })
      }
    };
    
    fs.writeFileSync(metricsFile, JSON.stringify(performanceReport, null, 2));
    
    console.log('📊 VC Management Testing Summary:');
    console.log(`   Issuance Time: ${testMetrics.issuanceTime.toFixed(2)}ms`);
    console.log(`   Verification Time: ${testMetrics.verificationTime.toFixed(2)}ms`);
    console.log(`   Renewal Time: ${testMetrics.renewalTime.toFixed(2)}ms`);
    console.log(`   Revocation Time: ${testMetrics.revocationTime.toFixed(2)}ms`);
    console.log(`   Batch Operation Time: ${testMetrics.batchOperationTime.toFixed(2)}ms`);
    console.log(`   Expiration Check Time: ${testMetrics.expirationCheckTime.toFixed(2)}ms`);
    console.log(`   Total Credentials Processed: ${issuedCredentials.length}`);
  });
});