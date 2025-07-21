import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { CreditService } from '../services/CreditService';

const router = Router();
const creditService = new CreditService();

// OAuth state store (in production, use Redis)
const stateStore = new Map();

/**
 * Store OAuth state for validation
 */
async function storeOAuthState(state: string, data: any): Promise<void> {
  stateStore.set(state, {
    ...data,
    createdAt: Date.now()
  });
  
  // Clean up expired states
  setTimeout(() => {
    stateStore.delete(state);
  }, 3600000); // 1 hour
}

/**
 * Retrieve OAuth state data
 */
async function getOAuthState(state: string): Promise<any> {
  const data = stateStore.get(state);
  if (!data) return null;
  
  // Check if expired (1 hour)
  if (Date.now() - data.createdAt > 3600000) {
    stateStore.delete(state);
    return null;
  }
  
  return data;
}

/**
 * GET /oauth/authorizeCredit
 * Initiate OAuth flow for credit data access
 */
router.get('/authorizeCredit', async (req, res) => {
  try {
    const { did, provider, returnUrl } = req.query;
    
    if (!did) {
      return res.status(400).json({
        success: false,
        error: 'DID parameter is required'
      });
    }
    
    const supportedProviders = ['credit_karma', 'experian'];
    const selectedProvider = provider as string || 'credit_karma';
    
    if (!supportedProviders.includes(selectedProvider)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported credit provider',
        supportedProviders
      });
    }
    
    // Generate secure state parameter
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state and DID association
    await storeOAuthState(state, {
      did: did as string,
      provider: selectedProvider,
      returnUrl: returnUrl as string,
      timestamp: Date.now()
    });
    
    let authUrl: string;
    
    switch (selectedProvider) {
      case 'experian':
        authUrl = creditService.buildExperianAuthUrl(state);
        break;
      case 'credit_karma':
      default:
        authUrl = creditService.buildCreditKarmaAuthUrl(state);
        break;
    }
    
    console.log(`🔐 Credit OAuth authorization initiated for DID: ${did}, Provider: ${selectedProvider}`);
    
    res.json({
      success: true,
      data: {
        authUrl,
        state,
        provider: selectedProvider,
        expiresIn: 3600 // 1 hour
      }
    });
    
  } catch (error) {
    console.error('❌ Error initiating credit OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate credit OAuth authorization'
    });
  }
});

/**
 * GET /oauth/callbackCredit
 * Handle OAuth callback from credit providers
 */
router.get('/callbackCredit', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    if (oauthError) {
      console.error('❌ Credit OAuth error:', oauthError);
      return res.status(400).json({
        success: false,
        error: 'Credit OAuth authorization denied',
        details: oauthError
      });
    }
    
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state parameter'
      });
    }
    
    // Retrieve and validate state
    const stateData = await getOAuthState(state as string);
    if (!stateData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired state parameter'
      });
    }
    
    // Exchange authorization code for access token
    const tokenData = await creditService.exchangeCodeForToken(
      code as string,
      stateData.provider
    );
    
    // Store access token associated with DID
    await creditService.storeAccessToken(stateData.did, stateData.provider, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      scope: tokenData.scope
    });
    
    // Generate success JWT for frontend
    const successToken = jwt.sign(
      {
        did: stateData.did,
        provider: stateData.provider,
        authorized: true,
        timestamp: Date.now()
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    
    console.log(`✅ Credit OAuth authorization completed for DID: ${stateData.did}, Provider: ${stateData.provider}`);
    
    // Redirect to return URL or default success page
    const returnUrl = stateData.returnUrl || `${process.env.FRONTEND_URL}/financial-success`;
    const redirectUrl = `${returnUrl}?token=${successToken}&provider=${stateData.provider}`;
    
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ Error handling credit OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete credit OAuth authorization'
    });
  }
});

/**
 * GET /oauth/authorizePlaid
 * Provide information for Plaid Link initialization (Plaid uses client-side initialization)
 */
router.get('/authorizePlaid', async (req, res) => {
  try {
    const { did, returnUrl } = req.query;
    
    if (!did) {
      return res.status(400).json({
        success: false,
        error: 'DID parameter is required'
      });
    }
    
    console.log(`🔐 Plaid authorization initiated for DID: ${did}`);
    
    // For Plaid, we redirect to frontend with instructions to use Plaid Link
    const frontendUrl = returnUrl as string || `${process.env.FRONTEND_URL}/financial-connect`;
    const redirectUrl = `${frontendUrl}?provider=plaid&did=${did}`;
    
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ Error initiating Plaid authorization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate Plaid authorization'
    });
  }
});

/**
 * POST /oauth/refresh
 * Refresh expired credit access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { did, provider } = req.body;
    
    if (!did || !provider) {
      return res.status(400).json({
        success: false,
        error: 'DID and provider are required'
      });
    }
    
    // For credit providers, attempt to refresh token
    // (Implementation would depend on provider's refresh token support)
    
    res.json({
      success: false,
      error: 'Token refresh not supported for credit providers, re-authorization required'
    });
    
  } catch (error) {
    console.error('❌ Error refreshing credit token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh access token'
    });
  }
});

/**
 * DELETE /oauth/revoke
 * Revoke access token and delete stored credentials
 */
router.delete('/revoke', async (req, res) => {
  try {
    const { did, provider } = req.body;
    
    if (!did || !provider) {
      return res.status(400).json({
        success: false,
        error: 'DID and provider are required'
      });
    }
    
    await creditService.revokeAccess(did, provider);
    
    console.log(`🔓 OAuth access revoked for DID: ${did}, Provider: ${provider}`);
    
    res.json({
      success: true,
      data: {
        revoked: true,
        did,
        provider
      }
    });
    
  } catch (error) {
    console.error('❌ Error revoking OAuth access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke OAuth access'
    });
  }
});

export { router as oauthRoutes };