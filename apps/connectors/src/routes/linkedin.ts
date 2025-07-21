import express from 'express';
import { Redis } from 'ioredis';
import { OAuth2Service } from '../services/oauth2Service';
import { VCGeneratorService } from '../services/vcGeneratorService';
import { ZKCommitmentService } from '../services/zkCommitmentService';
import { logger } from '../utils/logger';
import { ValidationError, ExternalServiceError } from '../middleware/errorHandler';
import crypto from 'crypto';

export const linkedinRouter = (redis: Redis) => {
  const router = express.Router();
  
  // Create config inside the function to ensure env vars are loaded
  const LINKEDIN_CONFIG = {
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    authorizationEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoEndpoint: 'https://api.linkedin.com/v2/me',
    emailEndpoint: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:8080/api/connectors/linkedin/callback',
    scopes: ['r_liteprofile', 'r_emailaddress']
  };
  
  const oauth2Service = new OAuth2Service(LINKEDIN_CONFIG, redis);
  const vcGenerator = new VCGeneratorService();
  const zkCommitment = new ZKCommitmentService();

  // Initiate LinkedIn OAuth flow
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

      logger.info('LinkedIn OAuth initiated', {
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

  // Handle OAuth callback
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

      // Fetch user info (LinkedIn requires multiple API calls)
      const [profileResponse, emailResponse] = await Promise.all([
        fetch(LINKEDIN_CONFIG.userInfoEndpoint, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }),
        fetch(LINKEDIN_CONFIG.emailEndpoint, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        })
      ]);

      if (!profileResponse.ok || !emailResponse.ok) {
        throw new ExternalServiceError('Failed to fetch LinkedIn profile', 'linkedin');
      }

      const profile = await profileResponse.json() as any;
      const emailData = await emailResponse.json() as any;

      // Extract email
      const email = emailData.elements?.[0]?.['handle~']?.emailAddress;

      // Transform LinkedIn data to credential subject
      const credentialSubject = {
        id: `did:personachain:${userId}`,
        linkedinId: profile.id,
        firstName: profile.firstName?.localized?.en_US || '',
        lastName: profile.lastName?.localized?.en_US || '',
        email: email,
        profilePicture: profile.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier,
        headline: profile.headline?.localized?.en_US || '',
        verified: true,
        platform: 'linkedin'
      };

      // Generate verifiable credential
      const credential = await vcGenerator.generateVC(
        'LinkedInIdentityCredential',
        credentialSubject,
        {
          issuer: {
            id: 'did:personachain:issuer:linkedin-connector',
            name: 'PersonaPass LinkedIn Connector'
          },
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        }
      );

      // Generate ZK commitment
      const commitment = await zkCommitment.createPlatformCommitment('linkedin', credentialSubject);

      // Store credential reference
      await redis.setex(
        `linkedin_credential:${userId}`,
        365 * 24 * 60 * 60, // 1 year
        JSON.stringify({
          credentialId: credential.id,
          issuedAt: new Date().toISOString(),
          refreshToken: tokenData.refresh_token
        })
      );

      // Clean up session data
      await redis.del(`user_session:${sessionId}`);
      await redis.del(`oauth_session:${sessionId}`);
      await redis.del(`callback_url:${sessionId}`);

      logger.info('LinkedIn credential generated', {
        userId,
        linkedinId: profile.id,
        credentialId: credential.id,
        requestId: req.id
      });

      res.json({
        credential,
        zkCommitment: commitment,
        platform: 'linkedin',
        name: `${credentialSubject.firstName} ${credentialSubject.lastName}`,
        metadata: {
          issuedAt: new Date().toISOString(),
          expiresAt: credential.expirationDate,
          refreshAvailable: !!tokenData.refresh_token
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('API')) {
        next(new ExternalServiceError('LinkedIn API error', 'linkedin', error.message));
      } else {
        next(error);
      }
    }
  });

  // Get connector status
  router.get('/status', async (req, res, next) => {
    try {
      const userId = req.userId;

      // Check if user has existing LinkedIn credential
      const existingCredential = await redis.get(`linkedin_credential:${userId}`);

      res.json({
        connected: !!existingCredential,
        platform: 'linkedin',
        features: [
          'Professional identity verification',
          'Career history',
          'Skills and endorsements',
          'Professional network'
        ],
        requiredScopes: LINKEDIN_CONFIG.scopes,
        credentialTypes: ['LinkedInIdentityCredential'],
        lastSync: existingCredential ? JSON.parse(existingCredential).issuedAt : null
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
      await redis.del(`linkedin_credential:${userId}`);

      logger.info('LinkedIn credential revoked', {
        userId,
        requestId: req.id
      });

      res.json({
        message: 'LinkedIn credential revoked successfully',
        platform: 'linkedin'
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};