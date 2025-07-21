/**
 * HSM Provider Factory
 * Multi-provider Hardware Security Module abstraction layer
 * Supports AWS CloudHSM, Azure HSM, Google Cloud HSM, Thales Luna, and SoftHSM
 */

import crypto from 'crypto';
import winston from 'winston';

// AWS CloudHSM imports
import { CloudHSMV2Client, DescribeClustersCommand } from '@aws-sdk/client-cloudhsm-v2';
import { KMSClient, CreateKeyCommand, SignCommand, EncryptCommand } from '@aws-sdk/client-kms';

// Azure HSM imports
import { KeyClient } from '@azure/keyvault-keys';
import { DefaultAzureCredential } from '@azure/identity';

// Google Cloud HSM imports
import { KeyManagementServiceClient } from '@google-cloud/kms';

// PKCS#11 for Thales Luna and SoftHSM
import pkcs11js from 'pkcs11js';

export default class HSMProviderFactory {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        
        // Provider instances
        this.providers = new Map();
        this.currentProvider = null;
        
        // HSM connection pools
        this.connectionPools = new Map();
        
        // Provider capabilities matrix
        this.capabilities = {
            aws: {
                keyGeneration: ['RSA-2048', 'RSA-3072', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384', 'ECDSA-P521', 'AES-256'],
                signing: ['RSA-PSS', 'RSA-PKCS1', 'ECDSA', 'HMAC'],
                encryption: ['RSA-OAEP', 'AES-GCM'],
                compliance: ['FIPS-140-2-Level-3', 'Common-Criteria-EAL4'],
                availability: '99.9%',
                performance: { keyGen: 1000, signing: 5000, encryption: 10000 } // ops/sec
            },
            azure: {
                keyGeneration: ['RSA-2048', 'RSA-3072', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384', 'ECDSA-P521', 'AES-256'],
                signing: ['RSA-PSS', 'RSA-PKCS1', 'ECDSA'],
                encryption: ['RSA-OAEP', 'AES-GCM'],
                compliance: ['FIPS-140-2-Level-3', 'Common-Criteria-EAL4'],
                availability: '99.9%',
                performance: { keyGen: 800, signing: 4000, encryption: 8000 }
            },
            gcp: {
                keyGeneration: ['RSA-2048', 'RSA-3072', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384', 'ECDSA-P521', 'AES-256'],
                signing: ['RSA-PSS', 'RSA-PKCS1', 'ECDSA'],
                encryption: ['RSA-OAEP', 'AES-GCM'],
                compliance: ['FIPS-140-2-Level-3', 'Common-Criteria-EAL4'],
                availability: '99.9%',
                performance: { keyGen: 900, signing: 4500, encryption: 9000 }
            },
            thales: {
                keyGeneration: ['RSA-2048', 'RSA-3072', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384', 'ECDSA-P521', 'AES-256'],
                signing: ['RSA-PSS', 'RSA-PKCS1', 'ECDSA', 'HMAC'],
                encryption: ['RSA-OAEP', 'AES-GCM'],
                compliance: ['FIPS-140-2-Level-3', 'Common-Criteria-EAL4+'],
                availability: '99.99%',
                performance: { keyGen: 1200, signing: 6000, encryption: 12000 }
            },
            softhsm: {
                keyGeneration: ['RSA-2048', 'RSA-3072', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384', 'AES-256'],
                signing: ['RSA-PSS', 'RSA-PKCS1', 'ECDSA', 'HMAC'],
                encryption: ['RSA-OAEP', 'AES-GCM'],
                compliance: ['PKCS11-Compliant'],
                availability: '99%',
                performance: { keyGen: 500, signing: 2000, encryption: 4000 }
            }
        };
        
        // Performance metrics
        this.metrics = {
            operationCounts: new Map(),
            responsetimes: new Map(),
            errorCounts: new Map(),
            lastHealthCheck: null
        };
        
        this.logger.info('HSM Provider Factory initialized', {
            supportedProviders: Object.keys(this.capabilities),
            primaryProvider: config.hsm.provider
        });
    }
    
    /**
     * Initialize HSM providers based on configuration
     */
    async initialize() {
        try {
            this.logger.info('🔐 Initializing HSM Provider Factory...');
            
            const primaryProvider = this.config.hsm.provider;
            
            // Initialize primary provider
            await this.initializeProvider(primaryProvider);
            
            // Initialize backup providers if configured
            const backupProviders = this.config.hsm.backupProviders || [];
            for (const provider of backupProviders) {
                if (provider !== primaryProvider) {
                    await this.initializeProvider(provider);
                }
            }
            
            // Set primary provider
            this.currentProvider = primaryProvider;
            
            // Perform initial health check
            await this.performHealthCheck();
            
            this.logger.info('✅ HSM Provider Factory initialized successfully', {
                primaryProvider,
                availableProviders: Array.from(this.providers.keys()),
                healthStatus: 'healthy'
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize HSM Provider Factory', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Initialize specific HSM provider
     */
    async initializeProvider(providerName) {
        try {
            this.logger.debug(`Initializing HSM provider: ${providerName}`);
            
            let provider;
            
            switch (providerName) {
                case 'aws':
                    provider = await this.initializeAWSProvider();
                    break;
                case 'azure':
                    provider = await this.initializeAzureProvider();
                    break;
                case 'gcp':
                    provider = await this.initializeGCPProvider();
                    break;
                case 'thales':
                    provider = await this.initializeThalesProvider();
                    break;
                case 'softhsm':
                    provider = await this.initializeSoftHSMProvider();
                    break;
                default:
                    throw new Error(`Unsupported HSM provider: ${providerName}`);
            }
            
            // Store provider instance
            this.providers.set(providerName, provider);
            
            // Initialize connection pool
            this.connectionPools.set(providerName, {
                active: 0,
                idle: 0,
                maxConnections: this.config.hsm.maxConnections || 10,
                connections: []
            });
            
            this.logger.info(`✅ HSM provider ${providerName} initialized successfully`);
            
        } catch (error) {
            this.logger.error(`❌ Failed to initialize HSM provider ${providerName}`, { error: error.message });
            throw error;
        }
    }
    
    /**
     * Initialize AWS CloudHSM provider
     */
    async initializeAWSProvider() {
        try {
            const awsConfig = {
                region: this.config.aws.region,
                credentials: {
                    accessKeyId: this.config.aws.accessKeyId,
                    secretAccessKey: this.config.aws.secretAccessKey
                }
            };
            
            // Initialize CloudHSM client
            const cloudHsmClient = new CloudHSMV2Client(awsConfig);
            
            // Initialize KMS client for key operations
            const kmsClient = new KMSClient(awsConfig);
            
            // Test connection
            if (this.config.aws.cloudHsmClusterId) {
                const command = new DescribeClustersCommand({
                    Filters: {
                        clusterIds: [this.config.aws.cloudHsmClusterId]
                    }
                });
                await cloudHsmClient.send(command);
            }
            
            return {
                name: 'aws',
                type: 'cloud',
                clients: {
                    cloudHsm: cloudHsmClient,
                    kms: kmsClient
                },
                config: this.config.aws,
                capabilities: this.capabilities.aws,
                status: 'active',
                lastHealthCheck: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Failed to initialize AWS provider', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Initialize Azure Key Vault HSM provider
     */
    async initializeAzureProvider() {
        try {
            const credential = new DefaultAzureCredential();
            
            // Initialize Key Vault client
            const keyClient = new KeyClient(
                this.config.azure.keyVaultUrl || this.config.azure.managedHsmUrl,
                credential
            );
            
            // Test connection
            const keyVaultName = this.config.azure.keyVaultUrl?.split('.')[0]?.split('//')[1];
            if (keyVaultName) {
                // List keys to test connection
                const iterator = keyClient.listPropertiesOfKeys();
                await iterator.next(); // Just test first result
            }
            
            return {
                name: 'azure',
                type: 'cloud',
                clients: {
                    keyVault: keyClient
                },
                config: this.config.azure,
                capabilities: this.capabilities.azure,
                status: 'active',
                lastHealthCheck: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Failed to initialize Azure provider', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Initialize Google Cloud KMS provider
     */
    async initializeGCPProvider() {
        try {
            // Initialize KMS client
            const kmsClient = new KeyManagementServiceClient({
                projectId: this.config.gcp.projectId,
                keyFilename: this.config.gcp.serviceAccountPath
            });
            
            // Test connection
            if (this.config.gcp.projectId && this.config.gcp.locationId) {
                const locationName = kmsClient.locationPath(
                    this.config.gcp.projectId,
                    this.config.gcp.locationId
                );
                await kmsClient.listKeyRings({ parent: locationName });
            }
            
            return {
                name: 'gcp',
                type: 'cloud',
                clients: {
                    kms: kmsClient
                },
                config: this.config.gcp,
                capabilities: this.capabilities.gcp,
                status: 'active',
                lastHealthCheck: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Failed to initialize GCP provider', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Initialize Thales Luna HSM provider
     */
    async initializeThalesProvider() {
        try {
            // Initialize PKCS#11 module for Thales Luna
            const pkcs11 = new pkcs11js.PKCS11();
            
            // Load Thales Luna PKCS#11 library
            const libraryPath = this.config.thales.libraryPath || '/usr/safenet/lunaclient/lib/libCryptoki2_64.so';
            pkcs11.load(libraryPath);
            
            // Initialize library
            pkcs11.C_Initialize();
            
            // Get slot list
            const slots = pkcs11.C_GetSlotList(true);
            if (slots.length === 0) {
                throw new Error('No Thales Luna HSM slots available');
            }
            
            // Open session with first available slot
            const session = pkcs11.C_OpenSession(slots[0], pkcs11js.CKF_SERIAL_SESSION | pkcs11js.CKF_RW_SESSION);
            
            // Login to partition
            if (this.config.thales.partitionPassword) {
                pkcs11.C_Login(session, pkcs11js.CKU_USER, this.config.thales.partitionPassword);
            }
            
            return {
                name: 'thales',
                type: 'hardware',
                clients: {
                    pkcs11,
                    session
                },
                config: this.config.thales,
                capabilities: this.capabilities.thales,
                status: 'active',
                lastHealthCheck: new Date().toISOString(),
                slots,
                activeSlot: slots[0]
            };
            
        } catch (error) {
            this.logger.error('Failed to initialize Thales provider', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Initialize SoftHSM provider (for testing)
     */
    async initializeSoftHSMProvider() {
        try {
            // Initialize PKCS#11 module for SoftHSM
            const pkcs11 = new pkcs11js.PKCS11();
            
            // Load SoftHSM PKCS#11 library
            const libraryPath = this.config.softhsm.libraryPath;
            pkcs11.load(libraryPath);
            
            // Initialize library
            pkcs11.C_Initialize();
            
            // Get slot list
            const slots = pkcs11.C_GetSlotList(true);
            if (slots.length === 0) {
                throw new Error('No SoftHSM slots available');
            }
            
            // Use configured slot or first available
            const targetSlot = this.config.softhsm.slot !== undefined ? 
                this.config.softhsm.slot : slots[0];
            
            // Open session
            const session = pkcs11.C_OpenSession(targetSlot, pkcs11js.CKF_SERIAL_SESSION | pkcs11js.CKF_RW_SESSION);
            
            // Login with PIN
            if (this.config.softhsm.pin) {
                pkcs11.C_Login(session, pkcs11js.CKU_USER, this.config.softhsm.pin);
            }
            
            return {
                name: 'softhsm',
                type: 'software',
                clients: {
                    pkcs11,
                    session
                },
                config: this.config.softhsm,
                capabilities: this.capabilities.softhsm,
                status: 'active',
                lastHealthCheck: new Date().toISOString(),
                slots,
                activeSlot: targetSlot
            };
            
        } catch (error) {
            this.logger.error('Failed to initialize SoftHSM provider', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Get current active provider
     */
    getProvider(providerName = null) {
        const targetProvider = providerName || this.currentProvider;
        const provider = this.providers.get(targetProvider);
        
        if (!provider) {
            throw new Error(`HSM provider not available: ${targetProvider}`);
        }
        
        return provider;
    }
    
    /**
     * Generate key using current provider
     */
    async generateKey(keySpec) {
        try {
            const provider = this.getProvider();
            this.logger.debug('Generating key with provider', { 
                provider: provider.name, 
                keyType: keySpec.keyType 
            });
            
            const startTime = Date.now();
            let result;
            
            switch (provider.name) {
                case 'aws':
                    result = await this.generateKeyAWS(provider, keySpec);
                    break;
                case 'azure':
                    result = await this.generateKeyAzure(provider, keySpec);
                    break;
                case 'gcp':
                    result = await this.generateKeyGCP(provider, keySpec);
                    break;
                case 'thales':
                case 'softhsm':
                    result = await this.generateKeyPKCS11(provider, keySpec);
                    break;
                default:
                    throw new Error(`Key generation not supported for provider: ${provider.name}`);
            }
            
            // Record metrics
            this.recordMetrics('key_generation', provider.name, Date.now() - startTime);
            
            return result;
            
        } catch (error) {
            this.recordError('key_generation', this.currentProvider);
            this.logger.error('Key generation failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate key using AWS KMS/CloudHSM
     */
    async generateKeyAWS(provider, keySpec) {
        try {
            const { keyType, keySize, keyUsage, keyLabel } = keySpec;
            
            // Use CloudHSM if available, otherwise KMS
            if (provider.config.cloudHsmClusterId) {
                // CloudHSM key generation
                return await this.generateKeyAWSCloudHSM(provider, keySpec);
            } else {
                // KMS key generation
                const keySpec = this.mapKeyTypeToAWS(keyType, keySize);
                const command = new CreateKeyCommand({
                    KeyUsage: keyUsage.includes('encrypt') ? 'ENCRYPT_DECRYPT' : 'SIGN_VERIFY',
                    KeySpec: keySpec,
                    Description: keyLabel || 'PersonaChain HSM Key',
                    Tags: [
                        { TagKey: 'Service', TagValue: 'PersonaChain' },
                        { TagKey: 'Component', TagValue: 'HSM-Enterprise' }
                    ]
                });
                
                const result = await provider.clients.kms.send(command);
                
                return {
                    keyId: result.KeyMetadata.KeyId,
                    keyLabel: keyLabel || result.KeyMetadata.KeyId,
                    keyType,
                    keySize,
                    keyUsage,
                    provider: 'aws-kms',
                    arn: result.KeyMetadata.Arn,
                    createdAt: new Date().toISOString(),
                    fipsCompliant: true
                };
            }
            
        } catch (error) {
            this.logger.error('AWS key generation failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Sign data using current provider
     */
    async signData(keyId, data, algorithm = 'RSA-PSS') {
        try {
            const provider = this.getProvider();
            this.logger.debug('Signing data with provider', { 
                provider: provider.name, 
                keyId, 
                algorithm 
            });
            
            const startTime = Date.now();
            let result;
            
            switch (provider.name) {
                case 'aws':
                    result = await this.signDataAWS(provider, keyId, data, algorithm);
                    break;
                case 'azure':
                    result = await this.signDataAzure(provider, keyId, data, algorithm);
                    break;
                case 'gcp':
                    result = await this.signDataGCP(provider, keyId, data, algorithm);
                    break;
                case 'thales':
                case 'softhsm':
                    result = await this.signDataPKCS11(provider, keyId, data, algorithm);
                    break;
                default:
                    throw new Error(`Signing not supported for provider: ${provider.name}`);
            }
            
            // Record metrics
            this.recordMetrics('signing', provider.name, Date.now() - startTime);
            
            return result;
            
        } catch (error) {
            this.recordError('signing', this.currentProvider);
            this.logger.error('Data signing failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Check health of all providers
     */
    async checkHealth() {
        try {
            const healthStatus = {
                overall: 'healthy',
                providers: {},
                timestamp: new Date().toISOString(),
                metrics: this.getMetricsSummary()
            };
            
            for (const [providerName, provider] of this.providers) {
                try {
                    const providerHealth = await this.checkProviderHealth(provider);
                    healthStatus.providers[providerName] = providerHealth;
                    
                    if (providerHealth.status !== 'healthy') {
                        healthStatus.overall = 'degraded';
                    }
                    
                } catch (error) {
                    healthStatus.providers[providerName] = {
                        status: 'unhealthy',
                        error: error.message,
                        lastChecked: new Date().toISOString()
                    };
                    healthStatus.overall = 'degraded';
                }
            }
            
            this.metrics.lastHealthCheck = healthStatus.timestamp;
            
            return {
                available: healthStatus.overall !== 'unhealthy',
                details: healthStatus
            };
            
        } catch (error) {
            this.logger.error('Health check failed', { error: error.message });
            return {
                available: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Check health of individual provider
     */
    async checkProviderHealth(provider) {
        try {
            const startTime = Date.now();
            
            switch (provider.name) {
                case 'aws':
                    // Test KMS operation
                    await provider.clients.kms.send(new (await import('@aws-sdk/client-kms')).ListKeysCommand({ Limit: 1 }));
                    break;
                    
                case 'azure':
                    // Test Key Vault access
                    const iterator = provider.clients.keyVault.listPropertiesOfKeys();
                    await iterator.next();
                    break;
                    
                case 'gcp':
                    // Test KMS access
                    const locationName = provider.clients.kms.locationPath(
                        provider.config.projectId,
                        provider.config.locationId || 'global'
                    );
                    await provider.clients.kms.listKeyRings({ parent: locationName });
                    break;
                    
                case 'thales':
                case 'softhsm':
                    // Test PKCS#11 session
                    const sessionInfo = provider.clients.pkcs11.C_GetSessionInfo(provider.clients.session);
                    if (!sessionInfo) {
                        throw new Error('PKCS#11 session invalid');
                    }
                    break;
                    
                default:
                    throw new Error(`Health check not implemented for provider: ${provider.name}`);
            }
            
            const responseTime = Date.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime,
                capabilities: provider.capabilities,
                lastChecked: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }
    }
    
    /**
     * Failover to backup provider
     */
    async failoverToBackup() {
        try {
            this.logger.warn('Initiating HSM provider failover', { 
                currentProvider: this.currentProvider 
            });
            
            // Get list of available backup providers
            const availableProviders = Array.from(this.providers.keys())
                .filter(name => name !== this.currentProvider);
            
            if (availableProviders.length === 0) {
                throw new Error('No backup HSM providers available');
            }
            
            // Test each backup provider and select the healthiest one
            let bestProvider = null;
            let bestResponseTime = Infinity;
            
            for (const providerName of availableProviders) {
                try {
                    const provider = this.providers.get(providerName);
                    const health = await this.checkProviderHealth(provider);
                    
                    if (health.status === 'healthy' && health.responseTime < bestResponseTime) {
                        bestProvider = providerName;
                        bestResponseTime = health.responseTime;
                    }
                } catch (error) {
                    this.logger.warn(`Backup provider ${providerName} failed health check`, { 
                        error: error.message 
                    });
                }
            }
            
            if (!bestProvider) {
                throw new Error('No healthy backup providers available');
            }
            
            // Switch to backup provider
            const previousProvider = this.currentProvider;
            this.currentProvider = bestProvider;
            
            this.logger.info('HSM provider failover completed', {
                previousProvider,
                newProvider: bestProvider,
                responseTime: bestResponseTime
            });
            
            return {
                previousProvider,
                newProvider: bestProvider,
                responseTime: bestResponseTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('HSM provider failover failed', { error: error.message });
            throw error;
        }
    }
    
    // Utility methods
    
    performHealthCheck() {
        return this.checkHealth();
    }
    
    recordMetrics(operation, provider, responseTime) {
        const key = `${provider}_${operation}`;
        
        if (!this.metrics.operationCounts.has(key)) {
            this.metrics.operationCounts.set(key, 0);
            this.metrics.responseeTimes.set(key, []);
        }
        
        this.metrics.operationCounts.set(key, this.metrics.operationCounts.get(key) + 1);
        
        const times = this.metrics.responseeTimes.get(key);
        times.push(responseTime);
        
        // Keep only last 100 measurements
        if (times.length > 100) {
            times.shift();
        }
    }
    
    recordError(operation, provider) {
        const key = `${provider}_${operation}`;
        
        if (!this.metrics.errorCounts.has(key)) {
            this.metrics.errorCounts.set(key, 0);
        }
        
        this.metrics.errorCounts.set(key, this.metrics.errorCounts.get(key) + 1);
    }
    
    getMetricsSummary() {
        return {
            operations: Object.fromEntries(this.metrics.operationCounts),
            errors: Object.fromEntries(this.metrics.errorCounts),
            responseeTimes: Object.fromEntries(
                Array.from(this.metrics.responseeTimes.entries()).map(([key, times]) => [
                    key,
                    {
                        avg: times.reduce((a, b) => a + b, 0) / times.length,
                        min: Math.min(...times),
                        max: Math.max(...times),
                        count: times.length
                    }
                ])
            )
        };
    }
    
    mapKeyTypeToAWS(keyType, keySize) {
        const mapping = {
            'RSA': {
                2048: 'RSA_2048',
                3072: 'RSA_3072', 
                4096: 'RSA_4096'
            },
            'ECC': {
                256: 'ECC_NIST_P256',
                384: 'ECC_NIST_P384',
                521: 'ECC_NIST_P521'
            },
            'AES': {
                256: 'SYMMETRIC_DEFAULT'
            }
        };
        
        return mapping[keyType]?.[keySize] || 'RSA_2048';
    }
    
    /**
     * Shutdown all providers
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down HSM Provider Factory');
            
            for (const [providerName, provider] of this.providers) {
                try {
                    if (provider.name === 'thales' || provider.name === 'softhsm') {
                        // Logout and close PKCS#11 session
                        provider.clients.pkcs11.C_Logout(provider.clients.session);
                        provider.clients.pkcs11.C_CloseSession(provider.clients.session);
                        provider.clients.pkcs11.C_Finalize();
                    }
                } catch (error) {
                    this.logger.warn(`Error shutting down provider ${providerName}`, { 
                        error: error.message 
                    });
                }
            }
            
            this.providers.clear();
            this.connectionPools.clear();
            
            this.logger.info('HSM Provider Factory shutdown complete');
            
        } catch (error) {
            this.logger.error('Error during HSM Provider Factory shutdown', { error: error.message });
            throw error;
        }
    }
}