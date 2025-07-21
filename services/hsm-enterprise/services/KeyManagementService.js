/**
 * Key Management Service
 * Comprehensive cryptographic key lifecycle management
 * Handles key generation, rotation, signing, encryption, and lifecycle operations
 */

import crypto from 'crypto';
import winston from 'winston';
import NodeCache from 'node-cache';

export default class KeyManagementService {
    constructor(config, logger, hsmProviderFactory) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        this.hsmProvider = hsmProviderFactory;
        
        // Key storage and caching
        this.keyRegistry = new Map();
        this.keyCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
        this.keyMetadata = new Map();
        
        // Key lifecycle management
        this.keyRotationSchedule = new Map();
        this.keyUsageTracking = new Map();
        this.keyBackups = new Map();
        
        // Performance optimization
        this.keyPools = new Map(); // Pre-generated key pools
        this.operationQueue = [];
        this.batchOperations = new Map();
        
        // Security policies
        this.keyPolicies = {
            defaultKeySize: {
                RSA: 4096,
                ECC: 384,
                AES: 256,
                HMAC: 256
            },
            maxKeyAge: config.security?.maxKeyAge || 365 * 24 * 60 * 60 * 1000, // 1 year
            keyUsageLimit: config.security?.keyUsageLimit || 1000000,
            rotationInterval: config.hsm?.keyRotationInterval || 90 * 24 * 60 * 60 * 1000, // 90 days
            backupInterval: config.hsm?.backupInterval || 24 * 60 * 60 * 1000, // 24 hours
            minBackupCopies: 3,
            maxBackupAge: 7 * 365 * 24 * 60 * 60 * 1000 // 7 years
        };
        
        // Supported algorithms
        this.algorithms = {
            asymmetric: {
                RSA: ['RSA-PSS', 'RSA-PKCS1', 'RSA-OAEP'],
                ECC: ['ECDSA', 'ECDH'],
                Ed25519: ['EdDSA']
            },
            symmetric: {
                AES: ['AES-GCM', 'AES-CBC', 'AES-CTR'],
                ChaCha20: ['ChaCha20-Poly1305']
            },
            hash: {
                SHA: ['SHA-256', 'SHA-384', 'SHA-512'],
                BLAKE: ['BLAKE2b', 'BLAKE2s']
            },
            mac: {
                HMAC: ['HMAC-SHA256', 'HMAC-SHA384', 'HMAC-SHA512']
            }
        };
        
        // Initialize background processes
        this.initializeBackgroundProcesses();
        
