/**
 * Risk Assessment Service
 * Comprehensive risk scoring and analysis for Zero Trust decisions
 * Real-time risk calculation with machine learning and contextual factors
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import * as tf from '@tensorflow/tfjs-node';

class RiskAssessmentService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
    this.redis = null;
    this.riskModels = new Map();
    this.riskFactors = new Map();
    this.userRiskProfiles = new Map();
    this.riskHistory = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'risk-assessment' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/risk-assessment.log' })
      ]
    });

    // Risk factor categories and weights
    this.riskCategories = {
      identity: {
        weight: 0.25,
        factors: {
          authentication_strength: 0.3,
          account_age: 0.2,
          privilege_level: 0.3,
          recent_changes: 0.2
        }
      },
      behavioral: {
        weight: 0.20,
        factors: {
          access_patterns: 0.4,
          typing_dynamics: 0.2,
          navigation_behavior: 0.2,
          interaction_style: 0.2
        }
      },
      contextual: {
        weight: 0.20,
        factors: {
          location: 0.3,
          time_of_access: 0.2,
          network: 0.3,
          device: 0.2
        }
      },
      operational: {
        weight: 0.15,
        factors: {
          resource_sensitivity: 0.4,
          access_frequency: 0.2,
          data_classification: 0.4
        }
      },
      threat_intelligence: {
        weight: 0.20,
        factors: {
          known_threats: 0.4,
          reputation: 0.3,
          indicators: 0.3
        }
      }
    };

    // Risk level thresholds
    this.riskLevels = {
      very_low: { min: 0.0, max: 0.2, color: '#00FF00' },
      low: { min: 0.2, max: 0.4, color: '#80FF00' },
      medium: { min: 0.4, max: 0.6, color: '#FFFF00' },
      high: { min: 0.6, max: 0.8, color: '#FF8000' },
      very_high: { min: 0.8, max: 1.0, color: '#FF0000' }
    };

    // Anomaly detection parameters
    this.anomalyThresholds = {
      location: { distance_km: 500, time_window: 3600 },
      velocity: { max_kmh: 1000, impossible_travel: true },
      frequency: { multiplier: 3, baseline_window: 86400 },
      behavioral: { deviation_threshold: 2.5, confidence: 0.8 }
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Risk Assessment Service...');

      // Initialize Redis for distributed risk state
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for risk assessment');
      }

      // Load ML models for risk prediction
      await this.loadRiskModels();

      // Initialize risk calculation engine
      await this.initializeRiskEngine();

      this.logger.info('Risk Assessment Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Risk Assessment Service:', error);
      throw error;
    }
  }

  async assessRequest(requestData) {
    try {
      const {
        userId,
        action,
        resource,
        context,
        timestamp
      } = requestData;

      this.logger.info(`Assessing risk for request`, {
        userId,
        action,
        resourceType: resource?.type,
        contextKeys: Object.keys(context || {})
      });

      // Step 1: Extract and normalize risk factors
      const riskFactors = await this.extractRiskFactors(requestData);

      // Step 2: Calculate category-specific risk scores
      const categoryScores = await this.calculateCategoryScores(riskFactors, requestData);

      // Step 3: Apply machine learning models
      const mlScores = await this.applyMLModels(riskFactors, requestData);

      // Step 4: Detect anomalies
      const anomalies = await this.detectAnomalies(requestData);

      // Step 5: Calculate overall risk score
      const overallRisk = this.calculateOverallRisk(categoryScores, mlScores, anomalies);

      // Step 6: Determine risk level and recommendations
      const riskLevel = this.determineRiskLevel(overallRisk.score);
      const recommendations = this.generateRecommendations(overallRisk, riskLevel, anomalies);

      // Step 7: Update user risk profile
      await this.updateUserRiskProfile(userId, overallRisk, requestData);

      // Step 8: Store assessment for future analysis
      await this.storeRiskAssessment({
        userId,
        requestData,
        riskFactors,
        categoryScores,
        mlScores,
        anomalies,
        overallRisk,
        riskLevel,
        timestamp: DateTime.now().toISO()
      });

      this.logger.info(`Risk assessment completed`, {
        userId,
        riskScore: overallRisk.score,
        riskLevel: riskLevel.level,
        anomaliesDetected: anomalies.length
      });

      return {
        riskScore: overallRisk.score,
        riskLevel: riskLevel.level,
        confidence: overallRisk.confidence,
        factors: riskFactors,
        categoryBreakdown: categoryScores,
        anomalies,
        recommendations,
        explanation: this.generateExplanation(overallRisk, categoryScores, anomalies),
        timestamp: DateTime.now().toISO()
      };

    } catch (error) {
      this.logger.error('Risk assessment error:', error);
      throw new Error(`Risk assessment failed: ${error.message}`);
    }
  }

  async extractRiskFactors(requestData) {
    const { userId, action, resource, context } = requestData;
    const factors = {};

    try {
      // Identity factors
      factors.identity = await this.extractIdentityFactors(userId, context);

      // Behavioral factors
      factors.behavioral = await this.extractBehavioralFactors(userId, context);

      // Contextual factors
      factors.contextual = await this.extractContextualFactors(context);

      // Operational factors
      factors.operational = await this.extractOperationalFactors(action, resource, context);

      // Threat intelligence factors
      factors.threat_intelligence = await this.extractThreatFactors(context);

      return factors;

    } catch (error) {
      this.logger.error('Error extracting risk factors:', error);
      return { identity: {}, behavioral: {}, contextual: {}, operational: {}, threat_intelligence: {} };
    }
  }

  async extractIdentityFactors(userId, context) {
    const factors = {};

    try {
      // Get user profile
      const userProfile = await this.getUserProfile(userId);
      
      // Authentication strength
      const authFactors = context.authenticationFactors || [];
      factors.authentication_strength = this.calculateAuthStrength(authFactors);

      // Account age
      if (userProfile?.createdAt) {
        const accountAge = DateTime.now().diff(DateTime.fromISO(userProfile.createdAt), 'days').days;
        factors.account_age = Math.min(1.0, accountAge / 365); // Normalize to 1 year
      } else {
        factors.account_age = 0;
      }

      // Privilege level
      factors.privilege_level = this.assessPrivilegeLevel(userProfile?.roles || []);

      // Recent account changes
      factors.recent_changes = await this.checkRecentAccountChanges(userId);

      return factors;

    } catch (error) {
      this.logger.error('Error extracting identity factors:', error);
      return { authentication_strength: 0, account_age: 0, privilege_level: 0, recent_changes: 0 };
    }
  }

  async extractBehavioralFactors(userId, context) {
    const factors = {};

    try {
      // Get behavioral baseline
      const baseline = await this.getBehavioralBaseline(userId);

      // Access patterns
      factors.access_patterns = await this.analyzeBehavioralPatterns(userId, context, baseline);

      // Typing dynamics
      if (context.behavior?.typing) {
        factors.typing_dynamics = this.analyzeTypingDynamics(context.behavior.typing, baseline?.typing);
      } else {
        factors.typing_dynamics = 0.5; // Neutral when no data
      }

      // Navigation behavior
      if (context.behavior?.navigation) {
        factors.navigation_behavior = this.analyzeNavigationBehavior(context.behavior.navigation, baseline?.navigation);
      } else {
        factors.navigation_behavior = 0.5;
      }

      // Interaction style
      factors.interaction_style = this.analyzeInteractionStyle(context.behavior, baseline?.interaction);

      return factors;

    } catch (error) {
      this.logger.error('Error extracting behavioral factors:', error);
      return { access_patterns: 0.5, typing_dynamics: 0.5, navigation_behavior: 0.5, interaction_style: 0.5 };
    }
  }

  async extractContextualFactors(context) {
    const factors = {};

    try {
      // Location risk
      factors.location = await this.assessLocationRisk(context.location);

      // Time of access
      factors.time_of_access = this.assessTimeRisk(context.timestamp);

      // Network risk
      factors.network = await this.assessNetworkRisk(context.network);

      // Device risk
      factors.device = await this.assessDeviceRisk(context.deviceId);

      return factors;

    } catch (error) {
      this.logger.error('Error extracting contextual factors:', error);
      return { location: 0.5, time_of_access: 0.5, network: 0.5, device: 0.5 };
    }
  }

  async extractOperationalFactors(action, resource, context) {
    const factors = {};

    try {
      // Resource sensitivity
      factors.resource_sensitivity = this.assessResourceSensitivity(resource);

      // Access frequency
      factors.access_frequency = await this.assessAccessFrequency(action, resource, context);

      // Data classification
      factors.data_classification = this.assessDataClassification(resource);

      return factors;

    } catch (error) {
      this.logger.error('Error extracting operational factors:', error);
      return { resource_sensitivity: 0.5, access_frequency: 0.5, data_classification: 0.5 };
    }
  }

  async extractThreatFactors(context) {
    const factors = {};

    try {
      // Check against threat intelligence
      const threatCheck = await this.checkThreatIntelligence(context);
      
      factors.known_threats = threatCheck.knownThreats;
      factors.reputation = threatCheck.reputation;
      factors.indicators = threatCheck.indicators;

      return factors;

    } catch (error) {
      this.logger.error('Error extracting threat factors:', error);
      return { known_threats: 0, reputation: 0.5, indicators: 0 };
    }
  }

  async calculateCategoryScores(riskFactors, requestData) {
    const categoryScores = {};

    for (const [categoryName, categoryConfig] of Object.entries(this.riskCategories)) {
      const factors = riskFactors[categoryName] || {};
      let categoryScore = 0;
      let totalWeight = 0;

      for (const [factorName, factorWeight] of Object.entries(categoryConfig.factors)) {
        const factorValue = factors[factorName];
        if (factorValue !== undefined && factorValue !== null) {
          categoryScore += factorValue * factorWeight;
          totalWeight += factorWeight;
        }
      }

      // Normalize score
      const normalizedScore = totalWeight > 0 ? categoryScore / totalWeight : 0.5;
      
      categoryScores[categoryName] = {
        score: Math.max(0, Math.min(1, normalizedScore)),
        weight: categoryConfig.weight,
        factors,
        confidence: this.calculateCategoryConfidence(factors, categoryConfig.factors)
      };
    }

    return categoryScores;
  }

  async applyMLModels(riskFactors, requestData) {
    const mlScores = {};

    try {
      // Apply different ML models
      mlScores.ensemble = await this.applyEnsembleModel(riskFactors, requestData);
      mlScores.behavioral = await this.applyBehavioralModel(riskFactors.behavioral, requestData);
      mlScores.contextual = await this.applyContextualModel(riskFactors.contextual, requestData);

      return mlScores;

    } catch (error) {
      this.logger.error('Error applying ML models:', error);
      return { ensemble: 0.5, behavioral: 0.5, contextual: 0.5 };
    }
  }

  async detectAnomalies(requestData) {
    const anomalies = [];

    try {
      // Location anomalies
      const locationAnomaly = await this.detectLocationAnomaly(requestData);
      if (locationAnomaly) anomalies.push(locationAnomaly);

      // Velocity anomalies (impossible travel)
      const velocityAnomaly = await this.detectVelocityAnomaly(requestData);
      if (velocityAnomaly) anomalies.push(velocityAnomaly);

      // Frequency anomalies
      const frequencyAnomaly = await this.detectFrequencyAnomaly(requestData);
      if (frequencyAnomaly) anomalies.push(frequencyAnomaly);

      // Behavioral anomalies
      const behavioralAnomaly = await this.detectBehavioralAnomaly(requestData);
      if (behavioralAnomaly) anomalies.push(behavioralAnomaly);

      return anomalies;

    } catch (error) {
      this.logger.error('Error detecting anomalies:', error);
      return [];
    }
  }

  calculateOverallRisk(categoryScores, mlScores, anomalies) {
    try {
      // Calculate weighted category score
      let weightedSum = 0;
      let totalWeight = 0;
      let totalConfidence = 0;

      for (const [categoryName, categoryData] of Object.entries(categoryScores)) {
        weightedSum += categoryData.score * categoryData.weight;
        totalWeight += categoryData.weight;
        totalConfidence += categoryData.confidence;
      }

      const categoryScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
      const avgConfidence = totalConfidence / Object.keys(categoryScores).length;

      // Incorporate ML scores
      const mlScore = Object.values(mlScores).reduce((sum, score) => sum + score, 0) / Object.keys(mlScores).length;

      // Apply anomaly adjustments
      let anomalyAdjustment = 0;
      anomalies.forEach(anomaly => {
        anomalyAdjustment += anomaly.riskImpact || 0.1;
      });

      // Calculate final risk score
      const baseScore = (categoryScore * 0.7) + (mlScore * 0.3);
      const finalScore = Math.min(1.0, baseScore + anomalyAdjustment);

      return {
        score: finalScore,
        confidence: Math.min(1.0, avgConfidence),
        breakdown: {
          categoryScore,
          mlScore,
          anomalyAdjustment,
          baseScore
        },
        factors: {
          categories: categoryScores,
          ml: mlScores,
          anomalies
        }
      };

    } catch (error) {
      this.logger.error('Error calculating overall risk:', error);
      return { score: 0.8, confidence: 0.2, breakdown: {}, factors: {} }; // High risk on error
    }
  }

  determineRiskLevel(riskScore) {
    for (const [levelName, levelConfig] of Object.entries(this.riskLevels)) {
      if (riskScore >= levelConfig.min && riskScore < levelConfig.max) {
        return {
          level: levelName,
          score: riskScore,
          color: levelConfig.color,
          threshold: levelConfig
        };
      }
    }

    // Default to very high if outside ranges
    return {
      level: 'very_high',
      score: riskScore,
      color: '#FF0000',
      threshold: this.riskLevels.very_high
    };
  }

  generateRecommendations(overallRisk, riskLevel, anomalies) {
    const recommendations = [];

    // Risk-level based recommendations
    switch (riskLevel.level) {
      case 'very_high':
        recommendations.push('Deny access and trigger security review');
        recommendations.push('Require administrator approval');
        recommendations.push('Implement immediate monitoring');
        break;
      
      case 'high':
        recommendations.push('Require additional authentication factors');
        recommendations.push('Limit session duration');
        recommendations.push('Enable enhanced monitoring');
        break;
      
      case 'medium':
        recommendations.push('Consider step-up authentication');
        recommendations.push('Monitor user behavior closely');
        break;
      
      case 'low':
        recommendations.push('Standard access with normal monitoring');
        break;
      
      case 'very_low':
        recommendations.push('Allow with minimal restrictions');
        break;
    }

    // Anomaly-specific recommendations
    anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'location':
          recommendations.push('Verify user location through secondary channel');
          break;
        case 'velocity':
          recommendations.push('Flag for impossible travel investigation');
          break;
        case 'frequency':
          recommendations.push('Review access patterns for potential automation');
          break;
        case 'behavioral':
          recommendations.push('Perform behavioral challenge');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  generateExplanation(overallRisk, categoryScores, anomalies) {
    const explanations = [];

    // Primary risk factors
    const sortedCategories = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b.score - a.score)
      .slice(0, 3);

    sortedCategories.forEach(([category, data]) => {
      if (data.score > 0.6) {
        explanations.push(`High ${category} risk (${(data.score * 100).toFixed(0)}%)`);
      }
    });

    // Anomaly explanations
    if (anomalies.length > 0) {
      explanations.push(`${anomalies.length} anomalies detected`);
    }

    // Overall assessment
    if (overallRisk.score > 0.8) {
      explanations.unshift('Critical risk level detected');
    } else if (overallRisk.score > 0.6) {
      explanations.unshift('Elevated risk level');
    } else if (overallRisk.score < 0.3) {
      explanations.unshift('Low risk assessment');
    }

    return explanations.join('; ');
  }

  // Helper methods for specific risk assessments
  calculateAuthStrength(authFactors) {
    const factorStrengths = {
      password: 0.3,
      biometric: 0.5,
      mfa: 0.4,
      webauthn: 0.6,
      certificate: 0.7
    };

    let totalStrength = 0;
    authFactors.forEach(factor => {
      totalStrength += factorStrengths[factor.type] || 0.2;
    });

    return Math.min(1.0, totalStrength);
  }

  assessPrivilegeLevel(roles) {
    const privilegeLevels = {
      admin: 1.0,
      power_user: 0.8,
      user: 0.4,
      guest: 0.2,
      readonly: 0.1
    };

    const maxPrivilege = Math.max(...roles.map(role => privilegeLevels[role] || 0.3));
    return maxPrivilege;
  }

  async loadRiskModels() {
    try {
      // Load ensemble risk model
      // this.riskModels.set('ensemble', await tf.loadLayersModel('file://./models/risk_ensemble/model.json'));
      
      // Load behavioral risk model
      // this.riskModels.set('behavioral', await tf.loadLayersModel('file://./models/risk_behavioral/model.json'));
      
      // Load contextual risk model
      // this.riskModels.set('contextual', await tf.loadLayersModel('file://./models/risk_contextual/model.json'));

      this.logger.info('Risk models loaded (placeholder implementation)');
    } catch (error) {
      this.logger.warn('Risk models not available, using statistical methods:', error.message);
    }
  }

  async initializeRiskEngine() {
    // Initialize risk calculation components
    this.logger.info('Risk assessment engine initialized');
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
        riskModels: {
          loaded: this.riskModels.size,
          available: Array.from(this.riskModels.keys())
        },
        categories: Object.keys(this.riskCategories),
        levels: Object.keys(this.riskLevels)
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
      this.logger.info('Shutting down Risk Assessment Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      // Dispose ML models
      this.riskModels.forEach((model, name) => {
        try {
          if (model.dispose) {
            model.dispose();
          }
        } catch (error) {
          this.logger.warn(`Error disposing risk model ${name}:`, error);
        }
      });
      this.riskModels.clear();

      this.riskFactors.clear();
      this.userRiskProfiles.clear();
      this.riskHistory.clear();

      this.logger.info('Risk Assessment Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default RiskAssessmentService;