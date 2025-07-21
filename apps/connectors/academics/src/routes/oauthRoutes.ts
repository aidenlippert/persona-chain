import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { OAuthService } from '../services/OAuthService';

const router = Router();
const oauthService = new OAuthService();

/**
 * GET /oauth/authorizeAcademics
 * Initiate OAuth flow for academic data access
 */
router.get('/authorizeAcademics', async (req, res) => {
  try {
    const { did, provider, returnUrl } = req.query;
    
    if (!did) {
      return res.status(400).json({
        success: false,
        error: 'DID parameter is required'
      });
    }
    
    // Generate secure state parameter
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state and DID association (in production, use Redis)
    await oauthService.storeOAuthState(state, {
      did: did as string,
      provider: provider as string || 'nsc',
      returnUrl: returnUrl as string,
      timestamp: Date.now()
    });
    
    let authUrl: string;
    
    switch (provider) {
      case 'parchment':
        authUrl = oauthService.buildParchmentAuthUrl(state);
        break;
      case 'nsc':
      default:
        authUrl = oauthService.buildNSCAuthUrl(state);
        break;
    }
    
    console.log(`🔐 OAuth authorization initiated for DID: ${did}, Provider: ${provider}`);
    
    res.json({
      success: true,
      data: {
        authUrl,
        state,
        provider: provider || 'nsc',
        expiresIn: 3600 // 1 hour
      }
    });
    
  } catch (error) {
    console.error('❌ Error initiating OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth authorization'
    });
  }
});

/**
 * GET /oauth/callbackAcademics
 * Handle OAuth callback from academic providers
 */
router.get('/callbackAcademics', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    if (oauthError) {
      console.error('❌ OAuth error:', oauthError);
      return res.status(400).json({
        success: false,
        error: 'OAuth authorization denied',
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
    const stateData = await oauthService.getOAuthState(state as string);
    if (!stateData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired state parameter'
      });
    }
    
    // Exchange authorization code for access token
    const tokenData = await oauthService.exchangeCodeForToken(
      code as string,
      stateData.provider,
      state as string
    );
    
    // Store access token associated with DID
    await oauthService.storeAccessToken(stateData.did, stateData.provider, {
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
    
    console.log(`✅ OAuth authorization completed for DID: ${stateData.did}, Provider: ${stateData.provider}`);
    
    // Redirect to return URL or default success page
    const returnUrl = stateData.returnUrl || `${process.env.FRONTEND_URL}/academic-success`;
    const redirectUrl = `${returnUrl}?token=${successToken}&provider=${stateData.provider}`;
    
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ Error handling OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete OAuth authorization'
    });
  }
});

/**
 * POST /oauth/refresh
 * Refresh expired access token
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
    
    const refreshed = await oauthService.refreshAccessToken(did, provider);
    
    if (!refreshed) {
      return res.status(401).json({
        success: false,
        error: 'Failed to refresh token, re-authorization required'
      });
    }
    
    res.json({
      success: true,
      data: {
        refreshed: true,
        expiresAt: refreshed.expiresAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
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
    
    await oauthService.revokeAccess(did, provider);
    
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