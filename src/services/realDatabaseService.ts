/**
 * REAL Database Service Implementation
 * Production-ready database with encryption, backup, and proper data management
 * NO LOCALSTORAGE - REAL PERSISTENT DATABASE
 */

import Dexie, { Table } from 'dexie';
import { cryptoService } from './cryptoService';
import { config } from '../config';
import type { VerifiableCredential } from '../types/wallet';
import type { DIDKeyPair } from '../services/didService';
import { errorService } from "@/services/errorService";

// Database schema interfaces
interface StoredDID {
  id: string;
  did: string;
  keyPair: string; // Encrypted
  document: string; // Encrypted
  method: string;
  created: Date;
  updated: Date;
  isActive: boolean;
  metadata: string; // Encrypted
}

interface StoredCredential {
  id: string;
  credentialId: string;
  credential: string; // Encrypted
  issuer: string;
  subject: string;
  type: string[];
  status: 'active' | 'revoked' | 'expired';
  issuanceDate: Date;
  expirationDate?: Date;
  created: Date;
  updated: Date;
  metadata: string; // Encrypted
}

interface StoredProof {
  id: string;
  proofId: string;
  circuitId: string;
  proof: string; // Encrypted
  publicSignals: string[];
  status: 'generated' | 'verified' | 'expired';
  created: Date;
  expiresAt?: Date;
  metadata: string; // Encrypted
}

interface StoredOperation {
  id: string;
  operationId: string;
  type: 'cross_chain' | 'zk_proof' | 'did_operation';
  data: string; // Encrypted
  status: 'pending' | 'completed' | 'failed';
  networkId: string;
  created: Date;
  updated: Date;
  metadata: string; // Encrypted
}

interface StoredSession {
  id: string;
  sessionId: string;
  userId: string;
  data: string; // Encrypted
  created: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface StoredBackup {
  id: string;
  backupId: string;
  data: string; // Encrypted
  checksum: string;
  created: Date;
  type: 'full' | 'incremental';
  size: number;
}

interface StoredSetting {
  id: string;
  key: string;
  value: string; // Encrypted
  type: 'user' | 'system';
  created: Date;
  updated: Date;
}

// Database class
class PersonaDatabase extends Dexie {
  dids!: Table<StoredDID>;
  credentials!: Table<StoredCredential>;
  proofs!: Table<StoredProof>;
  operations!: Table<StoredOperation>;
  sessions!: Table<StoredSession>;
  backups!: Table<StoredBackup>;
  settings!: Table<StoredSetting>;

  constructor() {
    super('PersonaPassDB');
    
    this.version(1).stores({
      dids: '++id, did, method, isActive, created',
      credentials: '++id, credentialId, issuer, subject, status, issuanceDate, expirationDate',
      proofs: '++id, proofId, circuitId, status, created, expiresAt',
      operations: '++id, operationId, type, status, networkId, created',
      sessions: '++id, sessionId, userId, created, expiresAt, isActive',
      backups: '++id, backupId, created, type, size',
      settings: '++id, key, type, created'
    });
  }
}

interface DatabaseConfig {
  encryptionKey: string;
  backupEnabled: boolean;
  backupInterval: number; // minutes
  maxBackups: number;
  compressionEnabled: boolean;
  debugMode: boolean;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

interface BackupResult {
  backupId: string;
  size: number;
  checksum: string;
  created: Date;
  type: 'full' | 'incremental';
}

export class RealDatabaseService {
  private static instance: RealDatabaseService;
  private db: PersonaDatabase;
  private encryptionKey: string;
  private config: DatabaseConfig;
  private backupTimer?: NodeJS.Timeout;
  private isInitialized = false;

  private constructor() {
    this.db = new PersonaDatabase();
    this.encryptionKey = '';
    this.config = {
      encryptionKey: '',
      backupEnabled: true,
      backupInterval: 60, // 1 hour
      maxBackups: 10,
      compressionEnabled: true,
      debugMode: config.app.environment === 'development'
    };
  }

