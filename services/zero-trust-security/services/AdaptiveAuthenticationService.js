/**
 * Adaptive Authentication Service
 * Risk-based authentication with dynamic requirements and multiple factors
 * Supports biometrics, behavioral analysis, device trust, and contextual authentication
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import QRCode from 'qrcode';
import * as fido2lib from 'fido2-lib';
import { webcrypto } from 'crypto';

class AdaptiveAuthenticationService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 900, checkperiod: 180 });
    this.redis = null;
    this.fido2 = null;
    this.authenticationFactors = new Map();
    this.userRiskProfiles = new Map();
    this.activeChallenges = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'adaptive-authentication' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/adaptive-auth.log' })
      ]
    });

    // Authentication factor weights based on security strength
    this.factorWeights = {
      password: 0.3,
      biometric: 0.4,
      device_trust: 0.2,
      behavioral: 0.25,
      location: 0.15,
      time_pattern: 0.1,
      mfa_totp: 0.35,
      mfa_sms: 0.25,
      mfa_push: 0.3,
      webauthn: 0.45,
      hardware_token: 0.5
    };

    // Risk-based authentication thresholds
    this.riskThresholds = {
      low: {
        minFactors: 1,
        minScore: 0.6,
        allowedMethods: ['password', 'biometric', 'device_trust']
      },
      medium: {
        minFactors: 2,
        minScore: 0.75,
        allowedMethods: ['password', 'biometric', 'mfa_totp', 'webauthn']
      },
      high: {
        minFactors: 3,
        minScore: 0.85,
        allowedMethods: ['password', 'biometric', 'mfa_totp', 'webauthn', 'hardware_token']
      },
      critical: {
        minFactors: 4,
        minScore: 0.95,
        allowedMethods: ['biometric', 'mfa_totp', 'webauthn', 'hardware_token'],
        requiresApproval: true
      }
    };

    // Challenge types for step-up authentication
    this.challengeTypes = {
      biometric: {
        type: 'biometric_verification',
        timeout: 300,
        retries: 3
      },
      behavioral: {
        type: 'behavioral_challenge',
        timeout: 600,
        retries: 2
      },
      knowledge: {
        type: 'knowledge_verification',
        timeout: 180,
        retries: 3
      },
      device: {
        type: 'device_verification',
        timeout: 300,
        retries: 2
      },
      location: {
        type: 'location_verification',
        timeout: 600,
        retries: 1
      }
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Adaptive Authentication Service...');

      // Initialize Redis for distributed sessions
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for authentication');
      }

      // Initialize FIDO2/WebAuthn
      this.fido2 = new fido2lib.Fido2Lib({
        timeout: 60000,
        rpId: process.env.RP_ID || 'personapass.io',
        rpName: process.env.RP_NAME || 'PersonaPass Identity Platform',
        challengeSize: 128,
        attestation: 'direct',
        cryptoParams: [-7, -257],
        authenticatorAttachment: 'platform',
        authenticatorRequireResidentKey: false,
        authenticatorUserVerification: 'required'
      });

      // Load authentication policies
      await this.loadAuthenticationPolicies();

      this.logger.info('Adaptive Authentication Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Adaptive Authentication Service:', error);
      throw error;
    }
  }

  async loadAuthenticationPolicies() {
    // Define context-specific authentication policies
    this.authPolicies = {
      admin_access: {
        requiredFactors: ['password', 'biometric', 'mfa_totp'],
        minRiskScore: 0.9,
        sessionTimeout: 900, // 15 minutes
        requiresApproval: true
      },
      financial_transaction: {
        requiredFactors: ['biometric', 'mfa_totp'],
        minRiskScore: 0.85,
        sessionTimeout: 600, // 10 minutes
        transactionLimits: true
      },
      sensitive_data_access: {
        requiredFactors: ['password', 'biometric'],
        minRiskScore: 0.8,
        sessionTimeout: 1800, // 30 minutes
        auditRequired: true
      },
      standard_access: {
        requiredFactors: ['password'],
        minRiskScore: 0.6,
        sessionTimeout: 3600, // 1 hour
        adaptiveUpgrade: true
      }
    };
  }

  async authenticate(authRequest) {
    try {
      const {
        credentials,
        context,
        riskAssessment,
        requestedAccess
      } = authRequest;

      this.logger.info(`Starting adaptive authentication`, {
        method: credentials?.method,
        riskLevel: riskAssessment?.riskLevel,
        requestedAccess: requestedAccess?.type
      });

      // Step 1: Validate basic credentials
      const primaryAuth = await this.validatePrimaryCredentials(credentials);
      if (!primaryAuth.success) {
        return this.createAuthResponse('denied', primaryAuth.reason);
      }

      // Step 2: Assess authentication risk
      const authRisk = await this.assessAuthenticationRisk(context, riskAssessment, primaryAuth.userId);

      // Step 3: Determine required authentication factors
      const requirements = this.determineAuthRequirements(authRisk, requestedAccess);

      // Step 4: Evaluate completed authentication factors
      const completedFactors = await this.evaluateAuthFactors(credentials, context, primaryAuth.userId);

      // Step 5: Calculate authentication score
      const authScore = this.calculateAuthScore(completedFactors, requirements);

      // Step 6: Make authentication decision
      const decision = this.makeAuthDecision(authScore, requirements, authRisk);

      // Step 7: Handle different authentication outcomes
      if (decision.status === 'authenticated') {
        const authToken = await this.generateAuthToken(primaryAuth.userId, authScore, decision);
        return this.createAuthResponse('authenticated', null, authToken, decision);
      } else if (decision.status === 'challenge_required') {
        const challenge = await this.createAuthChallenge(primaryAuth.userId, decision.requiredFactors, context);
        return this.createAuthResponse('challenge_required', null, null, decision, challenge);
      } else {
        return this.createAuthResponse('denied', decision.reason);
      }

    } catch (error) {
      this.logger.error('Authentication error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async validatePrimaryCredentials(credentials) {
    try {
      const { method, username, password, biometric, token } = credentials;

      switch (method) {
        case 'password':
          return await this.validatePasswordCredentials(username, password);
        
        case 'biometric':
          return await this.validateBiometricCredentials(username, biometric);
        
        case 'webauthn':
          return await this.validateWebAuthnCredentials(username, token);
        
        case 'token':
          return await this.validateTokenCredentials(token);
        
        default:
          return { success: false, reason: 'Unsupported authentication method' };
      }

    } catch (error) {
      this.logger.error('Primary credential validation error:', error);
      return { success: false, reason: 'Credential validation failed' };
    }
  }

  async validatePasswordCredentials(username, password) {
    try {
      // Get user from database (simplified)
      const user = await this.getUser(username);
      if (!user) {
        return { success: false, reason: 'User not found' };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        await this.logFailedAttempt(username, 'invalid_password');
        return { success: false, reason: 'Invalid credentials' };
      }

      // Check account status
      if (user.status !== 'active') {
        return { success: false, reason: 'Account inactive' };
      }

      return {
        success: true,
        userId: user.id,
        method: 'password',
        strength: 0.3,
        factors: ['knowledge']
      };

    } catch (error) {
      this.logger.error('Password validation error:', error);
      return { success: false, reason: 'Authentication service error' };
    }
  }

  async validateBiometricCredentials(username, biometric) {
    try {
      const user = await this.getUser(username);
      if (!user) {
        return { success: false, reason: 'User not found' };
      }

      const { type, data, template } = biometric;
      
      // Get stored biometric template
      const storedTemplate = await this.getBiometricTemplate(user.id, type);
      if (!storedTemplate) {
        return { success: false, reason: 'Biometric not enrolled' };
      }

      // Verify biometric match
      const verification = await this.verifyBiometric(data, storedTemplate, type);
      if (!verification.match || verification.score < 0.85) {
        await this.logFailedAttempt(username, 'biometric_mismatch');
        return { success: false, reason: 'Biometric verification failed' };
      }

      return {
        success: true,
        userId: user.id,
        method: 'biometric',
        strength: 0.4,
        factors: ['inherence'],
        score: verification.score,
        quality: verification.quality
      };

    } catch (error) {
      this.logger.error('Biometric validation error:', error);
      return { success: false, reason: 'Biometric verification failed' };
    }
  }

  async validateWebAuthnCredentials(username, assertion) {
    try {
      const user = await this.getUser(username);
      if (!user) {
        return { success: false, reason: 'User not found' };
      }

      // Get user's WebAuthn credentials
      const credentials = await this.getWebAuthnCredentials(user.id);
      if (!credentials || credentials.length === 0) {
        return { success: false, reason: 'WebAuthn not configured' };
      }

      // Verify WebAuthn assertion
      const verification = await this.fido2.assertionResult(assertion, {
        challenge: assertion.challenge,
        origin: process.env.ORIGIN || 'https://personapass.io',
        factor: 'either'
      });

      if (!verification.authnrData.flags.userPresent) {
        return { success: false, reason: 'User presence not verified' };
      }

      return {
        success: true,
        userId: user.id,
        method: 'webauthn',
        strength: 0.45,
        factors: ['possession', 'inherence'],
        authenticatorData: verification.authnrData
      };

    } catch (error) {
      this.logger.error('WebAuthn validation error:', error);
      return { success: false, reason: 'WebAuthn verification failed' };
    }
  }

  async assessAuthenticationRisk(context, riskAssessment, userId) {
    try {
      let riskScore = riskAssessment?.riskScore || 0.5;
      const riskFactors = [];

      // Location risk assessment
      const locationRisk = await this.assessLocationRisk(userId, context.location);
      riskScore += locationRisk.score * 0.2;
      if (locationRisk.factors.length > 0) {
        riskFactors.push(...locationRisk.factors);
      }

      // Device risk assessment
      const deviceRisk = await this.assessDeviceRisk(userId, context.deviceId);
      riskScore += deviceRisk.score * 0.25;
      if (deviceRisk.factors.length > 0) {
        riskFactors.push(...deviceRisk.factors);
      }

      // Temporal risk assessment
      const temporalRisk = await this.assessTemporalRisk(userId, context.timestamp);
      riskScore += temporalRisk.score * 0.15;
      if (temporalRisk.factors.length > 0) {
        riskFactors.push(...temporalRisk.factors);
      }

      // Behavioral risk assessment
      const behavioralRisk = await this.assessBehavioralRisk(userId, context.behavior);
      riskScore += behavioralRisk.score * 0.2;
      if (behavioralRisk.factors.length > 0) {
        riskFactors.push(...behavioralRisk.factors);
      }

      // Network risk assessment
      const networkRisk = await this.assessNetworkRisk(userId, context.network);
      riskScore += networkRisk.score * 0.2;
      if (networkRisk.factors.length > 0) {
        riskFactors.push(...networkRisk.factors);
      }

      // Normalize risk score
      riskScore = Math.max(0, Math.min(1, riskScore));

      // Determine risk level
      let riskLevel = 'low';
      if (riskScore > 0.8) riskLevel = 'critical';
      else if (riskScore > 0.6) riskLevel = 'high';
      else if (riskScore > 0.4) riskLevel = 'medium';

      return {
        score: riskScore,
        level: riskLevel,
        factors: riskFactors,
        assessments: {
          location: locationRisk,
          device: deviceRisk,
          temporal: temporalRisk,
          behavioral: behavioralRisk,
          network: networkRisk
        }
      };

    } catch (error) {
      this.logger.error('Risk assessment error:', error);
      return {
        score: 0.8, // Default to high risk on error
        level: 'high',
        factors: ['assessment_error'],
        error: error.message
      };
    }
  }

  determineAuthRequirements(authRisk, requestedAccess) {
    // Get base requirements from risk level
    const baseRequirements = this.riskThresholds[authRisk.level];
    
    // Get specific requirements for requested access
    const accessRequirements = requestedAccess?.type ? 
      this.authPolicies[requestedAccess.type] : null;

    // Merge requirements (more restrictive wins)
    const requirements = {
      minFactors: Math.max(
        baseRequirements.minFactors,
        accessRequirements?.requiredFactors?.length || 0
      ),
      minScore: Math.max(
        baseRequirements.minScore,
        accessRequirements?.minRiskScore || 0
      ),
      allowedMethods: accessRequirements?.requiredFactors || baseRequirements.allowedMethods,
      sessionTimeout: accessRequirements?.sessionTimeout || 3600,
      requiresApproval: baseRequirements.requiresApproval || accessRequirements?.requiresApproval || false
    };

    // Adjust based on risk factors
    if (authRisk.factors.includes('suspicious_location')) {
      requirements.minFactors += 1;
      requirements.minScore += 0.1;
    }

    if (authRisk.factors.includes('new_device')) {
      requirements.minFactors += 1;
      requirements.minScore += 0.05;
    }

    if (authRisk.factors.includes('unusual_time')) {
      requirements.minScore += 0.05;
    }

    return requirements;
  }

  async evaluateAuthFactors(credentials, context, userId) {
    const factors = [];

    // Primary authentication factor
    if (credentials.method === 'password') {
      factors.push({
        type: 'knowledge',
        method: 'password',
        score: 0.3,
        timestamp: DateTime.now().toISO()
      });
    } else if (credentials.method === 'biometric') {
      factors.push({
        type: 'inherence',
        method: 'biometric',
        score: 0.4,
        timestamp: DateTime.now().toISO()
      });
    }

    // Device trust factor
    const deviceTrust = await this.evaluateDeviceTrust(context.deviceId, userId);
    if (deviceTrust.score > 0.6) {
      factors.push({
        type: 'possession',
        method: 'device_trust',
        score: deviceTrust.score * 0.2,
        timestamp: DateTime.now().toISO()
      });
    }

    // MFA factors
    if (credentials.mfaToken) {
      const mfaResult = await this.verifyMFA(userId, credentials.mfaToken);
      if (mfaResult.verified) {
        factors.push({
          type: 'possession',
          method: 'mfa_totp',
          score: 0.35,
          timestamp: DateTime.now().toISO()
        });
      }
    }

    // Behavioral factor
    const behavioralScore = await this.evaluateBehavioralFactor(userId, context.behavior);
    if (behavioralScore > 0.5) {
      factors.push({
        type: 'behavioral',
        method: 'behavioral_pattern',
        score: behavioralScore * 0.25,
        timestamp: DateTime.now().toISO()
      });
    }

    // Location factor
    const locationScore = await this.evaluateLocationFactor(userId, context.location);
    if (locationScore > 0.7) {
      factors.push({
        type: 'location',
        method: 'trusted_location',
        score: locationScore * 0.15,
        timestamp: DateTime.now().toISO()
      });
    }

    return factors;
  }

  calculateAuthScore(completedFactors, requirements) {
    if (completedFactors.length === 0) {
      return 0;
    }

    // Calculate total score from all factors
    const totalScore = completedFactors.reduce((sum, factor) => sum + factor.score, 0);
    
    // Apply factor diversity bonus
    const uniqueTypes = new Set(completedFactors.map(f => f.type)).size;
    const diversityBonus = (uniqueTypes - 1) * 0.1;
    
    // Apply factor count bonus/penalty
    const factorCountRatio = completedFactors.length / requirements.minFactors;
    const factorBonus = Math.max(0, (factorCountRatio - 1) * 0.05);
    
    return Math.min(1.0, totalScore + diversityBonus + factorBonus);
  }

  makeAuthDecision(authScore, requirements, authRisk) {
    const decision = {
      status: 'denied',
      reason: null,
      accessLevel: 'none',
      sessionTimeout: 0,
      requiredFactors: []
    };

    // Check if score meets minimum requirements
    if (authScore >= requirements.minScore) {
      decision.status = 'authenticated';
      decision.accessLevel = this.determineAccessLevel(authScore, authRisk);
      decision.sessionTimeout = this.calculateSessionTimeout(authScore, requirements);
    } else {
      // Determine what additional factors are needed
      const gap = requirements.minScore - authScore;
      
      if (gap > 0.3) {
        decision.status = 'challenge_required';
        decision.requiredFactors = ['biometric', 'mfa_totp'];
        decision.reason = 'Additional verification required for high-risk access';
      } else if (gap > 0.15) {
        decision.status = 'challenge_required';
        decision.requiredFactors = ['mfa_totp'];
        decision.reason = 'Multi-factor authentication required';
      } else if (gap > 0.05) {
        decision.status = 'challenge_required';
        decision.requiredFactors = ['behavioral'];
        decision.reason = 'Behavioral verification required';
      } else {
        decision.reason = 'Authentication score too low';
      }
    }

    // Check if approval is required
    if (requirements.requiresApproval && decision.status === 'authenticated') {
      decision.status = 'approval_required';
      decision.reason = 'Administrator approval required for high-privilege access';
    }

    return decision;
  }

  async createAuthChallenge(userId, requiredFactors, context) {
    try {
      const challengeId = crypto.randomUUID();
      const challenges = [];

      for (const factor of requiredFactors) {
        const challengeConfig = this.challengeTypes[factor];
        if (!challengeConfig) continue;

        let challenge = {
          type: challengeConfig.type,
          timeout: challengeConfig.timeout,
          retries: challengeConfig.retries,
          created: DateTime.now().toISO()
        };

        // Generate factor-specific challenge data
        switch (factor) {
          case 'biometric':
            challenge.data = await this.generateBiometricChallenge(userId);
            break;
          
          case 'mfa_totp':
            challenge.data = { message: 'Enter code from your authenticator app' };
            break;
          
          case 'behavioral':
            challenge.data = await this.generateBehavioralChallenge(userId);
            break;
          
          case 'knowledge':
            challenge.data = await this.generateKnowledgeChallenge(userId);
            break;
          
          case 'device':
            challenge.data = await this.generateDeviceChallenge(context.deviceId);
            break;
        }

        challenges.push(challenge);
      }

      // Store challenge state
      const challengeState = {
        challengeId,
        userId,
        challenges,
        attempts: 0,
        maxAttempts: 3,
        created: DateTime.now().toISO(),
        expiresAt: DateTime.now().plus({ minutes: 10 }).toISO()
      };

      await this.storeChallengeState(challengeId, challengeState);

      return {
        challengeId,
        challenges: challenges.map(c => ({
          type: c.type,
          data: c.data,
          timeout: c.timeout
        })),
        expiresAt: challengeState.expiresAt
      };

    } catch (error) {
      this.logger.error('Challenge creation error:', error);
      throw new Error('Failed to create authentication challenge');
    }
  }

  async generateAuthToken(userId, authScore, decision) {
    try {
      const payload = {
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + decision.sessionTimeout,
        aud: process.env.JWT_AUDIENCE || 'personapass.io',
        iss: process.env.JWT_ISSUER || 'personapass-auth',
        authScore,
        accessLevel: decision.accessLevel,
        sessionId: crypto.randomUUID()
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: 'HS256'
      });

      // Store token metadata for session management
      await this.storeTokenMetadata(payload.sessionId, {
        userId,
        authScore,
        accessLevel: decision.accessLevel,
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        expiresAt: new Date(payload.exp * 1000).toISOString()
      });

      return token;

    } catch (error) {
      this.logger.error('Token generation error:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  createAuthResponse(status, reason = null, token = null, decision = null, challenge = null) {
    const response = {
      status,
      timestamp: DateTime.now().toISO()
    };

    if (reason) response.reason = reason;
    if (token) response.token = token;
    if (decision) {
      response.accessLevel = decision.accessLevel;
      response.sessionTimeout = decision.sessionTimeout;
      if (decision.expiresAt) response.expiresAt = decision.expiresAt;
    }
    if (challenge) {
      response.challengeId = challenge.challengeId;
      response.challenges = challenge.challenges;
      response.expiresAt = challenge.expiresAt;
    }

    return response;
  }

  // Helper methods for risk assessment
  async assessLocationRisk(userId, location) {
    const factors = [];
    let score = 0;

    if (!location) {
      factors.push('location_unavailable');
      return { score: 0.3, factors };
    }

    // Check against user's location history
    const locationHistory = await this.getUserLocationHistory(userId, 30); // Last 30 days
    
    if (locationHistory.length === 0) {
      factors.push('no_location_history');
      score += 0.2;
    } else {
      const isKnownLocation = locationHistory.some(loc => 
        this.calculateDistance(location, loc) < 50 // Within 50km
      );
      
      if (!isKnownLocation) {
        factors.push('suspicious_location');
        score += 0.4;
      }
    }

    // Check for VPN/Tor usage
    if (location.isVPN) {
      factors.push('vpn_usage');
      score += 0.2;
    }

    if (location.isTor) {
      factors.push('tor_usage');
      score += 0.5;
    }

    // Check for high-risk countries
    if (this.isHighRiskCountry(location.country)) {
      factors.push('high_risk_country');
      score += 0.3;
    }

    return { score: Math.min(1.0, score), factors };
  }

  async assessDeviceRisk(userId, deviceId) {
    const factors = [];
    let score = 0;

    const deviceHistory = await this.getDeviceHistory(userId, deviceId);
    
    if (!deviceHistory) {
      factors.push('new_device');
      score += 0.4;
    } else {
      const daysSinceFirstSeen = DateTime.now().diff(
        DateTime.fromISO(deviceHistory.firstSeen), 'days'
      ).days;
      
      if (daysSinceFirstSeen < 1) {
        factors.push('very_new_device');
        score += 0.3;
      } else if (daysSinceFirstSeen < 7) {
        factors.push('recent_device');
        score += 0.1;
      }

      // Check device compliance
      const compliance = await this.getDeviceCompliance(deviceId);
      if (!compliance.isCompliant) {
        factors.push('non_compliant_device');
        score += 0.2;
      }
    }

    return { score: Math.min(1.0, score), factors };
  }

  determineAccessLevel(authScore, authRisk) {
    if (authScore >= 0.95 && authRisk.level === 'low') {
      return 'full';
    } else if (authScore >= 0.85) {
      return 'standard';
    } else if (authScore >= 0.75) {
      return 'limited';
    } else {
      return 'restricted';
    }
  }

  calculateSessionTimeout(authScore, requirements) {
    const baseTimeout = requirements.sessionTimeout;
    
    // Adjust timeout based on auth score
    if (authScore >= 0.9) {
      return baseTimeout;
    } else if (authScore >= 0.8) {
      return Math.floor(baseTimeout * 0.8);
    } else if (authScore >= 0.7) {
      return Math.floor(baseTimeout * 0.6);
    } else {
      return Math.floor(baseTimeout * 0.4);
    }
  }

  calculateDistance(loc1, loc2) {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        timestamp: DateTime.now().toISO(),
        cache: {
          keys: this.cache.keys().length,
          stats: this.cache.getStats()
        },
        redis: null,
        fido2: {
          configured: !!this.fido2,
          rpId: this.fido2?.rpId
        },
        activeChallenges: this.activeChallenges.size,
        authFactors: this.authenticationFactors.size
      };

      if (this.redis) {
        await this.redis.ping();
        health.redis = { status: 'connected' };
      }

      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: DateTime.now().toISO()
      };
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down Adaptive Authentication Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.authenticationFactors.clear();
      this.userRiskProfiles.clear();
      this.activeChallenges.clear();

      this.logger.info('Adaptive Authentication Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default AdaptiveAuthenticationService;