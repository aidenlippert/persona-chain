import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { generateJWT, validateAdminCredentials, AuthRequest, authenticateJWT } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/admin/login
 * Admin login endpoint - returns JWT token for authenticated admin
 */
router.post('/admin/login', [
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
], async (req: Request, res: Response) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password } = req.body;

    // Rate limiting check (basic implementation)
    // In production, use Redis or proper rate limiting middleware
    const clientIP = req.ip || req.connection.remoteAddress;
    console.log(`🔐 Admin login attempt from IP: ${clientIP}`);

    // Validate credentials
    const user = await validateAdminCredentials({ username, password });

    if (!user) {
      // Log failed attempt for security monitoring
      console.warn(`❌ Failed admin login attempt for username: ${username} from IP: ${clientIP}`);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateJWT(user);

    // Log successful login
    console.log(`✅ Successful admin login for user: ${user.id} from IP: ${clientIP}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          role: user.role,
          address: user.address
        },
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /auth/admin/validate
 * Validate current JWT token
 */
router.post('/admin/validate', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          role: req.user.role,
          address: req.user.address
        },
        valid: true
      }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /auth/admin/logout
 * Admin logout endpoint (invalidates token on client side)
 */
router.post('/admin/logout', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    // Log logout
    console.log(`🔐 Admin logout for user: ${req.user?.id}`);

    // In a production system, you might want to add the token to a blacklist
    // For now, we rely on client-side token removal

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /auth/admin/profile
 * Get admin profile information
 */
router.get('/admin/profile', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          role: req.user.role,
          address: req.user.address
        },
        permissions: [
          'circuit_registration',
          'circuit_deactivation',
          'issuer_management',
          'governance_management',
          'system_configuration'
        ]
      }
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;