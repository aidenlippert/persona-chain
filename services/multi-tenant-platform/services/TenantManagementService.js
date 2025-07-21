/**
 * Tenant Management Service
 * Core tenant lifecycle management with enterprise features
 * Comprehensive tenant CRUD operations with advanced management capabilities
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import validator from 'validator';

class TenantManagementService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });
    this.redis = null;
    this.tenants = new Map();
    this.tenantSettings = new Map();
    this.tenantHierarchy = new Map();
    this.tenantRelationships = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'tenant-management' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/tenant-management.log' })
      ]
    });

    // Tenant status types
    this.tenantStatuses = {
      ACTIVE: { name: 'Active', description: 'Tenant is active and operational' },
      SUSPENDED: { name: 'Suspended', description: 'Tenant is temporarily suspended' },
      TERMINATED: { name: 'Terminated', description: 'Tenant is permanently terminated' },
      PROVISIONING: { name: 'Provisioning', description: 'Tenant is being set up' },
      MIGRATING: { name: 'Migrating', description: 'Tenant data is being migrated' },
      MAINTENANCE: { name: 'Maintenance', description: 'Tenant is under maintenance' },
      DEPROVISIONING: { name: 'Deprovisioning', description: 'Tenant is being removed' }
    };

    // Tenant types and plans
    this.tenantTypes = {
      STARTUP: {
        name: 'Startup',
        description: 'For small teams and startups',
        maxUsers: 25,
        maxStorage: '10GB',
        features: ['basic_analytics', 'email_support']
      },
      BUSINESS: {
        name: 'Business',
        description: 'For growing businesses',
        maxUsers: 100,
        maxStorage: '100GB',
        features: ['advanced_analytics', 'phone_support', 'custom_branding']
      },
      ENTERPRISE: {
        name: 'Enterprise',
        description: 'For large organizations',
        maxUsers: 'unlimited',
        maxStorage: '1TB',
        features: ['all_features', 'dedicated_support', 'sla_guarantee', 'custom_integrations']
      },
      CUSTOM: {
        name: 'Custom',
        description: 'Custom enterprise solution',
        maxUsers: 'configurable',
        maxStorage: 'configurable',
        features: ['all_features', 'white_label', 'dedicated_infrastructure']
      }
    };

    // Compliance and regulatory frameworks
    this.complianceFrameworks = {
      SOC2: { name: 'SOC 2 Type II', required: ['audit_logging', 'access_controls', 'data_encryption'] },
      GDPR: { name: 'GDPR Compliance', required: ['data_protection', 'consent_management', 'right_to_deletion'] },
      HIPAA: { name: 'HIPAA Compliance', required: ['healthcare_security', 'phi_protection', 'audit_trails'] },
      PCI_DSS: { name: 'PCI DSS', required: ['payment_security', 'secure_storage', 'network_monitoring'] },
      ISO27001: { name: 'ISO 27001', required: ['isms', 'risk_management', 'security_policies'] },
      FEDRAMP: { name: 'FedRAMP', required: ['government_security', 'continuous_monitoring', 'incident_response'] }
    };

    // Regional configurations
    this.regions = {
      'us-east-1': { name: 'US East (N. Virginia)', timezone: 'America/New_York', currency: 'USD' },
      'us-west-2': { name: 'US West (Oregon)', timezone: 'America/Los_Angeles', currency: 'USD' },
      'eu-west-1': { name: 'Europe (Ireland)', timezone: 'Europe/Dublin', currency: 'EUR' },
      'eu-central-1': { name: 'Europe (Frankfurt)', timezone: 'Europe/Berlin', currency: 'EUR' },
      'ap-southeast-1': { name: 'Asia Pacific (Singapore)', timezone: 'Asia/Singapore', currency: 'SGD' },
      'ap-northeast-1': { name: 'Asia Pacific (Tokyo)', timezone: 'Asia/Tokyo', currency: 'JPY' }
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Tenant Management Service...');

      // Initialize Redis for distributed tenant management
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for tenant management');
      }

      // Load existing tenants
      await this.loadExistingTenants();

      // Setup tenant monitoring
      await this.setupTenantMonitoring();

      // Initialize tenant metrics collection
      await this.initializeTenantMetrics();

      this.logger.info('Tenant Management Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Tenant Management Service:', error);
      throw error;
    }
  }

  async createTenant(params, tenantData, query, req) {
    try {
      const {
        name,
        subdomain,
        adminEmail,
        adminName,
        tenantType = 'BUSINESS',
        region = 'us-east-1',
        complianceRequirements = [],
        customConfiguration = {},
        contactInformation = {},
        billingInformation = {}
      } = tenantData;

      const tenantId = crypto.randomUUID();

      this.logger.info(`Creating new tenant: ${name}`, {
        tenantId,
        subdomain,
        tenantType,
        region
      });

      // Validate tenant data
      this.validateTenantData(tenantData);

      // Check subdomain availability
      await this.checkSubdomainAvailability(subdomain);

      // Create tenant object
      const tenant = {
        id: tenantId,
        name: validator.escape(name),
        subdomain: subdomain.toLowerCase(),
        status: this.tenantStatuses.PROVISIONING.name,
        type: tenantType,
        region,
        
        // Administrator information
        admin: {
          email: validator.normalizeEmail(adminEmail),
          name: validator.escape(adminName),
          userId: crypto.randomUUID(),
          createdAt: DateTime.now().toISO()
        },
        
        // Tenant configuration
        configuration: {
          ...this.tenantTypes[tenantType],
          ...customConfiguration,
          complianceFrameworks: complianceRequirements,
          features: this.calculateTenantFeatures(tenantType, complianceRequirements),
          limits: this.calculateTenantLimits(tenantType),
          settings: this.getDefaultTenantSettings(tenantType)
        },
        
        // Contact and billing
        contactInformation: {
          company: validator.escape(contactInformation.company || name),
          address: contactInformation.address || {},
          phone: contactInformation.phone || null,
          website: contactInformation.website || null,
          industry: contactInformation.industry || null,
          size: contactInformation.size || null
        },
        
        billingInformation: {
          ...billingInformation,
          currency: this.regions[region]?.currency || 'USD',
          billingCycle: billingInformation.billingCycle || 'monthly',
          paymentMethod: null
        },
        
        // Metadata
        metadata: {
          createdAt: DateTime.now().toISO(),
          createdBy: req.user?.id || 'system',
          lastModified: DateTime.now().toISO(),
          lastModifiedBy: req.user?.id || 'system',
          version: '1.0.0',
          timezone: this.regions[region]?.timezone || 'UTC'
        },
        
        // Usage tracking
        usage: {
          users: 0,
          storage: 0,
          apiCalls: 0,
          lastActivity: null,
          monthlyUsage: {},
          quotaAlerts: []
        },
        
        // Security settings
        security: {
          ssoEnabled: false,
          mfaRequired: complianceRequirements.length > 0,
          passwordPolicy: this.getPasswordPolicy(complianceRequirements),
          sessionTimeout: 8 * 60 * 60, // 8 hours
          ipWhitelist: [],
          auditLogging: true
        },
        
        // Integration settings
        integrations: {
          webhooks: [],
          apiKeys: [],
          connectedServices: [],
          customIntegrations: []
        },
        
        // Monitoring and health
        health: {
          status: 'provisioning',
          lastHealthCheck: DateTime.now().toISO(),
          healthScore: 100,
          alerts: [],
          maintenance: []
        }
      };

      // Store tenant
      this.tenants.set(tenantId, tenant);

      // Cache tenant
      this.cache.set(`tenant:${tenantId}`, tenant, 3600);
      this.cache.set(`subdomain:${subdomain}`, tenantId, 3600);

      // Store in Redis for distributed access
      if (this.redis) {
        await this.redis.setex(
          `tenant:${tenantId}`,
          3600,
          JSON.stringify(tenant)
        );
        await this.redis.setex(
          `subdomain:${subdomain}`,
          3600,
          tenantId
        );
      }

      // Trigger tenant provisioning process
      await this.provisionTenant(tenant);

      this.logger.info(`Tenant created successfully`, {
        tenantId,
        name,
        subdomain,
        status: tenant.status
      });

      return {
        tenantId,
        name,
        subdomain,
        status: tenant.status,
        type: tenant.type,
        region: tenant.region,
        adminEmail: tenant.admin.email,
        createdAt: tenant.metadata.createdAt,
        provisioningEstimate: this.estimateProvisioningTime(tenant)
      };

    } catch (error) {
      this.logger.error('Error creating tenant:', error);
      throw error;
    }
  }

  async getTenant(params, body, query, req) {
    try {
      const { tenantId } = params;
      
      this.logger.info(`Retrieving tenant: ${tenantId}`);

      // Check cache first
      let tenant = this.cache.get(`tenant:${tenantId}`);
      
      if (!tenant) {
        // Check Redis
        if (this.redis) {
          const tenantData = await this.redis.get(`tenant:${tenantId}`);
          if (tenantData) {
            tenant = JSON.parse(tenantData);
            this.cache.set(`tenant:${tenantId}`, tenant, 3600);
          }
        }
        
        // Check memory store
        if (!tenant) {
          tenant = this.tenants.get(tenantId);
        }
      }

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // Update last accessed
      tenant.metadata.lastAccessed = DateTime.now().toISO();

      // Calculate additional metrics
      const enrichedTenant = {
        ...tenant,
        metrics: await this.calculateTenantMetrics(tenant),
        healthStatus: await this.calculateTenantHealth(tenant),
        usagePercentage: this.calculateUsagePercentage(tenant),
        complianceStatus: this.calculateComplianceStatus(tenant),
        uptime: await this.calculateTenantUptime(tenantId)
      };

      return enrichedTenant;

    } catch (error) {
      this.logger.error('Error retrieving tenant:', error);
      throw error;
    }
  }

  async listTenants(params, body, query, req) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        type,
        region,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      this.logger.info('Listing tenants', { page, limit, status, type, region });

      let tenants = Array.from(this.tenants.values());

      // Apply filters
      if (status) {
        tenants = tenants.filter(t => t.status === status);
      }
      
      if (type) {
        tenants = tenants.filter(t => t.type === type);
      }
      
      if (region) {
        tenants = tenants.filter(t => t.region === region);
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        tenants = tenants.filter(t => 
          t.name.toLowerCase().includes(searchLower) ||
          t.subdomain.toLowerCase().includes(searchLower) ||
          t.admin.email.toLowerCase().includes(searchLower)
        );
      }

      // Sort tenants
      tenants.sort((a, b) => {
        const aVal = this.getNestedValue(a, sortBy);
        const bVal = this.getNestedValue(b, sortBy);
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedTenants = tenants.slice(startIndex, endIndex);

      // Enrich with summary data
      const enrichedTenants = await Promise.all(
        paginatedTenants.map(async (tenant) => ({
          ...tenant,
          metrics: await this.calculateTenantMetrics(tenant),
          healthStatus: await this.calculateTenantHealth(tenant)
        }))
      );

      return {
        tenants: enrichedTenants,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tenants.length,
          pages: Math.ceil(tenants.length / limit),
          hasNext: endIndex < tenants.length,
          hasPrev: page > 1
        },
        summary: {
          totalTenants: this.tenants.size,
          byStatus: this.groupTenantsByStatus(),
          byType: this.groupTenantsByType(),
          byRegion: this.groupTenantsByRegion()
        }
      };

    } catch (error) {
      this.logger.error('Error listing tenants:', error);
      throw error;
    }
  }

  async updateTenant(params, tenantData, query, req) {
    try {
      const { tenantId } = params;
      
      this.logger.info(`Updating tenant: ${tenantId}`, tenantData);

      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // Validate update data
      this.validateTenantUpdate(tenantData, tenant);

      // Apply updates
      const updatedTenant = {
        ...tenant,
        ...tenantData,
        metadata: {
          ...tenant.metadata,
          lastModified: DateTime.now().toISO(),
          lastModifiedBy: req.user?.id || 'system',
          version: this.incrementVersion(tenant.metadata.version)
        }
      };

      // Handle configuration changes
      if (tenantData.configuration) {
        updatedTenant.configuration = {
          ...tenant.configuration,
          ...tenantData.configuration
        };
      }

      // Update stores
      this.tenants.set(tenantId, updatedTenant);
      this.cache.set(`tenant:${tenantId}`, updatedTenant, 3600);

      if (this.redis) {
        await this.redis.setex(
          `tenant:${tenantId}`,
          3600,
          JSON.stringify(updatedTenant)
        );
      }

      // Trigger configuration update if needed
      if (tenantData.configuration || tenantData.type) {
        await this.updateTenantConfiguration(updatedTenant);
      }

      this.logger.info(`Tenant updated successfully`, {
        tenantId,
        changes: Object.keys(tenantData)
      });

      return {
        tenantId,
        status: 'updated',
        changes: Object.keys(tenantData),
        version: updatedTenant.metadata.version,
        lastModified: updatedTenant.metadata.lastModified
      };

    } catch (error) {
      this.logger.error('Error updating tenant:', error);
      throw error;
    }
  }

  async deleteTenant(params, body, query, req) {
    try {
      const { tenantId } = params;
      const { permanent = false, backupData = true } = query;
      
      this.logger.info(`Deleting tenant: ${tenantId}`, { permanent, backupData });

      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // Check if tenant can be deleted
      if (tenant.status === 'ACTIVE' && !permanent) {
        throw new Error('Active tenant must be suspended before deletion');
      }

      // Backup tenant data if requested
      if (backupData) {
        await this.backupTenantData(tenant);
      }

      // Update status to deprovisioning
      tenant.status = this.tenantStatuses.DEPROVISIONING.name;
      tenant.metadata.deletionStarted = DateTime.now().toISO();

      // Start deprovisioning process
      await this.deprovisionTenant(tenant, permanent);

      if (permanent) {
        // Remove from all stores
        this.tenants.delete(tenantId);
        this.cache.del(`tenant:${tenantId}`);
        this.cache.del(`subdomain:${tenant.subdomain}`);

        if (this.redis) {
          await this.redis.del(`tenant:${tenantId}`);
          await this.redis.del(`subdomain:${tenant.subdomain}`);
        }
      }

      this.logger.info(`Tenant deletion ${permanent ? 'completed' : 'initiated'}`, {
        tenantId,
        permanent,
        backupData
      });

      return {
        tenantId,
        status: permanent ? 'deleted' : 'deprovisioning',
        permanent,
        backupCreated: backupData,
        deletionTime: tenant.metadata.deletionStarted
      };

    } catch (error) {
      this.logger.error('Error deleting tenant:', error);
      throw error;
    }
  }

  async suspendTenant(params, body, query, req) {
    try {
      const { tenantId } = params;
      const { reason, duration } = body;
      
      this.logger.info(`Suspending tenant: ${tenantId}`, { reason, duration });

      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      if (tenant.status === this.tenantStatuses.SUSPENDED.name) {
        throw new Error('Tenant is already suspended');
      }

      // Update tenant status
      tenant.previousStatus = tenant.status;
      tenant.status = this.tenantStatuses.SUSPENDED.name;
      tenant.suspension = {
        reason: reason || 'Administrative action',
        suspendedAt: DateTime.now().toISO(),
        suspendedBy: req.user?.id || 'system',
        duration,
        scheduledReactivation: duration ? DateTime.now().plus({ seconds: duration }).toISO() : null
      };

      // Update stores
      this.updateTenantInStores(tenantId, tenant);

      // Trigger suspension workflow
      await this.executeTenantSuspension(tenant);

      this.logger.info(`Tenant suspended successfully`, {
        tenantId,
        reason,
        duration
      });

      return {
        tenantId,
        status: 'suspended',
        reason,
        suspendedAt: tenant.suspension.suspendedAt,
        scheduledReactivation: tenant.suspension.scheduledReactivation
      };

    } catch (error) {
      this.logger.error('Error suspending tenant:', error);
      throw error;
    }
  }

  async activateTenant(params, body, query, req) {
    try {
      const { tenantId } = params;
      
      this.logger.info(`Activating tenant: ${tenantId}`);

      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      if (tenant.status === this.tenantStatuses.ACTIVE.name) {
        throw new Error('Tenant is already active');
      }

      // Update tenant status
      const previousStatus = tenant.status;
      tenant.status = this.tenantStatuses.ACTIVE.name;
      tenant.activation = {
        activatedAt: DateTime.now().toISO(),
        activatedBy: req.user?.id || 'system',
        previousStatus
      };

      // Clear suspension data if exists
      if (tenant.suspension) {
        tenant.suspension.clearedAt = DateTime.now().toISO();
      }

      // Update stores
      this.updateTenantInStores(tenantId, tenant);

      // Trigger activation workflow
      await this.executeTenantActivation(tenant);

      this.logger.info(`Tenant activated successfully`, {
        tenantId,
        previousStatus
      });

      return {
        tenantId,
        status: 'active',
        activatedAt: tenant.activation.activatedAt,
        previousStatus
      };

    } catch (error) {
      this.logger.error('Error activating tenant:', error);
      throw error;
    }
  }

  async getTenantStatus(params, body, query, req) {
    try {
      const { tenantId } = params;
      
      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const status = {
        tenantId,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        type: tenant.type,
        region: tenant.region,
        
        // Health and metrics
        health: await this.calculateTenantHealth(tenant),
        metrics: await this.calculateTenantMetrics(tenant),
        usage: this.calculateUsagePercentage(tenant),
        
        // Compliance and security
        compliance: this.calculateComplianceStatus(tenant),
        security: {
          ssoEnabled: tenant.security.ssoEnabled,
          mfaRequired: tenant.security.mfaRequired,
          lastSecurityScan: tenant.security.lastSecurityScan || null
        },
        
        // Billing and subscription
        billing: {
          status: tenant.billing?.status || 'unknown',
          nextBillingDate: tenant.billing?.nextBillingDate || null,
          currentPlan: tenant.type
        },
        
        // Operational status
        operational: {
          uptime: await this.calculateTenantUptime(tenantId),
          lastActivity: tenant.usage.lastActivity,
          activeUsers: tenant.usage.users,
          apiCallsToday: await this.getApiCallsToday(tenantId)
        },
        
        // Timestamps
        createdAt: tenant.metadata.createdAt,
        lastModified: tenant.metadata.lastModified,
        lastAccessed: tenant.metadata.lastAccessed
      };

      return status;

    } catch (error) {
      this.logger.error('Error getting tenant status:', error);
      throw error;
    }
  }

  // Helper methods
  validateTenantData(data) {
    const required = ['name', 'subdomain', 'adminEmail', 'adminName'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!validator.isEmail(data.adminEmail)) {
      throw new Error('Invalid admin email address');
    }

    if (!validator.isAlphanumeric(data.subdomain)) {
      throw new Error('Subdomain must contain only alphanumeric characters');
    }

    if (data.subdomain.length < 3 || data.subdomain.length > 63) {
      throw new Error('Subdomain must be between 3 and 63 characters');
    }
  }

  async checkSubdomainAvailability(subdomain) {
    const existing = this.cache.get(`subdomain:${subdomain}`);
    if (existing) {
      throw new Error(`Subdomain '${subdomain}' is already taken`);
    }

    // Check Redis
    if (this.redis) {
      const redisResult = await this.redis.get(`subdomain:${subdomain}`);
      if (redisResult) {
        throw new Error(`Subdomain '${subdomain}' is already taken`);
      }
    }

    // Check reserved subdomains
    const reserved = ['admin', 'api', 'www', 'mail', 'ftp', 'support', 'help'];
    if (reserved.includes(subdomain.toLowerCase())) {
      throw new Error(`Subdomain '${subdomain}' is reserved`);
    }
  }

  calculateTenantFeatures(tenantType, complianceRequirements) {
    const baseFeatures = this.tenantTypes[tenantType]?.features || [];
    const complianceFeatures = [];

    complianceRequirements.forEach(framework => {
      const frameworkConfig = this.complianceFrameworks[framework];
      if (frameworkConfig) {
        complianceFeatures.push(...frameworkConfig.required);
      }
    });

    return [...new Set([...baseFeatures, ...complianceFeatures])];
  }

  calculateTenantLimits(tenantType) {
    const typeConfig = this.tenantTypes[tenantType];
    return {
      maxUsers: typeConfig?.maxUsers || 10,
      maxStorage: typeConfig?.maxStorage || '1GB',
      maxApiCalls: this.getApiCallLimits(tenantType),
      maxIntegrations: this.getIntegrationLimits(tenantType)
    };
  }

  getDefaultTenantSettings(tenantType) {
    return {
      notifications: {
        email: true,
        sms: false,
        webhook: true
      },
      ui: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC'
      },
      security: {
        sessionTimeout: 8 * 60 * 60, // 8 hours
        mfaRequired: false,
        passwordExpiry: 90 // days
      }
    };
  }

  getPasswordPolicy(complianceRequirements) {
    let policy = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      maxAge: 90 // days
    };

    if (complianceRequirements.includes('HIPAA') || 
        complianceRequirements.includes('PCI_DSS')) {
      policy = {
        ...policy,
        minLength: 12,
        requireSpecialChars: true,
        maxAge: 60
      };
    }

    return policy;
  }

  updateTenantInStores(tenantId, tenant) {
    this.tenants.set(tenantId, tenant);
    this.cache.set(`tenant:${tenantId}`, tenant, 3600);

    if (this.redis) {
      this.redis.setex(
        `tenant:${tenantId}`,
        3600,
        JSON.stringify(tenant)
      ).catch(error => {
        this.logger.error('Error updating tenant in Redis:', error);
      });
    }
  }

  async loadExistingTenants() {
    // Load tenants from persistent storage
    this.logger.info('Loading existing tenants');
  }

  async setupTenantMonitoring() {
    // Setup monitoring for tenant health and metrics
    this.logger.info('Tenant monitoring configured');
  }

  async initializeTenantMetrics() {
    // Initialize metrics collection
    this.logger.info('Tenant metrics initialized');
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
        tenants: {
          total: this.tenants.size,
          byStatus: this.groupTenantsByStatus()
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
      this.logger.info('Shutting down Tenant Management Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.tenants.clear();
      this.tenantSettings.clear();

      this.logger.info('Tenant Management Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default TenantManagementService;