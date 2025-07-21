/**
 * Feature Toggle Service
 * Advanced feature flag management with A/B testing and rollout strategies
 * Enterprise-grade feature toggle platform with targeting and analytics
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';

class FeatureToggleService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
    this.redis = null;
    this.features = new Map();
    this.tenantFeatures = new Map();
    this.experiments = new Map();
    this.rollouts = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'feature-toggle' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/feature-toggle.log' })
      ]
    });

    // Global feature definitions
    this.globalFeatures = {
      // Core Platform Features
      ADVANCED_ANALYTICS: {
        id: 'advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Enhanced analytics with custom dashboards and insights',
        category: 'analytics',
        type: 'plan_based',
        defaultValue: false,
        availableForPlans: ['BUSINESS', 'ENTERPRISE'],
        dependencies: [],
        tags: ['analytics', 'dashboards', 'insights']
      },
      CUSTOM_BRANDING: {
        id: 'custom_branding',
        name: 'Custom Branding',
        description: 'White-label branding and customization options',
        category: 'branding',
        type: 'plan_based',
        defaultValue: false,
        availableForPlans: ['BUSINESS', 'ENTERPRISE'],
        dependencies: [],
        tags: ['branding', 'customization', 'white-label']
      },
      SSO_INTEGRATION: {
        id: 'sso_integration',
        name: 'SSO Integration',
        description: 'Single Sign-On with SAML, OIDC, and OAuth2',
        category: 'authentication',
        type: 'plan_based',
        defaultValue: false,
        availableForPlans: ['BUSINESS', 'ENTERPRISE'],
        dependencies: [],
        tags: ['sso', 'authentication', 'saml', 'oidc']
      },
      API_ACCESS: {
        id: 'api_access',
        name: 'API Access',
        description: 'Full REST API access with rate limiting',
        category: 'integration',
        type: 'plan_based',
        defaultValue: false,
        availableForPlans: ['BUSINESS', 'ENTERPRISE'],
        dependencies: [],
        tags: ['api', 'integration', 'rest']
      },
      PRIORITY_SUPPORT: {
        id: 'priority_support',
        name: 'Priority Support',
        description: '24/7 priority customer support',
        category: 'support',
        type: 'plan_based',
        defaultValue: false,
        availableForPlans: ['BUSINESS', 'ENTERPRISE'],
        dependencies: [],
        tags: ['support', 'priority', '24/7']
      },
      
      // Experimental Features
      AI_RECOMMENDATIONS: {
        id: 'ai_recommendations',
        name: 'AI Recommendations',
        description: 'AI-powered usage recommendations and insights',
        category: 'ai',
        type: 'experimental',
        defaultValue: false,
        rolloutStrategy: 'gradual',
        rolloutPercentage: 10,
        tags: ['ai', 'recommendations', 'beta']
      },
      VOICE_COMMANDS: {
        id: 'voice_commands',
        name: 'Voice Commands',
        description: 'Voice-activated interface controls',
        category: 'interface',
        type: 'experimental',
        defaultValue: false,
        rolloutStrategy: 'opt_in',
        tags: ['voice', 'interface', 'experimental']
      },
      DARK_MODE: {
        id: 'dark_mode',
        name: 'Dark Mode',
        description: 'Dark theme interface option',
        category: 'interface',
        type: 'general',
        defaultValue: true,
        rolloutStrategy: 'enabled',
        tags: ['theme', 'interface', 'accessibility']
      },
      
      // Advanced Features
      MULTI_REGION_DEPLOYMENT: {
        id: 'multi_region_deployment',
        name: 'Multi-Region Deployment',
        description: 'Deploy across multiple geographical regions',
        category: 'infrastructure',
        type: 'enterprise',
        defaultValue: false,
        availableForPlans: ['ENTERPRISE'],
        dependencies: ['custom_branding'],
        tags: ['infrastructure', 'regions', 'enterprise']
      },
      COMPLIANCE_AUTOMATION: {
        id: 'compliance_automation',
        name: 'Compliance Automation',
        description: 'Automated compliance monitoring and reporting',
        category: 'compliance',
        type: 'enterprise',
        defaultValue: false,
        availableForPlans: ['ENTERPRISE'],
        dependencies: ['advanced_analytics'],
        tags: ['compliance', 'automation', 'reporting']
      },
      CUSTOM_INTEGRATIONS: {
        id: 'custom_integrations',
        name: 'Custom Integrations',
        description: 'Build custom integrations with third-party systems',
        category: 'integration',
        type: 'enterprise',
        defaultValue: false,
        availableForPlans: ['ENTERPRISE'],
        dependencies: ['api_access'],
        tags: ['integration', 'custom', 'enterprise']
      }
    };

    // Feature flag strategies
    this.flagStrategies = {
      ENABLED: {
        name: 'Always Enabled',
        description: 'Feature is always enabled for all users',
        evaluate: () => true
      },
      DISABLED: {
        name: 'Always Disabled',
        description: 'Feature is always disabled for all users',
        evaluate: () => false
      },
      PLAN_BASED: {
        name: 'Plan Based',
        description: 'Feature availability based on subscription plan',
        evaluate: (context, config) => {
          return config.availableForPlans?.includes(context.tenantPlan) || false;
        }
      },
      USER_PERCENTAGE: {
        name: 'User Percentage',
        description: 'Enable for a percentage of users',
        evaluate: (context, config) => {
          const hash = this.hashString(context.userId || context.tenantId);
          return (hash % 100) < (config.percentage || 0);
        }
      },
      TENANT_PERCENTAGE: {
        name: 'Tenant Percentage',
        description: 'Enable for a percentage of tenants',
        evaluate: (context, config) => {
          const hash = this.hashString(context.tenantId);
          return (hash % 100) < (config.percentage || 0);
        }
      },
      WHITELIST: {
        name: 'Whitelist',
        description: 'Enable for specific users or tenants',
        evaluate: (context, config) => {
          return config.whitelist?.includes(context.userId) || 
                 config.whitelist?.includes(context.tenantId) || false;
        }
      },
      GRADUAL_ROLLOUT: {
        name: 'Gradual Rollout',
        description: 'Gradually increase rollout percentage over time',
        evaluate: (context, config) => {
          const now = DateTime.now();
          const startDate = DateTime.fromISO(config.startDate);
          const endDate = DateTime.fromISO(config.endDate);
          
          if (now < startDate) return false;
          if (now > endDate) return true;
          
          const elapsed = now.diff(startDate).as('milliseconds');
          const total = endDate.diff(startDate).as('milliseconds');
          const progressPercentage = (elapsed / total) * 100;
          
          const hash = this.hashString(context.tenantId);
          return (hash % 100) < progressPercentage;
        }
      }
    };

    // A/B testing framework
    this.experimentTypes = {
      SIMPLE_TOGGLE: {
        name: 'Simple Toggle',
        description: 'Basic on/off experiment',
        variants: ['control', 'treatment']
      },
      MULTIVARIATE: {
        name: 'Multivariate',
        description: 'Multiple variant testing',
        variants: ['control', 'variant_a', 'variant_b', 'variant_c']
      },
      FEATURE_FLAG: {
        name: 'Feature Flag',
        description: 'Feature flag experiment',
        variants: ['disabled', 'enabled']
      }
    };

    // Targeting criteria
    this.targetingCriteria = {
      TENANT_PLAN: {
        name: 'Tenant Plan',
        operator: ['equals', 'in', 'not_in'],
        values: ['STARTUP', 'BUSINESS', 'ENTERPRISE']
      },
      TENANT_REGION: {
        name: 'Tenant Region',
        operator: ['equals', 'in'],
        values: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1']
      },
      USER_ROLE: {
        name: 'User Role',
        operator: ['equals', 'in'],
        values: ['admin', 'user', 'viewer']
      },
      TENANT_SIZE: {
        name: 'Tenant Size',
        operator: ['greater_than', 'less_than', 'between'],
        values: 'numeric'
      },
      CREATION_DATE: {
        name: 'Account Creation Date',
        operator: ['before', 'after', 'between'],
        values: 'date'
      }
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Feature Toggle Service...');

      // Initialize Redis for distributed feature management
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for feature toggles');
      }

      // Load global features
      await this.loadGlobalFeatures();

      // Initialize feature evaluation engine
      await this.initializeEvaluationEngine();

      // Setup experiment tracking
      await this.setupExperimentTracking();

      // Initialize rollout management
      await this.initializeRolloutManagement();

      this.logger.info('Feature Toggle Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Feature Toggle Service:', error);
      throw error;
    }
  }

  async getTenantFeatures(params, body, query, req) {
    try {
      const { tenantId } = params;
      const { 
        category,
        includeExperiments = false,
        evaluationContext = {} 
      } = query;

      this.logger.info(`Getting features for tenant: ${tenantId}`, {
        category,
        includeExperiments
      });

      // Build evaluation context
      const context = {
        tenantId,
        userId: req.user?.id,
        userRole: req.user?.role,
        tenantPlan: req.tenant?.type,
        tenantRegion: req.tenant?.region,
        ...evaluationContext
      };

      // Get all features
      let features = Object.values(this.globalFeatures);

      // Filter by category if specified
      if (category) {
        features = features.filter(feature => feature.category === category);
      }

      // Evaluate features for tenant
      const evaluatedFeatures = {};
      for (const feature of features) {
        const isEnabled = await this.evaluateFeature(feature.id, context);
        const featureData = {
          id: feature.id,
          name: feature.name,
          description: feature.description,
          category: feature.category,
          enabled: isEnabled,
          type: feature.type,
          tags: feature.tags
        };

        // Add experiment data if enabled and participating
        if (includeExperiments) {
          const experimentData = await this.getFeatureExperimentData(feature.id, context);
          if (experimentData) {
            featureData.experiment = experimentData;
          }
        }

        evaluatedFeatures[feature.id] = featureData;
      }

      // Get tenant-specific overrides
      const tenantOverrides = await this.getTenantFeatureOverrides(tenantId);

      return {
        tenantId,
        features: evaluatedFeatures,
        overrides: tenantOverrides,
        evaluatedAt: DateTime.now().toISO(),
        context: {
          tenantPlan: context.tenantPlan,
          tenantRegion: context.tenantRegion,
          userRole: context.userRole
        }
      };

    } catch (error) {
      this.logger.error('Error getting tenant features:', error);
      throw error;
    }
  }

  async toggleFeature(params, toggleData, query, req) {
    try {
      const { tenantId } = params;
      const {
        featureId,
        enabled,
        reason,
        duration,
        metadata = {}
      } = toggleData;

      this.logger.info(`Toggling feature for tenant: ${tenantId}`, {
        featureId,
        enabled,
        duration
      });

      // Validate feature exists
      const feature = this.globalFeatures[featureId.toUpperCase()];
      if (!feature) {
        throw new Error(`Feature not found: ${featureId}`);
      }

      // Check if tenant can toggle this feature
      const canToggle = await this.validateFeatureToggle(tenantId, feature, enabled);
      if (!canToggle.allowed) {
        throw new Error(`Cannot toggle feature: ${canToggle.reason}`);
      }

      // Create toggle record
      const toggleId = crypto.randomUUID();
      const toggle = {
        id: toggleId,
        tenantId,
        featureId,
        enabled,
        reason: reason || 'Manual toggle',
        
        // Timing
        createdAt: DateTime.now().toISO(),
        expiresAt: duration ? DateTime.now().plus({ seconds: duration }).toISO() : null,
        
        // Metadata
        metadata: {
          ...metadata,
          toggledBy: req.user?.id || 'system',
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      };

      // Store tenant override
      const tenantKey = `tenant_features:${tenantId}`;
      let tenantFeatures = this.cache.get(tenantKey) || {};
      tenantFeatures[featureId] = toggle;
      
      this.cache.set(tenantKey, tenantFeatures, 3600);
      this.tenantFeatures.set(tenantId, tenantFeatures);

      // Store in Redis
      if (this.redis) {
        await this.redis.setex(tenantKey, 3600, JSON.stringify(tenantFeatures));
      }

      // Track toggle event
      await this.trackFeatureToggleEvent(toggle);

      // Schedule expiration if duration specified
      if (duration) {
        await this.scheduleToggleExpiration(toggle);
      }

      this.logger.info(`Feature toggled successfully`, {
        toggleId,
        tenantId,
        featureId,
        enabled
      });

      return {
        toggleId,
        tenantId,
        featureId,
        enabled,
        createdAt: toggle.createdAt,
        expiresAt: toggle.expiresAt,
        reason: toggle.reason
      };

    } catch (error) {
      this.logger.error('Error toggling feature:', error);
      throw error;
    }
  }

  async updateFeatureFlags(params, flagData, query, req) {
    try {
      const { tenantId } = params;
      const { flags, reason, metadata = {} } = flagData;

      this.logger.info(`Updating feature flags for tenant: ${tenantId}`, {
        flagCount: Object.keys(flags).length
      });

      const updateId = crypto.randomUUID();
      const results = [];

      // Validate all flags first
      for (const [featureId, enabled] of Object.entries(flags)) {
        const feature = this.globalFeatures[featureId.toUpperCase()];
        if (!feature) {
          throw new Error(`Feature not found: ${featureId}`);
        }

        const canToggle = await this.validateFeatureToggle(tenantId, feature, enabled);
        if (!canToggle.allowed) {
          throw new Error(`Cannot toggle feature ${featureId}: ${canToggle.reason}`);
        }
      }

      // Apply all flag updates
      const tenantKey = `tenant_features:${tenantId}`;
      let tenantFeatures = this.cache.get(tenantKey) || {};

      for (const [featureId, enabled] of Object.entries(flags)) {
        const toggle = {
          id: crypto.randomUUID(),
          tenantId,
          featureId,
          enabled,
          reason: reason || 'Bulk flag update',
          createdAt: DateTime.now().toISO(),
          metadata: {
            ...metadata,
            updateId,
            updatedBy: req.user?.id || 'system'
          }
        };

        tenantFeatures[featureId] = toggle;
        results.push({
          featureId,
          enabled,
          toggleId: toggle.id
        });

        // Track individual toggle event
        await this.trackFeatureToggleEvent(toggle);
      }

      // Update stores
      this.cache.set(tenantKey, tenantFeatures, 3600);
      this.tenantFeatures.set(tenantId, tenantFeatures);

      if (this.redis) {
        await this.redis.setex(tenantKey, 3600, JSON.stringify(tenantFeatures));
      }

      this.logger.info(`Feature flags updated successfully`, {
        updateId,
        tenantId,
        flagsUpdated: results.length
      });

      return {
        updateId,
        tenantId,
        updatedAt: DateTime.now().toISO(),
        flags: results,
        totalUpdated: results.length
      };

    } catch (error) {
      this.logger.error('Error updating feature flags:', error);
      throw error;
    }
  }

  async getGlobalFeatures(params, body, query, req) {
    try {
      const { 
        category,
        type,
        includeExperiments = false,
        includeMetrics = false 
      } = query;

      this.logger.info('Getting global features', { category, type });

      let features = Object.values(this.globalFeatures);

      // Apply filters
      if (category) {
        features = features.filter(feature => feature.category === category);
      }

      if (type) {
        features = features.filter(feature => feature.type === type);
      }

      // Process features
      const processedFeatures = await Promise.all(
        features.map(async (feature) => {
          const processed = {
            id: feature.id,
            name: feature.name,
            description: feature.description,
            category: feature.category,
            type: feature.type,
            defaultValue: feature.defaultValue,
            tags: feature.tags,
            dependencies: feature.dependencies
          };

          // Add plan availability if plan-based
          if (feature.type === 'plan_based') {
            processed.availableForPlans = feature.availableForPlans;
          }

          // Add rollout information if applicable
          if (feature.rolloutStrategy) {
            processed.rollout = {
              strategy: feature.rolloutStrategy,
              percentage: feature.rolloutPercentage
            };
          }

          // Include experiment data if requested
          if (includeExperiments) {
            processed.experiments = await this.getFeatureExperiments(feature.id);
          }

          // Include metrics if requested
          if (includeMetrics) {
            processed.metrics = await this.getFeatureMetrics(feature.id);
          }

          return processed;
        })
      );

      return {
        features: processedFeatures,
        totalFeatures: processedFeatures.length,
        categories: [...new Set(features.map(f => f.category))],
        types: [...new Set(features.map(f => f.type))]
      };

    } catch (error) {
      this.logger.error('Error getting global features:', error);
      throw error;
    }
  }

  // Core evaluation methods
  async evaluateFeature(featureId, context) {
    try {
      const feature = this.globalFeatures[featureId.toUpperCase()];
      if (!feature) {
        return false;
      }

      // Check tenant-specific override first
      const tenantOverride = await this.getTenantFeatureOverride(context.tenantId, featureId);
      if (tenantOverride) {
        // Check if override has expired
        if (tenantOverride.expiresAt && DateTime.now() > DateTime.fromISO(tenantOverride.expiresAt)) {
          await this.removeExpiredOverride(context.tenantId, featureId);
        } else {
          return tenantOverride.enabled;
        }
      }

      // Check if feature is in experiment
      const experimentResult = await this.evaluateFeatureExperiment(featureId, context);
      if (experimentResult !== null) {
        return experimentResult;
      }

      // Evaluate based on feature type and strategy
      return this.evaluateFeatureStrategy(feature, context);

    } catch (error) {
      this.logger.error('Error evaluating feature:', error);
      return feature?.defaultValue || false;
    }
  }

  evaluateFeatureStrategy(feature, context) {
    switch (feature.type) {
      case 'plan_based':
        return this.flagStrategies.PLAN_BASED.evaluate(context, feature);
      
      case 'experimental':
        if (feature.rolloutStrategy === 'gradual') {
          return this.flagStrategies.TENANT_PERCENTAGE.evaluate(context, {
            percentage: feature.rolloutPercentage || 0
          });
        } else if (feature.rolloutStrategy === 'opt_in') {
          return false; // Requires explicit opt-in
        }
        return feature.defaultValue;
      
      case 'general':
        if (feature.rolloutStrategy === 'enabled') {
          return true;
        }
        return feature.defaultValue;
      
      case 'enterprise':
        return this.flagStrategies.PLAN_BASED.evaluate(context, feature);
      
      default:
        return feature.defaultValue;
    }
  }

  // Helper methods
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async validateFeatureToggle(tenantId, feature, enabled) {
    // Check plan restrictions
    if (feature.type === 'plan_based' || feature.type === 'enterprise') {
      // In a real implementation, get tenant plan from tenant service
      const tenantPlan = 'BUSINESS'; // Mock
      
      if (!feature.availableForPlans?.includes(tenantPlan)) {
        return {
          allowed: false,
          reason: `Feature not available for ${tenantPlan} plan`
        };
      }
    }

    // Check dependencies
    if (enabled && feature.dependencies?.length > 0) {
      for (const depFeatureId of feature.dependencies) {
        const depEnabled = await this.evaluateFeature(depFeatureId, { tenantId });
        if (!depEnabled) {
          return {
            allowed: false,
            reason: `Dependency ${depFeatureId} must be enabled first`
          };
        }
      }
    }

    return { allowed: true };
  }

  async getTenantFeatureOverride(tenantId, featureId) {
    const tenantKey = `tenant_features:${tenantId}`;
    let tenantFeatures = this.cache.get(tenantKey);
    
    if (!tenantFeatures && this.redis) {
      const data = await this.redis.get(tenantKey);
      if (data) {
        tenantFeatures = JSON.parse(data);
        this.cache.set(tenantKey, tenantFeatures, 3600);
      }
    }

    return tenantFeatures?.[featureId] || null;
  }

  async getTenantFeatureOverrides(tenantId) {
    const tenantKey = `tenant_features:${tenantId}`;
    return this.cache.get(tenantKey) || {};
  }

  async trackFeatureToggleEvent(toggle) {
    // Track toggle event for analytics
    this.logger.info('Feature toggle event', {
      tenantId: toggle.tenantId,
      featureId: toggle.featureId,
      enabled: toggle.enabled,
      reason: toggle.reason
    });
  }

  async loadGlobalFeatures() {
    this.logger.info('Loading global features');
  }

  async initializeEvaluationEngine() {
    this.logger.info('Initializing evaluation engine');
  }

  async setupExperimentTracking() {
    this.logger.info('Setting up experiment tracking');
  }

  async initializeRolloutManagement() {
    this.logger.info('Initializing rollout management');
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
        features: {
          global: Object.keys(this.globalFeatures).length,
          tenantOverrides: this.tenantFeatures.size,
          experiments: this.experiments.size
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
      this.logger.info('Shutting down Feature Toggle Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.features.clear();
      this.tenantFeatures.clear();
      this.experiments.clear();
      this.rollouts.clear();

      this.logger.info('Feature Toggle Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default FeatureToggleService;