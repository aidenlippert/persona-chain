/**
 * Device Compliance Service
 * Device trust assessment, compliance monitoring, and security validation
 * Supports mobile, desktop, IoT devices with comprehensive security checks
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import UAParser from 'ua-parser-js';

class DeviceComplianceService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });
    this.redis = null;
    this.deviceRegistry = new Map();
    this.compliancePolicies = new Map();
    this.deviceProfiles = new Map();
    this.complianceHistory = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'device-compliance' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/device-compliance.log' })
      ]
    });

    // Device compliance categories and weights
    this.complianceCategories = {
      security: {
        weight: 0.35,
        checks: {
          encryption: 0.25,
          antivirus: 0.20,
          firewall: 0.15,
          os_updates: 0.20,
          screen_lock: 0.10,
          remote_wipe: 0.10
        }
      },
      identity: {
        weight: 0.25,
        checks: {
          device_certificate: 0.40,
          hardware_attestation: 0.30,
          trusted_platform: 0.30
        }
      },
      configuration: {
        weight: 0.20,
        checks: {
          mdm_enrollment: 0.35,
          policy_compliance: 0.25,
          app_management: 0.20,
          network_access: 0.20
        }
      },
      behavioral: {
        weight: 0.20,
        checks: {
          usage_patterns: 0.30,
          location_consistency: 0.25,
          access_frequency: 0.25,
          anomaly_score: 0.20
        }
      }
    };

    // Device trust levels
    this.trustLevels = {
      trusted: {
        level: 4,
        minScore: 0.85,
        color: '#00FF00',
        access: 'full'
      },
      managed: {
        level: 3,
        minScore: 0.70,
        color: '#80FF00',
        access: 'standard'
      },
      monitored: {
        level: 2,
        minScore: 0.50,
        color: '#FFFF00',
        access: 'limited'
      },
      restricted: {
        level: 1,
        minScore: 0.30,
        color: '#FF8000',
        access: 'minimal'
      },
      blocked: {
        level: 0,
        minScore: 0.0,
        color: '#FF0000',
        access: 'none'
      }
    };

    // Platform-specific compliance requirements
    this.platformRequirements = {
      ios: {
        minVersion: '14.0',
        requiredFeatures: ['biometric_auth', 'secure_enclave', 'app_transport_security'],
        prohibitedFeatures: ['jailbreak', 'debug_mode'],
        mdmRequired: true
      },
      android: {
        minVersion: '10.0',
        requiredFeatures: ['hardware_security', 'verified_boot', 'play_protect'],
        prohibitedFeatures: ['root_access', 'unknown_sources'],
        mdmRequired: true
      },
      windows: {
        minVersion: '10.0.19041',
        requiredFeatures: ['bitlocker', 'windows_defender', 'secure_boot'],
        prohibitedFeatures: ['admin_shares', 'guest_account'],
        mdmRequired: false
      },
      macos: {
        minVersion: '11.0',
        requiredFeatures: ['filevault', 'xprotect', 'gatekeeper'],
        prohibitedFeatures: ['root_access', 'sip_disabled'],
        mdmRequired: false
      },
      linux: {
        minVersion: 'recent',
        requiredFeatures: ['selinux', 'disk_encryption', 'firewall'],
        prohibitedFeatures: ['debug_kernel', 'permissive_selinux'],
        mdmRequired: false
      }
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Device Compliance Service...');

      // Initialize Redis for device state
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for device compliance');
      }

      // Load compliance policies
      await this.loadCompliancePolicies();

      // Initialize device profiles
      await this.initializeDeviceProfiles();

      this.logger.info('Device Compliance Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Device Compliance Service:', error);
      throw error;
    }
  }

  async assessDeviceCompliance(deviceData) {
    try {
      const {
        deviceId,
        userAgent,
        fingerprint,
        certificates,
        attestation,
        securityFeatures,
        userId
      } = deviceData;

      this.logger.info(`Assessing device compliance`, {
        deviceId,
        userId,
        hasFingerprint: !!fingerprint,
        hasCertificates: !!certificates
      });

      // Step 1: Parse device information
      const deviceInfo = this.parseDeviceInfo(userAgent, fingerprint);

      // Step 2: Assess security compliance
      const securityCompliance = await this.assessSecurityCompliance(deviceInfo, securityFeatures);

      // Step 3: Assess identity compliance
      const identityCompliance = await this.assessIdentityCompliance(deviceId, certificates, attestation);

      // Step 4: Assess configuration compliance
      const configCompliance = await this.assessConfigurationCompliance(deviceId, deviceInfo);

      // Step 5: Assess behavioral compliance
      const behavioralCompliance = await this.assessBehavioralCompliance(deviceId, userId);

      // Step 6: Calculate overall compliance score
      const overallCompliance = this.calculateOverallCompliance({
        security: securityCompliance,
        identity: identityCompliance,
        configuration: configCompliance,
        behavioral: behavioralCompliance
      });

      // Step 7: Determine trust level
      const trustLevel = this.determineTrustLevel(overallCompliance.score);

      // Step 8: Generate recommendations
      const recommendations = this.generateComplianceRecommendations(
        securityCompliance,
        identityCompliance,
        configCompliance,
        behavioralCompliance,
        trustLevel
      );

      // Step 9: Update device profile
      await this.updateDeviceProfile(deviceId, {
        deviceInfo,
        compliance: overallCompliance,
        trustLevel,
        lastAssessment: DateTime.now().toISO()
      });

      // Step 10: Store compliance assessment
      await this.storeComplianceAssessment({
        deviceId,
        userId,
        assessment: {
          security: securityCompliance,
          identity: identityCompliance,
          configuration: configCompliance,
          behavioral: behavioralCompliance,
          overall: overallCompliance,
          trustLevel,
          recommendations
        },
        timestamp: DateTime.now().toISO()
      });

      this.logger.info(`Device compliance assessment completed`, {
        deviceId,
        complianceScore: overallCompliance.score,
        trustLevel: trustLevel.level
      });

      return {
        deviceId,
        complianceScore: overallCompliance.score,
        trustLevel: trustLevel.level,
        isCompliant: overallCompliance.score >= 0.7, // Minimum compliance threshold
        compliance: {
          security: securityCompliance,
          identity: identityCompliance,
          configuration: configCompliance,
          behavioral: behavioralCompliance
        },
        recommendations,
        accessLevel: trustLevel.access,
        validUntil: DateTime.now().plus({ hours: 1 }).toISO(),
        timestamp: DateTime.now().toISO()
      };

    } catch (error) {
      this.logger.error('Device compliance assessment error:', error);
      throw new Error(`Device compliance assessment failed: ${error.message}`);
    }
  }

  parseDeviceInfo(userAgent, fingerprint) {
    try {
      const parser = new UAParser(userAgent);
      const parsed = parser.getResult();

      const deviceInfo = {
        browser: {
          name: parsed.browser.name,
          version: parsed.browser.version,
          major: parsed.browser.major
        },
        os: {
          name: parsed.os.name,
          version: parsed.os.version
        },
        device: {
          type: parsed.device.type || 'desktop',
          model: parsed.device.model,
          vendor: parsed.device.vendor
        },
        engine: {
          name: parsed.engine.name,
          version: parsed.engine.version
        },
        cpu: {
          architecture: parsed.cpu.architecture
        },
        fingerprint: fingerprint || {},
        capabilities: this.extractCapabilities(parsed, fingerprint)
      };

      return deviceInfo;

    } catch (error) {
      this.logger.error('Error parsing device info:', error);
      return {
        browser: { name: 'unknown', version: 'unknown' },
        os: { name: 'unknown', version: 'unknown' },
        device: { type: 'unknown' },
        engine: { name: 'unknown' },
        cpu: { architecture: 'unknown' },
        fingerprint: {},
        capabilities: {}
      };
    }
  }

  async assessSecurityCompliance(deviceInfo, securityFeatures) {
    const compliance = {
      score: 0,
      checks: {},
      recommendations: []
    };

    try {
      const platform = this.determinePlatform(deviceInfo);
      const requirements = this.platformRequirements[platform] || {};

      // Check OS version
      compliance.checks.os_updates = this.checkOSVersion(deviceInfo.os, requirements.minVersion);
      
      // Check encryption
      compliance.checks.encryption = this.checkEncryption(securityFeatures?.encryption);
      
      // Check antivirus/security software
      compliance.checks.antivirus = this.checkAntivirus(securityFeatures?.antivirus);
      
      // Check firewall
      compliance.checks.firewall = this.checkFirewall(securityFeatures?.firewall);
      
      // Check screen lock
      compliance.checks.screen_lock = this.checkScreenLock(securityFeatures?.screenLock);
      
      // Check remote wipe capability
      compliance.checks.remote_wipe = this.checkRemoteWipe(securityFeatures?.remoteWipe);

      // Calculate category score
      const categoryConfig = this.complianceCategories.security;
      let weightedSum = 0;
      let totalWeight = 0;

      Object.entries(categoryConfig.checks).forEach(([checkName, weight]) => {
        const checkResult = compliance.checks[checkName];
        if (checkResult !== undefined) {
          weightedSum += checkResult.score * weight;
          totalWeight += weight;
          
          if (!checkResult.passed) {
            compliance.recommendations.push(checkResult.recommendation);
          }
        }
      });

      compliance.score = totalWeight > 0 ? weightedSum / totalWeight : 0;

      return compliance;

    } catch (error) {
      this.logger.error('Error assessing security compliance:', error);
      return { score: 0, checks: {}, recommendations: ['Security assessment failed'] };
    }
  }

  async assessIdentityCompliance(deviceId, certificates, attestation) {
    const compliance = {
      score: 0,
      checks: {},
      recommendations: []
    };

    try {
      // Check device certificate
      compliance.checks.device_certificate = this.checkDeviceCertificate(certificates);
      
      // Check hardware attestation
      compliance.checks.hardware_attestation = this.checkHardwareAttestation(attestation);
      
      // Check trusted platform module
      compliance.checks.trusted_platform = this.checkTrustedPlatform(attestation?.tpm);

      // Calculate category score
      const categoryConfig = this.complianceCategories.identity;
      let weightedSum = 0;
      let totalWeight = 0;

      Object.entries(categoryConfig.checks).forEach(([checkName, weight]) => {
        const checkResult = compliance.checks[checkName];
        if (checkResult !== undefined) {
          weightedSum += checkResult.score * weight;
          totalWeight += weight;
          
          if (!checkResult.passed) {
            compliance.recommendations.push(checkResult.recommendation);
          }
        }
      });

      compliance.score = totalWeight > 0 ? weightedSum / totalWeight : 0;

      return compliance;

    } catch (error) {
      this.logger.error('Error assessing identity compliance:', error);
      return { score: 0, checks: {}, recommendations: ['Identity assessment failed'] };
    }
  }

  async assessConfigurationCompliance(deviceId, deviceInfo) {
    const compliance = {
      score: 0,
      checks: {},
      recommendations: []
    };

    try {
      // Check MDM enrollment
      compliance.checks.mdm_enrollment = await this.checkMDMEnrollment(deviceId);
      
      // Check policy compliance
      compliance.checks.policy_compliance = await this.checkPolicyCompliance(deviceId);
      
      // Check app management
      compliance.checks.app_management = await this.checkAppManagement(deviceId);
      
      // Check network access controls
      compliance.checks.network_access = await this.checkNetworkAccess(deviceId);

      // Calculate category score
      const categoryConfig = this.complianceCategories.configuration;
      let weightedSum = 0;
      let totalWeight = 0;

      Object.entries(categoryConfig.checks).forEach(([checkName, weight]) => {
        const checkResult = compliance.checks[checkName];
        if (checkResult !== undefined) {
          weightedSum += checkResult.score * weight;
          totalWeight += weight;
          
          if (!checkResult.passed) {
            compliance.recommendations.push(checkResult.recommendation);
          }
        }
      });

      compliance.score = totalWeight > 0 ? weightedSum / totalWeight : 0;

      return compliance;

    } catch (error) {
      this.logger.error('Error assessing configuration compliance:', error);
      return { score: 0, checks: {}, recommendations: ['Configuration assessment failed'] };
    }
  }

  async assessBehavioralCompliance(deviceId, userId) {
    const compliance = {
      score: 0,
      checks: {},
      recommendations: []
    };

    try {
      // Check usage patterns
      compliance.checks.usage_patterns = await this.checkUsagePatterns(deviceId, userId);
      
      // Check location consistency
      compliance.checks.location_consistency = await this.checkLocationConsistency(deviceId, userId);
      
      // Check access frequency
      compliance.checks.access_frequency = await this.checkAccessFrequency(deviceId, userId);
      
      // Check anomaly score
      compliance.checks.anomaly_score = await this.checkAnomalyScore(deviceId, userId);

      // Calculate category score
      const categoryConfig = this.complianceCategories.behavioral;
      let weightedSum = 0;
      let totalWeight = 0;

      Object.entries(categoryConfig.checks).forEach(([checkName, weight]) => {
        const checkResult = compliance.checks[checkName];
        if (checkResult !== undefined) {
          weightedSum += checkResult.score * weight;
          totalWeight += weight;
          
          if (!checkResult.passed) {
            compliance.recommendations.push(checkResult.recommendation);
          }
        }
      });

      compliance.score = totalWeight > 0 ? weightedSum / totalWeight : 0;

      return compliance;

    } catch (error) {
      this.logger.error('Error assessing behavioral compliance:', error);
      return { score: 0.5, checks: {}, recommendations: ['Behavioral assessment limited'] };
    }
  }

  calculateOverallCompliance(categoryCompliances) {
    let weightedSum = 0;
    let totalWeight = 0;
    const breakdown = {};

    Object.entries(this.complianceCategories).forEach(([categoryName, categoryConfig]) => {
      const categoryCompliance = categoryCompliances[categoryName];
      if (categoryCompliance) {
        weightedSum += categoryCompliance.score * categoryConfig.weight;
        totalWeight += categoryConfig.weight;
        breakdown[categoryName] = {
          score: categoryCompliance.score,
          weight: categoryConfig.weight,
          checks: categoryCompliance.checks
        };
      }
    });

    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      score: overallScore,
      breakdown,
      confidence: this.calculateComplianceConfidence(categoryCompliances),
      timestamp: DateTime.now().toISO()
    };
  }

  determineTrustLevel(complianceScore) {
    for (const [levelName, levelConfig] of Object.entries(this.trustLevels)) {
      if (complianceScore >= levelConfig.minScore) {
        return {
          level: levelName,
          score: complianceScore,
          config: levelConfig,
          access: levelConfig.access
        };
      }
    }

    // Default to blocked if no level matches
    return {
      level: 'blocked',
      score: complianceScore,
      config: this.trustLevels.blocked,
      access: 'none'
    };
  }

  generateComplianceRecommendations(security, identity, configuration, behavioral, trustLevel) {
    const recommendations = [];

    // Collect all category recommendations
    [security, identity, configuration, behavioral].forEach(category => {
      if (category.recommendations) {
        recommendations.push(...category.recommendations);
      }
    });

    // Add trust level specific recommendations
    if (trustLevel.level === 'blocked' || trustLevel.level === 'restricted') {
      recommendations.push('Immediate remediation required before access can be granted');
    } else if (trustLevel.level === 'monitored') {
      recommendations.push('Enhanced monitoring recommended');
    }

    // Remove duplicates and return
    return [...new Set(recommendations)];
  }

  // Security check implementations
  checkOSVersion(osInfo, minVersion) {
    const passed = this.compareVersions(osInfo.version, minVersion) >= 0;
    return {
      passed,
      score: passed ? 1.0 : 0.3,
      recommendation: passed ? null : `Update ${osInfo.name} to version ${minVersion} or higher`,
      details: { current: osInfo.version, required: minVersion }
    };
  }

  checkEncryption(encryptionInfo) {
    const hasEncryption = encryptionInfo?.enabled === true;
    return {
      passed: hasEncryption,
      score: hasEncryption ? 1.0 : 0.0,
      recommendation: hasEncryption ? null : 'Enable full disk encryption',
      details: encryptionInfo || {}
    };
  }

  checkDeviceCertificate(certificates) {
    const hasCertificate = certificates && certificates.length > 0;
    const hasValidCertificate = hasCertificate && certificates.some(cert => 
      cert.valid && new Date(cert.expiresAt) > new Date()
    );
    
    return {
      passed: hasValidCertificate,
      score: hasValidCertificate ? 1.0 : (hasCertificate ? 0.5 : 0.0),
      recommendation: hasValidCertificate ? null : 'Install valid device certificate',
      details: { certificateCount: certificates?.length || 0 }
    };
  }

  // Utility methods
  determinePlatform(deviceInfo) {
    const osName = deviceInfo.os?.name?.toLowerCase() || '';
    
    if (osName.includes('ios')) return 'ios';
    if (osName.includes('android')) return 'android';
    if (osName.includes('windows')) return 'windows';
    if (osName.includes('mac')) return 'macos';
    if (osName.includes('linux') || osName.includes('ubuntu')) return 'linux';
    
    return 'unknown';
  }

  compareVersions(version1, version2) {
    if (!version1 || !version2) return 0;
    
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    const maxLength = Math.max(v1parts.length, v2parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  }

  extractCapabilities(parsed, fingerprint) {
    const capabilities = {};
    
    // Browser capabilities
    if (fingerprint?.webgl) capabilities.webgl = true;
    if (fingerprint?.canvas) capabilities.canvas = true;
    if (fingerprint?.webrtc) capabilities.webrtc = true;
    
    // Security capabilities
    if (fingerprint?.https) capabilities.https = true;
    if (fingerprint?.secureContext) capabilities.secureContext = true;
    
    return capabilities;
  }

  calculateComplianceConfidence(categoryCompliances) {
    const confidences = Object.values(categoryCompliances)
      .map(compliance => compliance.confidence || 0.8)
      .filter(conf => !isNaN(conf));
    
    return confidences.length > 0 
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : 0.5;
  }

  async loadCompliancePolicies() {
    // Load compliance policies from configuration
    this.logger.info('Default compliance policies loaded');
  }

  async initializeDeviceProfiles() {
    // Initialize device profile management
    this.logger.info('Device profile system initialized');
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
        deviceRegistry: this.deviceRegistry.size,
        compliancePolicies: this.compliancePolicies.size,
        trustLevels: Object.keys(this.trustLevels),
        platforms: Object.keys(this.platformRequirements)
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
      this.logger.info('Shutting down Device Compliance Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.deviceRegistry.clear();
      this.compliancePolicies.clear();
      this.deviceProfiles.clear();
      this.complianceHistory.clear();

      this.logger.info('Device Compliance Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default DeviceComplianceService;