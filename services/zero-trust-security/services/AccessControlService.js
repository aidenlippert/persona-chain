/**
 * Access Control Service
 * Fine-grained access control with RBAC, ABAC, and dynamic permissions
 * Real-time access decisions based on Zero Trust principles
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';

class AccessControlService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 900, checkperiod: 180 });
    this.redis = null;
    this.roles = new Map();
    this.permissions = new Map();
    this.policies = new Map();
    this.accessMatrix = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'access-control' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/access-control.log' })
      ]
    });

    // Access control models
    this.accessModels = {
      RBAC: 'role_based',      // Role-Based Access Control
      ABAC: 'attribute_based', // Attribute-Based Access Control
      MAC: 'mandatory',        // Mandatory Access Control
      DAC: 'discretionary'     // Discretionary Access Control
    };

    // Permission types
    this.permissionTypes = {
      READ: 'read',
      WRITE: 'write',
      EXECUTE: 'execute',
      DELETE: 'delete',
      ADMIN: 'admin',
      OWNER: 'owner'
    };

    // Default roles and permissions
    this.defaultRoles = {
      super_admin: {
        name: 'Super Administrator',
        level: 1000,
        permissions: ['*'],
        inherits: [],
        restrictions: []
      },
      admin: {
        name: 'Administrator',
        level: 800,
        permissions: ['admin', 'write', 'read', 'execute'],
        inherits: [],
        restrictions: ['super_admin_resources']
      },
      power_user: {
        name: 'Power User',
        level: 600,
        permissions: ['write', 'read', 'execute'],
        inherits: ['user'],
        restrictions: ['admin_resources', 'system_config']
      },
      user: {
        name: 'Standard User',
        level: 400,
        permissions: ['read', 'execute'],
        inherits: [],
        restrictions: ['admin_resources', 'system_config', 'user_management']
      },
      readonly: {
        name: 'Read Only',
        level: 200,
        permissions: ['read'],
        inherits: [],
        restrictions: ['*_write', '*_delete', '*_admin']
      },
      guest: {
        name: 'Guest',
        level: 100,
        permissions: ['read'],
        inherits: [],
        restrictions: ['*'],
        temporary: true,
        maxDuration: 3600
      }
    };

    // Resource classification levels
    this.classificationLevels = {
      public: { level: 0, color: '#00FF00' },
      internal: { level: 1, color: '#FFFF00' },
      confidential: { level: 2, color: '#FF8000' },
      restricted: { level: 3, color: '#FF0000' },
      top_secret: { level: 4, color: '#800080' }
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Access Control Service...');

      // Initialize Redis for distributed access control
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for access control');
      }

      // Load default roles and permissions
      await this.loadDefaultRoles();

      // Initialize access policies
      await this.initializeAccessPolicies();

      this.logger.info('Access Control Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Access Control Service:', error);
      throw error;
    }
  }

  async checkAccess(accessRequest) {
    try {
      const {
        subjectId,
        action,
        resource,
        context,
        attributes
      } = accessRequest;

      this.logger.info(`Checking access for ${action} on ${resource?.type}`, {
        subjectId,
        action,
        resourceId: resource?.id,
        resourceType: resource?.type
      });

      // Step 1: Get subject information
      const subject = await this.getSubject(subjectId);
      if (!subject) {
        return this.createAccessDecision('DENY', 'Subject not found');
      }

      // Step 2: Get resource information
      const resourceInfo = await this.getResourceInfo(resource);

      // Step 3: Evaluate RBAC (Role-Based Access Control)
      const rbacDecision = await this.evaluateRBAC(subject, action, resourceInfo);

      // Step 4: Evaluate ABAC (Attribute-Based Access Control)
      const abacDecision = await this.evaluateABAC(subject, action, resourceInfo, context, attributes);

      // Step 5: Evaluate dynamic policies
      const policyDecision = await this.evaluatePolicies(subject, action, resourceInfo, context);

      // Step 6: Make final access decision
      const finalDecision = this.makeAccessDecision({
        rbac: rbacDecision,
        abac: abacDecision,
        policy: policyDecision
      });

      // Step 7: Log access decision
      await this.logAccessDecision({
        subjectId,
        action,
        resource,
        decision: finalDecision,
        timestamp: DateTime.now().toISO()
      });

      this.logger.info(`Access decision: ${finalDecision.decision}`, {
        subjectId,
        action,
        resourceId: resource?.id,
        decision: finalDecision.decision,
        reason: finalDecision.reason
      });

      return finalDecision;

    } catch (error) {
      this.logger.error('Access control error:', error);
      return this.createAccessDecision('DENY', `Access control error: ${error.message}`);
    }
  }

  async evaluateRBAC(subject, action, resource) {
    try {
      const userRoles = subject.roles || [];
      const requiredPermissions = this.getRequiredPermissions(action, resource);
      
      // Check if user has any role with required permissions
      for (const roleName of userRoles) {
        const role = this.roles.get(roleName);
        if (!role) continue;

        // Check if role has required permissions
        const hasPermission = this.checkRolePermissions(role, requiredPermissions, resource);
        if (hasPermission.granted) {
          return {
            decision: 'ALLOW',
            model: 'RBAC',
            role: roleName,
            permissions: hasPermission.permissions,
            confidence: 0.9
          };
        }
      }

      return {
        decision: 'DENY',
        model: 'RBAC',
        reason: 'Insufficient role permissions',
        required: requiredPermissions,
        confidence: 0.9
      };

    } catch (error) {
      this.logger.error('RBAC evaluation error:', error);
      return {
        decision: 'DENY',
        model: 'RBAC',
        reason: 'RBAC evaluation failed',
        confidence: 0.1
      };
    }
  }

  async evaluateABAC(subject, action, resource, context, attributes) {
    try {
      const attributeRules = await this.getAttributeRules(action, resource);
      let allowScore = 0;
      let totalWeight = 0;
      const evaluations = [];

      for (const rule of attributeRules) {
        const evaluation = await this.evaluateAttributeRule(rule, {
          subject,
          action,
          resource,
          context,
          attributes
        });
        
        evaluations.push(evaluation);
        allowScore += evaluation.score * rule.weight;
        totalWeight += rule.weight;
      }

      const finalScore = totalWeight > 0 ? allowScore / totalWeight : 0;
      const decision = finalScore >= 0.7 ? 'ALLOW' : 'DENY';

      return {
        decision,
        model: 'ABAC',
        score: finalScore,
        evaluations,
        confidence: Math.min(0.9, totalWeight / 10) // Confidence based on rule coverage
      };

    } catch (error) {
      this.logger.error('ABAC evaluation error:', error);
      return {
        decision: 'DENY',
        model: 'ABAC',
        reason: 'ABAC evaluation failed',
        confidence: 0.1
      };
    }
  }

  async evaluatePolicies(subject, action, resource, context) {
    try {
      const applicablePolicies = await this.getApplicablePolicies(action, resource, context);
      let allowCount = 0;
      let denyCount = 0;
      const policyResults = [];

      for (const policy of applicablePolicies) {
        const result = await this.evaluatePolicy(policy, {
          subject,
          action,
          resource,
          context
        });
        
        policyResults.push(result);
        
        if (result.decision === 'ALLOW') allowCount++;
        if (result.decision === 'DENY') denyCount++;
      }

      // Policy combination logic: any explicit DENY overrides ALLOW
      let decision = 'DENY';
      let reason = 'No applicable policies found';
      
      if (denyCount > 0) {
        decision = 'DENY';
        reason = 'Explicit policy denial';
      } else if (allowCount > 0) {
        decision = 'ALLOW';
        reason = 'Policy allows access';
      }

      return {
        decision,
        model: 'POLICY',
        reason,
        policiesEvaluated: applicablePolicies.length,
        allowCount,
        denyCount,
        results: policyResults,
        confidence: applicablePolicies.length > 0 ? 0.85 : 0.3
      };

    } catch (error) {
      this.logger.error('Policy evaluation error:', error);
      return {
        decision: 'DENY',
        model: 'POLICY',
        reason: 'Policy evaluation failed',
        confidence: 0.1
      };
    }
  }

  makeAccessDecision(evaluations) {
    const { rbac, abac, policy } = evaluations;

    // Decision combination strategy: most restrictive wins
    const decisions = [rbac, abac, policy];
    const denyDecisions = decisions.filter(d => d.decision === 'DENY');
    
    if (denyDecisions.length > 0) {
      // Find the most confident DENY decision
      const strongestDeny = denyDecisions.reduce((prev, curr) => 
        (curr.confidence || 0) > (prev.confidence || 0) ? curr : prev
      );

      return this.createAccessDecision('DENY', strongestDeny.reason, {
        model: strongestDeny.model,
        confidence: strongestDeny.confidence,
        evaluations: decisions
      });
    }

    // All decisions are ALLOW or neutral
    const allowDecisions = decisions.filter(d => d.decision === 'ALLOW');
    
    if (allowDecisions.length > 0) {
      const strongestAllow = allowDecisions.reduce((prev, curr) => 
        (curr.confidence || 0) > (prev.confidence || 0) ? curr : prev
      );

      return this.createAccessDecision('ALLOW', 'Access granted', {
        model: strongestAllow.model,
        confidence: strongestAllow.confidence,
        evaluations: decisions
      });
    }

    // No clear decision
    return this.createAccessDecision('DENY', 'Insufficient authorization', {
      model: 'COMBINED',
      confidence: 0.5,
      evaluations: decisions
    });
  }

  createAccessDecision(decision, reason, details = {}) {
    return {
      decision,
      reason,
      timestamp: DateTime.now().toISO(),
      expiresAt: DateTime.now().plus({ minutes: 15 }).toISO(),
      ...details
    };
  }

  getRequiredPermissions(action, resource) {
    const permissions = [];
    
    // Map actions to permission requirements
    switch (action.toLowerCase()) {
      case 'read':
      case 'view':
      case 'list':
        permissions.push(this.permissionTypes.READ);
        break;
      
      case 'write':
      case 'update':
      case 'modify':
        permissions.push(this.permissionTypes.READ, this.permissionTypes.WRITE);
        break;
      
      case 'create':
      case 'add':
        permissions.push(this.permissionTypes.WRITE);
        break;
      
      case 'delete':
      case 'remove':
        permissions.push(this.permissionTypes.DELETE);
        break;
      
      case 'execute':
      case 'run':
        permissions.push(this.permissionTypes.EXECUTE);
        break;
      
      case 'admin':
      case 'manage':
        permissions.push(this.permissionTypes.ADMIN);
        break;
      
      default:
        permissions.push(this.permissionTypes.READ); // Default to read
    }

    // Add resource-specific permission requirements
    if (resource?.classification) {
      const classLevel = this.classificationLevels[resource.classification]?.level || 0;
      if (classLevel >= 2) { // Confidential or higher
        permissions.push('classified_access');
      }
      if (classLevel >= 3) { // Restricted or higher
        permissions.push('restricted_access');
      }
    }

    return permissions;
  }

  checkRolePermissions(role, requiredPermissions, resource) {
    const rolePermissions = role.permissions || [];
    const restrictions = role.restrictions || [];
    
    // Check if role has wildcard permission
    if (rolePermissions.includes('*')) {
      return {
        granted: true,
        permissions: ['*'],
        method: 'wildcard'
      };
    }

    // Check specific permissions
    const grantedPermissions = [];
    for (const required of requiredPermissions) {
      if (rolePermissions.includes(required)) {
        grantedPermissions.push(required);
      }
    }

    // Check if all required permissions are granted
    const allGranted = requiredPermissions.every(perm => 
      grantedPermissions.includes(perm)
    );

    // Check restrictions
    const restricted = restrictions.some(restriction => {
      if (restriction === '*') return true;
      if (resource?.type && restriction.includes(resource.type)) return true;
      if (resource?.classification && restriction.includes(resource.classification)) return true;
      return false;
    });

    return {
      granted: allGranted && !restricted,
      permissions: grantedPermissions,
      restricted,
      method: 'explicit'
    };
  }

  async evaluateAttributeRule(rule, requestData) {
    try {
      const { condition, weight = 1.0 } = rule;
      const { subject, action, resource, context, attributes } = requestData;

      // Evaluate condition based on rule type
      let score = 0;

      switch (rule.type) {
        case 'subject_attribute':
          score = this.evaluateSubjectAttribute(condition, subject, attributes);
          break;
        
        case 'resource_attribute':
          score = this.evaluateResourceAttribute(condition, resource);
          break;
        
        case 'context_attribute':
          score = this.evaluateContextAttribute(condition, context);
          break;
        
        case 'time_based':
          score = this.evaluateTimeCondition(condition, context);
          break;
        
        case 'location_based':
          score = this.evaluateLocationCondition(condition, context);
          break;
        
        default:
          score = 0.5; // Neutral if unknown rule type
      }

      return {
        ruleId: rule.id,
        type: rule.type,
        score,
        weight,
        passed: score >= 0.7,
        details: rule.condition
      };

    } catch (error) {
      this.logger.error('Attribute rule evaluation error:', error);
      return {
        ruleId: rule.id,
        type: rule.type,
        score: 0,
        weight: rule.weight || 1.0,
        passed: false,
        error: error.message
      };
    }
  }

  evaluateSubjectAttribute(condition, subject, attributes) {
    const { attribute, operator, value } = condition;
    const subjectValue = subject[attribute] || attributes?.[attribute];
    
    return this.compareValues(subjectValue, operator, value);
  }

  evaluateResourceAttribute(condition, resource) {
    const { attribute, operator, value } = condition;
    const resourceValue = resource[attribute];
    
    return this.compareValues(resourceValue, operator, value);
  }

  evaluateContextAttribute(condition, context) {
    const { attribute, operator, value } = condition;
    const contextValue = context[attribute];
    
    return this.compareValues(contextValue, operator, value);
  }

  compareValues(actual, operator, expected) {
    switch (operator) {
      case 'equals':
        return actual === expected ? 1.0 : 0.0;
      
      case 'not_equals':
        return actual !== expected ? 1.0 : 0.0;
      
      case 'contains':
        return actual && actual.includes && actual.includes(expected) ? 1.0 : 0.0;
      
      case 'in':
        return Array.isArray(expected) && expected.includes(actual) ? 1.0 : 0.0;
      
      case 'greater_than':
        return Number(actual) > Number(expected) ? 1.0 : 0.0;
      
      case 'less_than':
        return Number(actual) < Number(expected) ? 1.0 : 0.0;
      
      case 'exists':
        return actual !== undefined && actual !== null ? 1.0 : 0.0;
      
      default:
        return 0.5; // Neutral for unknown operators
    }
  }

  async loadDefaultRoles() {
    for (const [roleName, roleConfig] of Object.entries(this.defaultRoles)) {
      this.roles.set(roleName, {
        ...roleConfig,
        id: roleName,
        createdAt: DateTime.now().toISO()
      });
    }
    
    this.logger.info(`Loaded ${this.roles.size} default roles`);
  }

  async initializeAccessPolicies() {
    // Initialize basic access policies
    const basicPolicies = [
      {
        id: 'owner_full_access',
        name: 'Owner Full Access',
        description: 'Resource owners have full access',
        condition: {
          type: 'resource_attribute',
          attribute: 'ownerId',
          operator: 'equals',
          value: '${subject.id}'
        },
        decision: 'ALLOW'
      },
      {
        id: 'admin_override',
        name: 'Administrator Override',
        description: 'Administrators can access most resources',
        condition: {
          type: 'subject_attribute',
          attribute: 'roles',
          operator: 'contains',
          value: 'admin'
        },
        decision: 'ALLOW'
      }
    ];

    basicPolicies.forEach(policy => {
      this.policies.set(policy.id, policy);
    });

    this.logger.info(`Initialized ${this.policies.size} access policies`);
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
        roles: this.roles.size,
        permissions: this.permissions.size,
        policies: this.policies.size,
        accessModels: Object.keys(this.accessModels),
        classificationLevels: Object.keys(this.classificationLevels)
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
      this.logger.info('Shutting down Access Control Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.roles.clear();
      this.permissions.clear();
      this.policies.clear();
      this.accessMatrix.clear();

      this.logger.info('Access Control Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default AccessControlService;