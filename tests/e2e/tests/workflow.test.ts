import { Page } from 'puppeteer';
import { BrowserManager } from '../src/utils/browser';
import { TestnetClient } from '../src/utils/testnet';

describe('Complete Workflow Tests', () => {
  let browserManager: BrowserManager;
  let page: Page;
  let client: TestnetClient;

  beforeAll(async () => {
    browserManager = new BrowserManager({
      headless: process.env.HEADLESS !== 'false',
      devtools: process.env.DEVTOOLS === 'true',
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 50,
    });
    
    client = new TestnetClient();
    page = await browserManager.createPage();
  });

  afterAll(async () => {
    await browserManager.close();
  });

  describe('Complete DID + VC + ZK Workflow', () => {
    let createdDID: string;
    let vcId: string;
    let proofId: string;

    test('Step 1: Create a new DID identity', async () => {
      await page.goto('http://localhost:3000/create-did', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'workflow-step1-did-creation');

      // Generate unique DID for this test run
      const timestamp = Date.now();
      createdDID = `did:persona:workflow-${timestamp}`;

      await browserManager.fillForm(page, {
        '#did-id': createdDID,
        '#controller': 'cosmos1test1',
        '#public-key': JSON.stringify({
          type: 'Ed25519',
          value: `test-key-${timestamp}`,
        }),
        '#service-endpoints': JSON.stringify([
          {
            id: '#endpoint1',
            type: 'ProfileService',
            serviceEndpoint: `https://example.com/profile/${timestamp}`,
          },
        ]),
      });

      await browserManager.clickAndWaitForNavigation(page, '#submit-did');

      // Verify DID creation success
      const successMessage = await browserManager.getText(page, '.success-message');
      expect(successMessage).toMatch(/success/i);

      const txHash = await browserManager.getText(page, '.tx-hash');
      expect(txHash).toBeValidTxHash();

      await browserManager.takeScreenshot(page, 'workflow-step1-complete');

      // Verify DID exists via API
      const didResponse = await client.getDID(createdDID);
      expect(didResponse.did_document.id).toBe(createdDID);
      expect(didResponse.did_document.is_active).toBe(true);
    });

    test('Step 2: Issue a Verifiable Credential', async () => {
      await page.goto('http://localhost:3000/issue-vc', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'workflow-step2-vc-issuance');

      const timestamp = Date.now();
      vcId = `vc-workflow-${timestamp}`;

      await browserManager.fillForm(page, {
        '#vc-id': vcId,
        '#issuer-did': createdDID,
        '#subject-did': 'did:persona:subject-test',
        '#credential-type': 'AgeVerification',
        '#credential-data': JSON.stringify({
          age: 25,
          country: 'US',
          verified_at: timestamp,
        }),
        '#expiry-days': '365',
      });

      await page.click('#issue-vc');

      // Wait for VC issuance
      await browserManager.waitForText(page, '.issuance-status', 'Issued', 10000);

      await browserManager.takeScreenshot(page, 'workflow-step2-complete');

      const vcTxHash = await browserManager.getText(page, '.vc-tx-hash');
      expect(vcTxHash).toBeValidTxHash();

      // Verify VC exists via API
      const vcsResponse = await client.listVCs();
      const issuedVC = vcsResponse.vc_records.find(vc => vc.id === vcId);
      expect(issuedVC).toBeTruthy();
      expect(issuedVC?.issuer_did).toBe(createdDID);
    });

    test('Step 3: Generate ZK Proof using the VC', async () => {
      await page.goto('http://localhost:3000/prove', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'workflow-step3-zk-proof');

      // Select age verification circuit
      await page.select('#circuit-selector', 'age_verification_circuit');

      // Use the VC data for proof generation
      await browserManager.fillForm(page, {
        '#vc-reference': vcId,
        '#private-inputs': JSON.stringify({
          age: 25,
          country: 'US',
          secret_nonce: 'random_secret_123',
        }),
        '#public-inputs': JSON.stringify({
          min_age: 18,
          required_country: 'US',
        }),
        '#proof-purpose': 'Age verification for service access',
      });

      await page.click('#generate-proof');

      // Wait for proof generation
      await browserManager.waitForText(page, '.proof-status', 'Generated', 15000);

      await browserManager.takeScreenshot(page, 'workflow-step3-proof-generated');

      // Verify proof data
      const proofData = await browserManager.getText(page, '.proof-data');
      expect(proofData).toBeTruthy();
      expect(proofData.length).toBeGreaterThan(50);

      // Submit proof to chain
      await page.click('#submit-proof');

      await browserManager.waitForText(page, '.submission-status', 'Verified', 10000);

      const proofTxHash = await browserManager.getText(page, '.proof-tx-hash');
      expect(proofTxHash).toBeValidTxHash();

      // Get proof ID for verification
      proofId = await browserManager.getText(page, '.proof-id');
      expect(proofId).toBeTruthy();

      await browserManager.takeScreenshot(page, 'workflow-step3-complete');

      // Verify proof via API
      const proofsResponse = await client.listZKProofs();
      const submittedProof = proofsResponse.zk_proofs.find(proof => proof.id === proofId);
      expect(submittedProof).toBeTruthy();
      expect(submittedProof?.is_verified).toBe(true);
    });

    test('Step 4: Verify the complete identity chain', async () => {
      await page.goto('http://localhost:3000/identity-verification', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'workflow-step4-verification');

      // Enter the proof ID for verification
      await browserManager.fillForm(page, {
        '#proof-id': proofId,
      });

      await page.click('#verify-identity');

      // Wait for verification process
      await browserManager.waitForText(page, '.verification-status', 'Valid', 10000);

      await browserManager.takeScreenshot(page, 'workflow-step4-verification-success');

      // Check verification details
      const verificationDetails = await page.$('.verification-details');
      expect(verificationDetails).toBeTruthy();

      const didStatus = await browserManager.getText(page, '.did-status');
      expect(didStatus).toMatch(/active|valid/i);

      const vcStatus = await browserManager.getText(page, '.vc-status');
      expect(vcStatus).toMatch(/valid|not revoked/i);

      const proofStatus = await browserManager.getText(page, '.proof-status');
      expect(proofStatus).toMatch(/verified|valid/i);

      const proofAge = await browserManager.getText(page, '.proof-age-result');
      expect(proofAge).toMatch(/18|over|valid/i);
    });

    test('Step 5: Revoke VC and verify proof invalidation', async () => {
      await page.goto('http://localhost:3000/vcs', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'workflow-step5-vc-revocation');

      // Find the VC we created
      await browserManager.waitForSelector(page, '.vc-list-item');
      
      // Use VC ID to find specific VC
      await page.evaluate((vcId) => {
        const vcItems = document.querySelectorAll('.vc-list-item');
        for (const item of Array.from(vcItems)) {
          const idElement = item.querySelector('.vc-id');
          if (idElement && idElement.textContent?.includes(vcId)) {
            const revokeButton = item.querySelector('.revoke-button') as HTMLElement;
            if (revokeButton) {
              revokeButton.click();
            }
            break;
          }
        }
      }, vcId);

      // Confirm revocation
      await browserManager.waitForSelector(page, '.revoke-confirmation');
      await browserManager.fillForm(page, {
        '#revocation-reason': 'Test workflow completion',
      });

      await page.click('.confirm-revoke');

      // Wait for revocation to complete
      await browserManager.waitForText(page, '.revocation-status', 'Revoked', 10000);

      await browserManager.takeScreenshot(page, 'workflow-step5-vc-revoked');

      const revocationTxHash = await browserManager.getText(page, '.revocation-tx-hash');
      expect(revocationTxHash).toBeValidTxHash();

      // Verify VC is now revoked via API
      const vcsResponse = await client.listVCs();
      const revokedVC = vcsResponse.vc_records.find(vc => vc.id === vcId);
      expect(revokedVC?.is_revoked).toBe(true);
    });

    test('Step 6: Verify proof invalidation after VC revocation', async () => {
      await page.goto('http://localhost:3000/identity-verification', { 
        waitUntil: 'networkidle0' 
      });

      await browserManager.takeScreenshot(page, 'workflow-step6-proof-invalidation');

      // Try to verify the same proof again
      await browserManager.fillForm(page, {
        '#proof-id': proofId,
      });

      await page.click('#verify-identity');

      // Should now show invalid due to revoked VC
      await browserManager.waitForText(page, '.verification-status', 'Invalid', 10000);

      await browserManager.takeScreenshot(page, 'workflow-step6-proof-invalid');

      const errorReason = await browserManager.getText(page, '.verification-error');
      expect(errorReason).toMatch(/revoked|invalid|expired/i);

      const vcStatus = await browserManager.getText(page, '.vc-status');
      expect(vcStatus).toMatch(/revoked|invalid/i);
    });
  });

  describe('Multi-User Workflow', () => {
    test('should handle multiple users interacting with the system', async () => {
      const timestamp = Date.now();
      
      // User 1: Create DID and issue VC
      const user1DID = `did:persona:user1-${timestamp}`;
      const user2DID = `did:persona:user2-${timestamp}`;

      // Create User 1 DID
      await page.goto('http://localhost:3000/create-did');
      await browserManager.fillForm(page, {
        '#did-id': user1DID,
        '#controller': 'cosmos1user1',
        '#public-key': JSON.stringify({ type: 'Ed25519', value: 'user1-key' }),
      });
      await browserManager.clickAndWaitForNavigation(page, '#submit-did');

      await browserManager.takeScreenshot(page, 'multi-user-user1-did');

      // Create User 2 DID
      await page.goto('http://localhost:3000/create-did');
      await browserManager.fillForm(page, {
        '#did-id': user2DID,
        '#controller': 'cosmos1user2',
        '#public-key': JSON.stringify({ type: 'Ed25519', value: 'user2-key' }),
      });
      await browserManager.clickAndWaitForNavigation(page, '#submit-did');

      // User 1 issues VC to User 2
      await page.goto('http://localhost:3000/issue-vc');
      const vcId = `multi-user-vc-${timestamp}`;
      
      await browserManager.fillForm(page, {
        '#vc-id': vcId,
        '#issuer-did': user1DID,
        '#subject-did': user2DID,
        '#credential-type': 'Employment',
        '#credential-data': JSON.stringify({
          company: 'Test Corp',
          position: 'Developer',
          start_date: '2023-01-01',
        }),
      });

      await page.click('#issue-vc');
      await browserManager.waitForText(page, '.issuance-status', 'Issued', 10000);

      await browserManager.takeScreenshot(page, 'multi-user-vc-issued');

      // User 2 generates proof using the VC
      await page.goto('http://localhost:3000/prove');
      await page.select('#circuit-selector', 'employment_verification_circuit');
      
      await browserManager.fillForm(page, {
        '#vc-reference': vcId,
        '#private-inputs': JSON.stringify({
          company: 'Test Corp',
          position: 'Developer',
          years_experience: 5,
        }),
        '#public-inputs': JSON.stringify({
          required_experience: 2,
        }),
      });

      await page.click('#generate-proof');
      await browserManager.waitForText(page, '.proof-status', 'Generated', 15000);

      await page.click('#submit-proof');
      await browserManager.waitForText(page, '.submission-status', 'Verified', 10000);

      await browserManager.takeScreenshot(page, 'multi-user-proof-complete');

      // Verify all entities exist via API
      const didResponse1 = await client.getDID(user1DID);
      const didResponse2 = await client.getDID(user2DID);
      
      expect(didResponse1.did_document.is_active).toBe(true);
      expect(didResponse2.did_document.is_active).toBe(true);

      const vcsResponse = await client.listVCs();
      const issuedVC = vcsResponse.vc_records.find(vc => vc.id === vcId);
      expect(issuedVC?.issuer_did).toBe(user1DID);
      expect(issuedVC?.subject_did).toBe(user2DID);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle rapid sequential operations', async () => {
      const timestamp = Date.now();
      const operations = [];

      // Perform multiple operations rapidly
      for (let i = 0; i < 5; i++) {
        operations.push(async () => {
          const did = `did:persona:load-test-${timestamp}-${i}`;
          
          await page.goto('http://localhost:3000/create-did');
          await browserManager.fillForm(page, {
            '#did-id': did,
            '#controller': `cosmos1test${i}`,
            '#public-key': JSON.stringify({ type: 'Ed25519', value: `key-${i}` }),
          });
          
          await page.click('#submit-did');
          await browserManager.waitForText(page, '.success-message', 'success', 5000);
          
          return did;
        });
      }

      // Execute all operations
      const results = await Promise.allSettled(operations.map(op => op()));
      
      // Verify most operations succeeded
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThanOrEqual(3); // Allow some failures under load

      await browserManager.takeScreenshot(page, 'load-test-complete');
    });
  });
});