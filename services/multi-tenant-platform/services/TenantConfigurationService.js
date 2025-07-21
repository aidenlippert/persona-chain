/**
 * Tenant Configuration Service
 * Centralized tenant configuration management with validation and versioning
 * Enterprise-grade configuration platform with schema validation and rollback capabilities
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

class TenantConfigurationService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });
    this.redis = null;
    this.configurations = new Map();
    this.schemas = new Map();
    this.configHistory = new Map();
    this.validationCache = new Map();
    
    // Initialize JSON schema validator
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'tenant-configuration' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/tenant-configuration.log' })
      ]
    });

    // Configuration schema definitions
    this.configurationSchemas = {
      TENANT_SETTINGS: {
        id: 'tenant_settings',
        name: 'Tenant Settings',
        description: 'Core tenant configuration settings',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {
            general: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 100 },
                description: { type: 'string', maxLength: 500 },
                timezone: { type: 'string', format: 'timezone' },
                locale: { type: 'string', pattern: '^[a-z]{2}-[A-Z]{2}$' },
                currency: { type: 'string', pattern: '^[A-Z]{3}$' }
              },
              required: ['name', 'timezone', 'locale', 'currency'],
              additionalProperties: false
            },
            security: {
              type: 'object',
              properties: {
                passwordPolicy: {
                  type: 'object',
                  properties: {
                    minLength: { type: 'integer', minimum: 8, maximum: 128 },
                    requireUppercase: { type: 'boolean' },
                    requireLowercase: { type: 'boolean' },
                    requireNumbers: { type: 'boolean' },
                    requireSpecialChars: { type: 'boolean' },
                    maxAge: { type: 'integer', minimum: 1, maximum: 365 }
                  },
                  required: ['minLength'],
                  additionalProperties: false
                },
                sessionTimeout: { type: 'integer', minimum: 300, maximum: 86400 },
                mfaRequired: { type: 'boolean' },
                ipWhitelist: {
                  type: 'array',
                  items: { type: 'string', format: 'ipv4' }
                }
              },
              required: ['passwordPolicy', 'sessionTimeout', 'mfaRequired'],
              additionalProperties: false
            },
            notifications: {
              type: 'object',
              properties: {
                email: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    fromAddress: { type: 'string', format: 'email' },
                    replyToAddress: { type: 'string', format: 'email' },
                    templates: {
                      type: 'object',
                      additionalProperties: { type: 'string' }
                    }
                  },
                  required: ['enabled'],
                  additionalProperties: false
                },
                webhooks: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    endpoints: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          url: { type: 'string', format: 'uri' },
                          events: {
                            type: 'array',
                            items: { type: 'string' }
                          },
                          secret: { type: 'string' }
                        },
                        required: ['url', 'events'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['enabled'],
                  additionalProperties: false
                }
              },
              additionalProperties: false
            }
          },
          required: ['general', 'security', 'notifications'],
          additionalProperties: false
        }
      },
      
      BRANDING_CONFIG: {
        id: 'branding_config',
        name: 'Branding Configuration',
        description: 'Tenant branding and customization settings',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {
            colors: {
              type: 'object',
              properties: {
                primary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                secondary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                accent: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                background: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                text: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }
              },
              required: ['primary', 'background', 'text'],
              additionalProperties: false
            },
            typography: {
              type: 'object',
              properties: {
                primaryFont: { type: 'string' },
                secondaryFont: { type: 'string' },
                fontSize: {
                  type: 'object',
                  properties: {
                    base: { type: 'number', minimum: 12, maximum: 24 },
                    scale: { type: 'number', minimum: 1.1, maximum: 1.8 }
                  },
                  additionalProperties: false
                }
              },
              additionalProperties: false
            },
            logo: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                width: { type: 'integer', minimum: 50, maximum: 500 },
                height: { type: 'integer', minimum: 25, maximum: 250 }
              },
              additionalProperties: false
            },
            customCSS: { type: 'string', maxLength: 50000 }
          },
          additionalProperties: false
        }
      },
      
      INTEGRATION_CONFIG: {
        id: 'integration_config',
        name: 'Integration Configuration',
        description: 'External system integration settings',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {
            sso: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                provider: { 
                  type: 'string', 
                  enum: ['saml', 'oidc', 'oauth2'] 
                },
                configuration: {
                  type: 'object',
                  properties: {
                    entityId: { type: 'string' },
                    ssoUrl: { type: 'string', format: 'uri' },
                    certificate: { type: 'string' },
                    attributeMapping: {
                      type: 'object',
                      additionalProperties: { type: 'string' }
                    }
                  },
                  additionalProperties: true
                }
              },
              required: ['enabled'],
              additionalProperties: false
            },
            api: {
              type: 'object',
              properties: {
                rateLimit: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    requestsPerHour: { type: 'integer', minimum: 100, maximum: 1000000 },
                    burstLimit: { type: 'integer', minimum: 10, maximum: 10000 }
                  },
                  required: ['enabled'],
                  additionalProperties: false
                },
                cors: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    origins: {
                      type: 'array',
                      items: { type: 'string', format: 'uri' }
                    },
                    methods: {
                      type: 'array',
                      items: { 
                        type: 'string', 
                        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] 
                      }
                    }
                  },
                  required: ['enabled'],
                  additionalProperties: false
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      },
      
      COMPLIANCE_CONFIG: {
        id: 'compliance_config',
        name: 'Compliance Configuration',
        description: 'Regulatory compliance settings',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {
            frameworks: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['SOC2', 'GDPR', 'HIPAA', 'PCI_DSS', 'ISO27001', 'FEDRAMP']
              }
            },
            dataRetention: {
              type: 'object',
              properties: {
                userDataDays: { type: 'integer', minimum: 30, maximum: 2555 },
                logDataDays: { type: 'integer', minimum: 30, maximum: 2555 },
                auditDataDays: { type: 'integer', minimum: 365, maximum: 2555 }
              },
              required: ['userDataDays', 'logDataDays', 'auditDataDays'],
              additionalProperties: false
            },
            encryption: {
              type: 'object',
              properties: {
                atRest: { type: 'boolean' },
                inTransit: { type: 'boolean' },
                algorithm: { 
                  type: 'string', 
                  enum: ['AES-256', 'ChaCha20-Poly1305'] 
                }
              },
              required: ['atRest', 'inTransit', 'algorithm'],
              additionalProperties: false
            },
            auditLogging: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                events: {
                  type: 'array',
                  items: { type: 'string' }
                },
                retentionDays: { type: 'integer', minimum: 365, maximum: 2555 }
              },
              required: ['enabled'],
              additionalProperties: false
            }
          },
          required: ['frameworks', 'dataRetention', 'encryption', 'auditLogging'],
          additionalProperties: false
        }
      }
    };

    // Default configurations
    this.defaultConfigurations = {
      TENANT_SETTINGS: {
        general: {
          name: '',
          description: '',
          timezone: 'UTC',
          locale: 'en-US',
          currency: 'USD'
        },
        security: {
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false,
            maxAge: 90
          },
          sessionTimeout: 28800, // 8 hours
          mfaRequired: false,
          ipWhitelist: []
        },
        notifications: {
          email: {
            enabled: true,
            templates: {}
          },
          webhooks: {
            enabled: false,
            endpoints: []
          }
        }
      },
      
      BRANDING_CONFIG: {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          accent: '#28a745',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          primaryFont: 'Inter',
          secondaryFont: 'Inter',
          fontSize: {
            base: 16,
            scale: 1.25
          }
        },
        customCSS: ''
      },
      
      INTEGRATION_CONFIG: {
        sso: {
          enabled: false
        },
        api: {
          rateLimit: {
            enabled: true,
            requestsPerHour: 10000,
            burstLimit: 100
          },
          cors: {
            enabled: true,
            origins: [],
            methods: ['GET', 'POST', 'PUT', 'DELETE']
          }
        }
      },
      
      COMPLIANCE_CONFIG: {
        frameworks: [],
        dataRetention: {
          userDataDays: 2555, // 7 years
          logDataDays: 730,   // 2 years
          auditDataDays: 2555 // 7 years
        },
        encryption: {
          atRest: true,
          inTransit: true,
          algorithm: 'AES-256'
        },
        auditLogging: {
          enabled: true,
          events: ['login', 'logout', 'data_access', 'config_change'],
          retentionDays: 2555
        }
      }
    };

    // Configuration change types
    this.changeTypes = {
      CREATE: 'create',
      UPDATE: 'update',
      DELETE: 'delete',
      ROLLBACK: 'rollback',
      VALIDATE: 'validate'
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Tenant Configuration Service...');

      // Initialize Redis for distributed configuration management
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for tenant configuration');
      }

      // Compile JSON schemas
      await this.compileSchemas();

      // Load existing configurations
      await this.loadExistingConfigurations();

      // Initialize configuration monitoring
      await this.initializeConfigurationMonitoring();

      // Setup change tracking
      await this.setupChangeTracking();

      this.logger.info('Tenant Configuration Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Tenant Configuration Service:', error);
      throw error;
    }
  }

  async getTenantConfig(params, body, query, req) {
    try {
      const { tenantId } = params;
      const { 
        section,
        includeSchema = false,
        includeHistory = false 
      } = query;

      this.logger.info(`Getting tenant configuration: ${tenantId}`, { section });

      // Get configuration
      const config = await this.getConfiguration(tenantId, section);

      const response = {
        tenantId,
        configuration: config,
        lastModified: await this.getLastModified(tenantId, section),
        version: await this.getCurrentVersion(tenantId, section)
      };

      // Include schema if requested
      if (includeSchema) {
        response.schema = section ? 
          this.configurationSchemas[section.toUpperCase()] :
          this.configurationSchemas;
      }

      // Include history if requested
      if (includeHistory) {
        response.history = await this.getConfigurationHistory(tenantId, section, 10);
      }

      return response;

    } catch (error) {
      this.logger.error('Error getting tenant configuration:', error);
      throw error;
    }
  }

  async updateTenantConfig(params, configData, query, req) {
    try {
      const { tenantId } = params;
      const { 
        validate = true,
        createBackup = true,
        reason 
      } = query;

      this.logger.info(`Updating tenant configuration: ${tenantId}`, {
        sections: Object.keys(configData),
        validate,
        createBackup
      });

      const updateId = crypto.randomUUID();
      const results = {};

      // Create backup if requested
      if (createBackup) {
        await this.createConfigurationBackup(tenantId, updateId);
      }

      // Process each configuration section
      for (const [section, sectionData] of Object.entries(configData)) {
        try {
          // Validate configuration if requested
          if (validate) {
            const validationResult = this.validateConfiguration(section, sectionData);
            if (!validationResult.valid) {
              throw new Error(`Validation failed for ${section}: ${validationResult.errors.join(', ')}`);
            }
          }

          // Get current configuration
          const currentConfig = await this.getConfiguration(tenantId, section);

          // Merge with new data
          const updatedConfig = this.mergeConfiguration(currentConfig, sectionData);

          // Store updated configuration
          await this.storeConfiguration(tenantId, section, updatedConfig, {
            updateId,
            reason: reason || 'API update',
            updatedBy: req.user?.id || 'system',
            changeType: this.changeTypes.UPDATE
          });

          results[section] = {
            status: 'success',
            version: await this.getCurrentVersion(tenantId, section),
            changes: this.calculateChanges(currentConfig, updatedConfig)
          };

        } catch (error) {
          results[section] = {
            status: 'error',
            error: error.message
          };
        }
      }

      // Check if any updates failed
      const hasErrors = Object.values(results).some(result => result.status === 'error');

      this.logger.info(`Configuration update completed`, {
        updateId,
        tenantId,
        success: !hasErrors,
        sections: Object.keys(results)
      });

      return {
        updateId,
        tenantId,
        success: !hasErrors,
        results,
        updatedAt: DateTime.now().toISO()
      };

    } catch (error) {
      this.logger.error('Error updating tenant configuration:', error);
      throw error;
    }
  }

  async validateConfig(params, configData, query, req) {
    try {
      const { tenantId } = params;
      const { section } = query;

      this.logger.info(`Validating configuration for tenant: ${tenantId}`, { section });

      const validationResults = {};

      // Validate specified sections or all sections
      const sectionsToValidate = section ? [section] : Object.keys(configData);

      for (const sectionName of sectionsToValidate) {
        const sectionData = configData[sectionName];
        if (!sectionData) {
          validationResults[sectionName] = {
            valid: false,
            errors: ['Section data is required'],
            warnings: []
          };
          continue;
        }

        const result = this.validateConfiguration(sectionName, sectionData);
        
        // Add additional business rule validation
        const businessValidation = await this.validateBusinessRules(tenantId, sectionName, sectionData);
        
        validationResults[sectionName] = {
          valid: result.valid && businessValidation.valid,
          errors: [...result.errors, ...businessValidation.errors],
          warnings: [...(result.warnings || []), ...businessValidation.warnings],
          schema: result.schema
        };
      }

      const overallValid = Object.values(validationResults).every(result => result.valid);

      return {
        tenantId,
        valid: overallValid,
        sections: validationResults,
        validatedAt: DateTime.now().toISO()
      };

    } catch (error) {
      this.logger.error('Error validating configuration:', error);
      throw error;
    }
  }

  async getConfigSchema(params, body, query, req) {
    try {
      const { tenantId } = params;
      const { section, format = 'json' } = query;

      this.logger.info(`Getting configuration schema`, { tenantId, section, format });

      let schemas;
      if (section) {
        const schema = this.configurationSchemas[section.toUpperCase()];
        if (!schema) {
          throw new Error(`Schema not found for section: ${section}`);
        }
        schemas = { [section]: schema };
      } else {
        schemas = this.configurationSchemas;
      }

      // Format schema based on request
      const formattedSchemas = {};
      for (const [key, schema] of Object.entries(schemas)) {
        formattedSchemas[key] = {
          id: schema.id,
          name: schema.name,
          description: schema.description,
          version: schema.version,
          schema: format === 'json' ? schema.schema : this.convertSchemaFormat(schema.schema, format)
        };
      }

      return {
        tenantId,
        schemas: formattedSchemas,
        format,
        generatedAt: DateTime.now().toISO()
      };

    } catch (error) {
      this.logger.error('Error getting configuration schema:', error);
      throw error;
    }
  }

  // Core validation methods
  validateConfiguration(section, data) {
    const schema = this.configurationSchemas[section.toUpperCase()];
    if (!schema) {
      return {
        valid: false,
        errors: [`Unknown configuration section: ${section}`],
        warnings: []
      };
    }

    const validate = this.ajv.getSchema(schema.id) || this.ajv.compile(schema.schema);
    const valid = validate(data);

    return {
      valid,
      errors: valid ? [] : (validate.errors || []).map(error => 
        `${error.instancePath || 'root'}: ${error.message}`
      ),
      warnings: [],
      schema: schema.id
    };
  }

  async validateBusinessRules(tenantId, section, data) {
    const errors = [];
    const warnings = [];

    // Example business rule validations
    if (section === 'TENANT_SETTINGS') {
      // Check password policy against compliance requirements
      if (data.security?.passwordPolicy) {
        const policy = data.security.passwordPolicy;
        if (policy.minLength < 12 && data.general?.complianceFrameworks?.includes('HIPAA')) {
          errors.push('HIPAA compliance requires minimum password length of 12 characters');
        }
      }

      // Check session timeout limits
      if (data.security?.sessionTimeout > 86400) {
        warnings.push('Session timeout exceeds 24 hours, consider security implications');
      }
    }

    if (section === 'INTEGRATION_CONFIG') {
      // Validate CORS origins
      if (data.api?.cors?.origins?.length > 0) {
        for (const origin of data.api.cors.origins) {
          if (origin === '*') {
            warnings.push('Wildcard CORS origin (*) is not recommended for production');
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Configuration management methods
  async getConfiguration(tenantId, section = null) {
    const cacheKey = `config:${tenantId}${section ? `:${section}` : ''}`;
    
    // Check cache first
    let config = this.cache.get(cacheKey);
    
    if (!config) {
      // Check Redis
      if (this.redis) {
        const configData = await this.redis.get(cacheKey);
        if (configData) {
          config = JSON.parse(configData);
          this.cache.set(cacheKey, config, 1800);
        }
      }
      
      // Check memory store
      if (!config) {
        config = this.configurations.get(cacheKey);
      }
      
      // Use defaults if nothing found
      if (!config) {
        config = section ? 
          this.defaultConfigurations[section.toUpperCase()] :
          this.defaultConfigurations;
      }
    }

    return config;
  }

  async storeConfiguration(tenantId, section, data, metadata) {
    const cacheKey = `config:${tenantId}:${section}`;
    const version = await this.getNextVersion(tenantId, section);
    
    const configRecord = {
      tenantId,
      section,
      data,
      version,
      metadata: {
        ...metadata,
        timestamp: DateTime.now().toISO(),
        ip: metadata.ip
      }
    };

    // Store in memory
    this.configurations.set(cacheKey, data);
    
    // Store in cache
    this.cache.set(cacheKey, data, 1800);
    
    // Store in Redis
    if (this.redis) {
      await this.redis.setex(cacheKey, 1800, JSON.stringify(data));
    }

    // Store in history
    await this.addToHistory(configRecord);

    return version;
  }

  mergeConfiguration(current, updates) {
    // Deep merge configuration objects
    const merge = (target, source) => {
      const result = { ...target };
      
      for (const key in source) {
        if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = merge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      
      return result;
    };

    return merge(current, updates);
  }

  calculateChanges(current, updated) {
    const changes = [];
    
    const compare = (curr, upd, path = '') => {
      for (const key in upd) {
        const newPath = path ? `${path}.${key}` : key;
        
        if (!(key in curr)) {
          changes.push({ type: 'added', path: newPath, value: upd[key] });
        } else if (typeof upd[key] === 'object' && upd[key] !== null && !Array.isArray(upd[key])) {
          compare(curr[key] || {}, upd[key], newPath);
        } else if (curr[key] !== upd[key]) {
          changes.push({ 
            type: 'modified', 
            path: newPath, 
            oldValue: curr[key], 
            newValue: upd[key] 
          });
        }
      }
    };

    compare(current, updated);
    return changes;
  }

  async compileSchemas() {
    for (const [key, schema] of Object.entries(this.configurationSchemas)) {
      this.ajv.addSchema(schema.schema, schema.id);
    }
    this.logger.info('Configuration schemas compiled successfully');
  }

  async loadExistingConfigurations() {
    this.logger.info('Loading existing configurations');
  }

  async initializeConfigurationMonitoring() {
    this.logger.info('Initializing configuration monitoring');
  }

  async setupChangeTracking() {
    this.logger.info('Setting up change tracking');
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
        configuration: {
          schemas: Object.keys(this.configurationSchemas).length,
          tenantConfigs: this.configurations.size,
          historyRecords: this.configHistory.size
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
      this.logger.info('Shutting down Tenant Configuration Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.configurations.clear();
      this.schemas.clear();
      this.configHistory.clear();
      this.validationCache.clear();

      this.logger.info('Tenant Configuration Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default TenantConfigurationService;