/**
 * Encryption Service
 * Data protection and cryptographic operations
 * Handles encryption, decryption, key management, and data security
 */

import crypto from 'crypto';
import NodeCache from 'node-cache';
import winston from 'winston';
import argon2 from 'argon2';

export default class EncryptionService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
        
        // Encryption storage
        this.keys = new Map();
        this.encryptedData = new Map();
        this.keyDerivationCache = new Map();
        
        // Encryption configuration
        this.encryptionConfig = {
            defaultAlgorithm: config.encryption?.algorithm || 'aes-256-gcm',
            keySize: config.encryption?.keySize || 32, // 256 bits
            ivSize: config.encryption?.ivSize || 16, // 128 bits
            tagSize: config.encryption?.tagSize || 16, // 128 bits
            saltSize: config.encryption?.saltSize || 32, // 256 bits
            iterations: config.encryption?.iterations || 100000,
            memoryLimit: config.encryption?.memoryLimit || 64 * 1024, // 64MB
            parallelism: config.encryption?.parallelism || 1,
            keyRotationInterval: config.encryption?.keyRotationInterval || 30 * 24 * 60 * 60 * 1000, // 30 days
        };
        
        // Supported algorithms
        this.algorithms = {
            AES_256_GCM: 'aes-256-gcm',
            AES_256_CBC: 'aes-256-cbc',
            CHACHA20_POLY1305: 'chacha20-poly1305',
            AES_192_GCM: 'aes-192-gcm',
            AES_128_GCM: 'aes-128-gcm'
        };
        
        // Key types
        this.keyTypes = {
            MASTER: 'master',
            DATA: 'data',
            SESSION: 'session',
            BACKUP: 'backup',
            DERIVED: 'derived'
        };
        
        // Data classification levels
        this.classificationLevels = {
            PUBLIC: 'public',
            INTERNAL: 'internal',
            CONFIDENTIAL: 'confidential',
            SECRET: 'secret',
            TOP_SECRET: 'top_secret'
        };
        
        // Initialize master key
        this.initializeMasterKey();
        
        this.logger.info('Encryption service initialized', {
            algorithm: this.encryptionConfig.defaultAlgorithm,
            keySize: this.encryptionConfig.keySize,
            iterations: this.encryptionConfig.iterations
        });
    }
    
    /**
     * Encrypt data with specified algorithm and classification
     */
    async encryptData(data, options = {}) {
        try {
            const {
                algorithm = this.encryptionConfig.defaultAlgorithm,
                classification = this.classificationLevels.CONFIDENTIAL,
                keyId = null,
                metadata = {}
            } = options;
            
            this.logger.debug('Encrypting data', {
                algorithm,
                classification,
                dataSize: typeof data === 'string' ? data.length : Buffer.byteLength(JSON.stringify(data))
            });
            
            // Get or create encryption key
            const encryptionKey = keyId 
                ? await this.getKey(keyId)
                : await this.generateDataKey(algorithm);
            
            // Prepare data for encryption
            const dataBuffer = this.prepareDataForEncryption(data);
            
            // Generate initialization vector
            const iv = crypto.randomBytes(this.encryptionConfig.ivSize);
            
            // Create cipher
            const cipher = crypto.createCipher(algorithm, encryptionKey.key);
            cipher.setAAD(Buffer.from(JSON.stringify(metadata))); // Additional authenticated data
            
            // Encrypt data
            let encrypted = cipher.update(dataBuffer);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // Get authentication tag (for GCM modes)
            const authTag = cipher.getAuthTag ? cipher.getAuthTag() : null;
            
            // Create encryption envelope
            const envelope = {
                id: crypto.randomUUID(),
                algorithm,
                classification,
                keyId: encryptionKey.id,
                iv: iv.toString('base64'),
                authTag: authTag ? authTag.toString('base64') : null,
                encryptedData: encrypted.toString('base64'),
                metadata: {
                    ...metadata,
                    originalSize: dataBuffer.length,
                    encryptedAt: new Date().toISOString(),
                    version: '1.0'
                },
                integrity: {
                    checksum: this.calculateChecksum(dataBuffer),
                    hmac: this.calculateHMAC(encrypted, encryptionKey.key)
                }
            };
            
            // Store encrypted data
            this.encryptedData.set(envelope.id, envelope);
            
            this.logger.debug('Data encrypted successfully', {
                envelopeId: envelope.id,
                algorithm,
                classification
            });
            
            return envelope;
            
        } catch (error) {
            this.logger.error('Failed to encrypt data', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Decrypt data using envelope
     */
    async decryptData(envelope, options = {}) {
        try {
            const {
                verifyIntegrity = true,
                verifyMetadata = true
            } = options;
            
            this.logger.debug('Decrypting data', {
                envelopeId: envelope.id,
                algorithm: envelope.algorithm,
                classification: envelope.classification
            });
            
            // Get decryption key
            const decryptionKey = await this.getKey(envelope.keyId);
            if (!decryptionKey) {
                throw new Error('Decryption key not found');
            }
            
            // Prepare encrypted data
            const iv = Buffer.from(envelope.iv, 'base64');
            const encryptedData = Buffer.from(envelope.encryptedData, 'base64');
            const authTag = envelope.authTag ? Buffer.from(envelope.authTag, 'base64') : null;
            
            // Verify HMAC integrity
            if (verifyIntegrity) {
                const expectedHmac = this.calculateHMAC(encryptedData, decryptionKey.key);
                if (expectedHmac !== envelope.integrity.hmac) {
                    throw new Error('Data integrity verification failed');
                }
            }
            
            // Create decipher
            const decipher = crypto.createDecipher(envelope.algorithm, decryptionKey.key);
            
            // Set additional authenticated data
            if (verifyMetadata) {
                decipher.setAAD(Buffer.from(JSON.stringify(envelope.metadata)));
            }
            
            // Set auth tag for GCM modes
            if (authTag) {
                decipher.setAuthTag(authTag);
            }
            
            // Decrypt data
            let decrypted = decipher.update(encryptedData);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            // Verify checksum
            if (verifyIntegrity) {
                const expectedChecksum = this.calculateChecksum(decrypted);
                if (expectedChecksum !== envelope.integrity.checksum) {
                    throw new Error('Data checksum verification failed');
                }
            }
            
            // Convert back to original format
            const data = this.restoreDataFromDecryption(decrypted, envelope.metadata);
            
            this.logger.debug('Data decrypted successfully', {
                envelopeId: envelope.id,
                originalSize: envelope.metadata.originalSize,
                decryptedSize: decrypted.length
            });
            
            return data;
            
        } catch (error) {
            this.logger.error('Failed to decrypt data', { 
                envelopeId: envelope?.id, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Generate new encryption key
     */
    async generateKey(keyType = this.keyTypes.DATA, algorithm = this.encryptionConfig.defaultAlgorithm) {
        try {
            this.logger.debug('Generating new encryption key', { keyType, algorithm });
            
            const keyId = crypto.randomUUID();
            const keySize = this.getKeySizeForAlgorithm(algorithm);
            
            // Generate random key
            const key = crypto.randomBytes(keySize);
            
            // Create key metadata
            const keyInfo = {
                id: keyId,
                type: keyType,
                algorithm,
                keySize,
                key: key,
                metadata: {
                    createdAt: new Date().toISOString(),
                    createdBy: 'encryption_service',
                    version: '1.0',
                    usage: 0,
                    maxUsage: keyType === this.keyTypes.SESSION ? 1000 : -1 // Unlimited for non-session keys
                },
                rotation: {
                    nextRotation: new Date(Date.now() + this.encryptionConfig.keyRotationInterval).toISOString(),
                    rotationCount: 0
                },
                security: {
                    classification: this.classificationLevels.SECRET,
                    keyDerivation: null,
                    parentKeyId: null
                }
            };
            
            // Store key
            this.keys.set(keyId, keyInfo);
            
            this.logger.info('Encryption key generated', {
                keyId,
                keyType,
                algorithm,
                keySize
            });
            
            return keyInfo;
            
        } catch (error) {
            this.logger.error('Failed to generate encryption key', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Derive key from password/passphrase
     */
    async deriveKey(password, salt = null, options = {}) {
        try {
            const {
                algorithm = this.encryptionConfig.defaultAlgorithm,
                iterations = this.encryptionConfig.iterations,
                memoryLimit = this.encryptionConfig.memoryLimit,
                parallelism = this.encryptionConfig.parallelism,
                keyType = this.keyTypes.DERIVED
            } = options;
            
            this.logger.debug('Deriving key from password', {
                algorithm,
                iterations,
                memoryLimit
            });
            
            // Generate salt if not provided
            const keySalt = salt || crypto.randomBytes(this.encryptionConfig.saltSize);
            
            // Create cache key for derived keys
            const cacheKey = crypto.createHash('sha256')
                .update(password)
                .update(keySalt)
                .update(iterations.toString())
                .digest('hex');
            
            // Check cache
            if (this.keyDerivationCache.has(cacheKey)) {
                this.logger.debug('Using cached derived key');
                return this.keyDerivationCache.get(cacheKey);
            }
            
            // Derive key using Argon2id
            const derivedKey = await argon2.hash(password, {
                salt: keySalt,
                saltLength: this.encryptionConfig.saltSize,
                timeCost: iterations,
                memoryCost: memoryLimit,
                parallelism: parallelism,
                type: argon2.argon2id,
                hashLength: this.getKeySizeForAlgorithm(algorithm),
                raw: true
            });
            
            const keyId = crypto.randomUUID();
            const keyInfo = {
                id: keyId,
                type: keyType,
                algorithm,
                keySize: derivedKey.length,
                key: derivedKey,
                metadata: {
                    createdAt: new Date().toISOString(),
                    createdBy: 'key_derivation',
                    version: '1.0',
                    usage: 0,
                    maxUsage: -1
                },
                security: {
                    classification: this.classificationLevels.SECRET,
                    keyDerivation: {
                        method: 'argon2id',
                        salt: keySalt.toString('base64'),
                        iterations,
                        memoryLimit,
                        parallelism
                    },
                    parentKeyId: null
                }
            };
            
            // Store in cache
            this.keyDerivationCache.set(cacheKey, keyInfo);
            
            // Store key
            this.keys.set(keyId, keyInfo);
            
            this.logger.info('Key derived successfully', {
                keyId,
                algorithm,
                keySize: derivedKey.length
            });
            
            return keyInfo;
            
        } catch (error) {
            this.logger.error('Failed to derive key', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Rotate encryption key
     */
    async rotateKey(keyId) {
        try {
            const oldKey = this.keys.get(keyId);
            if (!oldKey) {
                throw new Error('Key not found for rotation');
            }
            
            this.logger.info('Rotating encryption key', { keyId });
            
            // Generate new key with same parameters
            const newKey = await this.generateKey(oldKey.type, oldKey.algorithm);
            
            // Update rotation metadata
            newKey.security.parentKeyId = keyId;
            newKey.rotation.rotationCount = oldKey.rotation.rotationCount + 1;
            
            // Mark old key as rotated
            oldKey.metadata.rotatedAt = new Date().toISOString();
            oldKey.metadata.replacedBy = newKey.id;
            oldKey.rotation.rotated = true;
            
            this.logger.info('Key rotated successfully', {
                oldKeyId: keyId,
                newKeyId: newKey.id,
                rotationCount: newKey.rotation.rotationCount
            });
            
            return newKey;
            
        } catch (error) {
            this.logger.error('Failed to rotate key', { keyId, error: error.message });
            throw error;
        }
    }
    
    /**
     * Encrypt sensitive configuration data
     */
    async encryptConfiguration(configData, keyId = null) {
        try {
            this.logger.debug('Encrypting configuration data');
            
            return await this.encryptData(configData, {
                classification: this.classificationLevels.CONFIDENTIAL,
                keyId,
                metadata: {
                    type: 'configuration',
                    category: 'system'
                }
            });
            
        } catch (error) {
            this.logger.error('Failed to encrypt configuration', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Encrypt guardian credentials
     */
    async encryptGuardianCredentials(credentials, guardianId) {
        try {
            this.logger.debug('Encrypting guardian credentials', { guardianId });
            
            return await this.encryptData(credentials, {
                classification: this.classificationLevels.SECRET,
                metadata: {
                    type: 'guardian_credentials',
                    guardianId,
                    category: 'authentication'
                }
            });
            
        } catch (error) {
            this.logger.error('Failed to encrypt guardian credentials', { 
                guardianId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Encrypt audit logs
     */
    async encryptAuditLog(logData, classification = this.classificationLevels.INTERNAL) {
        try {
            this.logger.debug('Encrypting audit log');
            
            return await this.encryptData(logData, {
                classification,
                metadata: {
                    type: 'audit_log',
                    category: 'compliance'
                }
            });
            
        } catch (error) {
            this.logger.error('Failed to encrypt audit log', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate secure hash
     */
    generateHash(data, algorithm = 'sha256') {
        try {
            const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
            return crypto.createHash(algorithm).update(dataBuffer).digest('hex');
            
        } catch (error) {
            this.logger.error('Failed to generate hash', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate HMAC
     */
    generateHMAC(data, key, algorithm = 'sha256') {
        try {
            const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
            const keyBuffer = typeof key === 'string' ? Buffer.from(key) : key;
            
            return crypto.createHmac(algorithm, keyBuffer).update(dataBuffer).digest('hex');
            
        } catch (error) {
            this.logger.error('Failed to generate HMAC', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate random bytes
     */
    generateRandomBytes(size = 32) {
        try {
            return crypto.randomBytes(size);
            
        } catch (error) {
            this.logger.error('Failed to generate random bytes', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Generate random string
     */
    generateRandomString(length = 32, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        try {
            let result = '';
            const bytes = crypto.randomBytes(length);
            
            for (let i = 0; i < length; i++) {
                result += charset[bytes[i] % charset.length];
            }
            
            return result;
            
        } catch (error) {
            this.logger.error('Failed to generate random string', { error: error.message });
            throw error;
        }
    }
    
    // Utility methods
    
    async getKey(keyId) {
        const key = this.keys.get(keyId);
        if (!key) {
            return null;
        }
        
        // Increment usage counter
        key.metadata.usage++;
        
        // Check usage limits
        if (key.metadata.maxUsage > 0 && key.metadata.usage > key.metadata.maxUsage) {
            this.logger.warn('Key usage limit exceeded', { keyId, usage: key.metadata.usage });
        }
        
        return key;
    }
    
    async generateDataKey(algorithm) {
        return await this.generateKey(this.keyTypes.DATA, algorithm);
    }
    
    initializeMasterKey() {
        try {
            // Generate or load master key
            const masterKeyId = 'master_key_1';
            
            if (!this.keys.has(masterKeyId)) {
                const masterKey = {
                    id: masterKeyId,
                    type: this.keyTypes.MASTER,
                    algorithm: this.encryptionConfig.defaultAlgorithm,
                    keySize: this.encryptionConfig.keySize,
                    key: crypto.randomBytes(this.encryptionConfig.keySize),
                    metadata: {
                        createdAt: new Date().toISOString(),
                        createdBy: 'system_initialization',
                        version: '1.0',
                        usage: 0,
                        maxUsage: -1
                    },
                    security: {
                        classification: this.classificationLevels.TOP_SECRET,
                        keyDerivation: null,
                        parentKeyId: null
                    }
                };
                
                this.keys.set(masterKeyId, masterKey);
                this.logger.info('Master key initialized', { keyId: masterKeyId });
            }
            
        } catch (error) {
            this.logger.error('Failed to initialize master key', { error: error.message });
            throw error;
        }
    }
    
    getKeySizeForAlgorithm(algorithm) {
        const keySizes = {
            [this.algorithms.AES_256_GCM]: 32,
            [this.algorithms.AES_256_CBC]: 32,
            [this.algorithms.AES_192_GCM]: 24,
            [this.algorithms.AES_128_GCM]: 16,
            [this.algorithms.CHACHA20_POLY1305]: 32
        };
        
        return keySizes[algorithm] || this.encryptionConfig.keySize;
    }
    
    prepareDataForEncryption(data) {
        if (Buffer.isBuffer(data)) {
            return data;
        }
        
        if (typeof data === 'string') {
            return Buffer.from(data, 'utf8');
        }
        
        // Convert objects to JSON
        return Buffer.from(JSON.stringify(data), 'utf8');
    }
    
    restoreDataFromDecryption(buffer, metadata) {
        if (metadata.originalType === 'buffer') {
            return buffer;
        }
        
        const text = buffer.toString('utf8');
        
        try {
            // Try to parse as JSON
            return JSON.parse(text);
        } catch {
            // Return as string if not valid JSON
            return text;
        }
    }
    
    calculateChecksum(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    
    calculateHMAC(data, key) {
        return crypto.createHmac('sha256', key).update(data).digest('hex');
    }
    
    /**
     * Key management operations
     */
    async getAllKeys(includeSecrets = false) {
        try {
            const keys = Array.from(this.keys.values()).map(key => {
                const keyInfo = {
                    id: key.id,
                    type: key.type,
                    algorithm: key.algorithm,
                    keySize: key.keySize,
                    metadata: key.metadata,
                    rotation: key.rotation,
                    security: {
                        classification: key.security.classification,
                        parentKeyId: key.security.parentKeyId
                    }
                };
                
                // Include key material only if explicitly requested and authorized
                if (includeSecrets) {
                    keyInfo.key = key.key.toString('base64');
                    keyInfo.security.keyDerivation = key.security.keyDerivation;
                }
                
                return keyInfo;
            });
            
            return keys;
            
        } catch (error) {
            this.logger.error('Failed to get keys', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Delete key (mark as deleted, don't actually remove for audit purposes)
     */
    async deleteKey(keyId) {
        try {
            const key = this.keys.get(keyId);
            if (!key) {
                throw new Error('Key not found');
            }
            
            // Mark as deleted
            key.metadata.deletedAt = new Date().toISOString();
            key.metadata.status = 'deleted';
            
            this.logger.info('Key marked as deleted', { keyId });
            
            return {
                keyId,
                deletedAt: key.metadata.deletedAt
            };
            
        } catch (error) {
            this.logger.error('Failed to delete key', { keyId, error: error.message });
            throw error;
        }
    }
    
    /**
     * Backup keys
     */
    async backupKeys() {
        try {
            this.logger.info('Creating key backup');
            
            const activeKeys = Array.from(this.keys.values())
                .filter(key => key.metadata.status !== 'deleted');
            
            const backup = {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                keyCount: activeKeys.length,
                keys: activeKeys.map(key => ({
                    ...key,
                    key: key.key.toString('base64') // Encode key for backup
                })),
                integrity: {
                    checksum: this.calculateChecksum(Buffer.from(JSON.stringify(activeKeys))),
                    version: '1.0'
                }
            };
            
            // Encrypt backup
            const encryptedBackup = await this.encryptData(backup, {
                classification: this.classificationLevels.TOP_SECRET,
                metadata: {
                    type: 'key_backup',
                    category: 'security'
                }
            });
            
            this.logger.info('Key backup created', {
                backupId: backup.id,
                keyCount: backup.keyCount
            });
            
            return encryptedBackup;
            
        } catch (error) {
            this.logger.error('Failed to create key backup', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const activeKeys = Array.from(this.keys.values())
                .filter(key => key.metadata.status !== 'deleted').length;
            
            const keysNeedingRotation = Array.from(this.keys.values())
                .filter(key => {
                    const nextRotation = new Date(key.rotation.nextRotation);
                    return nextRotation <= new Date();
                }).length;
                
            return {
                status: 'healthy',
                totalKeys: this.keys.size,
                activeKeys,
                keysNeedingRotation,
                encryptedData: this.encryptedData.size,
                algorithms: Object.values(this.algorithms),
                configuration: {
                    defaultAlgorithm: this.encryptionConfig.defaultAlgorithm,
                    keySize: this.encryptionConfig.keySize,
                    keyRotationInterval: this.encryptionConfig.keyRotationInterval
                },
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