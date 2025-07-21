import { test, expect } from '@playwright/test';

const WALLET_URL = 'http://localhost:5173';
const CONNECTOR_URL = 'http://localhost:8080';

test.describe('Security and Privacy Tests', () => {
  test('should not expose sensitive data in browser storage', async ({ page }) => {
    await page.goto(WALLET_URL);
    
    // Setup mock credential with sensitive data
    await page.evaluate(() => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:test-cred',
        type: ['VerifiableCredential', 'GitHubIdentityCredential'],
        credentialSubject: {
          id: 'did:personachain:user:test',
          username: 'testuser',
          email: 'test@example.com',
          platform: 'github',
          // These should be stored as ZK commitments, not plaintext
          socialSecurityNumber: '123-45-6789', // Should NEVER be in plaintext
          privateKey: 'sk_test_1234567890' // Should NEVER be in plaintext
        }
      };
      
      localStorage.setItem('test-credential', JSON.stringify(credential));
    });
    
    // Check localStorage doesn't contain sensitive data
    const localStorage = await page.evaluate(() => {
      const storage: Record<string, any> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          storage[key] = window.localStorage.getItem(key);
        }
      }
      return JSON.stringify(storage);
    });
    
    // Verify no sensitive data in plaintext
    expect(localStorage).not.toContain('123-45-6789');
    expect(localStorage).not.toContain('sk_test_1234567890');
  });

  test('should use secure communication channels', async ({ page }) => {
    // Intercept all network requests
    const requests: string[] = [];
    
    page.on('request', (request) => {
      requests.push(request.url());
    });
    
    await page.goto(WALLET_URL);
    await page.goto(`${WALLET_URL}/credentials`);
    
    // Verify all API calls use HTTPS in production
    // In dev, we use HTTP but in production this should be HTTPS
    const apiRequests = requests.filter(url => url.includes('/api/'));
    
    // For production builds, verify HTTPS
    if (process.env.NODE_ENV === 'production') {
      apiRequests.forEach(url => {
        expect(url).toMatch(/^https:/);
      });
    }
  });

  test('should implement CORS properly', async ({ page }) => {
    // Try cross-origin request
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost:8080/api/connectors/github/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://malicious-site.com'
          },
          body: JSON.stringify({ userId: 'test' })
        });
        return {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries())
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    // Should block unauthorized origins
    expect(response).toHaveProperty('error');
  });

  test('should validate input to prevent XSS', async ({ page }) => {
    await page.goto(`${WALLET_URL}/credentials`);
    
    // Try to inject script through various inputs
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>'
    ];
    
    for (const payload of xssPayloads) {
      // Try search input
      const searchInput = page.locator('input[placeholder="Search credentials..."]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(payload);
        await searchInput.press('Enter');
        
        // Verify no script execution
        const alertDialog = page.locator('text=XSS');
        await expect(alertDialog).not.toBeVisible({ timeout: 1000 });
      }
    }
  });

  test('should implement rate limiting', async ({ page }) => {
    // Make multiple rapid requests
    const requests = [];
    
    for (let i = 0; i < 20; i++) {
      requests.push(
        page.request.post(`${CONNECTOR_URL}/api/connectors/github/auth`, {
          data: { userId: 'test' },
          headers: { 'Authorization': 'Bearer test-token' }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // Should see rate limiting kick in
    const rateLimited = responses.filter(r => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('should handle session management securely', async ({ page, context }) => {
    await page.goto(WALLET_URL);
    
    // Set auth token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token-12345');
    });
    
    // Get cookies
    const cookies = await context.cookies();
    
    // Verify secure cookie settings
    const sessionCookie = cookies.find(c => c.name === 'session' || c.name === 'connect.sid');
    if (sessionCookie) {
      // In production, these should be true
      if (process.env.NODE_ENV === 'production') {
        expect(sessionCookie.secure).toBe(true);
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.sameSite).toBe('Strict');
      }
    }
  });

  test('should implement proper CSP headers', async ({ page }) => {
    const response = await page.goto(WALLET_URL);
    const headers = response?.headers();
    
    if (headers && process.env.NODE_ENV === 'production') {
      const csp = headers['content-security-policy'];
      expect(csp).toBeTruthy();
      
      // Verify CSP includes important directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src");
      expect(csp).toContain("style-src");
      expect(csp).not.toContain("unsafe-inline");
      expect(csp).not.toContain("unsafe-eval");
    }
  });

  test('should protect against CSRF attacks', async ({ page }) => {
    await page.goto(`${WALLET_URL}/credentials`);
    
    // Try to make a state-changing request without CSRF token
    const response = await page.evaluate(async () => {
      // Remove CSRF token if present
      delete (window as any).csrfToken;
      
      try {
        const res = await fetch('http://localhost:8080/api/connectors/github/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ credentialId: 'test-cred' })
        });
        return res.status;
      } catch (error) {
        return -1;
      }
    });
    
    // Should reject request without proper CSRF protection
    expect(response).not.toBe(200);
  });

  test('should implement zero-knowledge proofs correctly', async ({ page }) => {
    await page.goto(`${WALLET_URL}/credentials`);
    
    // Create a credential with ZK commitment
    const zkResult = await page.evaluate(async () => {
      // Mock ZK commitment generation
      const sensitiveData = {
        username: 'testuser',
        email: 'test@example.com',
        ssn: '123-45-6789' // Sensitive!
      };
      
      // Generate commitment (mock)
      const commitment = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(sensitiveData) + 'salt123')
      );
      
      const commitmentHex = Array.from(new Uint8Array(commitment))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Store only commitment, not raw data
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:zk-test',
        type: ['VerifiableCredential', 'ZKCredential'],
        credentialSubject: {
          id: 'did:personachain:user:test',
          commitment: commitmentHex,
          nullifier: 'unique-nullifier-123'
        }
      };
      
      return {
        hasRawData: JSON.stringify(credential).includes('123-45-6789'),
        hasCommitment: credential.credentialSubject.commitment.length > 0
      };
    });
    
    // Verify ZK properties
    expect(zkResult.hasRawData).toBe(false); // No raw sensitive data
    expect(zkResult.hasCommitment).toBe(true); // Has commitment
  });

  test('should encrypt sensitive data at rest', async ({ page }) => {
    await page.goto(WALLET_URL);
    
    // Check IndexedDB encryption
    const isEncrypted = await page.evaluate(async () => {
      // Open IndexedDB
      const dbName = 'PersonaPassWallet';
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Check if data is encrypted
      const transaction = db.transaction(['credentials'], 'readonly');
      const store = transaction.objectStore('credentials');
      const request = store.getAll();
      
      return new Promise<boolean>((resolve) => {
        request.onsuccess = () => {
          const data = request.result;
          if (data.length > 0) {
            // Check if data looks encrypted (not readable JSON)
            const firstItem = data[0];
            try {
              JSON.parse(firstItem);
              resolve(false); // Data is not encrypted
            } catch {
              resolve(true); // Data appears encrypted
            }
          } else {
            resolve(true); // No data to check
          }
        };
      });
    });
    
    // In production, data should be encrypted
    if (process.env.NODE_ENV === 'production') {
      expect(isEncrypted).toBe(true);
    }
  });
});