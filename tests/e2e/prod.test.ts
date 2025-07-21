import { test, expect } from '@playwright/test';

// Production E2E tests that hit real endpoints
const PRODUCTION_BASE_URL = process.env.PRODUCTION_BASE_URL || 'https://personapass.xyz';
const PRODUCTION_API_URL = process.env.PRODUCTION_API_URL || 'https://api.personapass.xyz';

test.describe('PersonaPass Production E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to production site
    await page.goto(PRODUCTION_BASE_URL);
  });

  test('should load production homepage', async ({ page }) => {
    // Check that the production site loads
    await expect(page).toHaveTitle(/PersonaPass/);
    
    // Check for key UI elements
    await expect(page.locator('text=Connect Wallet')).toBeVisible();
    await expect(page.locator('text=Decentralized Identity')).toBeVisible();
  });

  test('should connect to production blockchain', async ({ page }) => {
    // Click connect wallet button
    await page.click('text=Connect Wallet');
    
    // Should trigger Keplr wallet connection
    // Note: In actual test, would need to mock wallet or use test wallet
    const connectDialog = page.locator('[data-testid="wallet-connect-dialog"]');
    await expect(connectDialog).toBeVisible();
  });

  test('should create DID on production blockchain', async ({ page }) => {
    // Skip if no test wallet available
    test.skip(!process.env.TEST_WALLET_MNEMONIC, 'No test wallet configured');
    
    // Connect test wallet (would need wallet automation)
    // Navigate to DID creation
    await page.goto(`${PRODUCTION_BASE_URL}/create-did`);
    
    // Fill DID creation form
    await page.fill('[data-testid="did-id-input"]', `did:persona:test-${Date.now()}`);
    
    // Submit DID creation
    await page.click('[data-testid="create-did-button"]');
    
    // Wait for blockchain confirmation
    await expect(page.locator('text=DID created successfully')).toBeVisible({ timeout: 30000 });
    
    // Verify DID appears in list
    await page.goto(`${PRODUCTION_BASE_URL}/dashboard`);
    await expect(page.locator('[data-testid="current-did"]')).toBeVisible();
  });

  test('should issue credential on production blockchain', async ({ page }) => {
    test.skip(!process.env.TEST_WALLET_MNEMONIC, 'No test wallet configured');
    
    // Navigate to credential templates
    await page.goto(`${PRODUCTION_BASE_URL}/templates`);
    
    // Select age verification template
    await page.click('[data-testid="template-age-verification"]');
    
    // Fill credential form
    await page.fill('[data-testid="birth-year-input"]', '1990');
    await page.fill('[data-testid="full-name-input"]', 'Test User');
    
    // Submit credential issuance
    await page.click('[data-testid="issue-credential-button"]');
    
    // Wait for blockchain confirmation
    await expect(page.locator('text=Credential issued successfully')).toBeVisible({ timeout: 30000 });
    
    // Verify credential appears in list
    await page.goto(`${PRODUCTION_BASE_URL}/credentials`);
    await expect(page.locator('[data-testid="credential-list"]')).toContainText('Age Verification');
  });

  test('should generate real ZK proof on production', async ({ page }) => {
    test.skip(!process.env.TEST_WALLET_MNEMONIC, 'No test wallet configured');
    
    // Navigate to proof generation
    await page.goto(`${PRODUCTION_BASE_URL}/generate-proof`);
    
    // Select credential for proof
    await page.selectOption('[data-testid="credential-select"]', 'age-verification');
    
    // Set minimum age requirement
    await page.fill('[data-testid="min-age-input"]', '18');
    
    // Generate proof
    await page.click('[data-testid="generate-proof-button"]');
    
    // Wait for ZK proof generation (this takes time with real circuits)
    await expect(page.locator('text=Generating proof')).toBeVisible();
    await expect(page.locator('text=Proof generated successfully')).toBeVisible({ timeout: 60000 });
    
    // Verify proof details are shown
    await expect(page.locator('[data-testid="proof-tx-hash"]')).toBeVisible();
    await expect(page.locator('[data-testid="proof-verified-status"]')).toContainText('Verified');
  });

  test('should verify credential through use case flow', async ({ page }) => {
    // Navigate to verification flow
    await page.goto(`${PRODUCTION_BASE_URL}/verify`);
    
    // Select bar entry use case
    await page.click('[data-testid="use-case-bar"]');
    
    // Enter DID to verify
    const testDid = `did:persona:test-${Date.now()}`;
    await page.fill('[data-testid="did-lookup-input"]', testDid);
    
    // Fetch requirements
    await page.click('[data-testid="fetch-requirements-button"]');
    
    // Should show age verification requirement
    await expect(page.locator('text=Age Verification')).toBeVisible();
    
    // Note: Full verification would require the DID to have credentials
    // In production test, this would verify against real blockchain data
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Test error handling by making invalid API calls
    const response = await page.request.post(`${PRODUCTION_API_URL}/api/prove/invalid`, {
      data: { invalid: 'data' }
    });
    
    expect(response.status()).toBe(404);
  });

  test('should display transaction links to explorer', async ({ page }) => {
    test.skip(!process.env.TEST_WALLET_MNEMONIC, 'No test wallet configured');
    
    // After generating a proof (from previous test flow)
    await page.goto(`${PRODUCTION_BASE_URL}/proofs`);
    
    // Should have links to blockchain explorer
    const explorerLinks = page.locator('[data-testid="explorer-link"]');
    await expect(explorerLinks.first()).toBeVisible();
    
    // Links should point to real blockchain explorer
    const href = await explorerLinks.first().getAttribute('href');
    expect(href).toContain('tx/0x'); // Real transaction hash format
  });

  test('should validate production blockchain connectivity', async ({ page }) => {
    // Test that the frontend can connect to production blockchain
    const response = await page.request.get(`${PRODUCTION_API_URL}/health`);
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.chain_id).toBe('persona-mainnet-1');
  });

  test('should validate production API endpoints', async ({ page }) => {
    // Test all major API endpoints are responding
    const endpoints = [
      '/api/did/list',
      '/api/vc/list', 
      '/api/zk/circuits',
      '/api/health',
      '/api/status'
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(`${PRODUCTION_API_URL}${endpoint}`);
      expect(response.status()).toBeLessThan(500); // Should not have server errors
    }
  });

  test('should validate ZK circuit availability', async ({ page }) => {
    // Check that all required circuits are available
    const response = await page.request.get(`${PRODUCTION_API_URL}/api/zk/circuits`);
    expect(response.status()).toBe(200);
    
    const circuits = await response.json();
    expect(circuits.success).toBe(true);
    
    // Verify all expected circuits are present
    const expectedCircuits = [
      'age_verification',
      'employment_verification', 
      'education_verification',
      'financial_verification',
      'health_verification',
      'location_verification'
    ];
    
    const circuitIds = circuits.data.circuits.map((c: any) => c.circuit_id);
    for (const expected of expectedCircuits) {
      expect(circuitIds).toContain(expected);
    }
  });

  test('should maintain session state across navigation', async ({ page }) => {
    test.skip(!process.env.TEST_WALLET_MNEMONIC, 'No test wallet configured');
    
    // Connect wallet on homepage
    await page.goto(PRODUCTION_BASE_URL);
    // ... wallet connection flow ...
    
    // Navigate to different pages
    await page.goto(`${PRODUCTION_BASE_URL}/dashboard`);
    await page.goto(`${PRODUCTION_BASE_URL}/credentials`);
    await page.goto(`${PRODUCTION_BASE_URL}/proofs`);
    
    // Wallet should remain connected throughout
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
  });

  test('should handle concurrent proof generation', async ({ page }) => {
    test.skip(!process.env.TEST_WALLET_MNEMONIC, 'No test wallet configured');
    
    // Test that multiple proof generation requests are handled correctly
    // This would require having multiple credentials and generating proofs concurrently
    // Important for production load testing
    
    const proofPromises = [];
    for (let i = 0; i < 3; i++) {
      proofPromises.push(
        page.request.post(`${PRODUCTION_API_URL}/api/prove/age`, {
          data: {
            credential: { /* test credential */ },
            publicInputs: { currentYear: 2025, minAge: 18 },
            privateInputs: { birthYear: 1990 }
          }
        })
      );
    }
    
    const responses = await Promise.all(proofPromises);
    
    // All requests should succeed or fail gracefully
    responses.forEach(response => {
      expect([200, 400, 429]).toContain(response.status()); // Success, validation error, or rate limit
    });
  });
});