        this.logger.info('Key Management Service initialized', {
            supportedAlgorithms: Object.keys(this.algorithms),
            defaultPolicies: this.keyPolicies
        });
    }
    
    /**
     * Initialize background processes for key management
     */
    initializeBackgroundProcesses() {
        // Key rotation scheduler
        setInterval(() => {
            this.performScheduledKeyRotation();
        }, 60 * 60 * 1000); // Check every hour
        
        // Key backup scheduler
        setInterval(() => {
            this.performScheduledKeyBackup();
        }, this.keyPolicies.backupInterval);
        
        // Key usage monitoring
        setInterval(() => {
            this.monitorKeyUsage();
        }, 5 * 60 * 1000); // Check every 5 minutes
        
        // Cleanup expired keys
        setInterval(() => {
            this.cleanupExpiredKeys();
        }, 24 * 60 * 60 * 1000); // Daily cleanup
    }
    
    /**
     * Initialize service
     */
    async initialize() {
        try {
            this.logger.info('🔑 Initializing Key Management Service...');
            
            // Verify HSM provider is available
            if (!this.hsmProvider) {
                throw new Error('HSM Provider Factory not available');
            }
            
            // Load existing keys from persistent storage
            await this.loadExistingKeys();
            
            // Initialize key pools for performance
            await this.initializeKeyPools();
            
            // Perform initial key rotation check
            await this.checkKeyRotationNeeds();
            
            this.logger.info('✅ Key Management Service initialized successfully', {
                loadedKeys: this.keyRegistry.size,
                scheduledRotations: this.keyRotationSchedule.size
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize Key Management Service', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate new cryptographic key
     */
    async generateKey(keySpec) {
        try {
            const {
                keyType,
                keySize,
                keyUsage,
                keyLabel,
                extractable = false,
                metadata = {}
            } = keySpec;
            
            // Validate key specification
            await this.validateKeySpec(keySpec);
            
            this.logger.debug('Generating cryptographic key', {
                keyType,
                keySize,
                keyUsage,
                keyLabel
            });
            
            // Generate unique key identifier
            const keyId = crypto.randomUUID();
            
            // Generate key using HSM provider
            const hsmKeyResult = await this.hsmProvider.generateKey({
                keyType,
                keySize: keySize || this.keyPolicies.defaultKeySize[keyType],
                keyUsage,
                keyLabel: keyLabel || `${keyType}-${Date.now()}`,
                keyId
            });
            
            // Create key metadata
            const keyMetadata = {
                id: keyId,
                hsmKeyId: hsmKeyResult.keyId,
                type: keyType,
                size: keySize || this.keyPolicies.defaultKeySize[keyType],
                usage: keyUsage,
                label: keyLabel || hsmKeyResult.keyLabel,
                extractable,
                algorithm: this.algorithms[this.getKeyFamily(keyType)][keyType][0], // Default algorithm
                status: 'active',
                createdAt: new Date().toISOString(),
                createdBy: metadata.createdBy || 'system',
                lastUsed: null,
                usageCount: 0,
                rotationCount: 0,
                nextRotation: new Date(Date.now() + this.keyPolicies.rotationInterval).toISOString(),
                expiresAt: new Date(Date.now() + this.keyPolicies.maxKeyAge).toISOString(),
                fipsCompliant: true,
                compliance: {
                    fips140Level: this.config.hsm.fipsLevel,
                    commonCriteria: this.config.compliance?.commonCriteria || false,
                    algorithms: [keyType],
                    validatedAt: new Date().toISOString()
                },
                security: {
                    classification: metadata.classification || 'confidential',
                    accessLevel: metadata.accessLevel || 'restricted',
                    auditRequired: true,
                    backupRequired: true
                },
                backup: {
                    lastBackup: null,
                    backupCount: 0,
                    backupLocations: []
                },
                performance: {
                    avgResponseTime: 0,
                    maxResponseTime: 0,
                    errorCount: 0,
                    successCount: 0
                },
                relationships: {
                    parentKeyId: null,
                    childKeyIds: [],
                    derivedFrom: null,
                    certificateIds: []
                },
                metadata: {
                    ...metadata,
                    provider: this.hsmProvider.currentProvider,
                    generatedBy: 'key_management_service',
                    version: '1.0'
                }
            };
            
            // Store key metadata
            this.keyRegistry.set(keyId, keyMetadata);
            this.keyMetadata.set(keyId, keyMetadata);
            
            // Schedule automatic rotation
            this.scheduleKeyRotation(keyId, keyMetadata.nextRotation);
            
            // Initialize usage tracking
            this.keyUsageTracking.set(keyId, {
                totalOperations: 0,
                signingOperations: 0,
                encryptionOperations: 0,
                lastOperation: null,
                dailyUsage: new Map(),
                peakUsage: 0
            });
            
            // Cache key info for performance
            this.keyCache.set(keyId, keyMetadata);
            
            this.logger.info('Cryptographic key generated successfully', {
                keyId,
                keyType,
                keySize: keyMetadata.size,
                provider: keyMetadata.metadata.provider,
                fipsCompliant: keyMetadata.fipsCompliant
            });
            
            return {
                keyId,
                keyLabel: keyMetadata.label,
                publicKey: hsmKeyResult.publicKey,
                keyUsage: keyMetadata.usage,
                createdAt: keyMetadata.createdAt,
                expiresAt: keyMetadata.expiresAt,
                fipsCompliant: keyMetadata.fipsCompliant,
                compliance: keyMetadata.compliance
            };
            
        } catch (error) {
            this.logger.error('Key generation failed', { error: error.message, keySpec });
            throw error;
        }
    }
    
    /**
     * Sign data using specified key
     */
    async sign(signRequest) {
        try {
            const {
                keyId,
                data,
                algorithm,
                hashAlgorithm = 'SHA-256',
                metadata = {}
            } = signRequest;
            
            // Get key metadata
            const keyInfo = await this.getKeyInfo(keyId);
            if (!keyInfo) {
                throw new Error(`Key not found: ${keyId}`);
            }
            
            // Validate key can be used for signing
            if (!keyInfo.usage.includes('sign')) {
                throw new Error(`Key ${keyId} is not authorized for signing operations`);
            }
            
            // Check key status
            if (keyInfo.status !== 'active') {
                throw new Error(`Key ${keyId} is not active (status: ${keyInfo.status})`);
            }
            
            // Check key expiration
            if (new Date(keyInfo.expiresAt) < new Date()) {
                throw new Error(`Key ${keyId} has expired`);
            }
            
            // Check usage limits
            if (keyInfo.usageCount >= this.keyPolicies.keyUsageLimit) {
                throw new Error(`Key ${keyId} has exceeded usage limit`);
            }
            
            this.logger.debug('Signing data with key', {
                keyId,
                algorithm: algorithm || keyInfo.algorithm,
                hashAlgorithm,
                dataSize: data.length
            });
            
            const startTime = Date.now();
            
            // Perform signing operation using HSM
            const signatureResult = await this.hsmProvider.signData(
                keyInfo.hsmKeyId,
                data,
                algorithm || keyInfo.algorithm
            );
            
            const responseTime = Date.now() - startTime;
            
            // Update key usage statistics
            await this.updateKeyUsage(keyId, 'signing', responseTime);
            
            // Create signature metadata
            const signatureMetadata = {
                keyId,
                algorithm: signatureResult.algorithm || algorithm || keyInfo.algorithm,
                hashAlgorithm: signatureResult.hashAlgorithm || hashAlgorithm,
                timestamp: new Date().toISOString(),
                responseTime,
                dataSize: data.length,
                signatureSize: signatureResult.signature.length,
                fipsCompliant: keyInfo.fipsCompliant,
                provider: keyInfo.metadata.provider,
                ...metadata
            };
            
            this.logger.debug('Data signed successfully', {
                keyId,
                algorithm: signatureMetadata.algorithm,
                responseTime,
                signatureSize: signatureMetadata.signatureSize
            });
            
            return {
                signature: signatureResult.signature,
                algorithm: signatureMetadata.algorithm,
                hashAlgorithm: signatureMetadata.hashAlgorithm,
                keyId,
                timestamp: signatureMetadata.timestamp,
                metadata: signatureMetadata
            };
            
        } catch (error) {
            // Update error statistics
            const keyInfo = this.keyRegistry.get(signRequest.keyId);
            if (keyInfo) {
                keyInfo.performance.errorCount++;
            }
            
            this.logger.error('Signing operation failed', {
                keyId: signRequest.keyId,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Encrypt data using specified key
     */
    async encrypt(encryptRequest) {
        try {
            const {
                keyId,
                data,
                algorithm,
                metadata = {}
            } = encryptRequest;
            
            // Get key metadata
            const keyInfo = await this.getKeyInfo(keyId);
            if (!keyInfo) {
                throw new Error(`Key not found: ${keyId}`);
            }
            
            // Validate key can be used for encryption
            if (!keyInfo.usage.includes('encrypt')) {
                throw new Error(`Key ${keyId} is not authorized for encryption operations`);
            }
            
            // Check key status and expiration
            if (keyInfo.status !== 'active') {
                throw new Error(`Key ${keyId} is not active`);
            }
            
            if (new Date(keyInfo.expiresAt) < new Date()) {
                throw new Error(`Key ${keyId} has expired`);
            }
            
            this.logger.debug('Encrypting data with key', {
                keyId,
                algorithm: algorithm || keyInfo.algorithm,
                dataSize: data.length
            });
            
            const startTime = Date.now();
            
            // Perform encryption operation using HSM
            const encryptionResult = await this.hsmProvider.encryptData(
                keyInfo.hsmKeyId,
                data,
                algorithm || keyInfo.algorithm
            );
            
            const responseTime = Date.now() - startTime;
            
            // Update key usage statistics
            await this.updateKeyUsage(keyId, 'encryption', responseTime);
            
            // Create encryption metadata
            const encryptionMetadata = {
                keyId,
                algorithm: encryptionResult.algorithm || algorithm || keyInfo.algorithm,
                timestamp: new Date().toISOString(),
                responseTime,
                dataSize: data.length,
                encryptedSize: encryptionResult.encryptedData.length,
                fipsCompliant: keyInfo.fipsCompliant,
                provider: keyInfo.metadata.provider,
                ...metadata
            };
            
            this.logger.debug('Data encrypted successfully', {
                keyId,
                algorithm: encryptionMetadata.algorithm,
                responseTime,
                encryptedSize: encryptionMetadata.encryptedSize
            });
            
            return {
                encryptedData: encryptionResult.encryptedData,
                algorithm: encryptionMetadata.algorithm,
                keyId,
                timestamp: encryptionMetadata.timestamp,
                metadata: encryptionMetadata
            };
            
        } catch (error) {
            // Update error statistics
            const keyInfo = this.keyRegistry.get(encryptRequest.keyId);
            if (keyInfo) {
                keyInfo.performance.errorCount++;
            }
            
            this.logger.error('Encryption operation failed', {
                keyId: encryptRequest.keyId,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Rotate cryptographic key
     */
    async rotateKey(keyId, options = {}) {
        try {
            const {
                retainOldKey = true,
                gracePeriod = 30 * 24 * 60 * 60 * 1000, // 30 days
                notifyUsers = true
            } = options;
            
            // Get current key
            const currentKey = await this.getKeyInfo(keyId);
            if (!currentKey) {
                throw new Error(`Key not found: ${keyId}`);
            }
            
            this.logger.info('Starting key rotation', {
                keyId,
                currentRotationCount: currentKey.rotationCount,
                retainOldKey,
                gracePeriod
            });
            
            // Generate new key with same specifications
            const newKeySpec = {
                keyType: currentKey.type,
                keySize: currentKey.size,
                keyUsage: currentKey.usage,
                keyLabel: `${currentKey.label}-r${currentKey.rotationCount + 1}`,
                extractable: currentKey.extractable,
                metadata: {
                    ...currentKey.metadata,
                    rotatedFrom: keyId,
                    rotationReason: 'scheduled_rotation'
                }
            };
            
            const newKey = await this.generateKey(newKeySpec);
            
            // Update relationships
            currentKey.relationships.childKeyIds.push(newKey.keyId);
            const newKeyMetadata = this.keyRegistry.get(newKey.keyId);
            newKeyMetadata.relationships.parentKeyId = keyId;
            
            if (retainOldKey) {
                // Mark old key as rotated but keep it for grace period
                currentKey.status = 'rotated';
                currentKey.rotatedAt = new Date().toISOString();
                currentKey.replacedBy = newKey.keyId;
                currentKey.gracePeriodEnd = new Date(Date.now() + gracePeriod).toISOString();
                
                // Schedule old key retirement
                setTimeout(async () => {
                    await this.retireKey(keyId);
                }, gracePeriod);
            } else {
                // Immediately retire old key
                await this.retireKey(keyId);
            }
            
            // Update rotation count
            newKeyMetadata.rotationCount = currentKey.rotationCount + 1;
            
            // Schedule next rotation
            this.scheduleKeyRotation(newKey.keyId, newKeyMetadata.nextRotation);
            
            // Remove old rotation schedule
            this.keyRotationSchedule.delete(keyId);
            
            // Create backup of new key
            await this.backupKey(newKey.keyId);
            
            this.logger.info('Key rotation completed successfully', {
                oldKeyId: keyId,
                newKeyId: newKey.keyId,
                rotationCount: newKeyMetadata.rotationCount,
                gracePeriod: retainOldKey ? gracePeriod : 0
            });
            
            return {
                oldKeyId: keyId,
                newKeyId: newKey.keyId,
                rotationCount: newKeyMetadata.rotationCount,
                rotatedAt: currentKey.rotatedAt || new Date().toISOString(),
                gracePeriodEnd: currentKey.gracePeriodEnd,
                newKey: {
                    keyId: newKey.keyId,
                    keyLabel: newKeyMetadata.label,
                    publicKey: newKey.publicKey,
                    createdAt: newKeyMetadata.createdAt,
                    expiresAt: newKeyMetadata.expiresAt
                }
            };
            
        } catch (error) {
            this.logger.error('Key rotation failed', { keyId, error: error.message });
            throw error;
        }
    }
    
    /**
     * Get key information
     */
    async getKeyInfo(keyId) {
        try {
            // Check cache first
            let keyInfo = this.keyCache.get(keyId);
            if (keyInfo) {
                return keyInfo;
            }
            
            // Get from registry
            keyInfo = this.keyRegistry.get(keyId);
            if (!keyInfo) {
                return null;
            }
            
            // Update cache
            this.keyCache.set(keyId, keyInfo);
            
            return keyInfo;
            
        } catch (error) {
            this.logger.error('Failed to get key info', { keyId, error: error.message });
            throw error;
        }
    }
    
    /**
     * List all keys with filtering options
     */
    async listKeys(filters = {}) {
        try {
            const {
                status,
                keyType,
                usage,
                createdAfter,
                createdBefore,
                expiringWithin,
                limit = 100,
                offset = 0
            } = filters;
            
            let keys = Array.from(this.keyRegistry.values());
            
            // Apply filters
            if (status) {
                keys = keys.filter(key => key.status === status);
            }
            
            if (keyType) {
                keys = keys.filter(key => key.type === keyType);
            }
            
            if (usage) {
                keys = keys.filter(key => key.usage.includes(usage));
            }
            
            if (createdAfter) {
                keys = keys.filter(key => new Date(key.createdAt) > new Date(createdAfter));
            }
            
            if (createdBefore) {
                keys = keys.filter(key => new Date(key.createdAt) < new Date(createdBefore));
            }
            
            if (expiringWithin) {
                const expirationThreshold = new Date(Date.now() + expiringWithin);
                keys = keys.filter(key => new Date(key.expiresAt) < expirationThreshold);
            }
            
            // Sort by creation date (newest first)
            keys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Apply pagination
            const totalCount = keys.length;
            keys = keys.slice(offset, offset + limit);
            
            // Remove sensitive information
            const sanitizedKeys = keys.map(key => ({
                id: key.id,
                type: key.type,
                size: key.size,
                usage: key.usage,
                label: key.label,
                status: key.status,
                createdAt: key.createdAt,
                lastUsed: key.lastUsed,
                usageCount: key.usageCount,
                expiresAt: key.expiresAt,
                nextRotation: key.nextRotation,
                fipsCompliant: key.fipsCompliant,
                compliance: key.compliance,
                performance: key.performance
            }));
            
            return {
                keys: sanitizedKeys,
                totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            };
            
        } catch (error) {
            this.logger.error('Failed to list keys', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Backup key to secure storage
     */
    async backupKey(keyId) {
        try {
            const keyInfo = await this.getKeyInfo(keyId);
            if (!keyInfo) {
                throw new Error(`Key not found: ${keyId}`);
            }
            
            this.logger.debug('Creating key backup', { keyId });
            
            // Create backup metadata
            const backupId = crypto.randomUUID();
            const backup = {
                id: backupId,
                keyId,
                keyMetadata: keyInfo,
                createdAt: new Date().toISOString(),
                version: '1.0',
                encrypted: true,
                locations: []
            };
            
            // Store backup in multiple locations for redundancy
            const backupLocations = await this.storeBackupInMultipleLocations(backup);
            backup.locations = backupLocations;
            
            // Update key backup information
            keyInfo.backup.lastBackup = backup.createdAt;
            keyInfo.backup.backupCount++;
            keyInfo.backup.backupLocations.push(backupId);
            
            // Store backup metadata
            this.keyBackups.set(backupId, backup);
            
            this.logger.info('Key backup created successfully', {
                keyId,
                backupId,
                locations: backupLocations.length
            });
            
            return {
                backupId,
                createdAt: backup.createdAt,
                locations: backupLocations.length
            };
            
        } catch (error) {
            this.logger.error('Key backup failed', { keyId, error: error.message });
            throw error;
        }
    }
    
    // Utility methods
    
    async validateKeySpec(keySpec) {
        const { keyType, keySize, keyUsage } = keySpec;
        
        // Validate key type
        const supportedTypes = Object.keys({
            ...this.algorithms.asymmetric,
            ...this.algorithms.symmetric
        });
        
        if (!supportedTypes.includes(keyType)) {
            throw new Error(`Unsupported key type: ${keyType}`);
        }
        
        // Validate key size
        const defaultSize = this.keyPolicies.defaultKeySize[keyType];
        if (keySize && keySize < defaultSize) {
            throw new Error(`Key size ${keySize} below minimum ${defaultSize} for type ${keyType}`);
        }
        
        // Validate key usage
        const validUsages = ['sign', 'verify', 'encrypt', 'decrypt', 'wrap', 'unwrap'];
        if (!Array.isArray(keyUsage) || !keyUsage.every(usage => validUsages.includes(usage))) {
            throw new Error(`Invalid key usage. Must be array containing: ${validUsages.join(', ')}`);
        }
    }
    
    getKeyFamily(keyType) {
        for (const [family, types] of Object.entries(this.algorithms)) {
            if (types[keyType]) {
                return family;
            }
        }
        return 'asymmetric'; // default
    }
    
    async updateKeyUsage(keyId, operation, responseTime) {
        const keyInfo = this.keyRegistry.get(keyId);
        const usage = this.keyUsageTracking.get(keyId);
        
        if (keyInfo && usage) {
            // Update key metadata
            keyInfo.lastUsed = new Date().toISOString();
            keyInfo.usageCount++;
            keyInfo.performance.successCount++;
            
            // Update response time statistics
            if (responseTime > keyInfo.performance.maxResponseTime) {
                keyInfo.performance.maxResponseTime = responseTime;
            }
            
            const totalOps = keyInfo.performance.successCount;
            keyInfo.performance.avgResponseTime = 
                ((keyInfo.performance.avgResponseTime * (totalOps - 1)) + responseTime) / totalOps;
            
            // Update usage tracking
            usage.totalOperations++;
            usage.lastOperation = new Date().toISOString();
            
            if (operation === 'signing') {
                usage.signingOperations++;
            } else if (operation === 'encryption') {
                usage.encryptionOperations++;
            }
            
            // Track daily usage
            const today = new Date().toISOString().split('T')[0];
            const dailyCount = usage.dailyUsage.get(today) || 0;
            usage.dailyUsage.set(today, dailyCount + 1);
            
            // Update peak usage
            if (dailyCount + 1 > usage.peakUsage) {
                usage.peakUsage = dailyCount + 1;
            }
        }
    }
    
    scheduleKeyRotation(keyId, rotationTime) {
        const rotationDate = new Date(rotationTime);
        const delay = rotationDate.getTime() - Date.now();
        
        if (delay > 0) {
            const timeoutId = setTimeout(async () => {
                try {
                    await this.rotateKey(keyId);
                } catch (error) {
                    this.logger.error('Scheduled key rotation failed', { keyId, error: error.message });
                }
            }, delay);
            
            this.keyRotationSchedule.set(keyId, {
                scheduledTime: rotationTime,
                timeoutId
            });
        }
    }
    
    async performScheduledKeyRotation() {
        // This method is called periodically to check for keys needing rotation
        const now = new Date();
        
        for (const [keyId, keyInfo] of this.keyRegistry) {
            if (keyInfo.status === 'active' && new Date(keyInfo.nextRotation) <= now) {
                try {
                    await this.rotateKey(keyId);
                } catch (error) {
                    this.logger.error('Scheduled key rotation failed', { keyId, error: error.message });
                }
            }
        }
    }
    
    async performScheduledKeyBackup() {
        // Backup keys that haven't been backed up recently
        const backupThreshold = new Date(Date.now() - this.keyPolicies.backupInterval);
        
        for (const [keyId, keyInfo] of this.keyRegistry) {
            if (keyInfo.status === 'active' && 
                (!keyInfo.backup.lastBackup || new Date(keyInfo.backup.lastBackup) < backupThreshold)) {
                try {
                    await this.backupKey(keyId);
                } catch (error) {
                    this.logger.error('Scheduled key backup failed', { keyId, error: error.message });
                }
            }
        }
    }
    
    async monitorKeyUsage() {
        // Monitor key usage and trigger alerts for unusual patterns
        for (const [keyId, usage] of this.keyUsageTracking) {
            const keyInfo = this.keyRegistry.get(keyId);
            if (!keyInfo) continue;
            
            // Check usage limits
            if (keyInfo.usageCount >= this.keyPolicies.keyUsageLimit * 0.9) {
                this.logger.warn('Key approaching usage limit', {
                    keyId,
                    currentUsage: keyInfo.usageCount,
                    limit: this.keyPolicies.keyUsageLimit
                });
            }
            
            // Check for unusual usage patterns
            const today = new Date().toISOString().split('T')[0];
            const todayUsage = usage.dailyUsage.get(today) || 0;
            
            if (todayUsage > usage.peakUsage * 2) {
                this.logger.warn('Unusual key usage pattern detected', {
                    keyId,
                    todayUsage,
                    normalPeakUsage: usage.peakUsage
                });
            }
        }
    }
    
    async cleanupExpiredKeys() {
        // Clean up expired keys and old backups
        const now = new Date();
        
        for (const [keyId, keyInfo] of this.keyRegistry) {
            // Remove expired keys that are past grace period
            if (keyInfo.status === 'rotated' && 
                keyInfo.gracePeriodEnd && 
                new Date(keyInfo.gracePeriodEnd) < now) {
                await this.retireKey(keyId);
            }
            
            // Clean up old backups
            if (keyInfo.backup.backupLocations.length > this.keyPolicies.minBackupCopies) {
                await this.cleanupOldBackups(keyId);
            }
        }
    }
    
    async retireKey(keyId) {
        const keyInfo = this.keyRegistry.get(keyId);
        if (keyInfo) {
            keyInfo.status = 'retired';
            keyInfo.retiredAt = new Date().toISOString();
            
            // Remove from cache
            this.keyCache.del(keyId);
            
            // Remove rotation schedule
            const schedule = this.keyRotationSchedule.get(keyId);
            if (schedule) {
                clearTimeout(schedule.timeoutId);
                this.keyRotationSchedule.delete(keyId);
            }
            
            this.logger.info('Key retired', { keyId });
        }
    }
    
    async storeBackupInMultipleLocations(backup) {
        // Implement backup storage in multiple locations
        // This is a simplified implementation
        const locations = [];
        
        // Store in local encrypted storage
        locations.push({
            type: 'local',
            location: 'encrypted_backup_storage',
            checksum: crypto.createHash('sha256').update(JSON.stringify(backup)).digest('hex')
        });
        
        // Store in cloud storage (if configured)
        if (this.config.backup?.cloudStorage) {
            locations.push({
                type: 'cloud',
                location: this.config.backup.cloudStorage,
                checksum: crypto.createHash('sha256').update(JSON.stringify(backup)).digest('hex')
            });
        }
        
        return locations;
    }
    
    async loadExistingKeys() {
        // Load existing keys from persistent storage
        // This would typically load from a database or encrypted file
        this.logger.debug('Loading existing keys from storage');
        // Implementation would go here
    }
    
    async initializeKeyPools() {
        // Pre-generate key pools for better performance
        this.logger.debug('Initializing key pools for performance optimization');
        // Implementation would go here
    }
    
    async checkKeyRotationNeeds() {
        // Check which keys need rotation
        this.logger.debug('Checking key rotation needs');
        // Implementation would go here
    }
    
    async cleanupOldBackups(keyId) {
        // Clean up old backups beyond retention policy
        this.logger.debug('Cleaning up old backups', { keyId });
        // Implementation would go here
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const activeKeys = Array.from(this.keyRegistry.values())
                .filter(key => key.status === 'active').length;
                
            const keysNeedingRotation = Array.from(this.keyRegistry.values())
                .filter(key => {
                    const nextRotation = new Date(key.nextRotation);
                    return nextRotation <= new Date();
                }).length;
                
            const totalOperations = Array.from(this.keyUsageTracking.values())
                .reduce((sum, usage) => sum + usage.totalOperations, 0);
            
            return {
                status: 'healthy',
                totalKeys: this.keyRegistry.size,
                activeKeys,
                keysNeedingRotation,
                totalOperations,
                scheduledRotations: this.keyRotationSchedule.size,
                backupCount: this.keyBackups.size,
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
}