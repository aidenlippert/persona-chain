import { Router } from 'express';
import Joi from 'joi';
import { qrCodeService, sessionManager } from '../index.js';
import {
  ProofShareRequestSchema,
  ProofShareResponseSchema,
  ValidationError,
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

// Validation schemas
const generateRequestQRSchema = Joi.object({
  request: ProofShareRequestSchema.required(),
  sessionId: Joi.string().required(),
  options: Joi.object({
    width: Joi.number().min(128).max(1024).default(256),
    margin: Joi.number().min(0).max(10).default(4),
    format: Joi.string().valid('png', 'svg', 'utf8').default('png'),
    color: Joi.object({
      dark: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
      light: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#FFFFFF'),
    }).optional(),
  }).optional(),
});

const generateResponseQRSchema = Joi.object({
  response: ProofShareResponseSchema.required(),
  sessionId: Joi.string().required(),
  options: Joi.object({
    width: Joi.number().min(128).max(1024).default(256),
    margin: Joi.number().min(0).max(10).default(4),
    format: Joi.string().valid('png', 'svg', 'utf8').default('png'),
    color: Joi.object({
      dark: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
      light: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#FFFFFF'),
    }).optional(),
  }).optional(),
});

const generateSessionQRSchema = Joi.object({
  sessionId: Joi.string().required(),
  type: Joi.string().valid('request', 'response', 'invitation').default('invitation'),
  options: Joi.object({
    width: Joi.number().min(128).max(1024).default(256),
    margin: Joi.number().min(0).max(10).default(4),
    format: Joi.string().valid('png', 'svg', 'utf8').default('png'),
    color: Joi.object({
      dark: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
      light: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#FFFFFF'),
    }).optional(),
  }).optional(),
});

const parseQRSchema = Joi.object({
  imageData: Joi.alternatives().try(
    Joi.string(), // base64 or data URL
    Joi.object({
      data: Joi.array().items(Joi.number()).required(),
      width: Joi.number().required(),
      height: Joi.number().required(),
    })
  ).required(),
});

/**
 * POST /api/qr/generate/request
 * Generate QR code for a proof share request
 */
router.post('/generate/request', validateRequest(generateRequestQRSchema), async (req, res) => {
  try {
    const { request, sessionId, options = {} } = req.body;

    console.log(`📱 Generating request QR code for session ${sessionId}`);
    console.log(`   Requester: ${request.requester.name}`);
    console.log(`   Format: ${options.format || 'png'}`);

    const qrResult = await qrCodeService.generateRequestQR(request, sessionId, options);

    res.json({
      success: true,
      data: {
        qrCode: qrResult.qrCode,
        url: qrResult.url,
        metadata: {
          sessionId,
          dataSize: qrResult.size,
          format: options.format || 'png',
          dimensions: {
            width: options.width || 256,
            height: options.width || 256,
          },
          type: qrResult.data.type,
          version: qrResult.data.version,
        },
        instructions: {
          sharing: 'Share this QR code for users to scan with their PersonaPass wallet',
          scanning: 'Users should scan this with a compatible wallet app',
          fallback: 'Alternatively, users can visit the provided URL',
        },
      },
    });

  } catch (error) {
    console.error('❌ Failed to generate request QR code:', error);
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate QR code',
        details: error.message,
      });
    }
  }
});

/**
 * POST /api/qr/generate/response
 * Generate QR code for a proof share response
 */
router.post('/generate/response', validateRequest(generateResponseQRSchema), async (req, res) => {
  try {
    const { response, sessionId, options = {} } = req.body;

    console.log(`📱 Generating response QR code for session ${sessionId}`);
    console.log(`   Shared proofs: ${response.sharedProofs.length}`);
    console.log(`   Format: ${options.format || 'png'}`);

    const qrResult = await qrCodeService.generateResponseQR(response, sessionId, options);

    res.json({
      success: true,
      data: {
        qrCode: qrResult.qrCode,
        url: qrResult.url,
        metadata: {
          sessionId,
          dataSize: qrResult.size,
          format: options.format || 'png',
          dimensions: {
            width: options.width || 256,
            height: options.width || 256,
          },
          type: qrResult.data.type,
          version: qrResult.data.version,
          sharedProofCount: response.sharedProofs.length,
        },
        instructions: {
          sharing: 'Share this QR code to provide proof verification results',
          scanning: 'Verifiers can scan this to validate the shared proofs',
          security: 'This QR contains proof verification data - share securely',
        },
      },
    });

  } catch (error) {
    console.error('❌ Failed to generate response QR code:', error);
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate QR code',
        details: error.message,
      });
    }
  }
});

/**
 * POST /api/qr/generate/session
 * Generate session reference QR code (for large data)
 */
