/**
 * Policy Enforcement Service
 * Dynamic security policy enforcement with context-aware rules
 * Real-time policy evaluation and adaptive access control
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import Joi from 'joi';

class PolicyEnforcementService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
    this.redis = null;
    this.policies = new Map();
    this.rules = new Map();
    this.enforcementHistory = new Map();
    this.contextEvaluators = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'policy-enforcement' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/policy-enforcement.log' })
      ]
    });

    // Policy decision outcomes
    this.decisions = {
      ALLOW: 'allow',
      DENY: 'deny',
      CHALLENGE: 'challenge',
      MONITOR: 'monitor',
      STEP_UP: 'step_up'
    };

    // Context evaluation priorities
    this.contextPriorities = {
      security: 1.0,
      compliance: 0.9,
      business: 0.8,
      user_experience: 0.7,
      performance: 0.6
    };

    // Default security policies
    this.defaultPolicies = {
      admin_access: {
        name: 'Administrative Access Policy',
        description: 'Strict controls for administrative operations',
        priority: 100,
        conditions: {
          required_factors: ['password', 'mfa', 'biometric'],
          max_risk_score: 0.3,
          allowed_locations: 'trusted',
          time_restrictions: 'business_hours',
          device_compliance: 'required'
        },
        actions: {
          allow: ['audit_log', 'session_monitor'],
          deny: ['block_request', 'alert_security'],
          challenge: ['step_up_auth', 'approval_required']
        }
      },
      sensitive_data: {
        name: 'Sensitive Data Access Policy',
        description: 'Protection for sensitive and confidential data',
        priority: 90,
        conditions: {
          required_factors: ['password', 'mfa'],
          max_risk_score: 0.4,
          data_classification: ['confidential', 'restricted'],
          encryption_required: true
        },
        actions: {
          allow: ['audit_log', 'dlp_monitor'],
          deny: ['block_request', 'alert_dpo'],
          monitor: ['content_inspection', 'behavior_analysis']
        }
      },
      standard_access: {
        name: 'Standard User Access Policy',
        description: 'Default access controls for standard operations',
        priority: 50,
        conditions: {
          required_factors: ['password'],
          max_risk_score: 0.7,
          session_timeout: 3600
        },
        actions: {
          allow: ['session_tracking'],
          challenge: ['additional_verification'],
          monitor: ['usage_analytics']
        }
      }
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Policy Enforcement Service...');

      // Initialize Redis for distributed policy state
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for policy enforcement');
      }

      // Load default policies
      await this.loadDefaultPolicies();

      // Initialize context evaluators
      await this.initializeContextEvaluators();

      // Load custom policies from storage
      await this.loadCustomPolicies();

      this.logger.info('Policy Enforcement Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Policy Enforcement Service:', error);
      throw error;
    }
  }

  async enforcePolicy(enforcementRequest) {
    try {
      const {
        action,
        resource,
        context,
        riskAssessment,
        subject
      } = enforcementRequest;

      this.logger.info(`Enforcing policy for action: ${action}`, {
        action,
        resource: resource?.type,
        subjectId: subject?.id,
        riskLevel: riskAssessment?.riskLevel
      });

      // Step 1: Identify applicable policies
      const applicablePolicies = await this.identifyApplicablePolicies(action, resource, context);

      // Step 2: Evaluate each policy
      const evaluationResults = await this.evaluatePolicies(applicablePolicies, {
        action,
        resource,
        context,
        riskAssessment,
        subject
      });

      // Step 3: Make final decision
      const finalDecision = this.makeFinalDecision(evaluationResults);

      // Step 4: Execute enforcement actions
      const enforcementResult = await this.executeEnforcement(finalDecision, {
        action,
        resource,
        context,
        subject
      });

      // Step 5: Log enforcement decision
      await this.logEnforcementDecision({
        action,
        resource,
        subject,
        decision: finalDecision,
        result: enforcementResult,
        timestamp: DateTime.now().toISO()
      });

      this.logger.info(`Policy enforcement completed`, {
        action,
        decision: finalDecision.decision,
        policiesEvaluated: evaluationResults.length
      });

      return {
        decision: finalDecision.decision,
        reason: finalDecision.reason,
        requirements: finalDecision.requirements,
        actions: enforcementResult.actions,
        expiresAt: finalDecision.expiresAt,
        policyId: finalDecision.policyId,
        confidence: finalDecision.confidence
      };

    } catch (error) {
      this.logger.error('Policy enforcement error:', error);
      throw new Error(`Policy enforcement failed: ${error.message}`);
    }
  }

  async identifyApplicablePolicies(action, resource, context) {
    try {
      const applicablePolicies = [];

      for (const [policyId, policy] of this.policies.entries()) {
        const isApplicable = await this.isPolicyApplicable(policy, action, resource, context);
        
        if (isApplicable) {
          applicablePolicies.push({
            id: policyId,
            policy,
            applicabilityScore: await this.calculateApplicabilityScore(policy, action, resource, context)
          });
        }
      }

      // Sort by priority and applicability score
      applicablePolicies.sort((a, b) => {
        const priorityDiff = (b.policy.priority || 0) - (a.policy.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return b.applicabilityScore - a.applicabilityScore;
      });

      return applicablePolicies;

    } catch (error) {
      this.logger.error('Error identifying applicable policies:', error);
      return [];
    }
  }

  async isPolicyApplicable(policy, action, resource, context) {
    try {
      // Check action patterns
      if (policy.actionPatterns) {
        const actionMatches = policy.actionPatterns.some(pattern => 
          this.matchesPattern(action, pattern)
        );
        if (!actionMatches) return false;
      }

      // Check resource patterns
      if (policy.resourcePatterns && resource) {
        const resourceMatches = policy.resourcePatterns.some(pattern =>
          this.matchesResourcePattern(resource, pattern)
        );
        if (!resourceMatches) return false;
      }

      // Check context conditions
      if (policy.contextConditions) {
        const contextMatches = await this.evaluateContextConditions(
          policy.contextConditions,
          context
        );
        if (!contextMatches) return false;
      }

      return true;

    } catch (error) {
      this.logger.error('Error checking policy applicability:', error);
      return false;
    }
  }

  async evaluatePolicies(applicablePolicies, requestData) {
    const evaluationResults = [];

    for (const { id, policy, applicabilityScore } of applicablePolicies) {
      try {
        const evaluation = await this.evaluateSinglePolicy(policy, requestData);
        
        evaluationResults.push({
          policyId: id,
          policy,
          evaluation,
          applicabilityScore,
          decision: evaluation.decision,
          confidence: evaluation.confidence,
          reasons: evaluation.reasons
        });

      } catch (error) {
        this.logger.error(`Error evaluating policy ${id}:`, error);
        evaluationResults.push({
          policyId: id,
          policy,
          evaluation: { decision: this.decisions.DENY, confidence: 0, reasons: ['evaluation_error'] },
          applicabilityScore: 0,
          error: error.message
        });
      }
    }

    return evaluationResults;
  }

  async evaluateSinglePolicy(policy, requestData) {
    try {
      const { action, resource, context, riskAssessment, subject } = requestData;
      const evaluation = {
        decision: this.decisions.ALLOW,
        confidence: 1.0,
        reasons: [],
        requirements: [],
        conditions: []
      };

      // Evaluate risk score requirements
      if (policy.conditions?.max_risk_score !== undefined) {
        const riskScore = riskAssessment?.riskScore || 0.5;
        if (riskScore > policy.conditions.max_risk_score) {
          evaluation.decision = this.decisions.DENY;
          evaluation.reasons.push('risk_score_exceeded');
          evaluation.confidence *= 0.9;
        }
      }

      // Evaluate authentication requirements
      if (policy.conditions?.required_factors) {
        const hasRequiredFactors = await this.checkAuthenticationFactors(
          policy.conditions.required_factors,
          context.authenticationFactors || []
        );
        
        if (!hasRequiredFactors.satisfied) {
          evaluation.decision = this.decisions.CHALLENGE;
          evaluation.requirements.push(...hasRequiredFactors.missing);
          evaluation.reasons.push('insufficient_authentication');
        }
      }

      // Evaluate location restrictions
      if (policy.conditions?.allowed_locations) {
        const locationCheck = await this.checkLocationRestrictions(
          policy.conditions.allowed_locations,
          context.location
        );
        
        if (!locationCheck.allowed) {
          evaluation.decision = this.decisions.DENY;
          evaluation.reasons.push('location_not_allowed');
          evaluation.confidence *= 0.8;
        }
      }

      // Evaluate time restrictions
      if (policy.conditions?.time_restrictions) {
        const timeCheck = await this.checkTimeRestrictions(
          policy.conditions.time_restrictions,
          context.timestamp
        );
        
        if (!timeCheck.allowed) {
          evaluation.decision = this.decisions.DENY;
          evaluation.reasons.push('outside_allowed_time');
          evaluation.confidence *= 0.9;
        }
      }

      // Evaluate device compliance
      if (policy.conditions?.device_compliance) {
        const deviceCheck = await this.checkDeviceCompliance(
          policy.conditions.device_compliance,
          context.deviceId,
          subject?.id
        );
        
        if (!deviceCheck.compliant) {
          evaluation.decision = this.decisions.DENY;
          evaluation.reasons.push('device_not_compliant');
          evaluation.confidence *= 0.8;
        }
      }

      // Evaluate data classification requirements
      if (policy.conditions?.data_classification && resource?.classification) {
        const classificationAllowed = policy.conditions.data_classification.includes(
          resource.classification
        );
        
        if (!classificationAllowed) {
          evaluation.decision = this.decisions.DENY;
          evaluation.reasons.push('data_classification_mismatch');
        }
      }

      // Evaluate custom conditions
      if (policy.customConditions) {
        const customEvaluation = await this.evaluateCustomConditions(
          policy.customConditions,
          requestData
        );
        
        if (!customEvaluation.satisfied) {
          evaluation.decision = customEvaluation.suggestedDecision || this.decisions.DENY;
          evaluation.reasons.push(...customEvaluation.reasons);
          evaluation.confidence *= customEvaluation.confidenceMultiplier || 0.8;
        }
      }

      return evaluation;

    } catch (error) {
      this.logger.error('Error evaluating single policy:', error);
      return {
        decision: this.decisions.DENY,
        confidence: 0,
        reasons: ['policy_evaluation_error'],
        error: error.message
      };
    }
  }

  makeFinalDecision(evaluationResults) {
    if (evaluationResults.length === 0) {
      return {
        decision: this.decisions.DENY,
        reason: 'No applicable policies found',
        confidence: 0,
        policyId: null
      };
    }

    // Find the most restrictive decision
    const decisionPriority = {
      [this.decisions.DENY]: 4,
      [this.decisions.CHALLENGE]: 3,
      [this.decisions.STEP_UP]: 2,
      [this.decisions.MONITOR]: 1,
      [this.decisions.ALLOW]: 0
    };

    let finalDecision = evaluationResults[0];
    let maxPriority = decisionPriority[finalDecision.decision];

    for (const result of evaluationResults) {
      const priority = decisionPriority[result.decision];
      if (priority > maxPriority) {
        finalDecision = result;
        maxPriority = priority;
      }
    }

    // Calculate composite confidence
    const avgConfidence = evaluationResults.reduce((sum, result) => 
      sum + result.confidence, 0) / evaluationResults.length;

    // Determine expiration time
    const expiresAt = this.calculateDecisionExpiration(finalDecision);

    return {
      decision: finalDecision.decision,
      reason: finalDecision.evaluation.reasons.join(', '),
      requirements: finalDecision.evaluation.requirements || [],
      confidence: avgConfidence,
      policyId: finalDecision.policyId,
      expiresAt,
      evaluatedPolicies: evaluationResults.length
    };
  }

  async executeEnforcement(decision, requestData) {
    try {
      const actions = [];
      const { action, resource, context, subject } = requestData;

      switch (decision.decision) {
        case this.decisions.ALLOW:
          actions.push(await this.executeAllowActions(decision, requestData));
          break;
        
        case this.decisions.DENY:
          actions.push(await this.executeDenyActions(decision, requestData));
          break;
        
        case this.decisions.CHALLENGE:
          actions.push(await this.executeChallengeActions(decision, requestData));
          break;
        
        case this.decisions.MONITOR:
          actions.push(await this.executeMonitorActions(decision, requestData));
          break;
        
        case this.decisions.STEP_UP:
          actions.push(await this.executeStepUpActions(decision, requestData));
          break;
      }

      return {
        actions: actions.flat(),
        executed: true,
        timestamp: DateTime.now().toISO()
      };

    } catch (error) {
      this.logger.error('Error executing enforcement:', error);
      return {
        actions: [],
        executed: false,
        error: error.message
      };
    }
  }

  async executeAllowActions(decision, requestData) {
    const actions = [];
    
    // Always log allowed access
    actions.push({
      type: 'audit_log',
      details: {
        action: requestData.action,
        resource: requestData.resource,
        subject: requestData.subject,
        decision: decision.decision,
        policyId: decision.policyId
      }
    });

    // Start session monitoring if required
    if (decision.requirements?.includes('session_monitor')) {
      actions.push({
        type: 'start_session_monitoring',
        details: {
          subjectId: requestData.subject?.id,
          sessionId: requestData.context?.sessionId
        }
      });
    }

    return actions;
  }

  async executeDenyActions(decision, requestData) {
    const actions = [];
    
    // Log denied access
    actions.push({
      type: 'audit_log',
      details: {
        action: requestData.action,
        resource: requestData.resource,
        subject: requestData.subject,
        decision: decision.decision,
        reason: decision.reason,
        policyId: decision.policyId
      }
    });

    // Send security alert for denied access
    actions.push({
      type: 'security_alert',
      details: {
        severity: 'medium',
        message: `Access denied for ${requestData.subject?.id} to ${requestData.resource?.id}`,
        reason: decision.reason
      }
    });

    return actions;
  }

  async executeChallengeActions(decision, requestData) {
    const actions = [];
    
    // Create authentication challenge
    actions.push({
      type: 'create_challenge',
      details: {
        subjectId: requestData.subject?.id,
        requirements: decision.requirements,
        expiresAt: decision.expiresAt
      }
    });

    return actions;
  }

  // Helper methods for condition evaluation
  async checkAuthenticationFactors(requiredFactors, providedFactors) {
    const provided = new Set(providedFactors.map(f => f.type));
    const missing = requiredFactors.filter(factor => !provided.has(factor));
    
    return {
      satisfied: missing.length === 0,
      missing,
      provided: Array.from(provided)
    };
  }

  async checkLocationRestrictions(allowedLocations, currentLocation) {
    if (allowedLocations === 'any') return { allowed: true };
    
    if (allowedLocations === 'trusted') {
      // Check against trusted locations list
      const trustedLocations = await this.getTrustedLocations();
      return {
        allowed: trustedLocations.some(loc => 
          this.isLocationWithinRange(currentLocation, loc, 50) // 50km range
        )
      };
    }

    if (Array.isArray(allowedLocations)) {
      return {
        allowed: allowedLocations.some(loc => 
          this.isLocationWithinRange(currentLocation, loc, 10) // 10km range
        )
      };
    }

    return { allowed: false };
  }

  async checkTimeRestrictions(timeRestrictions, currentTime) {
    if (timeRestrictions === 'any') return { allowed: true };
    
    const now = DateTime.fromISO(currentTime);
    
    if (timeRestrictions === 'business_hours') {
      const hour = now.hour;
      const dayOfWeek = now.weekday;
      
      // Monday-Friday, 9 AM - 5 PM
      return {
        allowed: dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 17
      };
    }

    // Custom time restrictions would be evaluated here
    return { allowed: true };
  }

  async checkDeviceCompliance(complianceLevel, deviceId, userId) {
    if (complianceLevel === 'none') return { compliant: true };
    
    // Get device compliance status from device compliance service
    const deviceCompliance = await this.getDeviceCompliance(deviceId, userId);
    
    switch (complianceLevel) {
      case 'basic':
        return { compliant: deviceCompliance.basicCompliance };
      case 'standard':
        return { compliant: deviceCompliance.standardCompliance };
      case 'required':
        return { compliant: deviceCompliance.fullCompliance };
      default:
        return { compliant: false };
    }
  }

  calculateDecisionExpiration(decision) {
    const base = DateTime.now();
    
    switch (decision.decision) {
      case this.decisions.ALLOW:
        return base.plus({ hours: 1 }).toISO();
      case this.decisions.MONITOR:
        return base.plus({ minutes: 30 }).toISO();
      case this.decisions.CHALLENGE:
        return base.plus({ minutes: 5 }).toISO();
      default:
        return base.plus({ minutes: 1 }).toISO();
    }
  }

  matchesPattern(value, pattern) {
    if (typeof pattern === 'string') {
      return value.includes(pattern) || new RegExp(pattern).test(value);
    }
    return false;
  }

  matchesResourcePattern(resource, pattern) {
    if (pattern.type && resource.type !== pattern.type) return false;
    if (pattern.classification && resource.classification !== pattern.classification) return false;
    if (pattern.id && !this.matchesPattern(resource.id, pattern.id)) return false;
    return true;
  }

  isLocationWithinRange(location1, location2, rangeKm) {
    if (!location1 || !location2) return false;
    
    const R = 6371; // Earth's radius in km
    const dLat = (location2.latitude - location1.latitude) * Math.PI / 180;
    const dLon = (location2.longitude - location1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(location1.latitude * Math.PI / 180) * Math.cos(location2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance <= rangeKm;
  }

  async loadDefaultPolicies() {
    for (const [id, policy] of Object.entries(this.defaultPolicies)) {
      this.policies.set(id, policy);
    }
  }

  async initializeContextEvaluators() {
    // Initialize context evaluation functions
    this.contextEvaluators.set('location', this.evaluateLocationContext.bind(this));
    this.contextEvaluators.set('time', this.evaluateTimeContext.bind(this));
    this.contextEvaluators.set('device', this.evaluateDeviceContext.bind(this));
    this.contextEvaluators.set('network', this.evaluateNetworkContext.bind(this));
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
        policies: {
          total: this.policies.size,
          loaded: Array.from(this.policies.keys())
        },
        rules: this.rules.size,
        contextEvaluators: this.contextEvaluators.size
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
      this.logger.info('Shutting down Policy Enforcement Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.policies.clear();
      this.rules.clear();
      this.enforcementHistory.clear();
      this.contextEvaluators.clear();

      this.logger.info('Policy Enforcement Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default PolicyEnforcementService;