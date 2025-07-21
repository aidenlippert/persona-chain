/**
 * Anomaly Detection Service
 * AI-powered behavioral anomaly detection using machine learning models
 * Real-time threat detection with adaptive thresholds and automated response
 */

import * as tf from '@tensorflow/tfjs-node';
import { Matrix } from 'ml-matrix';
import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';

class AnomalyDetectionService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
    this.redis = null;
    this.mlModels = new Map();
    this.anomalyThresholds = new Map();
    this.userBaselines = new Map();
    this.realtimeBuffer = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'anomaly-detection' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/anomaly-detection.log' })
      ]
    });

    // Anomaly detection algorithms and weights
    this.detectionAlgorithms = {
      statistical: 0.25,      // Statistical outlier detection
      isolation_forest: 0.30, // Isolation Forest algorithm
      neural_network: 0.25,   // Deep learning based detection
      ensemble: 0.20          // Ensemble methods
    };

    // Anomaly severity levels
    this.severityLevels = {
      critical: { threshold: 0.9, weight: 1.0 },
      high: { threshold: 0.8, weight: 0.8 },
      medium: { threshold: 0.6, weight: 0.6 },
      low: { threshold: 0.4, weight: 0.4 },
      info: { threshold: 0.2, weight: 0.2 }
    };

    // Behavioral feature categories
    this.featureCategories = {
      access_patterns: {
        login_times: [],
        session_duration: [],
        access_frequency: [],
        location_patterns: []
      },
      behavioral_biometrics: {
        typing_dynamics: [],
        mouse_patterns: [],
        navigation_style: [],
        device_interaction: []
      },
      network_behavior: {
        connection_patterns: [],
        data_transfer: [],
        protocol_usage: [],
        geographic_anomalies: []
      },
      application_usage: {
        feature_usage: [],
        workflow_patterns: [],
        error_patterns: [],
        performance_patterns: []
      }
    };

    // Real-time detection parameters
    this.realtimeParams = {
      windowSize: 100,        // Number of events in sliding window
      updateInterval: 5000,   // Model update interval (ms)
      alertThreshold: 0.7,    // Threshold for real-time alerts
      bufferSize: 1000        // Maximum buffer size per user
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Anomaly Detection Service...');

      // Initialize Redis for distributed anomaly state
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for anomaly detection');
      }

      // Load pre-trained ML models
      await this.loadMLModels();

      // Initialize detection thresholds
      await this.initializeThresholds();

      // Start real-time processing
      this.startRealtimeProcessing();

      this.logger.info('Anomaly Detection Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Anomaly Detection Service:', error);
      throw error;
    }
  }

  async loadMLModels() {
    try {
      // Load Isolation Forest model for outlier detection
      this.mlModels.set('isolation_forest', await this.loadIsolationForestModel());
      
      // Load Autoencoder for reconstruction-based anomaly detection
      this.mlModels.set('autoencoder', await tf.loadLayersModel('file://./models/autoencoder/model.json'));
      
      // Load LSTM for sequence anomaly detection
      this.mlModels.set('lstm_sequence', await tf.loadLayersModel('file://./models/lstm_sequence/model.json'));
      
      // Load Variational Autoencoder for complex pattern detection
      this.mlModels.set('vae', await tf.loadLayersModel('file://./models/vae/model.json'));
      
      // Load Ensemble model combining multiple approaches
      this.mlModels.set('ensemble', await tf.loadLayersModel('file://./models/ensemble/model.json'));

      this.logger.info('ML models loaded for anomaly detection');
    } catch (error) {
      this.logger.warn('Some ML models not available, using fallback methods:', error.message);
    }
  }

  async initializeThresholds() {
    // Initialize adaptive thresholds for different anomaly types
    this.anomalyThresholds.set('behavioral', {
      critical: 0.95,
      high: 0.85,
      medium: 0.70,
      low: 0.55,
      adaptive: true,
      learningRate: 0.01
    });

    this.anomalyThresholds.set('access_pattern', {
      critical: 0.90,
      high: 0.80,
      medium: 0.65,
      low: 0.50,
      adaptive: true,
      learningRate: 0.015
    });

    this.anomalyThresholds.set('network', {
      critical: 0.92,
      high: 0.82,
      medium: 0.68,
      low: 0.52,
      adaptive: true,
      learningRate: 0.012
    });

    this.anomalyThresholds.set('temporal', {
      critical: 0.88,
      high: 0.78,
      medium: 0.63,
      low: 0.48,
      adaptive: true,
      learningRate: 0.018
    });
  }

  async detectAnomalies(detectionRequest) {
    try {
      const { userId, behavior, context } = detectionRequest;
      
      this.logger.info(`Starting anomaly detection for user ${userId}`, {
        userId,
        contextKeys: Object.keys(context || {}),
        behaviorKeys: Object.keys(behavior || {})
      });

      // Step 1: Extract and normalize features
      const features = await this.extractFeatures(userId, behavior, context);
      
      // Step 2: Get or create user baseline
      const baseline = await this.getUserBaseline(userId);
      
      // Step 3: Run multiple anomaly detection algorithms
      const detectionResults = await this.runDetectionAlgorithms(features, baseline);
      
      // Step 4: Calculate aggregate anomaly score
      const aggregateScore = this.calculateAggregateScore(detectionResults);
      
      // Step 5: Classify anomalies and assess severity
      const anomalies = this.classifyAnomalies(detectionResults, aggregateScore);
      
      // Step 6: Update user baseline with new data
      await this.updateBaseline(userId, features, anomalies);
      
      // Step 7: Generate recommendations and actions
      const recommendations = this.generateRecommendations(anomalies, aggregateScore);
      
      // Step 8: Log anomaly detection event
      await this.logAnomalyEvent({
        userId,
        anomalies,
        score: aggregateScore,
        context,
        timestamp: DateTime.now().toISO()
      });

      this.logger.info(`Anomaly detection completed for user ${userId}`, {
        userId,
        anomalyCount: anomalies.length,
        maxSeverity: anomalies.length > 0 ? Math.max(...anomalies.map(a => a.severity)) : 0,
        aggregateScore
      });

      return {
        userId,
        anomaliesDetected: anomalies,
        riskScore: aggregateScore,
        severity: this.determineSeverityLevel(aggregateScore),
        confidence: this.calculateConfidence(detectionResults),
        recommendedActions: recommendations.actions,
        explanation: recommendations.explanation,
        timestamp: DateTime.now().toISO()
      };

    } catch (error) {
      this.logger.error('Anomaly detection error:', error);
      throw new Error(`Anomaly detection failed: ${error.message}`);
    }
  }

  async extractFeatures(userId, behavior, context) {
    try {
      const features = {
        temporal: [],
        behavioral: [],
        network: [],
        access: [],
        metadata: {}
      };

      // Extract temporal features
      features.temporal = this.extractTemporalFeatures(behavior, context);
      
      // Extract behavioral biometric features
      features.behavioral = this.extractBehavioralFeatures(behavior);
      
      // Extract network and location features
      features.network = this.extractNetworkFeatures(context);
      
      // Extract access pattern features
      features.access = await this.extractAccessPatternFeatures(userId, context);
      
      // Extract metadata features
      features.metadata = this.extractMetadataFeatures(behavior, context);

      // Normalize features for ML processing
      return this.normalizeFeatures(features);

    } catch (error) {
      this.logger.error('Feature extraction error:', error);
      return { temporal: [], behavioral: [], network: [], access: [], metadata: {} };
    }
  }

  extractTemporalFeatures(behavior, context) {
    const features = [];
    const now = DateTime.now();
    
    // Hour of day (0-23)
    features.push(now.hour / 23.0);
    
    // Day of week (1-7)
    features.push(now.weekday / 7.0);
    
    // Month (1-12)
    features.push(now.month / 12.0);
    
    // Session timing patterns
    if (behavior?.sessionStart) {
      const sessionStart = DateTime.fromISO(behavior.sessionStart);
      const sessionDuration = now.diff(sessionStart, 'minutes').minutes;
      features.push(Math.min(sessionDuration / 480.0, 1.0)); // Normalize to 8 hours max
    } else {
      features.push(0);
    }
    
    // Access velocity (requests per minute)
    if (behavior?.requestCount && behavior?.timeWindow) {
      const velocity = behavior.requestCount / behavior.timeWindow;
      features.push(Math.min(velocity / 60.0, 1.0)); // Normalize to 60 req/min max
    } else {
      features.push(0);
    }

    return features;
  }

  extractBehavioralFeatures(behavior) {
    const features = [];
    
    // Typing dynamics features
    if (behavior?.typing) {
      const typing = behavior.typing;
      features.push(
        this.normalizeMetric(typing.avgDwellTime || 0, 0, 500),
        this.normalizeMetric(typing.avgFlightTime || 0, 0, 300),
        this.normalizeMetric(typing.typingSpeed || 0, 0, 150),
        this.normalizeMetric(typing.rhythm || 0, 0, 10)
      );
    } else {
      features.push(0, 0, 0, 0);
    }
    
    // Mouse dynamics features
    if (behavior?.mouse) {
      const mouse = behavior.mouse;
      features.push(
        this.normalizeMetric(mouse.avgVelocity || 0, 0, 2000),
        this.normalizeMetric(mouse.avgAcceleration || 0, 0, 5000),
        this.normalizeMetric(mouse.clickFrequency || 0, 0, 10),
        this.normalizeMetric(mouse.dragDistance || 0, 0, 1000)
      );
    } else {
      features.push(0, 0, 0, 0);
    }
    
    // Navigation patterns
    if (behavior?.navigation) {
      const nav = behavior.navigation;
      features.push(
        this.normalizeMetric(nav.pageVisits || 0, 0, 100),
        this.normalizeMetric(nav.avgTimeOnPage || 0, 0, 300),
        this.normalizeMetric(nav.backButtonUsage || 0, 0, 20),
        this.normalizeMetric(nav.scrollSpeed || 0, 0, 5000)
      );
    } else {
      features.push(0, 0, 0, 0);
    }

    return features;
  }

  extractNetworkFeatures(context) {
    const features = [];
    
    // IP geolocation features
    if (context?.location) {
      features.push(
        this.normalizeMetric(context.location.latitude || 0, -90, 90),
        this.normalizeMetric(context.location.longitude || 0, -180, 180),
        context.location.isVPN ? 1.0 : 0.0,
        context.location.isTor ? 1.0 : 0.0
      );
    } else {
      features.push(0, 0, 0, 0);
    }
    
    // Network characteristics
    if (context?.network) {
      features.push(
        this.normalizeMetric(context.network.latency || 0, 0, 1000),
        this.normalizeMetric(context.network.bandwidth || 0, 0, 1000),
        context.network.isProxy ? 1.0 : 0.0,
        context.network.isMobile ? 1.0 : 0.0
      );
    } else {
      features.push(0, 0, 0, 0);
    }

    return features;
  }

  async extractAccessPatternFeatures(userId, context) {
    const features = [];
    
    // Get recent access history
    const accessHistory = await this.getAccessHistory(userId, 24); // Last 24 hours
    
    if (accessHistory && accessHistory.length > 0) {
      // Access frequency
      features.push(Math.min(accessHistory.length / 50.0, 1.0)); // Normalize to 50 accesses max
      
      // Unique locations
      const uniqueLocations = new Set(accessHistory.map(a => a.location?.city)).size;
      features.push(Math.min(uniqueLocations / 10.0, 1.0)); // Normalize to 10 locations max
      
      // Device consistency
      const uniqueDevices = new Set(accessHistory.map(a => a.deviceId)).size;
      features.push(Math.min(uniqueDevices / 5.0, 1.0)); // Normalize to 5 devices max
      
      // Time distribution entropy
      const hourDistribution = this.calculateHourDistribution(accessHistory);
      const entropy = this.calculateEntropy(hourDistribution);
      features.push(entropy / Math.log(24)); // Normalize to max entropy
    } else {
      features.push(0, 0, 0, 0);
    }

    return features;
  }

  extractMetadataFeatures(behavior, context) {
    return {
      userAgent: context?.userAgent || '',
      deviceType: context?.deviceType || 'unknown',
      platform: context?.platform || 'unknown',
      screenResolution: context?.screenResolution || '',
      timezone: context?.timezone || '',
      language: context?.language || 'en',
      referrer: context?.referrer || '',
      sessionId: context?.sessionId || ''
    };
  }

  normalizeFeatures(features) {
    // Combine all numerical features
    const allFeatures = [
      ...features.temporal,
      ...features.behavioral,
      ...features.network,
      ...features.access
    ];

    // Apply z-score normalization
    const mean = allFeatures.reduce((sum, val) => sum + val, 0) / allFeatures.length;
    const variance = allFeatures.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allFeatures.length;
    const stdDev = Math.sqrt(variance);

    const normalized = allFeatures.map(val => 
      stdDev > 0 ? (val - mean) / stdDev : 0
    );

    return {
      features: normalized,
      metadata: features.metadata,
      stats: { mean, stdDev, variance }
    };
  }

  async runDetectionAlgorithms(features, baseline) {
    const results = {};

    try {
      // 1. Statistical outlier detection
      results.statistical = await this.statisticalOutlierDetection(features, baseline);
      
      // 2. Isolation Forest detection
      results.isolationForest = await this.isolationForestDetection(features);
      
      // 3. Autoencoder reconstruction error
      results.autoencoder = await this.autoencoderDetection(features);
      
      // 4. LSTM sequence anomaly detection
      results.lstm = await this.lstmSequenceDetection(features);
      
      // 5. Ensemble method
      results.ensemble = await this.ensembleDetection(features, results);

    } catch (error) {
      this.logger.error('Detection algorithm error:', error);
    }

    return results;
  }

  async statisticalOutlierDetection(features, baseline) {
    try {
      if (!baseline || baseline.samples.length < 10) {
        return { score: 0.5, confidence: 0.3, method: 'statistical' };
      }

      const currentFeatures = features.features;
      const baselineMatrix = new Matrix(baseline.samples);
      
      // Calculate z-scores for each feature
      const zScores = currentFeatures.map((value, index) => {
        const column = baselineMatrix.getColumn(index);
        const mean = column.reduce((sum, val) => sum + val, 0) / column.length;
        const variance = column.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / column.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev > 0 ? Math.abs((value - mean) / stdDev) : 0;
      });

      // Calculate overall anomaly score using max z-score
      const maxZScore = Math.max(...zScores);
      const anomalyScore = Math.min(maxZScore / 3.0, 1.0); // Normalize to 3 standard deviations

      return {
        score: anomalyScore,
        confidence: Math.min(baseline.samples.length / 100.0, 1.0),
        method: 'statistical',
        details: {
          maxZScore,
          zScores: zScores.slice(0, 5), // First 5 z-scores for brevity
          baselineSamples: baseline.samples.length
        }
      };

    } catch (error) {
      this.logger.error('Statistical detection error:', error);
      return { score: 0.5, confidence: 0.1, method: 'statistical', error: error.message };
    }
  }

  async isolationForestDetection(features) {
    try {
      const model = this.mlModels.get('isolation_forest');
      if (!model) {
        return { score: 0.5, confidence: 0.2, method: 'isolation_forest' };
      }

      // Isolation Forest implementation would go here
      // For now, using a simplified approach
      const anomalyScore = await this.runIsolationForest(features.features);

      return {
        score: anomalyScore,
        confidence: 0.8,
        method: 'isolation_forest',
        details: {
          featureCount: features.features.length,
          isolationPath: 'computed'
        }
      };

    } catch (error) {
      this.logger.error('Isolation Forest detection error:', error);
      return { score: 0.5, confidence: 0.1, method: 'isolation_forest', error: error.message };
    }
  }

  async autoencoderDetection(features) {
    try {
      const model = this.mlModels.get('autoencoder');
      if (!model) {
        return { score: 0.5, confidence: 0.2, method: 'autoencoder' };
      }

      // Convert features to tensor
      const inputTensor = tf.tensor2d([features.features]);
      
      // Get reconstruction
      const reconstruction = model.predict(inputTensor);
      
      // Calculate reconstruction error
      const mse = tf.losses.meanSquaredError(inputTensor, reconstruction);
      const reconstructionError = await mse.data();
      
      // Normalize error to anomaly score
      const anomalyScore = Math.min(reconstructionError[0] * 10, 1.0);

      // Cleanup tensors
      inputTensor.dispose();
      reconstruction.dispose();
      mse.dispose();

      return {
        score: anomalyScore,
        confidence: 0.85,
        method: 'autoencoder',
        details: {
          reconstructionError: reconstructionError[0],
          featureCount: features.features.length
        }
      };

    } catch (error) {
      this.logger.error('Autoencoder detection error:', error);
      return { score: 0.5, confidence: 0.1, method: 'autoencoder', error: error.message };
    }
  }

  async lstmSequenceDetection(features) {
    try {
      const model = this.mlModels.get('lstm_sequence');
      if (!model) {
        return { score: 0.5, confidence: 0.2, method: 'lstm_sequence' };
      }

      // For LSTM, we need sequence data
      // This would require maintaining a sequence buffer per user
      const userSequence = await this.getUserSequenceBuffer(features.metadata.sessionId);
      
      if (!userSequence || userSequence.length < 10) {
        return { score: 0.5, confidence: 0.3, method: 'lstm_sequence' };
      }

      // Prepare sequence tensor
      const sequenceTensor = tf.tensor3d([userSequence.slice(-10)]); // Last 10 items
      
      // Get prediction
      const prediction = model.predict(sequenceTensor);
      const predictionData = await prediction.data();
      
      // Calculate sequence anomaly score
      const anomalyScore = Math.min(predictionData[0], 1.0);

      // Cleanup tensors
      sequenceTensor.dispose();
      prediction.dispose();

      return {
        score: anomalyScore,
        confidence: 0.8,
        method: 'lstm_sequence',
        details: {
          sequenceLength: userSequence.length,
          prediction: predictionData[0]
        }
      };

    } catch (error) {
      this.logger.error('LSTM sequence detection error:', error);
      return { score: 0.5, confidence: 0.1, method: 'lstm_sequence', error: error.message };
    }
  }

  async ensembleDetection(features, previousResults) {
    try {
      // Combine results from other methods
      const scores = Object.values(previousResults)
        .filter(result => result.score !== undefined)
        .map(result => ({
          score: result.score,
          confidence: result.confidence,
          weight: this.detectionAlgorithms[result.method] || 0.1
        }));

      if (scores.length === 0) {
        return { score: 0.5, confidence: 0.2, method: 'ensemble' };
      }

      // Calculate weighted average
      const totalWeight = scores.reduce((sum, s) => sum + s.weight * s.confidence, 0);
      const weightedScore = scores.reduce((sum, s) => sum + s.score * s.weight * s.confidence, 0);
      
      const ensembleScore = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
      const ensembleConfidence = totalWeight / scores.length;

      return {
        score: ensembleScore,
        confidence: ensembleConfidence,
        method: 'ensemble',
        details: {
          contributingMethods: scores.length,
          totalWeight,
          individualScores: scores.map(s => ({ score: s.score, weight: s.weight }))
        }
      };

    } catch (error) {
      this.logger.error('Ensemble detection error:', error);
      return { score: 0.5, confidence: 0.1, method: 'ensemble', error: error.message };
    }
  }

  calculateAggregateScore(detectionResults) {
    const validResults = Object.values(detectionResults)
      .filter(result => result.score !== undefined && !isNaN(result.score));

    if (validResults.length === 0) {
      return 0.5;
    }

    // Use ensemble result if available, otherwise weighted average
    const ensembleResult = validResults.find(r => r.method === 'ensemble');
    if (ensembleResult) {
      return ensembleResult.score;
    }

    // Calculate weighted average of all methods
    const totalWeight = validResults.reduce((sum, result) => {
      const weight = this.detectionAlgorithms[result.method] || 0.1;
      return sum + weight * result.confidence;
    }, 0);

    const weightedSum = validResults.reduce((sum, result) => {
      const weight = this.detectionAlgorithms[result.method] || 0.1;
      return sum + result.score * weight * result.confidence;
    }, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  classifyAnomalies(detectionResults, aggregateScore) {
    const anomalies = [];

    // Classify based on aggregate score and individual method results
    Object.entries(detectionResults).forEach(([method, result]) => {
      if (result.score > 0.6) { // Threshold for considering an anomaly
        const severity = this.determineSeverityLevel(result.score);
        
        anomalies.push({
          type: method,
          severity,
          score: result.score,
          confidence: result.confidence,
          details: result.details || {},
          timestamp: DateTime.now().toISO(),
          description: this.generateAnomalyDescription(method, result)
        });
      }
    });

    // Add aggregate anomaly if score is high
    if (aggregateScore > 0.7) {
      anomalies.push({
        type: 'aggregate',
        severity: this.determineSeverityLevel(aggregateScore),
        score: aggregateScore,
        confidence: 0.9,
        details: { contributingMethods: Object.keys(detectionResults) },
        timestamp: DateTime.now().toISO(),
        description: `High aggregate anomaly score detected across multiple methods`
      });
    }

    return anomalies;
  }

  determineSeverityLevel(score) {
    if (score >= this.severityLevels.critical.threshold) return 'critical';
    if (score >= this.severityLevels.high.threshold) return 'high';
    if (score >= this.severityLevels.medium.threshold) return 'medium';
    if (score >= this.severityLevels.low.threshold) return 'low';
    return 'info';
  }

  generateRecommendations(anomalies, aggregateScore) {
    const actions = [];
    const explanations = [];

    if (aggregateScore > 0.9) {
      actions.push('immediate_account_lock');
      actions.push('security_team_alert');
      explanations.push('Critical anomaly detected requiring immediate response');
    } else if (aggregateScore > 0.8) {
      actions.push('enhanced_verification');
      actions.push('supervisor_notification');
      explanations.push('High-risk anomaly requiring additional verification');
    } else if (aggregateScore > 0.6) {
      actions.push('step_up_authentication');
      explanations.push('Moderate anomaly detected, requesting additional authentication');
    } else if (aggregateScore > 0.4) {
      actions.push('increased_monitoring');
      explanations.push('Low-level anomaly detected, increasing monitoring frequency');
    }

    // Add specific recommendations based on anomaly types
    anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'behavioral':
          actions.push('behavioral_challenge');
          break;
        case 'network':
          actions.push('ip_verification');
          break;
        case 'temporal':
          actions.push('time_based_challenge');
          break;
      }
    });

    return {
      actions: [...new Set(actions)], // Remove duplicates
      explanation: explanations.join('; ')
    };
  }

  // Helper methods
  normalizeMetric(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  calculateConfidence(detectionResults) {
    const confidences = Object.values(detectionResults)
      .map(result => result.confidence || 0.5)
      .filter(conf => !isNaN(conf));
    
    return confidences.length > 0 
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : 0.5;
  }

  generateAnomalyDescription(method, result) {
    const descriptions = {
      statistical: `Statistical outlier detected with z-score of ${result.details?.maxZScore?.toFixed(2) || 'unknown'}`,
      isolation_forest: `Isolation Forest detected anomalous pattern in feature space`,
      autoencoder: `Autoencoder reconstruction error of ${result.details?.reconstructionError?.toFixed(4) || 'unknown'}`,
      lstm_sequence: `Sequential pattern anomaly detected in user behavior`,
      ensemble: `Multiple detection methods agree on anomalous behavior`
    };

    return descriptions[method] || `${method} anomaly detected`;
  }

  startRealtimeProcessing() {
    setInterval(() => {
      this.processRealtimeBuffer();
    }, this.realtimeParams.updateInterval);
  }

  async processRealtimeBuffer() {
    try {
      for (const [userId, buffer] of this.realtimeBuffer.entries()) {
        if (buffer.length >= this.realtimeParams.windowSize) {
          // Process buffer for real-time anomaly detection
          await this.processUserBuffer(userId, buffer);
          
          // Keep only recent events
          this.realtimeBuffer.set(userId, buffer.slice(-this.realtimeParams.windowSize));
        }
      }
    } catch (error) {
      this.logger.error('Real-time processing error:', error);
    }
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
        mlModels: {
          loaded: this.mlModels.size,
          available: Array.from(this.mlModels.keys())
        },
        realtimeBuffer: {
          activeUsers: this.realtimeBuffer.size,
          totalEvents: Array.from(this.realtimeBuffer.values())
            .reduce((sum, buffer) => sum + buffer.length, 0)
        }
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
      this.logger.info('Shutting down Anomaly Detection Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      // Dispose TensorFlow models
      this.mlModels.forEach((model, name) => {
        try {
          if (model.dispose) {
            model.dispose();
          }
        } catch (error) {
          this.logger.warn(`Error disposing model ${name}:`, error);
        }
      });
      this.mlModels.clear();

      this.logger.info('Anomaly Detection Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default AnomalyDetectionService;