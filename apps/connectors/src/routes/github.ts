import express from 'express';
import { Redis } from 'ioredis';
import { OAuth2Service } from '../services/oauth2Service';
import { VCGeneratorService } from '../services/vcGeneratorService';
import { ZKCommitmentService } from '../services/zkCommitmentService';
import { logger } from '../utils/logger';
import { ValidationError, ExternalServiceError } from '../middleware/errorHandler';
import crypto from 'crypto';

export const githubRouter = (redis: Redis) => {
  const router = express.Router();
  
  // Create config inside the function to ensure env vars are loaded
  const GITHUB_CONFIG = {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    userInfoEndpoint: 'https://api.github.com/user',
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:8080/api/connectors/github/callback',
    scopes: ['read:user', 'user:email']
  };
  
  const oauth2Service = new OAuth2Service(GITHUB_CONFIG, redis);
  const vcGenerator = new VCGeneratorService();
  const zkCommitment = new ZKCommitmentService();

  // Initiate GitHub OAuth flow
  router.post('/auth', async (req, res, next) => {
    try {
      const { userId, callbackUrl } = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Generate session ID
      const sessionId = crypto.randomBytes(16).toString('hex');

      // Store callback URL if provided
      if (callbackUrl) {
        await redis.setex(
          `callback_url:${sessionId}`,
          600, // 10 minutes
          callbackUrl
        );
      }

      // Get authorization URL
      const authUrl = await oauth2Service.initiateAuth(sessionId);

      // Store user association
      await redis.setex(
        `user_session:${sessionId}`,
        600, // 10 minutes
        userId
      );

      logger.info('GitHub OAuth initiated', {
        sessionId,
        userId,
        requestId: req.id
      });

      res.json({
        authUrl,
        sessionId,
        expiresIn: 600
      });
    } catch (error) {
      next(error);
    }
  });

  // Handle OAuth callback from GitHub (GET request with query params)
  router.get('/callback', async (req, res, next) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        throw new ValidationError('Missing required callback parameters');
      }

      // Get user ID from session using state as sessionId
      const sessionId = state as string;
      const userId = await redis.get(`user_session:${sessionId}`);
      if (!userId) {
        throw new ValidationError('Invalid or expired session');
      }

      // Exchange code for token
      const tokenData = await oauth2Service.handleCallback(sessionId, code as string, state as string);

      // Fetch user info
      const userInfo = await oauth2Service.fetchUserInfo(tokenData.access_token);

      // Transform GitHub data to credential subject
      const credentialSubject = {
        id: `did:personachain:${userId}`,
        githubId: userInfo.id.toString(),
        username: userInfo.login,
        name: userInfo.name,
        email: userInfo.email,
        company: userInfo.company,
        location: userInfo.location,
        bio: userInfo.bio,
        publicRepos: userInfo.public_repos,
        followers: userInfo.followers,
        following: userInfo.following,
        createdAt: userInfo.created_at,
        updatedAt: userInfo.updated_at,
        profileUrl: userInfo.html_url,
        avatarUrl: userInfo.avatar_url,
        verified: true,
        platform: 'github'
      };

      // Generate verifiable credential
      const credential = await vcGenerator.generateVC(
        'GitHubIdentityCredential',
        credentialSubject,
        {
          issuer: {
            id: 'did:personachain:issuer:github-connector',
            name: 'PersonaPass GitHub Connector'
          },
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        }
      );

      // Generate ZK commitment
      const commitment = await zkCommitment.createPlatformCommitment('github', credentialSubject);

      // Store the credential temporarily for frontend retrieval
      await redis.setex(
        `github_credential_result:${sessionId}`,
        300, // 5 minutes
        JSON.stringify({
          credential,
          zkCommitment: commitment,
          platform: 'github',
          username: userInfo.login,
          metadata: {
            issuedAt: new Date().toISOString(),
            expiresAt: credential.expirationDate,
            refreshAvailable: true
          }
        })
      );

      // Get callback URL from session
      const callbackUrl = await redis.get(`callback_url:${sessionId}`) || 'http://localhost:5175/credentials';

      // Clean up session data
      await redis.del(`user_session:${sessionId}`);
      await redis.del(`oauth_session:${sessionId}`);
      await redis.del(`callback_url:${sessionId}`);

      logger.info('GitHub credential generated', {
        userId,
        githubUsername: userInfo.login,
        credentialId: credential.id,
        requestId: req.id
      });

      // Redirect back to frontend with success
      res.redirect(`${callbackUrl}?sessionId=${sessionId}&status=success&platform=github`);
    } catch (error) {
      const sessionId = req.query.state as string;
      const callbackUrl = await redis.get(`callback_url:${sessionId}`) || 'http://localhost:5175/credentials';
      
      logger.error('GitHub OAuth callback error', { error: error.message, sessionId });
      
      // Redirect back to frontend with error
      res.redirect(`${callbackUrl}?sessionId=${sessionId}&status=error&platform=github&error=${encodeURIComponent(error.message)}`);
    }
  });

  // API endpoint to retrieve credential result
  router.get('/result/:sessionId', async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      
      const resultData = await redis.get(`github_credential_result:${sessionId}`);
      if (!resultData) {
        throw new ValidationError('No credential result found or session expired');
      }

      // Clean up result data after retrieval
      await redis.del(`github_credential_result:${sessionId}`);

      res.json(JSON.parse(resultData));
    } catch (error) {
      next(error);
    }
  });

  // Handle OAuth callback (legacy POST endpoint for API calls)
  router.post('/callback', async (req, res, next) => {
    try {
      const { code, state, sessionId } = req.body;

      if (!code || !state || !sessionId) {
        throw new ValidationError('Missing required callback parameters');
      }

      // Get user ID from session
      const userId = await redis.get(`user_session:${sessionId}`);
      if (!userId) {
        throw new ValidationError('Invalid or expired session');
      }

      // Exchange code for token
      const tokenData = await oauth2Service.handleCallback(sessionId, code, state);

      // Fetch user info
      const userInfo = await oauth2Service.fetchUserInfo(tokenData.access_token);

      // Transform GitHub data to credential subject
      const credentialSubject = {
        id: `did:personachain:${userId}`,
        githubId: userInfo.id.toString(),
        username: userInfo.login,
        name: userInfo.name,
        email: userInfo.email,
        company: userInfo.company,
        location: userInfo.location,
        bio: userInfo.bio,
        publicRepos: userInfo.public_repos,
        followers: userInfo.followers,
        following: userInfo.following,
        createdAt: userInfo.created_at,
        updatedAt: userInfo.updated_at,
        profileUrl: userInfo.html_url,
        avatarUrl: userInfo.avatar_url,
        verified: true,
        platform: 'github'
      };

      // Generate verifiable credential
      const credential = await vcGenerator.generateVC(
        'GitHubIdentityCredential',
        credentialSubject,
        {
          issuer: {
            id: 'did:personachain:issuer:github-connector',
            name: 'PersonaPass GitHub Connector'
          },
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        }
      );

      // Generate ZK commitment
      const commitment = await zkCommitment.createPlatformCommitment('github', credentialSubject);

      // Clean up session data
      await redis.del(`user_session:${sessionId}`);
      await redis.del(`oauth_session:${sessionId}`);
      await redis.del(`callback_url:${sessionId}`);

      logger.info('GitHub credential generated', {
        userId,
        githubUsername: userInfo.login,
        credentialId: credential.id,
        requestId: req.id
      });

      res.json({
        credential,
        zkCommitment: commitment,
        platform: 'github',
        username: userInfo.login,
        metadata: {
          issuedAt: new Date().toISOString(),
          expiresAt: credential.expirationDate,
          refreshAvailable: true
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('API')) {
        next(new ExternalServiceError('GitHub API error', 'github', error.message));
      } else {
        next(error);
      }
    }
  });

  // Get connector status
  router.get('/status', async (req, res, next) => {
    try {
      const userId = req.userId;

      // Check if user has existing GitHub credential
      const existingCredential = await redis.get(`github_credential:${userId}`);

      res.json({
        connected: !!existingCredential,
        platform: 'github',
        features: [
          'Developer profile verification',
          'Repository ownership proof',
          'Contribution history',
          'Organization membership'
        ],
        requiredScopes: GITHUB_CONFIG.scopes,
        credentialTypes: ['GitHubIdentityCredential'],
        lastSync: existingCredential ? JSON.parse(existingCredential).issuedAt : null
      });
    } catch (error) {
      next(error);
    }
  });

  // Refresh credential
  router.post('/refresh', async (req, res, next) => {
    try {
      const userId = req.userId;

      // Get stored credential
      const storedData = await redis.get(`github_credential:${userId}`);
      if (!storedData) {
        throw new ValidationError('No GitHub credential found');
      }

      const { refreshToken } = JSON.parse(storedData);
      if (!refreshToken) {
        throw new ValidationError('Refresh not available. Please reconnect.');
      }

      // Refresh token
      const newTokenData = await oauth2Service.refreshToken(refreshToken);

      // Fetch updated user info
      const userInfo = await oauth2Service.fetchUserInfo(newTokenData.access_token);

      // Generate new credential with updated data
      // ... (similar to callback logic)

      res.json({
        message: 'Credential refreshed successfully',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
    } catch (error) {
      next(error);
    }
  });

  // Revoke credential
  router.delete('/revoke', async (req, res, next) => {
    try {
      const userId = req.userId;

      // Remove stored credential
      await redis.del(`github_credential:${userId}`);

      logger.info('GitHub credential revoked', {
        userId,
        requestId: req.id
      });

      res.json({
        message: 'GitHub credential revoked successfully',
        platform: 'github'
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};