  static getInstance(): RealDatabaseService {
    if (!RealDatabaseService.instance) {
      RealDatabaseService.instance = new RealDatabaseService();
    }
    return RealDatabaseService.instance;
  }

  /**
   * Initialize the database service
   */
  async initialize(encryptionKey: string): Promise<void> {
    try {
      this.encryptionKey = encryptionKey;
      this.config.encryptionKey = encryptionKey;

      // Open the database
      await this.db.open();

      // Setup backup if enabled
      if (this.config.backupEnabled) {
        this.setupAutomaticBackup();
      }

      // Clean up expired sessions and proofs
      await this.cleanupExpiredData();

      this.isInitialized = true;
      console.log('✅ Real Database Service initialized');
    } catch (error) {
      errorService.logError('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Store a DID securely
   */
  async storeDID(didKeyPair: DIDKeyPair): Promise<string> {
    this.ensureInitialized();

    try {
      const encryptedKeyPair = await cryptoService.encrypt(
        JSON.stringify(didKeyPair.keyPair),
        this.encryptionKey
      );
      
      const encryptedDocument = await cryptoService.encrypt(
        JSON.stringify(didKeyPair.document),
        this.encryptionKey
      );

      const encryptedMetadata = await cryptoService.encrypt(
        JSON.stringify(didKeyPair.metadata || {}),
        this.encryptionKey
      );

      const storedDID: StoredDID = {
        id: crypto.randomUUID(),
        did: didKeyPair.did,
        keyPair: encryptedKeyPair,
        document: encryptedDocument,
        method: didKeyPair.method,
        created: new Date(),
        updated: new Date(),
        isActive: true,
        metadata: encryptedMetadata
      };

      // Deactivate other DIDs
      await this.db.dids.where('isActive').equals(true).modify({ isActive: false });

      // Store new DID
      await this.db.dids.add(storedDID);

      if (this.config.debugMode) {
        console.log(`📝 Stored DID: ${didKeyPair.did}`);
      }

      return storedDID.id;
    } catch (error) {
      errorService.logError('❌ Failed to store DID:', error);
      throw error;
    }
  }

  /**
   * Retrieve a DID
   */
  async getDID(didId: string): Promise<DIDKeyPair | null> {
    this.ensureInitialized();

    try {
      const storedDID = await this.db.dids.get(didId);
      if (!storedDID) {
        return null;
      }

      const decryptedKeyPair = await cryptoService.decrypt(
        storedDID.keyPair,
        this.encryptionKey
      );
      
      const decryptedDocument = await cryptoService.decrypt(
        storedDID.document,
        this.encryptionKey
      );

      const decryptedMetadata = await cryptoService.decrypt(
        storedDID.metadata,
        this.encryptionKey
      );

      return {
        did: storedDID.did,
        keyPair: JSON.parse(decryptedKeyPair),
        document: JSON.parse(decryptedDocument),
        method: storedDID.method,
        metadata: JSON.parse(decryptedMetadata)
      };
    } catch (error) {
      errorService.logError('❌ Failed to retrieve DID:', error);
      return null;
    }
  }

  /**
   * Get the current active DID
   */
  async getCurrentDID(): Promise<string | null> {
    this.ensureInitialized();

    try {
      const activeDID = await this.db.dids.where('isActive').equals(true).first();
      return activeDID ? activeDID.id : null;
    } catch (error) {
      errorService.logError('❌ Failed to get current DID:', error);
      return null;
    }
  }

  /**
   * Store a credential securely
   */
  async storeCredential(credential: VerifiableCredential): Promise<string> {
    this.ensureInitialized();

    try {
      const encryptedCredential = await cryptoService.encrypt(
        JSON.stringify(credential),
        this.encryptionKey
      );

      const encryptedMetadata = await cryptoService.encrypt(
        JSON.stringify({ stored: Date.now() }),
        this.encryptionKey
      );

      const storedCredential: StoredCredential = {
        id: crypto.randomUUID(),
        credentialId: credential.id,
        credential: encryptedCredential,
        issuer: credential.issuer,
        subject: credential.credentialSubject.id,
        type: credential.type,
        status: 'active',
        issuanceDate: new Date(credential.issuanceDate),
        expirationDate: credential.expirationDate ? new Date(credential.expirationDate) : undefined,
        created: new Date(),
        updated: new Date(),
        metadata: encryptedMetadata
      };

      await this.db.credentials.add(storedCredential);

      if (this.config.debugMode) {
        console.log(`📝 Stored credential: ${credential.id}`);
      }

      return storedCredential.id;
    } catch (error) {
      errorService.logError('❌ Failed to store credential:', error);
      throw error;
    }
  }

  /**
   * Retrieve all credentials
   */
  async getCredentials(options: QueryOptions = {}): Promise<VerifiableCredential[]> {
    this.ensureInitialized();

    try {
      let query = this.db.credentials.where('status').equals('active');

      // Apply filters
      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          query = query.and(item => (item as any)[key] === value);
        }
      }

      // Apply sorting
      if (options.sortBy) {
        query = query.orderBy(options.sortBy);
        if (options.sortOrder === 'desc') {
          query = query.reverse();
        }
      }

      // Apply pagination
      if (options.offset) {
        query = query.offset(options.offset);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const storedCredentials = await query.toArray();
      const credentials: VerifiableCredential[] = [];

      for (const stored of storedCredentials) {
        try {
          const decryptedCredential = await cryptoService.decrypt(
            stored.credential,
            this.encryptionKey
          );
          credentials.push(JSON.parse(decryptedCredential));
        } catch (error) {
          errorService.logError(`❌ Failed to decrypt credential ${stored.id}:`, error);
        }
      }

      return credentials;
    } catch (error) {
      errorService.logError('❌ Failed to retrieve credentials:', error);
      return [];
    }
  }

  /**
   * Store a ZK proof
   */
  async storeProof(proofId: string, circuitId: string, proof: any, publicSignals: string[]): Promise<string> {
    this.ensureInitialized();

    try {
      const encryptedProof = await cryptoService.encrypt(
        JSON.stringify(proof),
        this.encryptionKey
      );

      const encryptedMetadata = await cryptoService.encrypt(
        JSON.stringify({ generated: Date.now() }),
        this.encryptionKey
      );

      const storedProof: StoredProof = {
        id: crypto.randomUUID(),
        proofId,
        circuitId,
        proof: encryptedProof,
        publicSignals,
        status: 'generated',
        created: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        metadata: encryptedMetadata
      };

      await this.db.proofs.add(storedProof);

      if (this.config.debugMode) {
        console.log(`📝 Stored proof: ${proofId}`);
      }

      return storedProof.id;
    } catch (error) {
      errorService.logError('❌ Failed to store proof:', error);
      throw error;
    }
  }

  /**
   * Store an operation
   */
  async storeOperation(operationId: string, type: string, data: any, networkId: string): Promise<string> {
    this.ensureInitialized();

    try {
      const encryptedData = await cryptoService.encrypt(
        JSON.stringify(data),
        this.encryptionKey
      );

      const encryptedMetadata = await cryptoService.encrypt(
        JSON.stringify({ created: Date.now() }),
        this.encryptionKey
      );

      const storedOperation: StoredOperation = {
        id: crypto.randomUUID(),
        operationId,
        type: type as any,
        data: encryptedData,
        status: 'pending',
        networkId,
        created: new Date(),
        updated: new Date(),
        metadata: encryptedMetadata
      };

      await this.db.operations.add(storedOperation);

      if (this.config.debugMode) {
        console.log(`📝 Stored operation: ${operationId}`);
      }

      return storedOperation.id;
    } catch (error) {
      errorService.logError('❌ Failed to store operation:', error);
      throw error;
    }
  }

  /**
   * Create a backup
   */
  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupResult> {
    this.ensureInitialized();

    try {
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Export all data
      const backupData = {
        dids: await this.db.dids.toArray(),
        credentials: await this.db.credentials.toArray(),
        proofs: await this.db.proofs.toArray(),
        operations: await this.db.operations.toArray(),
        settings: await this.db.settings.toArray(),
        version: 1,
        created: new Date()
      };

      // Encrypt backup data
      const encryptedBackup = await cryptoService.encrypt(
        JSON.stringify(backupData),
        this.encryptionKey
      );

      // Calculate checksum
      const checksum = await cryptoService.hash(encryptedBackup);

      const backup: StoredBackup = {
        id: crypto.randomUUID(),
        backupId,
        data: encryptedBackup,
        checksum,
        created: new Date(),
        type,
        size: encryptedBackup.length
      };

      await this.db.backups.add(backup);

      // Clean up old backups
      await this.cleanupOldBackups();

      console.log(`💾 Created ${type} backup: ${backupId}`);

      return {
        backupId,
        size: backup.size,
        checksum,
        created: backup.created,
        type
      };
    } catch (error) {
      errorService.logError('❌ Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const backup = await this.db.backups.where('backupId').equals(backupId).first();
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Decrypt backup data
      const decryptedData = await cryptoService.decrypt(backup.data, this.encryptionKey);
      const backupData = JSON.parse(decryptedData);

      // Verify checksum
      const calculatedChecksum = await cryptoService.hash(backup.data);
      if (calculatedChecksum !== backup.checksum) {
        throw new Error('Backup checksum verification failed');
      }

      // Clear existing data
      await this.db.transaction('rw', this.db.dids, this.db.credentials, this.db.proofs, this.db.operations, this.db.settings, async () => {
        await this.db.dids.clear();
        await this.db.credentials.clear();
        await this.db.proofs.clear();
        await this.db.operations.clear();
        await this.db.settings.clear();

        // Restore data
        await this.db.dids.bulkAdd(backupData.dids);
        await this.db.credentials.bulkAdd(backupData.credentials);
        await this.db.proofs.bulkAdd(backupData.proofs);
        await this.db.operations.bulkAdd(backupData.operations);
        await this.db.settings.bulkAdd(backupData.settings);
      });

      console.log(`🔄 Restored from backup: ${backupId}`);
      return true;
    } catch (error) {
      errorService.logError('❌ Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    dids: number;
    credentials: number;
    proofs: number;
    operations: number;
    sessions: number;
    backups: number;
    totalSize: number;
    lastBackup?: Date;
  }> {
    this.ensureInitialized();

    try {
      const [dids, credentials, proofs, operations, sessions, backups] = await Promise.all([
        this.db.dids.count(),
        this.db.credentials.count(),
        this.db.proofs.count(),
        this.db.operations.count(),
        this.db.sessions.count(),
        this.db.backups.count()
      ]);

      const lastBackup = await this.db.backups.orderBy('created').last();

      return {
        dids,
        credentials,
        proofs,
        operations,
        sessions,
        backups,
        totalSize: 0, // Would need to calculate actual size
        lastBackup: lastBackup?.created
      };
    } catch (error) {
      errorService.logError('❌ Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized');
    }
  }

  private setupAutomaticBackup(): void {
    this.backupTimer = setInterval(async () => {
      try {
        await this.createBackup('incremental');
      } catch (error) {
        errorService.logError('❌ Automatic backup failed:', error);
      }
    }, this.config.backupInterval * 60 * 1000);
  }

  private async cleanupExpiredData(): Promise<void> {
    const now = new Date();
    
    // Clean up expired sessions
    await this.db.sessions.where('expiresAt').below(now).delete();
    
    // Clean up expired proofs
    await this.db.proofs.where('expiresAt').below(now).delete();
    
    console.log('🧹 Cleaned up expired data');
  }

  private async cleanupOldBackups(): Promise<void> {
    const backupCount = await this.db.backups.count();
    
    if (backupCount > this.config.maxBackups) {
      const oldBackups = await this.db.backups
        .orderBy('created')
        .limit(backupCount - this.config.maxBackups)
        .toArray();
      
      for (const backup of oldBackups) {
        await this.db.backups.delete(backup.id);
      }
    }
  }

  /**
   * Close the database
   */
  async close(): Promise<void> {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }
    
    await this.db.close();
    this.isInitialized = false;
    console.log('🔌 Database closed');
  }
}

// Export singleton instance
export const realDatabaseService = RealDatabaseService.getInstance();