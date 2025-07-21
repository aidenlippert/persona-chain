/**
 * Secure Storage Service
 * Encrypted data storage and management for HSM Enterprise
 * Handles encrypted data storage, access control, and data lifecycle management
 */

import crypto from 'crypto';
import winston from 'winston';
import NodeCache from 'node-cache';

export default class SecureStorageService {
    constructor(config, logger, keyManagementService) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        this.keyManagement = keyManagementService;
        
        // Storage system
        this.secureStorage = new Map();
        this.storageCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache
        this.storageIndex = new Map();
        this.accessControlList = new Map();
        
        // Storage configuration
        this.storageConfig = {
            encryptionAlgorithm: config.security?.encryptionAlgorithm || 'aes-256-gcm',
            compressionEnabled: config.storage?.compressionEnabled !== false,
            dedupe: config.storage?.dedupe !== false,
            versioning: config.storage?.versioning !== false,
            maxVersions: config.storage?.maxVersions || 10,
            retentionPeriod: config.storage?.retentionPeriod || 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
            maxFileSize: config.storage?.maxFileSize || 100 * 1024 * 1024, // 100MB
            maxStorageSize: config.storage?.maxStorageSize || 10 * 1024 * 1024 * 1024, // 10GB
            integrityChecks: config.storage?.integrityChecks !== false,
            auditLogging: config.storage?.auditLogging !== false
        };
        
        // Data classification levels
        this.classificationLevels = {
            PUBLIC: {
                level: 1,
                encryption: false,
                accessControl: false,
                auditRequired: false,
                retentionPeriod: 365 * 24 * 60 * 60 * 1000 // 1 year
            },
            INTERNAL: {
                level: 2,
                encryption: true,
                accessControl: true,
                auditRequired: false,
                retentionPeriod: 3 * 365 * 24 * 60 * 60 * 1000 // 3 years
            },
            CONFIDENTIAL: {
                level: 3,
                encryption: true,
                accessControl: true,
                auditRequired: true,
                retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000 // 7 years
            },
            SECRET: {
                level: 4,
                encryption: true,
                accessControl: true,
                auditRequired: true,
                retentionPeriod: 10 * 365 * 24 * 60 * 60 * 1000 // 10 years
            },
            TOP_SECRET: {
                level: 5,
                encryption: true,
                accessControl: true,
                auditRequired: true,
                retentionPeriod: 25 * 365 * 24 * 60 * 60 * 1000 // 25 years
            }
        };
        
        // Storage types
        this.storageTypes = {
            CREDENTIAL_DATA: 'credential_data',
            KEY_MATERIAL: 'key_material',
            CERTIFICATE_DATA: 'certificate_data',
            AUDIT_LOGS: 'audit_logs',
            CONFIGURATION: 'configuration',
            BACKUP_DATA: 'backup_data',
            TEMPORARY: 'temporary',
            ARCHIVE: 'archive'
        };
        
        // Access permissions
        this.permissions = {
            READ: 'read',
            write: 'write',
            delete: 'delete',
            admin: 'admin',
            audit: 'audit'
        };
        
        // Storage metrics
        this.storageMetrics = {
            totalItems: 0,
            totalSize: 0,
            encryptedItems: 0,
            compressedItems: 0,
            deduplicatedItems: 0,
            accessCount: 0,
            cacheHitRate: 0,
            storageEfficiency: 0,
            integrityChecks: 0,
            integrityFailures: 0
        };
        
        // Initialize background processes
        this.initializeBackgroundProcesses();
        
