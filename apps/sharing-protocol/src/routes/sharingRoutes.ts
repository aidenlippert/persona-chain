import { Router } from 'express';
import Joi from 'joi';
import { sessionManager, qrCodeService, consentManager } from '../index.js';
import {
  ProofShareRequestSchema,
  ProofShareResponseSchema,
  SharingProtocolError,
  SessionError,
} from '../types/sharing.js';

const router = Router();

// Validation middleware
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })),
      });
    }
    
    next();
  };
};

// Validation schemas for API
const createSessionSchema = Joi.object({
  request: ProofShareRequestSchema.required(),
  type: Joi.string().valid('qr', 'did', 'direct', 'api').default('qr'),
  ttl: Joi.number().min(60000).max(86400000).optional(), // 1 minute to 24 hours
  generateQR: Joi.boolean().default(true),
  qrOptions: Joi.object({
    width: Joi.number().min(128).max(1024).default(256),
    format: Joi.string().valid('png', 'svg', 'utf8').default('png'),
  }).optional(),
});

const respondToSessionSchema = Joi.object({
  holderDid: Joi.string().required(),
  response: ProofShareResponseSchema.required(),
  consentSignature: Joi.string().required(),
});

const activateSessionSchema = Joi.object({
  holderDid: Joi.string().optional(),
});

/**
 * POST /api/sharing/sessions
 * Create a new sharing session
 */
router.post('/sessions', validateRequest(createSessionSchema), async (req, res) => {
  try {
    const { request, type, ttl, generateQR, qrOptions } = req.body;

    console.log(`🔗 Creating sharing session for ${request.requester.name}`);
    console.log(`   Purpose: ${request.purpose}`);
    console.log(`   Requested proofs: ${request.requestedProofs.length}`);

    // Create session
    const session = await sessionManager.createSession(request, type, ttl);

    // Generate QR code if requested
    let qrData;
    if (generateQR && (type === 'qr' || type === 'api')) {
      try {
        qrData = await qrCodeService.generateRequestQR(
          request,
          session.id,
          qrOptions
        );
        console.log(`📱 Generated QR code for session ${session.id}`);
      } catch (qrError) {
        console.warn(`⚠️  Failed to generate QR code:`, qrError);
        // Continue without QR code
      }
    }

    res.status(201).json({
      success: true,
      data: {
        session,
        qr: qrData,
        sharingUrl: qrCodeService.buildSharingUrl(session.id, 'request'),
        instructions: {
          qr: 'Share the QR code for users to scan with their PersonaPass wallet',
          url: 'Share the URL for web-based sharing',
          websocket: `Connect to /socket.io with sessionId: ${session.id} for real-time updates`,
        },
      },
    });

  } catch (error) {
    console.error('❌ Failed to create sharing session:', error);
    
    if (error instanceof SessionError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create sharing session',
        details: error.message,
      });
    }
  }
});

