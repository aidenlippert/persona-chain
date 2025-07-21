import { Page } from 'puppeteer';
import { BrowserManager } from '../src/utils/browser';
import { TestnetClient } from '../src/utils/testnet';

describe('UI End-to-End Tests', () => {
  let browserManager: BrowserManager;
  let page: Page;
  let client: TestnetClient;

  beforeAll(async () => {
    browserManager = new BrowserManager({
      headless: process.env.HEADLESS !== 'false',
      devtools: process.env.DEVTOOLS === 'true',
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    });
    
    client = new TestnetClient();
    page = await browserManager.createPage();
  });

  afterAll(async () => {
    await browserManager.close();
  });

  describe('DID Creation Workflow', () => {
    test('should create a new DID through UI', async () => {
      // Navigate to DID creation page
      await page.goto('http://localhost:3000/create-did', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'did-creation-page');

      // Check if the page loaded correctly
      const title = await browserManager.getText(page, 'h1');
      expect(title).toMatch(/create.*did/i);

      // Fill out DID creation form
      await browserManager.fillForm(page, {
        '#did-id': 'did:persona:e2e-test-001',
        '#controller': 'cosmos1test1',
        '#public-key': '{"type":"Ed25519","value":"test-key"}',
      });

      // Submit the form
      await browserManager.clickAndWaitForNavigation(page, '#submit-did');

      await browserManager.takeScreenshot(page, 'did-creation-success');

      // Verify success message
      const successMessage = await browserManager.getText(page, '.success-message');
      expect(successMessage).toMatch(/success/i);

      // Verify transaction hash is displayed
      const txHashElement = await page.$('.tx-hash');
      expect(txHashElement).toBeTruthy();
      
      const txHash = await browserManager.getText(page, '.tx-hash');
      expect(txHash).toBeValidTxHash();
    });

    test('should handle DID creation validation errors', async () => {
      await page.goto('http://localhost:3000/create-did', { 
        waitUntil: 'networkidle0' 
      });

      // Try to submit with invalid DID format
      await browserManager.fillForm(page, {
        '#did-id': 'invalid-did-format',
        '#controller': '',
      });

      await page.click('#submit-did');

      // Check for validation errors
      const errorMessages = await page.$$('.error-message');
      expect(errorMessages.length).toBeGreaterThan(0);

      await browserManager.takeScreenshot(page, 'did-creation-validation-error');
    });
  });

  describe('ZK Proof Generation Workflow', () => {
    test('should generate ZK proof through UI', async () => {
      await page.goto('http://localhost:3000/prove', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'zk-proof-page');

      // Select a circuit
      await page.select('#circuit-selector', 'circuit_001');

      // Fill proof inputs
      await browserManager.fillForm(page, {
        '#private-inputs': '{"age": 25, "secret": "test"}',
        '#public-inputs': '{"min_age": 18}',
      });

      // Generate proof
      await page.click('#generate-proof');

      // Wait for proof generation (this might take time in real scenario)
      await browserManager.waitForText(page, '.proof-status', 'Generated', 10000);

      await browserManager.takeScreenshot(page, 'zk-proof-generated');

      // Verify proof is displayed
      const proofData = await browserManager.getText(page, '.proof-data');
      expect(proofData).toBeTruthy();
      expect(proofData.length).toBeGreaterThan(10);

      // Submit proof to chain
      await page.click('#submit-proof');

      await browserManager.waitForText(page, '.submission-status', 'Success', 5000);

      const txHash = await browserManager.getText(page, '.proof-tx-hash');
      expect(txHash).toBeValidTxHash();
    });

    test('should handle invalid circuit selection', async () => {
      await page.goto('http://localhost:3000/prove', { 
        waitUntil: 'networkidle0' 
      });

      // Try to generate proof without selecting circuit
      await page.click('#generate-proof');

      const errorMessage = await browserManager.getText(page, '.error-message');
      expect(errorMessage).toMatch(/circuit.*required/i);

      await browserManager.takeScreenshot(page, 'zk-proof-circuit-error');
    });
  });

  describe('VC Management Workflow', () => {
    test('should display VC list and details', async () => {
      await page.goto('http://localhost:3000/vcs', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'vc-list-page');

      // Wait for VCs to load
      await browserManager.waitForSelector(page, '.vc-list-item');

      // Check that VCs are displayed
      const vcItems = await page.$$('.vc-list-item');
      expect(vcItems.length).toBeGreaterThan(0);

      // Click on first VC to view details
      await page.click('.vc-list-item:first-child .view-details');

      await browserManager.waitForSelector(page, '.vc-details');
      await browserManager.takeScreenshot(page, 'vc-details');

      // Verify VC details are shown
      const vcId = await browserManager.getText(page, '.vc-id');
      expect(vcId).toBeTruthy();

      const issuerDid = await browserManager.getText(page, '.vc-issuer');
      expect(issuerDid).toBeValidDID();

      const subjectDid = await browserManager.getText(page, '.vc-subject');
      expect(subjectDid).toBeValidDID();
    });

    test('should handle VC revocation', async () => {
      await page.goto('http://localhost:3000/vcs', { 
        waitUntil: 'networkidle0' 
      });

      // Find a VC that can be revoked
      await browserManager.waitForSelector(page, '.vc-list-item');
      
      const revokeButton = await page.$('.vc-list-item .revoke-button');
      if (revokeButton) {
        await page.click('.vc-list-item .revoke-button');

        // Confirm revocation
        await browserManager.waitForSelector(page, '.revoke-confirmation');
        await page.click('.confirm-revoke');

        // Wait for revocation to complete
        await browserManager.waitForText(page, '.revocation-status', 'Revoked', 5000);

        await browserManager.takeScreenshot(page, 'vc-revoked');

        const txHash = await browserManager.getText(page, '.revocation-tx-hash');
        expect(txHash).toBeValidTxHash();
      }
    });
  });

  describe('Navigation and Layout', () => {
    test('should navigate between pages correctly', async () => {
      // Test main navigation
      await page.goto('http://localhost:3000', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'home-page');

      // Navigate to DIDs
      await page.click('nav a[href="/create-did"]');
      await page.waitForSelector('h1');
      
      let title = await browserManager.getText(page, 'h1');
      expect(title).toMatch(/create.*did/i);

      // Navigate to Proofs
      await page.click('nav a[href="/prove"]');
      await page.waitForSelector('h1');
      
      title = await browserManager.getText(page, 'h1');
      expect(title).toMatch(/prove|proof/i);

      // Navigate to VCs
      await page.click('nav a[href="/vcs"]');
      await page.waitForSelector('h1');
      
      title = await browserManager.getText(page, 'h1');
      expect(title).toMatch(/credential|vc/i);
    });

    test('should display chain status in header', async () => {
      await page.goto('http://localhost:3000', { 
        waitUntil: 'networkidle0' 
      });

      // Check for chain status indicator
      const chainStatus = await browserManager.isElementVisible(page, '.chain-status');
      expect(chainStatus).toBe(true);

      const statusText = await browserManager.getText(page, '.chain-status');
      expect(statusText).toMatch(/connected|online|healthy/i);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network error by navigating to invalid endpoint
      await page.goto('http://localhost:3000/invalid-page', { 
        waitUntil: 'networkidle0' 
      });

      // Should show 404 or error page
      const pageContent = await page.content();
      expect(pageContent).toMatch(/404|not found|error/i);

      await browserManager.takeScreenshot(page, 'error-page');
    });

    test('should handle API timeouts', async () => {
      await page.goto('http://localhost:3000/create-did', { 
        waitUntil: 'networkidle0' 
      });

      // Mock a long-running request by intercepting
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        if (request.url().includes('/cosmos/tx/v1beta1/txs')) {
          // Simulate timeout
          setTimeout(() => {
            request.respond({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Request timeout' }),
            });
          }, 100);
        } else {
          request.continue();
        }
      });

      // Try to submit a transaction
      await browserManager.fillForm(page, {
        '#did-id': 'did:persona:timeout-test',
        '#controller': 'cosmos1test1',
      });

      await page.click('#submit-did');

      // Should show timeout error
      await browserManager.waitForText(page, '.error-message', 'timeout', 5000);

      await browserManager.takeScreenshot(page, 'timeout-error');
    });
  });
});