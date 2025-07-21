/**
 * @file ZK Proof Testing Suite
 * @description Comprehensive testing for ZK proof generation, verification, batch processing, and performance optimization
 */

import { test, expect, Page } from '@playwright/test';
import { performance } from 'perf_hooks';

interface ZKProofMetrics {
  proofGenerationTime: number;
  proofVerificationTime: number;
  batchProofTime: number;
  circuitCompilationTime: number;
  witnessGenerationTime: number;
  proofSize: number;
  circuitConstraints: number;
}

let testMetrics: ZKProofMetrics = {
  proofGenerationTime: 0,
  proofVerificationTime: 0,
  batchProofTime: 0,
  circuitCompilationTime: 0,
  witnessGenerationTime: 0,
  proofSize: 0,
  circuitConstraints: 0
};

test.describe('ZK Proof Testing @zkproof', () => {
  let page: Page;
  let generatedProofs: string[] = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to ZK proof page
    const zkButton = page.locator('button:has-text("ZK Proof"), [data-testid="zk-proof-button"]');
    if (await zkButton.isVisible()) {
      await zkButton.click();
    }
  });

  test('ZK Proof Generation and Verification @performance', async () => {
    console.log('🔐 Testing ZK proof generation and verification...');
    
    // Test Age Verification Circuit
    const ageVerificationStartTime = performance.now();
    
    const ageVerificationButton = page.locator('button:has-text("Age Verification"), [data-testid="age-verification"]');
    if (await ageVerificationButton.isVisible()) {
      await ageVerificationButton.click();
      
      // Fill age verification form
      const ageInput = page.locator('input[data-testid="age-input"]');
      await ageInput.fill('25');
      
      const minAgeInput = page.locator('input[data-testid="min-age-input"]');
      await minAgeInput.fill('18');
      
      // Generate proof
      const generateButton = page.locator('button:has-text("Generate Proof")');
      await generateButton.click();
      
      // Wait for proof generation
      await page.waitForSelector('[data-testid="proof-generated"]', { timeout: 30000 });
    }
    
    const ageVerificationEndTime = performance.now();
    testMetrics.proofGenerationTime = ageVerificationEndTime - ageVerificationStartTime;
    
    // Verify the proof
    const verificationStartTime = performance.now();
    
    const verifyButton = page.locator('button:has-text("Verify Proof"), [data-testid="verify-proof"]');
    await verifyButton.click();
    
    // Wait for verification result
    await page.waitForSelector('[data-testid="verification-result"]', { timeout: 15000 });
    
    const verificationEndTime = performance.now();
    testMetrics.proofVerificationTime = verificationEndTime - verificationStartTime;
    
    // Check verification result
    const verificationResult = page.locator('[data-testid="verification-result"]');
    await expect(verificationResult).toContainText('Valid');
    
    // Get proof size
    const proofSizeElement = page.locator('[data-testid="proof-size"]');
    if (await proofSizeElement.isVisible()) {
      const proofSizeText = await proofSizeElement.textContent();
      testMetrics.proofSize = parseInt(proofSizeText?.match(/\d+/)?.[0] || '0');
    }
    
    // Performance assertions
    expect(testMetrics.proofGenerationTime).toBeLessThan(10000); // Less than 10 seconds
    expect(testMetrics.proofVerificationTime).toBeLessThan(2000); // Less than 2 seconds
    expect(testMetrics.proofSize).toBeLessThan(1000); // Less than 1KB
    
    console.log(`✅ ZK proof generated in ${testMetrics.proofGenerationTime.toFixed(2)}ms`);
    console.log(`✅ ZK proof verified in ${testMetrics.proofVerificationTime.toFixed(2)}ms`);
    console.log(`✅ Proof size: ${testMetrics.proofSize} bytes`);
  });

  test('Income Threshold Proof @performance', async () => {
    console.log('💰 Testing income threshold proof...');
    
    const incomeProofStartTime = performance.now();
    
    const incomeThresholdButton = page.locator('button:has-text("Income Threshold"), [data-testid="income-threshold"]');
    if (await incomeThresholdButton.isVisible()) {
      await incomeThresholdButton.click();
      
      // Fill income proof form
      const incomeInput = page.locator('input[data-testid="income-input"]');
      await incomeInput.fill('75000');
      
      const thresholdInput = page.locator('input[data-testid="threshold-input"]');
      await thresholdInput.fill('50000');
      
      // Generate proof
      const generateButton = page.locator('button:has-text("Generate Proof")');
      await generateButton.click();
      
      // Wait for proof generation
      await page.waitForSelector('[data-testid="proof-generated"]', { timeout: 30000 });
    }
    
    const incomeProofEndTime = performance.now();
    const incomeProofTime = incomeProofEndTime - incomeProofStartTime;
    
    // Verify the proof
    const verifyButton = page.locator('button:has-text("Verify Proof")');
    await verifyButton.click();
    
    await page.waitForSelector('[data-testid="verification-result"]', { timeout: 15000 });
    
    const verificationResult = page.locator('[data-testid="verification-result"]');
    await expect(verificationResult).toContainText('Valid');
    
    // Performance assertion
    expect(incomeProofTime).toBeLessThan(15000); // Less than 15 seconds
    
    console.log(`✅ Income threshold proof generated in ${incomeProofTime.toFixed(2)}ms`);
  });

  test('Selective Disclosure Proof @performance', async () => {
    console.log('🎯 Testing selective disclosure proof...');
    
    const selectiveDisclosureStartTime = performance.now();
    
    const selectiveDisclosureButton = page.locator('button:has-text("Selective Disclosure"), [data-testid="selective-disclosure"]');
    if (await selectiveDisclosureButton.isVisible()) {
      await selectiveDisclosureButton.click();
      
      // Configure selective disclosure
      const fields = ['name', 'age', 'email', 'address'];
      const selectedFields = ['name', 'age']; // Only disclose name and age
      
      for (const field of fields) {
        const checkbox = page.locator(`input[data-testid="${field}-checkbox"]`);
        if (await checkbox.isVisible()) {
          if (selectedFields.includes(field)) {
            await checkbox.check();
          } else {
            await checkbox.uncheck();
          }
        }
      }
      
      // Generate proof
      const generateButton = page.locator('button:has-text("Generate Proof")');
      await generateButton.click();
      
      // Wait for proof generation
      await page.waitForSelector('[data-testid="proof-generated"]', { timeout: 30000 });
    }
    
    const selectiveDisclosureEndTime = performance.now();
    const selectiveDisclosureTime = selectiveDisclosureEndTime - selectiveDisclosureStartTime;
    
    // Verify selective disclosure
    const verifyButton = page.locator('button:has-text("Verify Proof")');
    await verifyButton.click();
    
    await page.waitForSelector('[data-testid="verification-result"]', { timeout: 15000 });
    
    // Check that only selected fields are disclosed
    const disclosedFields = page.locator('[data-testid="disclosed-fields"]');
    await expect(disclosedFields).toContainText('name');
    await expect(disclosedFields).toContainText('age');
    await expect(disclosedFields).not.toContainText('email');
    await expect(disclosedFields).not.toContainText('address');
    
    // Performance assertion
    expect(selectiveDisclosureTime).toBeLessThan(20000); // Less than 20 seconds
    
    console.log(`✅ Selective disclosure proof generated in ${selectiveDisclosureTime.toFixed(2)}ms`);
  });

  test('Membership Proof @performance', async () => {
    console.log('👥 Testing membership proof...');
    
    const membershipProofStartTime = performance.now();
    
    const membershipButton = page.locator('button:has-text("Membership Proof"), [data-testid="membership-proof"]');
    if (await membershipButton.isVisible()) {
      await membershipButton.click();
      
      // Configure membership proof
      const memberIdInput = page.locator('input[data-testid="member-id-input"]');
      await memberIdInput.fill('12345');
      
      const groupIdInput = page.locator('input[data-testid="group-id-input"]');
      await groupIdInput.fill('premium-members');
      
      // Generate proof
      const generateButton = page.locator('button:has-text("Generate Proof")');
      await generateButton.click();
      
      // Wait for proof generation
      await page.waitForSelector('[data-testid="proof-generated"]', { timeout: 30000 });
    }
    
    const membershipProofEndTime = performance.now();
    const membershipProofTime = membershipProofEndTime - membershipProofStartTime;
    
    // Verify membership proof
    const verifyButton = page.locator('button:has-text("Verify Proof")');
    await verifyButton.click();
    
    await page.waitForSelector('[data-testid="verification-result"]', { timeout: 15000 });
    
    const verificationResult = page.locator('[data-testid="verification-result"]');
    await expect(verificationResult).toContainText('Valid');
    
    // Performance assertion
    expect(membershipProofTime).toBeLessThan(25000); // Less than 25 seconds
    
    console.log(`✅ Membership proof generated in ${membershipProofTime.toFixed(2)}ms`);
  });

  test('Batch Proof Processing @performance', async () => {
    console.log('📦 Testing batch proof processing...');
    
    const batchStartTime = performance.now();
    
    const batchProofButton = page.locator('button:has-text("Batch Proof"), [data-testid="batch-proof"]');
    if (await batchProofButton.isVisible()) {
      await batchProofButton.click();
      
      // Configure batch size
      const batchSizeInput = page.locator('input[data-testid="batch-size-input"]');
      await batchSizeInput.fill('5');
      
      // Generate batch proofs
      const generateBatchButton = page.locator('button:has-text("Generate Batch")');
      await generateBatchButton.click();
      
      // Wait for batch completion
      await page.waitForSelector('[data-testid="batch-complete"]', { timeout: 120000 }); // 2 minutes for batch
    }
    
    const batchEndTime = performance.now();
    testMetrics.batchProofTime = batchEndTime - batchStartTime;
    
    // Verify batch results
    const batchResults = page.locator('[data-testid="batch-results"]');
    await expect(batchResults).toBeVisible();
    
    const successCount = page.locator('[data-testid="batch-success-count"]');
    const successText = await successCount.textContent();
    const successNumber = parseInt(successText?.match(/\d+/)?.[0] || '0');
    
    expect(successNumber).toBe(5); // All 5 proofs should succeed
    
    // Performance assertion
    expect(testMetrics.batchProofTime).toBeLessThan(120000); // Less than 2 minutes
    
    console.log(`✅ Batch proof processing completed in ${testMetrics.batchProofTime.toFixed(2)}ms`);
    console.log(`✅ Successfully processed ${successNumber} proofs`);
  });

  test('Circuit Compilation and Optimization @performance', async () => {
    console.log('⚙️ Testing circuit compilation and optimization...');
    
    const compilationStartTime = performance.now();
    
    const compileCircuitButton = page.locator('button:has-text("Compile Circuit"), [data-testid="compile-circuit"]');
    if (await compileCircuitButton.isVisible()) {
      await compileCircuitButton.click();
      
      // Select circuit type
      const circuitSelector = page.locator('select[data-testid="circuit-selector"]');
      await circuitSelector.selectOption('age_verification');
      
      // Start compilation
      const startCompileButton = page.locator('button:has-text("Start Compilation")');
      await startCompileButton.click();
      
      // Wait for compilation
      await page.waitForSelector('[data-testid="compilation-complete"]', { timeout: 60000 });
    }
    
    const compilationEndTime = performance.now();
    testMetrics.circuitCompilationTime = compilationEndTime - compilationStartTime;
    
    // Get circuit constraints
    const constraintsElement = page.locator('[data-testid="circuit-constraints"]');
    if (await constraintsElement.isVisible()) {
      const constraintsText = await constraintsElement.textContent();
      testMetrics.circuitConstraints = parseInt(constraintsText?.match(/\d+/)?.[0] || '0');
    }
    
    // Test witness generation
    const witnessStartTime = performance.now();
    
    const generateWitnessButton = page.locator('button:has-text("Generate Witness")');
    await generateWitnessButton.click();
    
    await page.waitForSelector('[data-testid="witness-generated"]', { timeout: 30000 });
    
    const witnessEndTime = performance.now();
    testMetrics.witnessGenerationTime = witnessEndTime - witnessStartTime;
    
    // Performance assertions
    expect(testMetrics.circuitCompilationTime).toBeLessThan(60000); // Less than 1 minute
    expect(testMetrics.witnessGenerationTime).toBeLessThan(10000); // Less than 10 seconds
    expect(testMetrics.circuitConstraints).toBeLessThan(100000); // Less than 100K constraints
    
    console.log(`✅ Circuit compiled in ${testMetrics.circuitCompilationTime.toFixed(2)}ms`);
    console.log(`✅ Witness generated in ${testMetrics.witnessGenerationTime.toFixed(2)}ms`);
    console.log(`✅ Circuit constraints: ${testMetrics.circuitConstraints}`);
  });

  test('ZK Proof Security Validation @security', async () => {
    console.log('🔒 Testing ZK proof security validation...');
    
    // Test proof tampering detection
    const tamperingButton = page.locator('button:has-text("Test Tampering"), [data-testid="test-tampering"]');
    if (await tamperingButton.isVisible()) {
      await tamperingButton.click();
      
      // Wait for tampering test result
      await page.waitForSelector('[data-testid="tampering-result"]', { timeout: 15000 });
      
      const tamperingResult = page.locator('[data-testid="tampering-result"]');
      await expect(tamperingResult).toContainText('Detected');
    }
    
    // Test nullifier uniqueness
    const nullifierButton = page.locator('button:has-text("Test Nullifier"), [data-testid="test-nullifier"]');
    if (await nullifierButton.isVisible()) {
      await nullifierButton.click();
      
      // Wait for nullifier test result
      await page.waitForSelector('[data-testid="nullifier-result"]', { timeout: 15000 });
      
      const nullifierResult = page.locator('[data-testid="nullifier-result"]');
      await expect(nullifierResult).toContainText('Unique');
    }
    
    // Test replay attack prevention
    const replayButton = page.locator('button:has-text("Test Replay"), [data-testid="test-replay"]');
    if (await replayButton.isVisible()) {
      await replayButton.click();
      
      // Wait for replay test result
      await page.waitForSelector('[data-testid="replay-result"]', { timeout: 15000 });
      
      const replayResult = page.locator('[data-testid="replay-result"]');
      await expect(replayResult).toContainText('Blocked');
    }
    
    console.log('✅ Security validation completed');
  });

  test('ZK Proof Performance Optimization', async () => {
    console.log('⚡ Testing ZK proof performance optimization...');
    
    // Test proof caching
    const cacheButton = page.locator('button:has-text("Test Caching"), [data-testid="test-caching"]');
    if (await cacheButton.isVisible()) {
      await cacheButton.click();
      
      // Generate first proof (should be slow)
      const firstProofStart = performance.now();
      await page.locator('button:has-text("Generate First Proof")').click();
      await page.waitForSelector('[data-testid="first-proof-complete"]', { timeout: 30000 });
      const firstProofTime = performance.now() - firstProofStart;
      
      // Generate second proof (should be faster due to caching)
      const secondProofStart = performance.now();
      await page.locator('button:has-text("Generate Second Proof")').click();
      await page.waitForSelector('[data-testid="second-proof-complete"]', { timeout: 30000 });
      const secondProofTime = performance.now() - secondProofStart;
      
      // Second proof should be significantly faster
      expect(secondProofTime).toBeLessThan(firstProofTime * 0.5); // At least 50% faster
      
      console.log(`✅ First proof: ${firstProofTime.toFixed(2)}ms`);
      console.log(`✅ Second proof: ${secondProofTime.toFixed(2)}ms`);
      console.log(`✅ Performance improvement: ${((firstProofTime - secondProofTime) / firstProofTime * 100).toFixed(1)}%`);
    }
    
    // Test parallel proof generation
    const parallelButton = page.locator('button:has-text("Test Parallel"), [data-testid="test-parallel"]');
    if (await parallelButton.isVisible()) {
      await parallelButton.click();
      
      const parallelStart = performance.now();
      await page.locator('button:has-text("Generate Parallel Proofs")').click();
      await page.waitForSelector('[data-testid="parallel-complete"]', { timeout: 60000 });
      const parallelTime = performance.now() - parallelStart;
      
      // Parallel generation should be more efficient
      expect(parallelTime).toBeLessThan(45000); // Less than 45 seconds for parallel
      
      console.log(`✅ Parallel proof generation: ${parallelTime.toFixed(2)}ms`);
    }
  });

  test.afterAll(async () => {
    // Save performance metrics
    const fs = require('fs');
    const path = require('path');
    
    const testResultsDir = path.join(__dirname, '..', '..', 'test-results');
    const metricsFile = path.join(testResultsDir, 'zk-proof-metrics.json');
    
    const performanceReport = {
      testSuite: 'ZK Proof Testing',
      timestamp: new Date().toISOString(),
      metrics: testMetrics,
      thresholds: {
        proofGenerationTime: 10000,
        proofVerificationTime: 2000,
        batchProofTime: 120000,
        circuitCompilationTime: 60000,
        witnessGenerationTime: 10000,
        maxProofSize: 1000,
        maxCircuitConstraints: 100000
      },
      performance: {
        proofEfficiency: (testMetrics.proofVerificationTime / testMetrics.proofGenerationTime) * 100,
        batchEfficiency: testMetrics.batchProofTime / 5, // Per proof in batch
        circuitEfficiency: testMetrics.circuitConstraints / testMetrics.circuitCompilationTime
      }
    };
    
    fs.writeFileSync(metricsFile, JSON.stringify(performanceReport, null, 2));
    
    console.log('📊 ZK Proof Testing Summary:');
    console.log(`   Proof Generation Time: ${testMetrics.proofGenerationTime.toFixed(2)}ms`);
    console.log(`   Proof Verification Time: ${testMetrics.proofVerificationTime.toFixed(2)}ms`);
    console.log(`   Batch Proof Time: ${testMetrics.batchProofTime.toFixed(2)}ms`);
    console.log(`   Circuit Compilation Time: ${testMetrics.circuitCompilationTime.toFixed(2)}ms`);
    console.log(`   Witness Generation Time: ${testMetrics.witnessGenerationTime.toFixed(2)}ms`);
    console.log(`   Proof Size: ${testMetrics.proofSize} bytes`);
    console.log(`   Circuit Constraints: ${testMetrics.circuitConstraints}`);
    console.log(`   Proof Efficiency: ${performanceReport.performance.proofEfficiency.toFixed(2)}%`);
  });
});