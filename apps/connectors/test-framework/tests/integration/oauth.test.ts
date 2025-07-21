import nock from 'nock';
import { SocialOAuthService } from '@social/services/SocialOAuthService';
import { HealthOAuthService } from '@health/services/HealthOAuthService';
import { createMockDID, createMockAccessToken, mockAPIResponses } from '../setup';

describe('OAuth Integration Tests', () => {
  const mockDID = createMockDID();
  
  describe('Social OAuth Service', () => {
    let socialOAuthService: SocialOAuthService;
    
    beforeEach(() => {
      socialOAuthService = new SocialOAuthService();
    });
    
    describe('LinkedIn OAuth Flow', () => {
      it('should build authorization URL correctly', async () => {
        const { authUrl, state } = await socialOAuthService.buildAuthorizationUrl('linkedin', mockDID);
        
        expect(authUrl).toContain('linkedin.com/oauth/v2/authorization');
        expect(authUrl).toContain('response_type=code');
        expect(authUrl).toContain('client_id=');
        expect(authUrl).toContain(`state=${state}`);
        expect(state).toHaveLength(64); // 32 bytes hex encoded
      });
      
      it('should exchange code for token successfully', async () => {
        const mockCode = 'mock-auth-code';
        const mockState = 'mock-state';
        
        // Mock LinkedIn token endpoint
        nock('https://www.linkedin.com')
          .post('/oauth/v2/accessToken')
          .reply(200, {
            access_token: 'linkedin-access-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'r_liteprofile r_emailaddress'
          });
        
        // First, we need to store the state
        await socialOAuthService.buildAuthorizationUrl('linkedin', mockDID);
        
        const result = await socialOAuthService.exchangeCodeForToken(mockCode, mockState, 'linkedin');
        
        expect(result.tokenData).toBeValidOAuthToken();
        expect(result.tokenData.provider).toBe('linkedin');
        expect(result.tokenData.accessToken).toBe('linkedin-access-token');
      });
      
      it('should handle OAuth errors gracefully', async () => {
        const mockCode = 'invalid-code';
        const mockState = 'invalid-state';
        
        // Mock LinkedIn error response
        nock('https://www.linkedin.com')
          .post('/oauth/v2/accessToken')
          .reply(400, {
            error: 'invalid_grant',
            error_description: 'Authorization code expired'
          });
        
        await expect(
          socialOAuthService.exchangeCodeForToken(mockCode, mockState, 'linkedin')
        ).rejects.toThrow();
      });
    });
    
    describe('Twitter OAuth Flow', () => {
      it('should build authorization URL with PKCE', async () => {
        const { authUrl, state } = await socialOAuthService.buildAuthorizationUrl('twitter', mockDID);
        
        expect(authUrl).toContain('twitter.com/i/oauth2/authorize');
        expect(authUrl).toContain('code_challenge=challenge');
        expect(authUrl).toContain('code_challenge_method=plain');
        expect(state).toHaveLength(64);
      });
      
      it('should exchange code for token with PKCE', async () => {
        const mockCode = 'twitter-auth-code';
        const mockState = 'twitter-state';
        
        // Mock Twitter token endpoint
        nock('https://api.twitter.com')
          .post('/2/oauth2/token')
          .reply(200, {
            access_token: 'twitter-access-token',
            expires_in: 7200,
            token_type: 'bearer',
            scope: 'tweet.read users.read'
          });
        
        await socialOAuthService.buildAuthorizationUrl('twitter', mockDID);
        
        const result = await socialOAuthService.exchangeCodeForToken(mockCode, mockState, 'twitter');
        
        expect(result.tokenData).toBeValidOAuthToken();
        expect(result.tokenData.provider).toBe('twitter');
      });
    });
    
    describe('GitHub OAuth Flow', () => {
      it('should handle GitHub OAuth flow', async () => {
        const mockCode = 'github-auth-code';
        const mockState = 'github-state';
        
        // Mock GitHub token endpoint
        nock('https://github.com')
          .post('/login/oauth/access_token')
          .reply(200, {
            access_token: 'github-access-token',
            token_type: 'bearer',
            scope: 'user:email read:user public_repo'
          });
        
        await socialOAuthService.buildAuthorizationUrl('github', mockDID);
        
        const result = await socialOAuthService.exchangeCodeForToken(mockCode, mockState, 'github');
        
        expect(result.tokenData).toBeValidOAuthToken();
        expect(result.tokenData.provider).toBe('github');
      });
    });
  });
  
  describe('Health OAuth Service (SMART on FHIR)', () => {
    let healthOAuthService: HealthOAuthService;
    
    beforeEach(() => {
      healthOAuthService = new HealthOAuthService();
    });
    
    describe('Epic FHIR OAuth', () => {
      it('should fetch SMART configuration', async () => {
        // Mock Epic well-known endpoint
        nock('https://fhir.epic.com')
          .get('/interconnect-fhir-oauth/.well-known/smart_configuration')
          .reply(200, {
            authorization_endpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
            token_endpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
            capabilities: ['launch-standalone', 'client-public', 'sso-openid-connect'],
            scopes_supported: ['patient/Patient.read', 'patient/Observation.read']
          });
        
        const config = await healthOAuthService.getSMARTConfiguration('epic');
        
        expect(config.authorization_endpoint).toContain('epic.com');
        expect(config.token_endpoint).toContain('epic.com');
        expect(config.capabilities).toContain('launch-standalone');
      });
      
      it('should build FHIR authorization URL with patient context', async () => {
        const patientId = 'epic-patient-123';
        
        // Mock SMART configuration
        nock('https://fhir.epic.com')
          .get('/interconnect-fhir-oauth/.well-known/smart_configuration')
          .reply(200, {
            authorization_endpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
            token_endpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token'
          });
        
        const { authUrl, state } = await healthOAuthService.buildAuthorizationUrl('epic', mockDID, patientId);
        
        expect(authUrl).toContain('epic.com');
        expect(authUrl).toContain(`launch=patient=${patientId}`);
        expect(authUrl).toContain('response_type=code');
        expect(state).toHaveLength(64);
      });
      
      it('should exchange code for FHIR access token', async () => {
        const mockCode = 'epic-auth-code';
        const mockState = 'epic-state';
        
        // Mock SMART configuration
        nock('https://fhir.epic.com')
          .get('/interconnect-fhir-oauth/.well-known/smart_configuration')
          .reply(200, {
            authorization_endpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
            token_endpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token'
          });
        
        // Mock token exchange
        nock('https://fhir.epic.com')
          .post('/interconnect-fhir-oauth/oauth2/token')
          .reply(200, {
            access_token: 'epic-fhir-token',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'patient/Patient.read patient/Observation.read',
            patient: 'epic-patient-123'
          });
        
        await healthOAuthService.buildAuthorizationUrl('epic', mockDID);
        
        const result = await healthOAuthService.exchangeCodeForToken(mockCode, mockState, 'epic');
        
        expect(result.tokenData.accessToken).toBe('epic-fhir-token');
        expect(result.tokenData.patientId).toBe('epic-patient-123');
        expect(result.tokenData.scope).toContain('patient/Patient.read');
      });
    });
    
    describe('Cerner FHIR OAuth', () => {
      it('should handle Cerner SMART on FHIR flow', async () => {
        // Mock Cerner well-known endpoint
        nock('https://fhir-ehr-code.cerner.com')
          .get('/r4/.well-known/smart_configuration')
          .reply(200, {
            authorization_endpoint: 'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/personas/patient/authorize',
            token_endpoint: 'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token',
            capabilities: ['launch-standalone', 'client-public']
          });
        
        const { authUrl, state } = await healthOAuthService.buildAuthorizationUrl('cerner', mockDID);
        
        expect(authUrl).toContain('authorization.cerner.com');
        expect(authUrl).toContain('smart-v1');
        expect(state).toHaveLength(64);
      });
    });
  });
  
  describe('OAuth Token Management', () => {
    let socialOAuthService: SocialOAuthService;
    
    beforeEach(() => {
      socialOAuthService = new SocialOAuthService();
    });
    
    it('should refresh expired tokens', async () => {
      const refreshToken = 'mock-refresh-token';
      
      // Mock token refresh endpoint
      nock('https://www.linkedin.com')
        .post('/oauth/v2/accessToken')
        .reply(200, {
          access_token: 'new-linkedin-token',
          expires_in: 3600,
          token_type: 'Bearer',
          refresh_token: 'new-refresh-token'
        });
      
      const newTokenData = await socialOAuthService.refreshAccessToken('linkedin', refreshToken);
      
      expect(newTokenData.accessToken).toBe('new-linkedin-token');
      expect(newTokenData.refreshToken).toBe('new-refresh-token');
      expect(newTokenData.provider).toBe('linkedin');
    });
    
    it('should validate tokens with provider APIs', async () => {
      const accessToken = 'valid-linkedin-token';
      
      // Mock LinkedIn profile endpoint for validation
      nock('https://api.linkedin.com')
        .get('/v2/people/~')
        .reply(200, mockAPIResponses.linkedin.profile);
      
      const result = await socialOAuthService.validateTokenAndGetUser('linkedin', accessToken);
      
      expect(result.valid).toBe(true);
    });
    
    it('should handle token revocation', async () => {
      const accessToken = 'token-to-revoke';
      
      // Mock GitHub token revocation
      nock('https://api.github.com')
        .delete('/applications/github-client-id-placeholder/token')
        .reply(204);
      
      await expect(
        socialOAuthService.revokeToken('github', accessToken)
      ).resolves.not.toThrow();
    });
  });
  
  describe('OAuth Error Handling', () => {
    let socialOAuthService: SocialOAuthService;
    
    beforeEach(() => {
      socialOAuthService = new SocialOAuthService();
    });
    
    it('should handle network timeouts', async () => {
      // Mock timeout
      nock('https://www.linkedin.com')
        .post('/oauth/v2/accessToken')
        .delay(35000) // Longer than timeout
        .reply(200, {});
      
      await expect(
        socialOAuthService.exchangeCodeForToken('code', 'state', 'linkedin')
      ).rejects.toThrow();
    });
    
    it('should handle rate limiting', async () => {
      // Mock rate limit response
      nock('https://api.twitter.com')
        .post('/2/oauth2/token')
        .reply(429, {
          error: 'rate_limit_exceeded',
          error_description: 'Too many requests'
        });
      
      await expect(
        socialOAuthService.exchangeCodeForToken('code', 'state', 'twitter')
      ).rejects.toThrow();
    });
  });
});