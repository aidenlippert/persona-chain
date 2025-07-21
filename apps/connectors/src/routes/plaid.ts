import express from 'express';
import { Redis } from 'ioredis';
import { Configuration, PlaidApi, PlaidEnvironments, LinkTokenCreateRequest } from 'plaid';
import { VCGeneratorService } from '../services/vcGeneratorService';
import { ZKCommitmentService } from '../services/zkCommitmentService';
import { logger } from '../utils/logger';
import { ValidationError, ExternalServiceError } from '../middleware/errorHandler';
import crypto from 'crypto';

// Initialize Plaid client
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

export const plaidRouter = (redis: Redis) => {
  const router = express.Router();
  const vcGenerator = new VCGeneratorService();
  const zkCommitment = new ZKCommitmentService();

  // Create Plaid Link token
  router.post('/auth', async (req, res, next) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Generate session ID
      const sessionId = crypto.randomBytes(16).toString('hex');

      // Create Link token request
      const request: LinkTokenCreateRequest = {
        user: {
          client_user_id: userId,
        },
        client_name: 'PersonaPass',
        products: ['identity_verification' as any],
        identity_verification: {
          template_id: process.env.PLAID_IDENTITY_TEMPLATE_ID || 'idvtmp_default',
        },
        country_codes: ['US' as any],
        language: 'en',
        webhook: process.env.PLAID_WEBHOOK_URL,
      };

      // Create Link token
      const response = await plaidClient.linkTokenCreate(request);

      // Store session
      await redis.setex(
        `plaid_session:${sessionId}`,
        600, // 10 minutes
        JSON.stringify({
          userId,
          linkToken: response.data.link_token,
          createdAt: new Date().toISOString()
        })
      );

      logger.info('Plaid Link token created', {
        sessionId,
        userId,
        requestId: req.id
      });

      res.json({
        linkToken: response.data.link_token,
        sessionId,
        expiresIn: 600,
        mode: 'identity_verification'
      });
    } catch (error: any) {
      logger.error('Plaid Link token error', {
        error: error.message,
        response: error.response?.data,
        requestId: req.id
      });

      if (error.response?.data) {
        next(new ExternalServiceError('Plaid API error', 'plaid', error.response.data));
      } else {
        next(error);
      }
    }
  });

  // Handle Plaid callback
  router.post('/callback', async (req, res, next) => {
    try {
      const { publicToken, sessionId, identityVerificationId } = req.body;

      if (!publicToken || !sessionId || !identityVerificationId) {
        throw new ValidationError('Missing required callback parameters');
      }

      // Get session data
      const sessionData = await redis.get(`plaid_session:${sessionId}`);
      if (!sessionData) {
        throw new ValidationError('Invalid or expired session');
      }

      const { userId } = JSON.parse(sessionData);

      // Exchange public token for access token
      const tokenResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const accessToken = tokenResponse.data.access_token;

      // Get identity verification status
      const idvResponse = await plaidClient.identityVerificationGet({
        identity_verification_id: identityVerificationId,
      });

      const verification = (idvResponse.data as any).identity_verification;

      if (verification.status !== 'success') {
        throw new ValidationError('Identity verification not completed');
      }

      // Extract verified data
      const user = verification.user;
      const credentialSubject = {
        id: `did:personachain:${userId}`,
        plaidUserId: user.client_user_id,
        fullName: user.name?.given_name && user.name?.family_name 
          ? `${user.name.given_name} ${user.name.family_name}` 
          : null,
        dateOfBirth: user.date_of_birth,
        email: user.email_address,
        phoneNumber: user.phone_number,
        address: user.address ? {
          street: user.address.street,
          street2: user.address.street2,
          city: user.address.city,
          region: user.address.region,
          postalCode: user.address.postal_code,
          country: user.address.country,
        } : null,
        idNumber: user.id_number?.value ? {
          type: user.id_number.type,
          lastFour: user.id_number.value.slice(-4), // Only store last 4 digits
        } : null,
        verifiedAt: verification.created_at,
        verificationId: identityVerificationId,
        verified: true,
        platform: 'plaid'
      };

      // Generate verifiable credential
      const credential = await vcGenerator.generateVC(
        'PlaidIdentityCredential',
        credentialSubject,
        {
          issuer: {
            id: 'did:personachain:issuer:plaid-connector',
            name: 'PersonaPass Plaid Connector'
          },
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          evidence: [{
            type: 'IdentityVerification',
            verifier: 'Plaid',
            verificationId: identityVerificationId,
            timestamp: verification.created_at,
            method: 'document_and_selfie'
          }]
        }
      );

      // Generate ZK commitment
      const commitment = await zkCommitment.createPlatformCommitment('plaid', credentialSubject);

      // Store credential reference (not the access token for security)
      await redis.setex(
        `plaid_credential:${userId}`,
        365 * 24 * 60 * 60, // 1 year
        JSON.stringify({
          credentialId: credential.id,
          verificationId: identityVerificationId,
          issuedAt: new Date().toISOString()
        })
      );

      // Clean up session
      await redis.del(`plaid_session:${sessionId}`);

      logger.info('Plaid identity credential generated', {
        userId,
        verificationId: identityVerificationId,
        credentialId: credential.id,
        requestId: req.id
      });

      res.json({
        credential,
        zkCommitment: commitment,
        platform: 'plaid',
        verifiedName: credentialSubject.fullName,
        metadata: {
          issuedAt: new Date().toISOString(),
          expiresAt: credential.expirationDate,
          verificationLevel: 'bank_verified',
          refreshAvailable: false
        }
      });
    } catch (error: any) {
      logger.error('Plaid callback error', {
        error: error.message,
        response: error.response?.data,
        requestId: req.id
      });

      if (error.response?.data) {
        next(new ExternalServiceError('Plaid API error', 'plaid', error.response.data));
      } else {
        next(error);
      }
    }
  });

  // Get connector status
  router.get('/status', async (req, res, next) => {
    try {
      const userId = req.userId;

      // Check if user has existing Plaid credential
      const existingCredential = await redis.get(`plaid_credential:${userId}`);

      res.json({
        connected: !!existingCredential,
        platform: 'plaid',
        features: [
          'Bank-verified identity',
          'Government ID verification',
          'Address verification',
          'Selfie verification'
        ],
        requiredProducts: ['identity_verification'],
        credentialTypes: ['PlaidIdentityCredential'],
        verificationMethods: ['document', 'selfie', 'database'],
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
      await redis.del(`plaid_credential:${userId}`);

      logger.info('Plaid credential revoked', {
        userId,
        requestId: req.id
      });

      res.json({
        message: 'Plaid identity credential revoked successfully',
        platform: 'plaid'
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};