/**
 * GET /api/sharing/sessions/:sessionId
 * Get session details
 */
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired',
      });
    }

    // Don't expose sensitive data in the response
    const safeSession = {
      ...session,
      // Remove sensitive information from request/response
      request: session.request ? {
        ...session.request,
        // Keep only necessary fields for verification
        id: session.request.id,
        requester: session.request.requester,
        requestedProofs: session.request.requestedProofs.map(p => ({
          domain: p.domain,
          operation: p.operation,
          reason: p.reason,
          required: p.required,
        })),
        purpose: session.request.purpose,
        expiresAt: session.request.expiresAt,
      } : undefined,
    };

    res.json({
      success: true,
      data: {
        session: safeSession,
        sharingUrl: qrCodeService.buildSharingUrl(sessionId, 'request'),
      },
    });

  } catch (error) {
    console.error(`❌ Failed to get session ${req.params.sessionId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session',
      details: error.message,
    });
  }
});

/**
 * POST /api/sharing/sessions/:sessionId/activate
 * Activate a session (e.g., when QR code is scanned)
 */
router.post('/sessions/:sessionId/activate', validateRequest(activateSessionSchema), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { holderDid } = req.body;

    console.log(`🔓 Activating session ${sessionId}`);

    const session = await sessionManager.activateSession(sessionId, holderDid);

    res.json({
      success: true,
      data: {
        session,
        message: 'Session activated successfully',
      },
    });

  } catch (error) {
    console.error(`❌ Failed to activate session ${req.params.sessionId}:`, error);
    
    if (error instanceof SessionError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to activate session',
        details: error.message,
      });
    }
  }
});

/**
 * POST /api/sharing/sessions/:sessionId/respond
 * Submit response to a sharing request
 */
router.post('/sessions/:sessionId/respond', validateRequest(respondToSessionSchema), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { holderDid, response, consentSignature } = req.body;

    console.log(`📤 Processing response for session ${sessionId}`);
    console.log(`   Holder: ${holderDid}`);
    console.log(`   Shared proofs: ${response.sharedProofs.length}`);
    console.log(`   Consent given: ${response.consentGiven}`);

    // Get the session to validate the request
    const session = sessionManager.getSession(sessionId);
    if (!session || !session.request) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired',
      });
    }

    // Request consent if consent is given
    if (response.consentGiven) {
      const consentResult = await consentManager.requestConsent(holderDid, session.request);
      
      if (consentResult.requiresDecision) {
        // Record the consent decision
        await consentManager.recordConsent(
          consentResult.consentId,
          holderDid,
          session.request.requester.did,
          session.request,
          {
            consentGiven: true,
            selectedProofs: response.sharedProofs.map(p => p.domain),
            signature: consentSignature,
          }
        );
      }
    }

    // Update session with response
    const updatedSession = await sessionManager.respondToSession(sessionId, holderDid, response);

    // Generate response QR code if needed
    let qrData;
    if (updatedSession.type === 'qr') {
      try {
        qrData = await qrCodeService.generateResponseQR(response, sessionId);
      } catch (qrError) {
        console.warn(`⚠️  Failed to generate response QR code:`, qrError);
      }
    }

    res.json({
      success: true,
      data: {
        session: updatedSession,
        qr: qrData,
        message: response.consentGiven 
          ? 'Response submitted successfully with consent'
          : 'Response submitted - consent denied',
      },
    });

  } catch (error) {
    console.error(`❌ Failed to respond to session ${req.params.sessionId}:`, error);
    
    if (error instanceof SessionError || error instanceof SharingProtocolError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code || 'SESSION_ERROR',
        details: error.details,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to process session response',
        details: error.message,
      });
    }
  }
});

/**
 * DELETE /api/sharing/sessions/:sessionId
 * Revoke/cancel a session
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    console.log(`🚫 Revoking session ${sessionId}`);

    await sessionManager.revokeSession(sessionId, reason);

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });

  } catch (error) {
    console.error(`❌ Failed to revoke session ${req.params.sessionId}:`, error);
    
    if (error instanceof SessionError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to revoke session',
        details: error.message,
      });
    }
  }
});

/**
 * GET /api/sharing/sessions
 * List sessions with filtering
 */
router.get('/sessions', async (req, res) => {
  try {
    const {
      status,
      requesterDid,
      holderDid,
      domain,
      limit = 20,
    } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (requesterDid) filter.requesterDid = requesterDid;
    if (holderDid) filter.holderDid = holderDid;
    if (domain) filter.domain = domain;
    if (limit) filter.limit = parseInt(limit as string);

    const sessions = sessionManager.listSessions(filter);

    res.json({
      success: true,
      data: {
        sessions,
        total: sessions.length,
        filter,
      },
    });

  } catch (error) {
    console.error('❌ Failed to list sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list sessions',
      details: error.message,
    });
  }
});

/**
 * GET /api/sharing/analytics
 * Get sharing analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const sessionStats = sessionManager.getSessionStats();
    const sharingAnalytics = sessionManager.getAnalytics();
    const consentAnalytics = consentManager.getConsentAnalytics();

    res.json({
      success: true,
      data: {
        sessions: sessionStats,
        sharing: sharingAnalytics,
        consent: consentAnalytics,
        summary: {
          totalSessions: sessionStats.total,
          successRate: sessionStats.total > 0 
            ? Math.round((sessionStats.completed / sessionStats.total) * 100) 
            : 0,
          activeNow: sessionStats.active,
          consentRate: Math.round(consentAnalytics.consentRate * 100),
        },
      },
    });

  } catch (error) {
    console.error('❌ Failed to get analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics',
      details: error.message,
    });
  }
});

/**
 * GET /api/sharing/stats
 * Get real-time statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = sessionManager.getSessionStats();
    
    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('❌ Failed to get stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message,
    });
  }
});

export { router as sharingRoutes };