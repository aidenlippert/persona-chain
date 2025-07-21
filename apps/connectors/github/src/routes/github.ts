import { Router } from 'express';
import { Redis } from 'ioredis';
import { OAuth2Service, OAuth2Config } from '../../../shared/services/oauth2Service';
import { VCGeneratorService, IssuerConfig } from '../../../shared/services/vcGeneratorService';
import { ZKCommitmentService } from '../../../shared/services/zkCommitmentService';
import { GitHubService } from '../services/githubService';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

export function githubRouter(redis: Redis): Router {
  const router = Router();

  // OAuth2 configuration for GitHub
  const oauthConfig: OAuth2Config = {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'read:user user:email',
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/v1/github/callback',
    usePKCE: false // GitHub doesn't support PKCE
  };

  // Issuer configuration
  const issuerConfig: IssuerConfig = {
    id: process.env.ISSUER_DID || 'did:web:personapass.io',
    name: 'PersonaPass GitHub Connector',
    privateKey: process.env.ISSUER_PRIVATE_KEY!,
    publicKey: process.env.ISSUER_PUBLIC_KEY!
  };

  // Initialize services
  const oauth2Service = new OAuth2Service(oauthConfig, redis);
  const vcGenerator = new VCGeneratorService(issuerConfig);
  const zkService = new ZKCommitmentService();
  const githubService = new GitHubService();

  /**
   * Initiate GitHub OAuth flow
   */
  router.post('/auth', authMiddleware, async (req, res, next) => {
    try {
      const { userId } = req.body;
      const sessionId = `${userId}:github:${Date.now()}`;

      // Generate authorization URL
      const authUrl = await oauth2Service.initiateAuth(sessionId);

      // Store session mapping
      await redis.setex(`user_session:${sessionId}`, 600, userId);

      res.json({
        authUrl,
        sessionId,
        expiresIn: 600 // 10 minutes
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Handle OAuth callback
   */
  router.get('/callback', async (req, res, next) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(`${process.env.FRONTEND_URL}/connect/error?error=${error}`);
      }

      if (!code || !state) {
        return res.redirect(`${process.env.FRONTEND_URL}/connect/error?error=invalid_request`);
      }

      // Extract session ID from state
      const sessionData = await redis.get(`oauth_session:${state}`);
      if (!sessionData) {
        return res.redirect(`${process.env.FRONTEND_URL}/connect/error?error=session_expired`);
      }

      // Exchange code for token
      const tokenData = await oauth2Service.handleCallback(
        state as string,
        code as string,
        state as string
      );

      // Fetch user profile
      const userProfile = await oauth2Service.fetchUserInfo(tokenData.access_token);

      // Fetch additional GitHub data
      const enrichedProfile = await githubService.enrichProfile(
        userProfile,
        tokenData.access_token
      );

      // Get user ID from session
      const userId = await redis.get(`user_session:${state}`);
      if (!userId) {
        return res.redirect(`${process.env.FRONTEND_URL}/connect/error?error=user_not_found`);
      }

      // Generate credential subject
      const credentialSubject = VCGeneratorService.mapPlatformDataToCredentialSubject(
        'github',
        enrichedProfile,
        `did:key:${userId}` // Use user's DID
      );

      // Generate verifiable credential
      const credential = await vcGenerator.generateVC(
        'GitHubCredential',
        credentialSubject,
        {
          credentialSchema: {
            id: 'https://personapass.io/schemas/github-credential-v1.json',
            type: 'JsonSchema2023'
          },
          additionalContext: ['https://personapass.io/contexts/github-v1'],
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        }
      );

      // Generate ZK commitment
      const zkCommitment = await zkService.createPlatformCommitment(
        'github',
        credentialSubject
      );

      // Store credential reference
      await redis.setex(
        `credential:github:${userId}`,
        365 * 24 * 60 * 60, // 1 year
        JSON.stringify({
          credential,
          zkCommitment,
          issuedAt: new Date().toISOString()
        })
      );

      // Clean up session data
      await redis.del(`oauth_session:${state}`);
      await redis.del(`user_session:${state}`);

      // Redirect to success page
      res.redirect(`${process.env.FRONTEND_URL}/connect/success?platform=github`);
    } catch (error) {
      console.error('GitHub callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/connect/error?error=credential_generation_failed`);
    }
  });

  /**
   * Get user's GitHub credential
   */
  router.get('/credential/:userId', authMiddleware, async (req, res, next) => {
    try {
      const { userId } = req.params;

      const credentialData = await redis.get(`credential:github:${userId}`);
      if (!credentialData) {
        return res.status(404).json({ error: 'Credential not found' });
      }

      const credential = JSON.parse(credentialData);
      res.json(credential);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Generate selective disclosure proof
   */
  router.post('/proof/generate', authMiddleware, async (req, res, next) => {
    try {
      const { userId, disclosureRequest } = req.body;

      const credentialData = await redis.get(`credential:github:${userId}`);
      if (!credentialData) {
        return res.status(404).json({ error: 'Credential not found' });
      }

      const { credential } = JSON.parse(credentialData);

      // Generate proof for selective disclosure
      const proof = await zkService.generateSelectiveDisclosureProof(
        credential.credentialSubject,
        disclosureRequest
      );

      res.json({ proof });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Revoke credential
   */
  router.delete('/credential/:userId', authMiddleware, async (req, res, next) => {
    try {
      const { userId } = req.params;

      await redis.del(`credential:github:${userId}`);

      res.json({ message: 'Credential revoked successfully' });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get credential schema
   */
  router.get('/schema', async (req, res) => {
    const schema = VCGeneratorService.generateCredentialSchema('github');
    res.json(schema);
  });

  return router;
}