router.post('/generate/session', validateRequest(generateSessionQRSchema), async (req, res) => {
  try {
    const { sessionId, type, options = {} } = req.body;

    // Validate session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired',
      });
    }

    console.log(`📱 Generating session reference QR code for ${sessionId}`);
    console.log(`   Type: ${type}, Format: ${options.format || 'png'}`);

    const qrResult = await qrCodeService.generateSessionReferenceQR(sessionId, type, options);

    res.json({
      success: true,
      data: {
        qrCode: qrResult.qrCode,
        url: qrResult.url,
        metadata: {
          sessionId,
          dataSize: qrResult.size,
          format: options.format || 'png',
          dimensions: {
            width: options.width || 256,
            height: options.width || 256,
          },
          type: qrResult.data.type,
          version: qrResult.data.version,
          referenceType: type,
        },
        instructions: {
          sharing: 'This QR code links to the sharing session',
          scanning: 'Scan to access the full sharing request/response',
          fallback: 'Users can also visit the URL directly',
        },
      },
    });

  } catch (error) {
    console.error('❌ Failed to generate session QR code:', error);
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate QR code',
        details: error.message,
      });
    }
  }
});

/**
 * POST /api/qr/parse
 * Parse and validate QR code data
 */
router.post('/parse', validateRequest(parseQRSchema), async (req, res) => {
  try {
    const { imageData } = req.body;

    console.log(`📱 Parsing QR code data`);

    let qrData;
    
    if (typeof imageData === 'string') {
      // Handle base64 or data URL
      if (imageData.startsWith('data:')) {
        qrData = await qrCodeService.parseQRFromDataURL(imageData);
      } else {
        throw new ValidationError('String image data must be a data URL');
      }
    } else if (typeof imageData === 'object' && imageData.data) {
      // Handle raw image data
      const { data, width, height } = imageData;
      const uint8Array = new Uint8ClampedArray(data);
      qrData = await qrCodeService.parseQRCode(uint8Array, width, height);
    } else {
      throw new ValidationError('Invalid image data format');
    }

    // Provide additional context based on QR type
    let context = {};
    if (qrData.type === 'invitation' && typeof qrData.data === 'object' && 'sessionId' in qrData.data) {
      const session = sessionManager.getSession(qrData.data.sessionId as string);
      if (session) {
        context = {
          sessionExists: true,
          sessionStatus: session.status,
          requesterName: session.request?.requester.name,
          expiresAt: session.expiresAt,
        };
      } else {
        context = {
          sessionExists: false,
          reason: 'Session not found or expired',
        };
      }
    }

    console.log(`✅ Successfully parsed QR code: ${qrData.type}`);

    res.json({
      success: true,
      data: {
        qrData,
        context,
        metadata: {
          type: qrData.type,
          version: qrData.version,
          hasSignature: !!qrData.signature,
          checksumValid: true, // Would be false if parsing failed
        },
        instructions: {
          next: qrData.type === 'request' 
            ? 'Use this data to display the sharing request to the user'
            : qrData.type === 'response'
            ? 'Use this data to verify the shared proofs'
            : 'Use the session ID to fetch full sharing details',
        },
      },
    });

  } catch (error) {
    console.error('❌ Failed to parse QR code:', error);
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to parse QR code',
        details: error.message,
      });
    }
  }
});

/**
 * GET /api/qr/stats
 * Get QR code service statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = qrCodeService.getStats();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('❌ Failed to get QR stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve QR statistics',
      details: error.message,
    });
  }
});

/**
 * GET /api/qr/formats
 * Get supported QR code formats and options
 */
router.get('/formats', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        formats: [
          {
            name: 'png',
            description: 'PNG image (base64 data URL)',
            mimeType: 'image/png',
            recommended: true,
          },
          {
            name: 'svg',
            description: 'SVG vector image',
            mimeType: 'image/svg+xml',
            scalable: true,
          },
          {
            name: 'utf8',
            description: 'ASCII text representation',
            mimeType: 'text/plain',
            debugging: true,
          },
        ],
        options: {
          width: {
            min: 128,
            max: 1024,
            default: 256,
            description: 'QR code width in pixels',
          },
          margin: {
            min: 0,
            max: 10,
            default: 4,
            description: 'Margin around QR code',
          },
          errorCorrectionLevel: {
            options: ['L', 'M', 'Q', 'H'],
            default: 'M',
            description: 'Error correction level',
          },
          colors: {
            dark: {
              default: '#000000',
              description: 'Dark module color (hex)',
            },
            light: {
              default: '#FFFFFF',
              description: 'Light module color (hex)',
            },
          },
        },
        limitations: {
          maxDataSize: '2048 bytes for embedded data',
          largeDataHandling: 'Session reference QR codes for large payloads',
          signingSupported: true,
        },
      },
    });

  } catch (error) {
    console.error('❌ Failed to get format info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve format information',
      details: error.message,
    });
  }
});

export { router as qrRoutes };