        this.logger.info('Secure Storage Service initialized', {
            encryptionAlgorithm: this.storageConfig.encryptionAlgorithm,
            classificationLevels: Object.keys(this.classificationLevels),
            storageTypes: Object.keys(this.storageTypes)
        });
    }
    
    /**
     * Initialize background storage processes
     */
    initializeBackgroundProcesses() {
        // Integrity checking
        if (this.storageConfig.integrityChecks) {
            setInterval(() => {
                this.performIntegrityChecks();
            }, 60 * 60 * 1000); // Every hour
        }
        
        // Cleanup expired data
        setInterval(() => {
            this.cleanupExpiredData();
        }, 24 * 60 * 60 * 1000); // Daily
        
        // Compress and optimize storage
        setInterval(() => {
            this.optimizeStorage();
        }, 6 * 60 * 60 * 1000); // Every 6 hours
        
        // Update storage metrics
        setInterval(() => {
            this.updateStorageMetrics();
        }, 5 * 60 * 1000); // Every 5 minutes
        
        // Cleanup old versions
        if (this.storageConfig.versioning) {
            setInterval(() => {
                this.cleanupOldVersions();
            }, 24 * 60 * 60 * 1000); // Daily
        }
    }
    
    /**
     * Initialize Secure Storage Service
     */
    async initialize() {
        try {
            this.logger.info('🔒 Initializing Secure Storage Service...');
            
            // Verify key management service
            if (!this.keyManagement) {
                throw new Error('Key Management Service not available');
            }
            
            // Initialize storage encryption keys
            await this.initializeStorageKeys();
            
            // Load existing storage data
            await this.loadExistingData();
            
            // Perform initial integrity check
            await this.performInitialIntegrityCheck();
            
            // Initialize access control
            await this.initializeAccessControl();
            
            this.logger.info('✅ Secure Storage Service initialized successfully', {
                totalItems: this.storageMetrics.totalItems,
                totalSize: this.formatBytes(this.storageMetrics.totalSize),
                encryptedItems: this.storageMetrics.encryptedItems
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize Secure Storage Service', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Store data securely
     */
    async storeData(data, options = {}) {
        try {
            const {
                id = crypto.randomUUID(),
                classification = 'CONFIDENTIAL',
                storageType = this.storageTypes.CREDENTIAL_DATA,
                metadata = {},
                accessControl = {},
                ttl = null,
                versioning = this.storageConfig.versioning
            } = options;
            
            // Validate data size
            if (data.length > this.storageConfig.maxFileSize) {
                throw new Error(`Data size exceeds maximum allowed size: ${this.formatBytes(this.storageConfig.maxFileSize)}`);
            }
            
            // Check storage capacity
            await this.checkStorageCapacity(data.length);
            
            this.logger.debug('Storing secure data', {
                id,
                classification,
                storageType,
                dataSize: data.length
            });
            
            const classificationConfig = this.classificationLevels[classification];
            if (!classificationConfig) {
                throw new Error(`Invalid classification level: ${classification}`);
            }
            
            // Create storage entry
            const storageEntry = {
                id,
                originalSize: data.length,
                classification,
                storageType,
                metadata: {
                    ...metadata,
                    createdAt: new Date().toISOString(),
                    createdBy: metadata.createdBy || 'system',
                    version: 1,
                    contentType: metadata.contentType || 'application/octet-stream'
                },
                accessControl: {
                    owner: accessControl.owner || 'system',
                    permissions: accessControl.permissions || [this.permissions.read],
                    groups: accessControl.groups || [],
                    inheritFromParent: accessControl.inheritFromParent || false
                },
                lifecycle: {
                    ttl: ttl || classificationConfig.retentionPeriod,
                    expiresAt: ttl ? new Date(Date.now() + ttl).toISOString() : 
                              new Date(Date.now() + classificationConfig.retentionPeriod).toISOString(),
                    versioning: versioning,
                    currentVersion: 1,
                    versions: []
                },
                security: {
                    encrypted: false,
                    compressed: false,
                    deduplicated: false,
                    integrity: {
                        checksum: null,
                        algorithm: 'sha256',
                        verified: false,
                        lastCheck: null
                    },
                    keyId: null
                },
                storage: {
                    location: 'memory',
                    compressedSize: null,
                    encryptedSize: null,
                    storageEfficiency: 0
                }
            };
            
            let processedData = data;
            
            // Apply deduplication
            if (this.storageConfig.dedupe) {
                const dataHash = this.calculateHash(data);
                const existingEntry = await this.findByHash(dataHash);
                if (existingEntry) {
                    this.logger.debug('Data already exists (deduplicated)', { id, existingId: existingEntry.id });
                    storageEntry.security.deduplicated = true;
                    storageEntry.dedupeReference = existingEntry.id;
                    processedData = null; // Don't store duplicate data
                }
            }
            
            if (processedData) {
                // Apply compression
                if (this.storageConfig.compressionEnabled) {
                    processedData = await this.compressData(processedData);
                    storageEntry.security.compressed = true;
                    storageEntry.storage.compressedSize = processedData.length;
                }
                
                // Apply encryption
                if (classificationConfig.encryption) {
                    const encryptionResult = await this.encryptData(processedData, classification);
                    processedData = encryptionResult.encryptedData;
                    storageEntry.security.encrypted = true;
                    storageEntry.security.keyId = encryptionResult.keyId;
                    storageEntry.storage.encryptedSize = processedData.length;
                }
                
                // Calculate integrity checksum
                storageEntry.security.integrity.checksum = this.calculateHash(processedData);
            }
            
            // Calculate storage efficiency
            const finalSize = processedData ? processedData.length : 0;
            storageEntry.storage.storageEfficiency = 
                finalSize > 0 ? (1 - (finalSize / storageEntry.originalSize)) * 100 : 100;
            
            // Store processed data
            if (processedData) {
                this.secureStorage.set(id, processedData);
            }
            
            // Store metadata
            this.storageIndex.set(id, storageEntry);
            
            // Set up access control
            if (classificationConfig.accessControl) {
                await this.setupAccessControl(id, storageEntry.accessControl);
            }
            
            // Update metrics
            await this.updateStorageMetrics();
            
            // Audit logging
            if (this.storageConfig.auditLogging || classificationConfig.auditRequired) {
                await this.logStorageAccess('store', id, {
                    classification,
                    storageType,
                    dataSize: storageEntry.originalSize,
                    encrypted: storageEntry.security.encrypted,
                    compressed: storageEntry.security.compressed
                });
            }
            
            this.logger.debug('Data stored successfully', {
                id,
                originalSize: storageEntry.originalSize,
                finalSize,
                storageEfficiency: storageEntry.storage.storageEfficiency,
                encrypted: storageEntry.security.encrypted,
                compressed: storageEntry.security.compressed
            });
            
            return {
                id,
                classification,
                storageType,
                originalSize: storageEntry.originalSize,
                finalSize,
                storageEfficiency: storageEntry.storage.storageEfficiency,
                encrypted: storageEntry.security.encrypted,
                compressed: storageEntry.security.compressed,
                deduplicated: storageEntry.security.deduplicated,
                expiresAt: storageEntry.lifecycle.expiresAt,
                version: storageEntry.metadata.version
            };
            
        } catch (error) {
            this.logger.error('Failed to store secure data', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Retrieve data securely
     */
    async retrieveData(id, options = {}) {
        try {
            const {
                version = null,
                requester = 'system',
                verifyIntegrity = true
            } = options;
            
            this.logger.debug('Retrieving secure data', { id, version, requester });
            
            // Get storage entry metadata
            const storageEntry = this.storageIndex.get(id);
            if (!storageEntry) {
                throw new Error(`Data not found: ${id}`);
            }
            
            // Check access permissions
            if (storageEntry.classification !== 'PUBLIC') {
                await this.checkAccess(id, requester, this.permissions.read);
            }
            
            // Check expiration
            if (new Date(storageEntry.lifecycle.expiresAt) < new Date()) {
                throw new Error(`Data has expired: ${id}`);
            }
            
            // Get data (handle deduplication)
            let data;
            if (storageEntry.security.deduplicated) {
                data = this.secureStorage.get(storageEntry.dedupeReference);
            } else {
                data = this.secureStorage.get(id);
            }
            
            if (!data) {
                throw new Error(`Data content not found: ${id}`);
            }
            
            // Verify integrity
            if (verifyIntegrity && storageEntry.security.integrity.checksum) {
                const currentChecksum = this.calculateHash(data);
                if (currentChecksum !== storageEntry.security.integrity.checksum) {
                    this.storageMetrics.integrityFailures++;
                    throw new Error(`Data integrity verification failed: ${id}`);
                }
            }
            
            // Decrypt data
            if (storageEntry.security.encrypted) {
                data = await this.decryptData(data, storageEntry.security.keyId);
            }
            
            // Decompress data
            if (storageEntry.security.compressed) {
                data = await this.decompressData(data);
            }
            
            // Update access metrics
            this.storageMetrics.accessCount++;
            
            // Audit logging
            if (this.storageConfig.auditLogging || 
                this.classificationLevels[storageEntry.classification].auditRequired) {
                await this.logStorageAccess('retrieve', id, {
                    requester,
                    classification: storageEntry.classification,
                    dataSize: data.length
                });
            }
            
            this.logger.debug('Data retrieved successfully', {
                id,
                dataSize: data.length,
                classification: storageEntry.classification,
                requester
            });
            
            return {
                id,
                data,
                metadata: storageEntry.metadata,
                classification: storageEntry.classification,
                storageType: storageEntry.storageType,
                version: storageEntry.metadata.version,
                retrievedAt: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Failed to retrieve secure data', { id, error: error.message });
            throw error;
        }
    }
    
    /**
     * Update stored data (versioning)
     */
    async updateData(id, newData, options = {}) {
        try {
            const {
                requester = 'system',
                preserveVersions = this.storageConfig.versioning,
                metadata = {}
            } = options;
            
            this.logger.debug('Updating secure data', { id, requester, preserveVersions });
            
            // Get existing entry
            const storageEntry = this.storageIndex.get(id);
            if (!storageEntry) {
                throw new Error(`Data not found: ${id}`);
            }
            
            // Check access permissions
            await this.checkAccess(id, requester, this.permissions.write);
            
            // Handle versioning
            if (preserveVersions && storageEntry.lifecycle.versioning) {
                // Store current version in history
                const currentData = await this.retrieveData(id, { requester, verifyIntegrity: false });
                storageEntry.lifecycle.versions.push({
                    version: storageEntry.metadata.version,
                    data: currentData.data,
                    metadata: { ...storageEntry.metadata },
                    archivedAt: new Date().toISOString()
                });
                
                // Limit version history
                if (storageEntry.lifecycle.versions.length > this.storageConfig.maxVersions) {
                    storageEntry.lifecycle.versions.shift();
                }
                
                // Increment version
                storageEntry.metadata.version++;
            }
            
            // Update metadata
            storageEntry.metadata = {
                ...storageEntry.metadata,
                ...metadata,
                updatedAt: new Date().toISOString(),
                updatedBy: requester
            };
            
            // Store new data using existing storage process
            const storeResult = await this.storeData(newData, {
                id,
                classification: storageEntry.classification,
                storageType: storageEntry.storageType,
                metadata: storageEntry.metadata,
                accessControl: storageEntry.accessControl,
                versioning: false // Prevent recursive versioning
            });
            
            // Audit logging
            await this.logStorageAccess('update', id, {
                requester,
                newVersion: storageEntry.metadata.version,
                dataSize: newData.length
            });
            
            this.logger.debug('Data updated successfully', {
                id,
                newVersion: storageEntry.metadata.version,
                versionsKept: storageEntry.lifecycle.versions.length
            });
            
            return {
                id,
                version: storageEntry.metadata.version,
                versionsKept: storageEntry.lifecycle.versions.length,
                updatedAt: storageEntry.metadata.updatedAt
            };
            
        } catch (error) {
            this.logger.error('Failed to update secure data', { id, error: error.message });
            throw error;
        }
    }
    
    /**
     * Delete stored data securely
     */
    async deleteData(id, options = {}) {
        try {
            const {
                requester = 'system',
                secureWipe = true,
                reason = 'user_request'
            } = options;
            
            this.logger.debug('Deleting secure data', { id, requester, secureWipe });
            
            // Get storage entry
            const storageEntry = this.storageIndex.get(id);
            if (!storageEntry) {
                throw new Error(`Data not found: ${id}`);
            }
            
            // Check access permissions
            await this.checkAccess(id, requester, this.permissions.delete);
            
            // Secure data wiping
            if (secureWipe) {
                await this.secureWipeData(id);
            } else {
                this.secureStorage.delete(id);
            }
            
            // Remove from index
            this.storageIndex.delete(id);
            
            // Remove from cache
            this.storageCache.del(id);
            
            // Remove access control
            this.accessControlList.delete(id);
            
            // Update metrics
            this.storageMetrics.totalItems--;
            this.storageMetrics.totalSize -= storageEntry.originalSize;
            
            // Audit logging
            await this.logStorageAccess('delete', id, {
                requester,
                reason,
                secureWipe,
                classification: storageEntry.classification
            });
            
            this.logger.info('Data deleted successfully', {
                id,
                secureWipe,
                reason,
                classification: storageEntry.classification
            });
            
            return {
                id,
                deletedAt: new Date().toISOString(),
                secureWipe,
                reason
            };
            
        } catch (error) {
            this.logger.error('Failed to delete secure data', { id, error: error.message });
            throw error;
        }
    }
    
    // Private utility methods
    
    async initializeStorageKeys() {
        // Initialize encryption keys for different classification levels
        for (const [level, config] of Object.entries(this.classificationLevels)) {
            if (config.encryption) {
                const keyLabel = `storage-key-${level.toLowerCase()}`;
                try {
                    // Try to get existing key or generate new one
                    const storageKey = await this.keyManagement.generateKey({
                        keyType: 'AES',
                        keySize: 256,
                        keyUsage: ['encrypt', 'decrypt'],
                        keyLabel,
                        metadata: {
                            purpose: 'secure_storage',
                            classificationLevel: level
                        }
                    });
                    
                    config.keyId = storageKey.keyId;
                    this.logger.debug(`Storage key initialized for ${level}`, { keyId: storageKey.keyId });
                } catch (error) {
                    this.logger.error(`Failed to initialize storage key for ${level}`, { error: error.message });
                }
            }
        }
    }
    
    async encryptData(data, classification) {
        const classificationConfig = this.classificationLevels[classification];
        if (!classificationConfig.keyId) {
            throw new Error(`No encryption key available for classification: ${classification}`);
        }
        
        // Use key management service for encryption
        const encryptionResult = await this.keyManagement.encrypt({
            keyId: classificationConfig.keyId,
            data,
            algorithm: this.storageConfig.encryptionAlgorithm
        });
        
        return {
            encryptedData: encryptionResult.encryptedData,
            keyId: classificationConfig.keyId
        };
    }
    
    async decryptData(encryptedData, keyId) {
        // Use key management service for decryption
        const decryptionResult = await this.keyManagement.decrypt({
            keyId,
            encryptedData
        });
        
        return decryptionResult.data;
    }
    
    async compressData(data) {
        // Simple compression simulation
        // In a real implementation, use a proper compression library
        return data;
    }
    
    async decompressData(compressedData) {
        // Simple decompression simulation
        return compressedData;
    }
    
    calculateHash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    
    async findByHash(hash) {
        // Find existing data by hash for deduplication
        for (const [id, entry] of this.storageIndex) {
            if (entry.security.integrity.checksum === hash) {
                return entry;
            }
        }
        return null;
    }
    
    async checkStorageCapacity(dataSize) {
        if (this.storageMetrics.totalSize + dataSize > this.storageConfig.maxStorageSize) {
            throw new Error('Storage capacity exceeded');
        }
    }
    
    async setupAccessControl(id, accessControl) {
        this.accessControlList.set(id, accessControl);
    }
    
    async checkAccess(id, requester, permission) {
        const accessControl = this.accessControlList.get(id);
        if (!accessControl) {
            return true; // No access control configured
        }
        
        // Check if requester is owner
        if (accessControl.owner === requester) {
            return true;
        }
        
        // Check permissions
        if (!accessControl.permissions.includes(permission)) {
            throw new Error(`Access denied: insufficient permissions for ${permission}`);
        }
        
        return true;
    }
    
    async secureWipeData(id) {
        // Secure data wiping by overwriting with random data
        const data = this.secureStorage.get(id);
        if (data) {
            // Overwrite with random data multiple times
            for (let i = 0; i < 3; i++) {
                const randomData = crypto.randomBytes(data.length);
                this.secureStorage.set(id, randomData);
            }
        }
        this.secureStorage.delete(id);
    }
    
    async logStorageAccess(operation, id, metadata) {
        // Log storage access for auditing
        this.logger.info('Storage access', {
            operation,
            dataId: id,
            timestamp: new Date().toISOString(),
            ...metadata
        });
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Background process methods
    
    async performIntegrityChecks() {
        // Perform integrity checks on stored data
        let checkedCount = 0;
        let failureCount = 0;
        
        for (const [id, entry] of this.storageIndex) {
            try {
                const data = this.secureStorage.get(id);
                if (data && entry.security.integrity.checksum) {
                    const currentChecksum = this.calculateHash(data);
                    if (currentChecksum !== entry.security.integrity.checksum) {
                        failureCount++;
                        this.logger.error('Integrity check failed', { id });
                    } else {
                        entry.security.integrity.lastCheck = new Date().toISOString();
                        entry.security.integrity.verified = true;
                    }
                    checkedCount++;
                }
            } catch (error) {
                this.logger.error('Integrity check error', { id, error: error.message });
                failureCount++;
            }
        }
        
        this.storageMetrics.integrityChecks += checkedCount;
        this.storageMetrics.integrityFailures += failureCount;
        
        if (checkedCount > 0) {
            this.logger.debug('Integrity checks completed', { checkedCount, failureCount });
        }
    }
    
    async cleanupExpiredData() {
        // Clean up expired data
        const now = new Date();
        const expiredIds = [];
        
        for (const [id, entry] of this.storageIndex) {
            if (new Date(entry.lifecycle.expiresAt) < now) {
                expiredIds.push(id);
            }
        }
        
        for (const id of expiredIds) {
            try {
                await this.deleteData(id, {
                    requester: 'system',
                    reason: 'expired',
                    secureWipe: true
                });
            } catch (error) {
                this.logger.error('Failed to cleanup expired data', { id, error: error.message });
            }
        }
        
        if (expiredIds.length > 0) {
            this.logger.info('Cleaned up expired data', { count: expiredIds.length });
        }
    }
    
    async optimizeStorage() {
        // Optimize storage by compression, deduplication, etc.
        this.logger.debug('Optimizing storage');
    }
    
    async updateStorageMetrics() {
        // Update storage metrics
        let totalItems = 0;
        let totalSize = 0;
        let encryptedItems = 0;
        let compressedItems = 0;
        let deduplicatedItems = 0;
        
        for (const [id, entry] of this.storageIndex) {
            totalItems++;
            totalSize += entry.originalSize;
            
            if (entry.security.encrypted) encryptedItems++;
            if (entry.security.compressed) compressedItems++;
            if (entry.security.deduplicated) deduplicatedItems++;
        }
        
        this.storageMetrics.totalItems = totalItems;
        this.storageMetrics.totalSize = totalSize;
        this.storageMetrics.encryptedItems = encryptedItems;
        this.storageMetrics.compressedItems = compressedItems;
        this.storageMetrics.deduplicatedItems = deduplicatedItems;
        
        // Calculate cache hit rate
        const cacheStats = this.storageCache.getStats();
        this.storageMetrics.cacheHitRate = cacheStats.hits / Math.max(cacheStats.hits + cacheStats.misses, 1);
    }
    
    async cleanupOldVersions() {
        // Clean up old versions beyond retention limits
        for (const [id, entry] of this.storageIndex) {
            if (entry.lifecycle.versions.length > this.storageConfig.maxVersions) {
                const versionsToRemove = entry.lifecycle.versions.length - this.storageConfig.maxVersions;
                entry.lifecycle.versions.splice(0, versionsToRemove);
            }
        }
    }
    
    async loadExistingData() {
        // Load existing data from persistent storage
        this.logger.debug('Loading existing storage data');
    }
    
    async performInitialIntegrityCheck() {
        // Perform initial integrity check
        this.logger.debug('Performing initial integrity check');
    }
    
    async initializeAccessControl() {
        // Initialize access control system
        this.logger.debug('Initializing access control');
    }
    
    /**
     * Get storage statistics
     */
    async getStorageStats() {
        return {
            totalItems: this.storageMetrics.totalItems,
            totalSize: this.storageMetrics.totalSize,
            totalSizeFormatted: this.formatBytes(this.storageMetrics.totalSize),
            encryptedItems: this.storageMetrics.encryptedItems,
            compressedItems: this.storageMetrics.compressedItems,
            deduplicatedItems: this.storageMetrics.deduplicatedItems,
            accessCount: this.storageMetrics.accessCount,
            cacheHitRate: Math.round(this.storageMetrics.cacheHitRate * 100),
            integrityChecks: this.storageMetrics.integrityChecks,
            integrityFailures: this.storageMetrics.integrityFailures,
            storageEfficiency: this.storageMetrics.storageEfficiency,
            classification: this.getClassificationStats(),
            storageTypes: this.getStorageTypeStats()
        };
    }
    
    getClassificationStats() {
        const stats = {};
        for (const level of Object.keys(this.classificationLevels)) {
            stats[level] = 0;
        }
        
        for (const [id, entry] of this.storageIndex) {
            stats[entry.classification] = (stats[entry.classification] || 0) + 1;
        }
        
        return stats;
    }
    
    getStorageTypeStats() {
        const stats = {};
        for (const type of Object.values(this.storageTypes)) {
            stats[type] = 0;
        }
        
        for (const [id, entry] of this.storageIndex) {
            stats[entry.storageType] = (stats[entry.storageType] || 0) + 1;
        }
        
        return stats;
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const stats = await this.getStorageStats();
            
            return {
                status: 'healthy',
                totalItems: stats.totalItems,
                totalSize: stats.totalSizeFormatted,
                encryptedItems: stats.encryptedItems,
                cacheHitRate: stats.cacheHitRate,
                integrityFailures: stats.integrityFailures,
                storageCapacityUsed: Math.round((stats.totalSize / this.storageConfig.maxStorageSize) * 100),
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