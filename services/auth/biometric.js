// PersonaChain Biometric Authentication Module
// WebAuthn, Face ID, Touch ID, Voice Recognition, Behavioral Biometrics

const crypto = require('crypto');
const { fido2lib } = require('fido2-lib');
const winston = require('winston');

class BiometricAuthenticator {
  constructor(authService) {
    this.authService = authService;
    this.logger = authService.logger;
    
    // Initialize FIDO2/WebAuthn library
    this.fido2 = new fido2lib.Fido2Lib({
      timeout: 60000,
      rpId: process.env.RP_ID || 'localhost',
      rpName: 'PersonaChain Identity Platform',
      challengeSize: 128,
      attestation: 'direct',
      cryptoParams: [-7, -257], // ES256, RS256
      authenticatorAttachment: 'platform',
      authenticatorRequireResidentKey: false,
      authenticatorUserVerification: 'preferred',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'preferred'
      }
    });

    this.setupBiometricRoutes();
  }

  setupBiometricRoutes() {
    const app = this.authService.app;

    // WebAuthn registration initiation
    app.post('/auth/biometric/register/begin', this.authService.authenticateJWT, async (req, res) => {
      try {
        const user = req.user;
        
        // Generate registration options
        const registrationOptions = await this.fido2.attestationOptions();
        
        // Store challenge in Redis for verification
        const challengeKey = `webauthn:challenge:${user.id}:${Date.now()}`;
        await this.authService.redis.setex(
          challengeKey, 
          300, // 5 minutes
          JSON.stringify({
            challenge: registrationOptions.challenge,
            userId: user.id,
            type: 'registration'
          })
        );

        // Prepare user information for WebAuthn
        const userInfo = {
          id: Buffer.from(user.id),
          name: user.email,
          displayName: `${user.first_name} ${user.last_name}`.trim()
        };

        // Enhance options with user info and RP info
        const options = {
          ...registrationOptions,
          user: userInfo,
          rp: {
            name: 'PersonaChain Identity Platform',
            id: process.env.RP_ID || 'localhost'
          },
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Use platform authenticators (Touch ID, Face ID, Windows Hello)
            requireResidentKey: false,
            userVerification: 'preferred'
          },
          attestation: 'direct',
          timeout: 60000
        };

        res.json({
          success: true,
          options,
          challengeId: challengeKey
        });

      } catch (error) {
        this.logger.error('WebAuthn registration begin error:', error);
        res.status(500).json({ error: 'Failed to initiate biometric registration' });
      }
    });

    // WebAuthn registration completion
    app.post('/auth/biometric/register/complete', this.authService.authenticateJWT, async (req, res) => {
      try {
        const { challengeId, credential, deviceName } = req.body;
        const user = req.user;

        // Retrieve challenge from Redis
        const challengeData = await this.authService.redis.get(challengeId);
        if (!challengeData) {
          return res.status(400).json({ error: 'Invalid or expired challenge' });
        }

        const { challenge, userId } = JSON.parse(challengeData);

        if (userId !== user.id) {
          return res.status(403).json({ error: 'Challenge user mismatch' });
        }

        // Verify the attestation
        const attestationExpectations = {
          challenge,
          origin: process.env.WEBAUTHN_ORIGIN || `https://${process.env.RP_ID}`,
          factor: 'either'
        };

        const regResult = await this.fido2.attestationResult(credential, attestationExpectations);

        // Store the authenticator in the database
        const authenticatorData = {
          credentialId: Buffer.from(regResult.authnrData.get('credId')).toString('base64'),
          publicKey: regResult.authnrData.get('credentialPublicKeyPem'),
          counter: regResult.authnrData.get('counter'),
          aaguid: regResult.authnrData.get('aaguid'),
          fmt: regResult.authnrData.get('fmt')
        };

        await this.authService.db.query(`
          INSERT INTO user_authenticators (
            user_id, credential_id, public_key, counter, aaguid, fmt, 
            device_name, device_type, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          user.id,
          authenticatorData.credentialId,
          authenticatorData.publicKey,
          authenticatorData.counter,
          authenticatorData.aaguid,
          authenticatorData.fmt,
          deviceName || 'Unknown Device',
          'webauthn'
        ]);

        // Clean up challenge
        await this.authService.redis.del(challengeId);

        // Log biometric registration
        await this.authService.logAuthEvent(user.id, 'biometric_registered', {
          deviceName,
          credentialId: authenticatorData.credentialId,
          fmt: authenticatorData.fmt
        });

        res.json({
          success: true,
          message: 'Biometric authenticator registered successfully',
          authenticator: {
            credentialId: authenticatorData.credentialId,
            deviceName,
            createdAt: new Date().toISOString()
          }
        });

      } catch (error) {
        this.logger.error('WebAuthn registration complete error:', error);
        res.status(500).json({ error: 'Failed to complete biometric registration' });
      }
    });

    // WebAuthn authentication initiation
    app.post('/auth/biometric/authenticate/begin', async (req, res) => {
      try {
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({ error: 'Email required' });
        }

        // Get user and their authenticators
        const userResult = await this.authService.db.query(
          'SELECT * FROM users WHERE email = $1 AND active = true',
          [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Get user's registered authenticators
        const authenticatorsResult = await this.authService.db.query(
          'SELECT credential_id, public_key, counter FROM user_authenticators WHERE user_id = $1 AND active = true',
          [user.id]
        );

        if (authenticatorsResult.rows.length === 0) {
          return res.status(400).json({ error: 'No biometric authenticators registered' });
        }

        // Generate authentication options
        const authenticationOptions = await this.fido2.assertionOptions();

        // Prepare allowed credentials
        const allowCredentials = authenticatorsResult.rows.map(auth => ({
          type: 'public-key',
          id: Buffer.from(auth.credential_id, 'base64'),
          transports: ['internal'] // For platform authenticators
        }));

        // Store challenge in Redis
        const challengeKey = `webauthn:challenge:${user.id}:${Date.now()}`;
        await this.authService.redis.setex(
          challengeKey,
          300, // 5 minutes
          JSON.stringify({
            challenge: authenticationOptions.challenge,
            userId: user.id,
            type: 'authentication'
          })
        );

        const options = {
          ...authenticationOptions,
          allowCredentials,
          userVerification: 'preferred',
          timeout: 60000
        };

        res.json({
          success: true,
          options,
          challengeId: challengeKey
        });

      } catch (error) {
        this.logger.error('WebAuthn authentication begin error:', error);
        res.status(500).json({ error: 'Failed to initiate biometric authentication' });
      }
    });

    // WebAuthn authentication completion
    app.post('/auth/biometric/authenticate/complete', async (req, res) => {
      try {
        const { challengeId, credential } = req.body;

        // Retrieve challenge from Redis
        const challengeData = await this.authService.redis.get(challengeId);
        if (!challengeData) {
          return res.status(400).json({ error: 'Invalid or expired challenge' });
        }

        const { challenge, userId } = JSON.parse(challengeData);

        // Get user and authenticator
        const userResult = await this.authService.db.query(
          'SELECT * FROM users WHERE id = $1 AND active = true',
          [userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Get the specific authenticator used
        const credentialId = Buffer.from(credential.id, 'base64').toString('base64');
        const authenticatorResult = await this.authService.db.query(
          'SELECT * FROM user_authenticators WHERE user_id = $1 AND credential_id = $2 AND active = true',
          [userId, credentialId]
        );

        if (authenticatorResult.rows.length === 0) {
          return res.status(400).json({ error: 'Authenticator not found' });
        }

        const authenticator = authenticatorResult.rows[0];

        // Verify the assertion
        const assertionExpectations = {
          challenge,
          origin: process.env.WEBAUTHN_ORIGIN || `https://${process.env.RP_ID}`,
          factor: 'either',
          publicKey: authenticator.public_key,
          prevCounter: authenticator.counter,
          userHandle: Buffer.from(user.id)
        };

        const assertionResult = await this.fido2.assertionResult(credential, assertionExpectations);

        // Update counter
        const newCounter = assertionResult.authnrData.get('counter');
        await this.authService.db.query(
          'UPDATE user_authenticators SET counter = $1, last_used = NOW() WHERE id = $2',
          [newCounter, authenticator.id]
        );

        // Generate tokens
        const tokens = await this.authService.generateTokens(user);

        // Clean up challenge
        await this.authService.redis.del(challengeId);

        // Log successful biometric authentication
        await this.authService.logAuthEvent(user.id, 'biometric_login_success', {
          credentialId,
          deviceName: authenticator.device_name
        });

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name
          },
          ...tokens
        });

      } catch (error) {
        this.logger.error('WebAuthn authentication complete error:', error);
        res.status(500).json({ error: 'Biometric authentication failed' });
      }
    });

    // List user's registered authenticators
    app.get('/auth/biometric/devices', this.authService.authenticateJWT, async (req, res) => {
      try {
        const result = await this.authService.db.query(`
          SELECT id, credential_id, device_name, device_type, created_at, last_used
          FROM user_authenticators 
          WHERE user_id = $1 AND active = true
          ORDER BY created_at DESC
        `, [req.user.id]);

        res.json({
          success: true,
          devices: result.rows.map(device => ({
            id: device.id,
            credentialId: device.credential_id,
            deviceName: device.device_name,
            deviceType: device.device_type,
            createdAt: device.created_at,
            lastUsed: device.last_used
          }))
        });

      } catch (error) {
        this.logger.error('Get biometric devices error:', error);
        res.status(500).json({ error: 'Failed to retrieve biometric devices' });
      }
    });

    // Remove a biometric authenticator
    app.delete('/auth/biometric/devices/:deviceId', this.authService.authenticateJWT, async (req, res) => {
      try {
        const { deviceId } = req.params;

        const result = await this.authService.db.query(
          'UPDATE user_authenticators SET active = false WHERE id = $1 AND user_id = $2 RETURNING device_name',
          [deviceId, req.user.id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Device not found' });
        }

        // Log device removal
        await this.authService.logAuthEvent(req.user.id, 'biometric_device_removed', {
          deviceId,
          deviceName: result.rows[0].device_name
        });

        res.json({
          success: true,
          message: 'Biometric device removed successfully'
        });

      } catch (error) {
        this.logger.error('Remove biometric device error:', error);
        res.status(500).json({ error: 'Failed to remove biometric device' });
      }
    });

    // Voice biometric enrollment (placeholder for future implementation)
    app.post('/auth/biometric/voice/enroll', this.authService.authenticateJWT, async (req, res) => {
      try {
        // Voice biometric enrollment would integrate with services like:
        // - Amazon Polly/Transcribe
        // - Google Cloud Speech-to-Text
        // - Azure Cognitive Services Speech
        // - Nuance Dragon Speech Recognition
        
        res.status(501).json({ 
          error: 'Voice biometric enrollment not yet implemented',
          message: 'Coming soon in future release'
        });
      } catch (error) {
        this.logger.error('Voice biometric enrollment error:', error);
        res.status(500).json({ error: 'Voice biometric enrollment failed' });
      }
    });

    // Behavioral biometrics analysis (placeholder for future implementation)
    app.post('/auth/biometric/behavioral/analyze', this.authService.authenticateJWT, async (req, res) => {
      try {
        // Behavioral biometrics would analyze:
        // - Typing patterns and rhythms
        // - Mouse movement patterns
        // - Touch patterns on mobile devices
        // - Navigation patterns
        // - Session duration patterns
        
        res.status(501).json({ 
          error: 'Behavioral biometric analysis not yet implemented',
          message: 'Coming soon in future release'
        });
      } catch (error) {
        this.logger.error('Behavioral biometric analysis error:', error);
        res.status(500).json({ error: 'Behavioral biometric analysis failed' });
      }
    });
  }

  // Helper method to initialize biometric database tables
  async initializeBiometricTables() {
    try {
      await this.authService.db.query(`
        CREATE TABLE IF NOT EXISTS user_authenticators (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          credential_id TEXT NOT NULL UNIQUE,
          public_key TEXT NOT NULL,
          counter BIGINT DEFAULT 0,
          aaguid TEXT,
          fmt TEXT,
          device_name VARCHAR(255),
          device_type VARCHAR(50) DEFAULT 'webauthn',
          active BOOLEAN DEFAULT true,
          last_used TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_user_authenticators_user_id ON user_authenticators(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_authenticators_credential_id ON user_authenticators(credential_id);
      `);

      this.logger.info('Biometric tables initialized successfully');
    } catch (error) {
      this.logger.error('Biometric table initialization error:', error);
      throw error;
    }
  }

  // Validate biometric authentication requirements
  validateBiometricCapability(req) {
    const userAgent = req.get('User-Agent') || '';
    
    // Check for platform authenticator support
    const supportsPlatformAuth = 
      userAgent.includes('Chrome') ||
      userAgent.includes('Firefox') ||
      userAgent.includes('Safari') ||
      userAgent.includes('Edge');

    return {
      supported: supportsPlatformAuth,
      capabilities: {
        webauthn: supportsPlatformAuth,
        faceId: userAgent.includes('Safari') && userAgent.includes('Mobile'),
        touchId: userAgent.includes('Safari') && userAgent.includes('Mobile'),
        windowsHello: userAgent.includes('Windows'),
        androidBiometric: userAgent.includes('Android')
      }
    };
  }
}

module.exports = BiometricAuthenticator;