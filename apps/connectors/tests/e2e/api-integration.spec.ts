import { test, expect } from '@playwright/test';

const CONNECTOR_URL = 'http://localhost:8080';

test.describe('Connector API Integration Tests', () => {
  test('health check endpoint should be accessible', async ({ request }) => {
    const response = await request.get(`${CONNECTOR_URL}/health`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
  });

  test('should require authentication for connector endpoints', async ({ request }) => {
    const response = await request.post(`${CONNECTOR_URL}/api/connectors/github/auth`, {
      data: { userId: 'test' }
    });
    
    expect(response.status()).toBe(401);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
  });

  test('GitHub OAuth initiation should return proper auth URL', async ({ request }) => {
    const response = await request.post(`${CONNECTOR_URL}/api/connectors/github/auth`, {
      data: { 
        userId: 'test-user-123',
        callbackUrl: 'http://localhost:5173/credentials'
      },
      headers: {
        'Authorization': 'Bearer test-token-12345',
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('authUrl');
    expect(data).toHaveProperty('sessionId');
    
    // Verify OAuth URL structure
    const authUrl = new URL(data.authUrl);
    expect(authUrl.hostname).toBe('github.com');
    expect(authUrl.pathname).toBe('/login/oauth/authorize');
    expect(authUrl.searchParams.get('client_id')).toBe('Ov23lifeCftrdv4dcMBW');
    expect(authUrl.searchParams.get('scope')).toBe('read:user user:email');
    expect(authUrl.searchParams.get('redirect_uri')).toBe('http://localhost:8080/api/connectors/github/callback');
    
    // Verify PKCE parameters
    expect(authUrl.searchParams.get('code_challenge')).toBeTruthy();
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authUrl.searchParams.get('state')).toBeTruthy();
  });

  test('LinkedIn OAuth initiation should return proper auth URL', async ({ request }) => {
    const response = await request.post(`${CONNECTOR_URL}/api/connectors/linkedin/auth`, {
      data: { 
        userId: 'test-user-123',
        callbackUrl: 'http://localhost:5173/credentials'
      },
      headers: {
        'Authorization': 'Bearer test-token-12345',
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('authUrl');
    expect(data).toHaveProperty('sessionId');
    
    // Verify OAuth URL structure
    const authUrl = new URL(data.authUrl);
    expect(authUrl.hostname).toBe('www.linkedin.com');
    expect(authUrl.pathname).toBe('/oauth/v2/authorization');
    expect(authUrl.searchParams.get('client_id')).toBe('861ja0f20lfhjp');
    expect(authUrl.searchParams.get('scope')).toBe('r_liteprofile r_emailaddress');
  });

  test('Plaid OAuth initiation should return proper auth URL', async ({ request }) => {
    const response = await request.post(`${CONNECTOR_URL}/api/connectors/plaid/auth`, {
      data: { 
        userId: 'test-user-123',
        callbackUrl: 'http://localhost:5173/credentials'
      },
      headers: {
        'Authorization': 'Bearer test-token-12345',
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('authUrl');
    expect(data).toHaveProperty('sessionId');
    
    // Plaid uses a different flow but should still have auth URL
    expect(data.authUrl).toContain('plaid.com');
  });

  test('should handle invalid OAuth callback', async ({ request }) => {
    // POST request since callback is a POST endpoint
    const response = await request.post(`${CONNECTOR_URL}/api/connectors/github/callback`, {
      data: { 
        error: 'access_denied'
      },
      headers: {
        'Authorization': 'Bearer test-token-12345',
        'Content-Type': 'application/json'
      }
    });
    
    // Should return error response
    expect(response.status()).toBe(400);
  });

  test('should validate OAuth state parameter', async ({ request }) => {
    // POST request since callback is a POST endpoint
    const response = await request.post(`${CONNECTOR_URL}/api/connectors/github/callback`, {
      data: { 
        code: 'test', 
        state: 'invalid-state', 
        sessionId: 'test-session' 
      },
      headers: {
        'Authorization': 'Bearer test-token-12345',
        'Content-Type': 'application/json'
      }
    });
    
    // Should reject with invalid state
    expect(response.status()).toBe(400);
  });

  test('rate limiting should be enforced', async ({ request }) => {
    const promises = [];
    
    // Make 15 rapid requests
    for (let i = 0; i < 15; i++) {
      promises.push(
        request.post(`${CONNECTOR_URL}/api/connectors/github/auth`, {
          data: { userId: `test-user-${i}` },
          headers: {
            'Authorization': 'Bearer test-token-12345',
            'Content-Type': 'application/json'
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // At least some should be rate limited
    const rateLimited = responses.filter(r => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('CORS headers should be properly set', async ({ request }) => {
    const response = await request.options(`${CONNECTOR_URL}/api/connectors/github/auth`, {
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(headers['access-control-allow-methods']).toContain('POST');
    expect(headers['access-control-allow-headers']).toContain('Content-Type');
  });

  test('should validate request content-type', async ({ request }) => {
    const response = await request.post(`${CONNECTOR_URL}/api/connectors/github/auth`, {
      data: '{"userId":"test"}',
      headers: {
        'Authorization': 'Bearer test-token-12345',
        'Content-Type': 'text/plain' // Wrong content type
      }
    });
    
    expect(response.status()).toBe(400);
  });

  test('should handle malformed JSON', async ({ request }) => {
    const response = await request.post(`${CONNECTOR_URL}/api/connectors/github/auth`, {
      data: '{"userId":"test"',  // Malformed JSON
      headers: {
        'Authorization': 'Bearer test-token-12345',
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status()).toBe(400);
  });

  test('should validate required fields', async ({ request }) => {
    const response = await request.post(`${CONNECTOR_URL}/api/connectors/github/auth`, {
      data: {}, // Missing required userId
      headers: {
        'Authorization': 'Bearer test-token-12345',
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status()).toBe(400);
    
    const error = await response.json();
    expect(error.error).toContain('userId');
  });
});