test.describe('Production Security Tests', () => {
  test('should reject malicious inputs in proof generation', async ({ page }) => {
    const maliciousInputs = [
      { birthYear: -1 },
      { birthYear: 'DROP TABLE users;' },
      { birthYear: '<script>alert("xss")</script>' },
      { birthYear: Number.MAX_SAFE_INTEGER }
    ];
    
    for (const input of maliciousInputs) {
      const response = await page.request.post(`${PRODUCTION_API_URL}/api/prove/age`, {
        data: {
          credential: {},
          publicInputs: { currentYear: 2025, minAge: 18 },
          privateInputs: input
        }
      });
      
      // Should reject malicious inputs
      expect([400, 422]).toContain(response.status());
    }
  });

  test('should validate HTTPS and security headers', async ({ page }) => {
    const response = await page.request.get(PRODUCTION_BASE_URL);
    
    // Should use HTTPS in production
    expect(PRODUCTION_BASE_URL).toMatch(/^https:/);
    
    // Should have security headers
    const headers = response.headers();
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeDefined();
  });
});

test.describe('Production Performance Tests', () => {
  test('should load homepage within performance budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(PRODUCTION_BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Homepage should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle API rate limiting', async ({ page }) => {
    // Make many requests quickly to test rate limiting
    const requests = Array(20).fill(null).map(() => 
      page.request.get(`${PRODUCTION_API_URL}/api/health`)
    );
    
    const responses = await Promise.all(requests);
    
    // Some requests might be rate limited (429) but service should remain available
    const successfulRequests = responses.filter(r => r.status() === 200);
    expect(successfulRequests.length).toBeGreaterThan(10); // Most should succeed
  });
});