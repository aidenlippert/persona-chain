// PersonaChain Multi-Factor Authentication Module
// TOTP, SMS, Email, Hardware tokens, Backup codes

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

class MFAManager {
  constructor(authService) {
    this.authService = authService;
    this.logger = authService.logger;
    
    // Initialize Twilio for SMS
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.setupMFARoutes();
  }

  setupMFARoutes() {
    const app = this.authService.app;

    // Enable MFA for user account
    app.post('/auth/mfa/enable', this.authService.authenticateJWT, async (req, res) => {
      try {
        const { method, phoneNumber } = req.body;
        const user = req.user;

        // Validate method
        const validMethods = ['totp', 'sms', 'email'];
        if (!validMethods.includes(method)) {
          return res.status(400).json({ error: 'Invalid MFA method' });
        }

        // Check if MFA is already enabled
        const existingMFA = await this.authService.db.query(
          'SELECT * FROM user_mfa_methods WHERE user_id = $1 AND method_type = $2 AND active = true',
          [user.id, method]
        );

        if (existingMFA.rows.length > 0) {
          return res.status(409).json({ error: 'MFA method already enabled' });
        }

        let setupData = {};

        switch (method) {
          case 'totp':
            setupData = await this.setupTOTP(user);
            break;
          case 'sms':
            if (!phoneNumber) {
              return res.status(400).json({ error: 'Phone number required for SMS MFA' });
            }
            setupData = await this.setupSMS(user, phoneNumber);
            break;
          case 'email':
            setupData = await this.setupEmail(user);
            break;
        }

        res.json({
          success: true,
          method,
          setupData
        });

      } catch (error) {
        this.logger.error('MFA enable error:', error);
        res.status(500).json({ error: 'Failed to enable MFA' });
      }
    });

    // Verify MFA setup and complete enrollment
    app.post('/auth/mfa/verify-setup', this.authService.authenticateJWT, async (req, res) => {
      try {
        const { method, code, secret } = req.body;
        const user = req.user;

        let isValid = false;

        switch (method) {
          case 'totp':
            isValid = speakeasy.totp.verify({
              secret,
              encoding: 'base32',
              token: code,
              window: 2
            });
            break;
          case 'sms':
          case 'email':
            // Verify code from Redis
            const storedCode = await this.authService.redis.get(`mfa:${method}:${user.id}`);
            isValid = storedCode === code;
            break;
        }

        if (!isValid) {
          return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Generate backup codes
        const backupCodes = this.generateBackupCodes();
        const hashedBackupCodes = backupCodes.map(code => 
          crypto.createHash('sha256').update(code).digest('hex')
        );

        // Store MFA method in database
        await this.authService.db.query(`
          INSERT INTO user_mfa_methods (user_id, method_type, secret, backup_codes, verified, created_at, updated_at)
          VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        `, [user.id, method, secret || null, hashedBackupCodes]);

        // Enable MFA for user
        await this.authService.db.query(
          'UPDATE users SET mfa_enabled = true WHERE id = $1',
          [user.id]
        );

        // Clean up temporary codes
        await this.authService.redis.del(`mfa:${method}:${user.id}`);

        // Log MFA enablement
        await this.authService.logAuthEvent(user.id, 'mfa_enabled', { method });

        res.json({
          success: true,
          message: 'MFA enabled successfully',
          backupCodes
        });

      } catch (error) {
        this.logger.error('MFA verify setup error:', error);
        res.status(500).json({ error: 'Failed to verify MFA setup' });
      }
    });

    // Verify MFA code during login
    app.post('/auth/mfa/verify', async (req, res) => {
      try {
        const { tempToken, code, method, isBackupCode } = req.body;

        // Verify temp token
        const tempData = await this.authService.redis.get(`temp:${tempToken}`);
        if (!tempData) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const { userId } = JSON.parse(tempData);

        // Get user
        const userResult = await this.authService.db.query(
          'SELECT * FROM users WHERE id = $1 AND active = true',
          [userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(401).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        let isValid = false;

        if (isBackupCode) {
          isValid = await this.verifyBackupCode(user.id, code);
        } else {
          isValid = await this.verifyMFACode(user.id, method, code);
        }

        if (!isValid) {
          await this.authService.logAuthEvent(user.id, 'mfa_failed', { method });
          return res.status(401).json({ error: 'Invalid MFA code' });
        }

        // Generate tokens
        const tokens = await this.authService.generateTokens(user);

        // Clean up temp token
        await this.authService.redis.del(`temp:${tempToken}`);

        // Log successful MFA
        await this.authService.logAuthEvent(user.id, 'mfa_success', { 
          method: isBackupCode ? 'backup_code' : method 
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
        this.logger.error('MFA verify error:', error);
        res.status(500).json({ error: 'MFA verification failed' });
      }
    });

    // Disable MFA
    app.post('/auth/mfa/disable', this.authService.authenticateJWT, async (req, res) => {
      try {
        const { password, code } = req.body;
        const user = req.user;

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        // Verify MFA code or backup code
        const isValidMFA = await this.verifyAnyMFAMethod(user.id, code);
        if (!isValidMFA) {
          return res.status(401).json({ error: 'Invalid MFA code' });
        }

        // Disable all MFA methods
        await this.authService.db.query(
          'UPDATE user_mfa_methods SET active = false WHERE user_id = $1',
          [user.id]
        );

        await this.authService.db.query(
          'UPDATE users SET mfa_enabled = false WHERE id = $1',
          [user.id]
        );

        // Log MFA disable
        await this.authService.logAuthEvent(user.id, 'mfa_disabled', {});

        res.json({
          success: true,
          message: 'MFA disabled successfully'
        });

      } catch (error) {
        this.logger.error('MFA disable error:', error);
        res.status(500).json({ error: 'Failed to disable MFA' });
      }
    });

    // Get user's MFA methods
    app.get('/auth/mfa/methods', this.authService.authenticateJWT, async (req, res) => {
      try {
        const result = await this.authService.db.query(
          'SELECT method_type, verified, created_at FROM user_mfa_methods WHERE user_id = $1 AND active = true',
          [req.user.id]
        );

        res.json({
          success: true,
          methods: result.rows.map(row => ({
            type: row.method_type,
            verified: row.verified,
            createdAt: row.created_at
          }))
        });

      } catch (error) {
        this.logger.error('Get MFA methods error:', error);
        res.status(500).json({ error: 'Failed to retrieve MFA methods' });
      }
    });

    // Regenerate backup codes
    app.post('/auth/mfa/backup-codes/regenerate', this.authService.authenticateJWT, async (req, res) => {
      try {
        const { password } = req.body;
        const user = req.user;

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate new backup codes
        const backupCodes = this.generateBackupCodes();
        const hashedBackupCodes = backupCodes.map(code => 
          crypto.createHash('sha256').update(code).digest('hex')
        );

        // Update backup codes in database
        await this.authService.db.query(
          'UPDATE user_mfa_methods SET backup_codes = $1 WHERE user_id = $2',
          [hashedBackupCodes, user.id]
        );

        // Log backup code regeneration
        await this.authService.logAuthEvent(user.id, 'backup_codes_regenerated', {});

        res.json({
          success: true,
          backupCodes
        });

      } catch (error) {
        this.logger.error('Regenerate backup codes error:', error);
        res.status(500).json({ error: 'Failed to regenerate backup codes' });
      }
    });

    // Send MFA code via SMS or Email
    app.post('/auth/mfa/send-code', async (req, res) => {
      try {
        const { tempToken, method } = req.body;

        // Verify temp token
        const tempData = await this.authService.redis.get(`temp:${tempToken}`);
        if (!tempData) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const { userId } = JSON.parse(tempData);

        // Get user's MFA method
        const mfaResult = await this.authService.db.query(
          'SELECT * FROM user_mfa_methods WHERE user_id = $1 AND method_type = $2 AND active = true',
          [userId, method]
        );

        if (mfaResult.rows.length === 0) {
          return res.status(404).json({ error: 'MFA method not found' });
        }

        let sent = false;

        switch (method) {
          case 'sms':
            sent = await this.sendSMSCode(userId);
            break;
          case 'email':
            sent = await this.sendEmailCode(userId);
            break;
        }

        if (!sent) {
          return res.status(500).json({ error: 'Failed to send code' });
        }

        res.json({
          success: true,
          message: `Code sent via ${method}`
        });

      } catch (error) {
        this.logger.error('Send MFA code error:', error);
        res.status(500).json({ error: 'Failed to send MFA code' });
      }
    });
  }

  async setupTOTP(user) {
    const secret = speakeasy.generateSecret({
      name: `PersonaChain (${user.email})`,
      issuer: 'PersonaChain Identity Platform',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntry: secret.base32
    };
  }

  async setupSMS(user, phoneNumber) {
    // Store phone number temporarily
    await this.authService.redis.setex(
      `mfa:sms:phone:${user.id}`,
      3600, // 1 hour
      phoneNumber
    );

    // Send verification code
    const code = this.generateMFACode();
    await this.sendSMSCode(user.id, code);

    return {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      message: 'Verification code sent to your phone'
    };
  }

  async setupEmail(user) {
    // Send verification code
    const code = this.generateMFACode();
    await this.sendEmailCode(user.id, code);

    return {
      email: this.maskEmail(user.email),
      message: 'Verification code sent to your email'
    };
  }

  async sendSMSCode(userId, customCode = null) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not configured');
      }

      const code = customCode || this.generateMFACode();

      // Get phone number
      const phoneNumber = await this.authService.redis.get(`mfa:sms:phone:${userId}`);
      if (!phoneNumber) {
        const userResult = await this.authService.db.query(
          'SELECT phone_number FROM users WHERE id = $1',
          [userId]
        );
        if (userResult.rows.length === 0 || !userResult.rows[0].phone_number) {
          throw new Error('Phone number not found');
        }
        phoneNumber = userResult.rows[0].phone_number;
      }

      // Send SMS
      await this.twilioClient.messages.create({
        body: `Your PersonaChain verification code is: ${code}. This code expires in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      // Store code in Redis
      await this.authService.redis.setex(`mfa:sms:${userId}`, 300, code); // 5 minutes

      return true;
    } catch (error) {
      this.logger.error('SMS send error:', error);
      return false;
    }
  }

  async sendEmailCode(userId, customCode = null) {
    try {
      const code = customCode || this.generateMFACode();

      // Get user email
      const userResult = await this.authService.db.query(
        'SELECT email, first_name FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Send email
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'PersonaChain <noreply@persona-chain.com>',
        to: user.email,
        subject: 'PersonaChain Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>PersonaChain Verification Code</h2>
            <p>Hello ${user.first_name},</p>
            <p>Your verification code is:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">PersonaChain Identity Platform</p>
          </div>
        `
      });

      // Store code in Redis
      await this.authService.redis.setex(`mfa:email:${userId}`, 300, code); // 5 minutes

      return true;
    } catch (error) {
      this.logger.error('Email send error:', error);
      return false;
    }
  }

  async verifyMFACode(userId, method, code) {
    try {
      switch (method) {
        case 'totp':
          const mfaResult = await this.authService.db.query(
            'SELECT secret FROM user_mfa_methods WHERE user_id = $1 AND method_type = $2 AND active = true',
            [userId, method]
          );

          if (mfaResult.rows.length === 0) {
            return false;
          }

          return speakeasy.totp.verify({
            secret: mfaResult.rows[0].secret,
            encoding: 'base32',
            token: code,
            window: 2
          });

        case 'sms':
          const smsCode = await this.authService.redis.get(`mfa:sms:${userId}`);
          const isValidSMS = smsCode === code;
          if (isValidSMS) {
            await this.authService.redis.del(`mfa:sms:${userId}`);
          }
          return isValidSMS;

        case 'email':
          const emailCode = await this.authService.redis.get(`mfa:email:${userId}`);
          const isValidEmail = emailCode === code;
          if (isValidEmail) {
            await this.authService.redis.del(`mfa:email:${userId}`);
          }
          return isValidEmail;

        default:
          return false;
      }
    } catch (error) {
      this.logger.error('MFA verification error:', error);
      return false;
    }
  }

  async verifyBackupCode(userId, code) {
    try {
      const result = await this.authService.db.query(
        'SELECT backup_codes FROM user_mfa_methods WHERE user_id = $1 AND active = true LIMIT 1',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      const backupCodes = result.rows[0].backup_codes;

      const codeIndex = backupCodes.indexOf(hashedCode);
      if (codeIndex === -1) {
        return false;
      }

      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await this.authService.db.query(
        'UPDATE user_mfa_methods SET backup_codes = $1 WHERE user_id = $2',
        [backupCodes, userId]
      );

      return true;
    } catch (error) {
      this.logger.error('Backup code verification error:', error);
      return false;
    }
  }

  generateMFACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  maskPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `***-***-${cleaned.slice(-4)}`;
    }
    return '***-***-****';
  }

  maskEmail(email) {
    const [user, domain] = email.split('@');
    const maskedUser = user.length > 2 ? 
      `${user[0]}***${user[user.length - 1]}` : 
      '***';
    return `${maskedUser}@${domain}`;
  }

  // Initialize MFA database tables
  async initializeMFATables() {
    try {
      await this.authService.db.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
        ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;

        CREATE TABLE IF NOT EXISTS user_mfa_methods (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          method_type VARCHAR(50) NOT NULL,
          secret TEXT,
          backup_codes TEXT[],
          verified BOOLEAN DEFAULT false,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, method_type)
        );

        CREATE INDEX IF NOT EXISTS idx_user_mfa_methods_user_id ON user_mfa_methods(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_mfa_methods_type ON user_mfa_methods(method_type);
      `);

      this.logger.info('MFA tables initialized successfully');
    } catch (error) {
      this.logger.error('MFA table initialization error:', error);
      throw error;
    }
  }
}

module.exports = MFAManager;