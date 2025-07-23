/**
 * Persona Wallet Storage Service
 * Handles secure storage of credentials, DIDs, and wallet data using IndexedDB
 */

import Dexie, { Table } from "dexie";
import type {
  DID,
  WalletCredential,
  WalletConnection,
  WalletConfig,
  SharingRecord,
  PasskeyCredential,
  BackupData,
  RecoveryPhrase,
  VerifiableCredential,
  ZKCredential,
} from "@/types/wallet";
import { CryptoService, type EncryptionResult } from "./cryptoService";
import { errorService } from "@/services/errorService";

interface StoredDID extends DID {
  encrypted: boolean;
  encryptedData?: string;
}

interface StoredCredential extends Omit<WalletCredential, "credential"> {
  credentialData: string;
  encrypted: boolean;
}

interface StoredConnection extends WalletConnection {
  encrypted: boolean;
  encryptedData?: string;
}

interface StoredSharingRecord extends SharingRecord {
  encrypted: boolean;
}

interface StoredPasskey extends PasskeyCredential {
  encrypted: boolean;
  encryptedData?: string;
}

interface StoredRecoveryPhrase {
  id: string;
  encryptedPhrase: string;
  created: string;
  verified: boolean;
  strength: 128 | 256;
  salt: string;
  iv: string;
}

interface StoredZKCredential {
  id: string;
  type: string[];
  holder: string;
  metadata: ZKCredential["metadata"];
  credentialData: string;
  encrypted: boolean;
  created: string;
}

class WalletDatabase extends Dexie {
  dids!: Table<StoredDID>;
  credentials!: Table<StoredCredential>;
  connections!: Table<StoredConnection>;
  config!: Table<WalletConfig>;
  sharingHistory!: Table<StoredSharingRecord>;
  passkeys!: Table<StoredPasskey>;
  recoveryPhrases!: Table<StoredRecoveryPhrase>;
  backups!: Table<BackupData>;
  zkCredentials!: Table<StoredZKCredential>;

  constructor() {
    super("PersonaWallet");

    this.version(1).stores({
      dids: "++id, method, identifier, controller, created",
      credentials: "++id, metadata.tags, metadata.source, storage.encrypted",
      connections: "++id, domain, trustLevel, active, lastUsed",
      config: "++id, version, created",
      sharingHistory: "++id, verifier.domain, timestamp, status",
      passkeys: "++id, name, created, active",
      recoveryPhrases: "++id, created, verified",
      backups: "++created, wallet_id",
      zkCredentials: "++id, type, holder, metadata.credentialType, created",
    });
  }
}

export class StorageService {
  private static instance: StorageService;
  private db: WalletDatabase;
  private cryptoService: CryptoService;
  private encryptionPassword?: string;

  private constructor() {
    this.db = new WalletDatabase();
    this.cryptoService = CryptoService.getInstance();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Initialize storage with encryption password
   */
  async initialize(password?: string): Promise<void> {
    try {
      await this.db.open();
      this.encryptionPassword = password;
    } catch (error) {
      errorService.logError("Error initializing storage:", error);
      throw new Error("Failed to initialize storage");
    }
  }

  /**
   * Generic key-value storage (for simple data)
   */
  async setItem(key: string, value: any): Promise<void> {
    try {
      const data = {
        key,
        value: JSON.stringify(value),
        timestamp: Date.now()
      };
      await this.db.transaction('rw', this.db.connections, async () => {
        // Use connections table for generic storage since it's not type-specific
        await this.db.connections.put({
          ...data,
          id: key,
          metadata: {},
          permissions: []
        } as any);
      });
    } catch (error) {
      errorService.logError("Error setting item:", error);
      // Fallback to localStorage
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  /**
   * Generic key-value retrieval
   */
  async getItem(key: string): Promise<any> {
    try {
      const item = await this.db.connections.get(key);
      if (item && typeof item === 'object') {
        // Check for the value property safely with additional null checks
        let itemValue;
        try {
          itemValue = (item as any).value;
        } catch (accessError) {
          console.warn('Failed to access value property:', key, accessError);
          return null;
        }
        
        if (itemValue !== undefined && itemValue !== null) {
          try {
            return JSON.parse(itemValue);
          } catch (parseError) {
            console.warn('Failed to parse stored item value:', key, parseError);
            return itemValue; // Return raw value if parsing fails
          }
        }
      }
      return null;
    } catch (error) {
      errorService.logError("Error getting item:", error);
      // Fallback to localStorage
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (parseError) {
        console.warn('Failed to parse localStorage item:', key, parseError);
        return localStorage.getItem(key); // Return raw string if parsing fails
      }
    }
  }

  /**
   * Generic key-value removal
   */
  async removeItem(key: string): Promise<void> {
    try {
      await this.db.connections.delete(key);
    } catch (error) {
      errorService.logError("Error removing item:", error);
      // Fallback to localStorage
      localStorage.removeItem(key);
    }
  }

  /**
   * Store a DID document
   */
  async storeDID(did: DID, encrypt: boolean = true): Promise<void> {
    try {
      let storedDID: StoredDID;

      if (encrypt && this.encryptionPassword) {
        const encryptedData = await this.cryptoService.encryptData(
          JSON.stringify(did),
          this.encryptionPassword,
        );
        storedDID = {
          ...did,
          encrypted: true,
          encryptedData: JSON.stringify(encryptedData),
        };
      } else {
        storedDID = {
          ...did,
          encrypted: false,
        };
      }

      await this.db.dids.put(storedDID);
    } catch (error) {
      errorService.logError("Error storing DID:", error);
      throw new Error("Failed to store DID");
    }
  }

  /**
   * Retrieve a DID document by ID
   */
  async getDID(id: string): Promise<DID | null> {
    try {
      const storedDID = await this.db.dids.where("id").equals(id).first();
      if (!storedDID) return null;

      if (
        storedDID.encrypted &&
        storedDID.encryptedData &&
        this.encryptionPassword
      ) {
        const encryptionResult: EncryptionResult = JSON.parse(
          storedDID.encryptedData,
        );
        const decryptedData = await this.cryptoService.decryptData(
          encryptionResult,
          this.encryptionPassword,
        );
        return JSON.parse(decryptedData);
      }

      // Remove encryption-related fields for unencrypted data
      const { encrypted, encryptedData, ...did } = storedDID;
      return did;
    } catch (error) {
      errorService.logError("Error retrieving DID:", error);
      throw new Error("Failed to retrieve DID");
    }
  }

  /**
   * Get all DIDs
   */
  async getAllDIDs(): Promise<DID[]> {
    try {
      const storedDIDs = await this.db.dids.toArray();
      const dids: DID[] = [];

      for (const storedDID of storedDIDs) {
        if (
          storedDID.encrypted &&
          storedDID.encryptedData &&
          this.encryptionPassword
        ) {
          try {
            const encryptionResult: EncryptionResult = JSON.parse(
              storedDID.encryptedData,
            );
            const decryptedData = await this.cryptoService.decryptData(
              encryptionResult,
              this.encryptionPassword,
            );
            dids.push(JSON.parse(decryptedData));
          } catch (decryptError) {
            console.warn("Failed to decrypt DID:", storedDID.id);
          }
        } else {
          const { encrypted, encryptedData, ...did } = storedDID;
          dids.push(did);
        }
      }

      return dids;
    } catch (error) {
      errorService.logError("Error retrieving all DIDs:", error);
      throw new Error("Failed to retrieve DIDs");
    }
  }

  /**
   * Set the current active DID
   */
  async setCurrentDID(didId: string): Promise<void> {
    try {
      await this.setItem('current_did', didId);
      await this.setItem('user_did', didId);
    } catch (error) {
      errorService.logError("Error setting current DID:", error);
      throw new Error("Failed to set current DID");
    }
  }

  /**
   * Get the current active DID
   */
  async getCurrentDID(): Promise<string | null> {
    try {
      return await this.getItem('current_did');
    } catch (error) {
      errorService.logError("Error getting current DID:", error);
      return null;
    }
  }

  /**
   * Store a verifiable credential
   */
  async storeCredential(
    credential: WalletCredential,
    encrypt: boolean = true,
  ): Promise<void> {
    try {
      let credentialData: string;

      if (encrypt && this.encryptionPassword) {
        const encryptedData = await this.cryptoService.encryptData(
          JSON.stringify(credential.credential),
          this.encryptionPassword,
        );
        credentialData = JSON.stringify(encryptedData);
      } else {
        credentialData = JSON.stringify(credential.credential);
      }

      const storedCredential: StoredCredential = {
        id: credential.id,
        metadata: credential.metadata,
        storage: {
          ...credential.storage,
          encrypted: encrypt,
        },
        credentialData,
        encrypted: encrypt,
      };

      await this.db.credentials.put(storedCredential);
    } catch (error) {
      errorService.logError("Error storing credential:", error);
      throw new Error("Failed to store credential");
    }
  }

  /**
   * Retrieve a credential by ID
   */
  async getCredential(id: string): Promise<WalletCredential | null> {
    try {
      const storedCredential = await this.db.credentials
        .where("id")
        .equals(id)
        .first();
      if (!storedCredential) return null;

      let credentialObject: VerifiableCredential | ZKCredential;

      if (storedCredential.encrypted && this.encryptionPassword) {
        const encryptionResult: EncryptionResult = JSON.parse(
          storedCredential.credentialData,
        );
        const decryptedData = await this.cryptoService.decryptData(
          encryptionResult,
          this.encryptionPassword,
        );
        credentialObject = JSON.parse(decryptedData);
      } else {
        credentialObject = JSON.parse(storedCredential.credentialData);
      }

      return {
        id: storedCredential.id,
        type: credentialObject.type || "VerifiableCredential",
        credential: credentialObject,
        metadata: storedCredential.metadata,
        storage: storedCredential.storage,
      };
    } catch (error) {
      errorService.logError("Error retrieving credential:", error);
      throw new Error("Failed to retrieve credential");
    }
  }

  /**
   * Get all credentials with optional filtering
   */
  async getCredentials(filter?: {
    tags?: string[];
    source?: string;
    encrypted?: boolean;
  }): Promise<WalletCredential[]> {
    try {
      let query = this.db.credentials.toCollection();

      if (filter?.source) {
        query = this.db.credentials
          .where("metadata.source")
          .equals(filter.source);
      }

      if (filter?.encrypted !== undefined) {
        query = query.filter((cred) => cred.encrypted === filter.encrypted);
      }

      const storedCredentials = await query.toArray();
      const credentials: WalletCredential[] = [];

      for (const storedCredential of storedCredentials) {
        try {
          let credentialObject: VerifiableCredential | ZKCredential;

          if (storedCredential.encrypted && this.encryptionPassword) {
            const encryptionResult: EncryptionResult = JSON.parse(
              storedCredential.credentialData,
            );
            const decryptedData = await this.cryptoService.decryptData(
              encryptionResult,
              this.encryptionPassword,
            );
            credentialObject = JSON.parse(decryptedData);
          } else {
            credentialObject = JSON.parse(storedCredential.credentialData);
          }

          const credential: WalletCredential = {
            id: storedCredential.id,
            type: credentialObject.type || "VerifiableCredential",
            credential: credentialObject,
            metadata: storedCredential.metadata,
            storage: storedCredential.storage,
          };

          // Apply tag filtering
          if (filter?.tags && filter.tags.length > 0) {
            const hasMatchingTag = filter.tags.some((tag) =>
              credential.metadata.tags.includes(tag),
            );
            if (hasMatchingTag) {
              credentials.push(credential);
            }
          } else {
            credentials.push(credential);
          }
        } catch (decryptError) {
          console.warn("Failed to decrypt credential:", storedCredential.id);
        }
      }

      return credentials;
    } catch (error) {
      errorService.logError("Error retrieving credentials:", error);
      throw new Error("Failed to retrieve credentials");
    }
  }

  /**
   * Store a wallet connection
   */
  async storeConnection(
    connection: WalletConnection,
    encrypt: boolean = true,
  ): Promise<void> {
    try {
      let storedConnection: StoredConnection;

      if (encrypt && this.encryptionPassword) {
        const encryptedData = await this.cryptoService.encryptData(
          JSON.stringify(connection),
          this.encryptionPassword,
        );
        storedConnection = {
          ...connection,
          encrypted: true,
          encryptedData: JSON.stringify(encryptedData),
        };
      } else {
        storedConnection = {
          ...connection,
          encrypted: false,
        };
      }

      await this.db.connections.put(storedConnection);
    } catch (error) {
      errorService.logError("Error storing connection:", error);
      throw new Error("Failed to store connection");
    }
  }

  /**
   * Get wallet connections
   */
  async getConnections(
    activeOnly: boolean = false,
  ): Promise<WalletConnection[]> {
    try {
      let query = activeOnly
        ? this.db.connections.where("active").equals(1)
        : this.db.connections.toCollection();

      const storedConnections = await query.toArray();
      const connections: WalletConnection[] = [];

      for (const storedConnection of storedConnections) {
        if (
          storedConnection.encrypted &&
          storedConnection.encryptedData &&
          this.encryptionPassword
        ) {
          try {
            const encryptionResult: EncryptionResult = JSON.parse(
              storedConnection.encryptedData,
            );
            const decryptedData = await this.cryptoService.decryptData(
              encryptionResult,
              this.encryptionPassword,
            );
            connections.push(JSON.parse(decryptedData));
          } catch (decryptError) {
            console.warn("Failed to decrypt connection:", storedConnection.id);
          }
        } else {
          const { encrypted, encryptedData, ...connection } = storedConnection;
          connections.push(connection);
        }
      }

      return connections;
    } catch (error) {
      errorService.logError("Error retrieving connections:", error);
      throw new Error("Failed to retrieve connections");
    }
  }

  /**
   * Store wallet configuration
   */
  async storeConfig(config: WalletConfig): Promise<void> {
    try {
      await this.db.config.put(config);
    } catch (error) {
      errorService.logError("Error storing config:", error);
      throw new Error("Failed to store wallet configuration");
    }
  }

  /**
   * Get wallet configuration
   */
  async getConfig(): Promise<WalletConfig | null> {
    try {
      return (await this.db.config.orderBy("created").last()) || null;
    } catch (error) {
      errorService.logError("Error retrieving config:", error);
      throw new Error("Failed to retrieve wallet configuration");
    }
  }

  /**
   * Store sharing record
   */
  async storeSharingRecord(record: SharingRecord): Promise<void> {
    try {
      const storedRecord: StoredSharingRecord = {
        ...record,
        encrypted: false,
      };
      await this.db.sharingHistory.put(storedRecord);
    } catch (error) {
      errorService.logError("Error storing sharing record:", error);
      throw new Error("Failed to store sharing record");
    }
  }

  /**
   * Get sharing history
   */
  async getSharingHistory(limit?: number): Promise<SharingRecord[]> {
    try {
      let query = this.db.sharingHistory.orderBy("timestamp").reverse();

      if (limit) {
        query = query.limit(limit);
      }

      const records = await query.toArray();
      return records.map(({ encrypted, ...record }) => record);
    } catch (error) {
      errorService.logError("Error retrieving sharing history:", error);
      throw new Error("Failed to retrieve sharing history");
    }
  }

  /**
   * Store passkey credential
   */
  async storePasskey(
    passkey: PasskeyCredential,
    encrypt: boolean = true,
  ): Promise<void> {
    try {
      let storedPasskey: StoredPasskey;

      if (encrypt && this.encryptionPassword) {
        const encryptedData = await this.cryptoService.encryptData(
          JSON.stringify(passkey),
          this.encryptionPassword,
        );
        storedPasskey = {
          ...passkey,
          encrypted: true,
          encryptedData: JSON.stringify(encryptedData),
        };
      } else {
        storedPasskey = {
          ...passkey,
          encrypted: false,
        };
      }

      await this.db.passkeys.put(storedPasskey);
    } catch (error) {
      errorService.logError("Error storing passkey:", error);
      throw new Error("Failed to store passkey");
    }
  }

  /**
   * Get passkey credentials
   */
  async getPasskeys(activeOnly: boolean = true): Promise<PasskeyCredential[]> {
    try {
      let query = activeOnly
        ? this.db.passkeys.where("active").equals(1)
        : this.db.passkeys.toCollection();

      const storedPasskeys = await query.toArray();
      const passkeys: PasskeyCredential[] = [];

      for (const storedPasskey of storedPasskeys) {
        if (
          storedPasskey.encrypted &&
          storedPasskey.encryptedData &&
          this.encryptionPassword
        ) {
          try {
            const encryptionResult: EncryptionResult = JSON.parse(
              storedPasskey.encryptedData,
            );
            const decryptedData = await this.cryptoService.decryptData(
              encryptionResult,
              this.encryptionPassword,
            );
            passkeys.push(JSON.parse(decryptedData));
          } catch (decryptError) {
            console.warn("Failed to decrypt passkey:", storedPasskey.id);
          }
        } else {
          const { encrypted, encryptedData, ...passkey } = storedPasskey;
          passkeys.push(passkey);
        }
      }

      return passkeys;
    } catch (error) {
      errorService.logError("Error retrieving passkeys:", error);
      throw new Error("Failed to retrieve passkeys");
    }
  }

  /**
   * Store encrypted recovery phrase
   */
  async storeRecoveryPhrase(
    phrase: RecoveryPhrase,
    password: string,
  ): Promise<void> {
    try {
      const encryptionResult = await this.cryptoService.encryptData(
        phrase.phrase,
        password,
      );

      const storedPhrase: StoredRecoveryPhrase = {
        id: phrase.id,
        encryptedPhrase: encryptionResult.ciphertext,
        created: phrase.created,
        verified: phrase.verified,
        strength: phrase.strength,
        salt: encryptionResult.salt,
        iv: encryptionResult.iv,
      };

      await this.db.recoveryPhrases.put(storedPhrase);
    } catch (error) {
      errorService.logError("Error storing recovery phrase:", error);
      throw new Error("Failed to store recovery phrase");
    }
  }

  /**
   * Get recovery phrase
   */
  async getRecoveryPhrase(
    id: string,
    password: string,
  ): Promise<RecoveryPhrase | null> {
    try {
      const storedPhrase = await this.db.recoveryPhrases
        .where("id")
        .equals(id)
        .first();
      if (!storedPhrase) return null;

      const encryptionResult: EncryptionResult = {
        ciphertext: storedPhrase.encryptedPhrase,
        salt: storedPhrase.salt,
        iv: storedPhrase.iv,
        algorithm: "AES-256-GCM",
      };

      const decryptedPhrase = await this.cryptoService.decryptData(
        encryptionResult,
        password,
      );

      return {
        id: storedPhrase.id,
        phrase: decryptedPhrase,
        created: storedPhrase.created,
        verified: storedPhrase.verified,
        backup_locations: [],
        strength: storedPhrase.strength,
      };
    } catch (error) {
      errorService.logError("Error retrieving recovery phrase:", error);
      throw new Error("Failed to retrieve recovery phrase");
    }
  }

  /**
   * Create backup of wallet data
   */
  async createBackup(walletId: string): Promise<BackupData> {
    try {
      const dids = await this.getAllDIDs();
      const credentials = await this.getCredentials();
      const connections = await this.getConnections();
      const config = await this.getConfig();
      const sharingHistory = await this.getSharingHistory();

      const backupData: BackupData = {
        version: "1.0.0",
        created: new Date().toISOString(),
        wallet_id: walletId,
        data: {
          dids,
          credentials,
          connections,
          config: config!,
          sharing_history: sharingHistory,
        },
        encryption: {
          algorithm: "AES-256-GCM",
          key_derivation: "PBKDF2",
          salt: "",
          iv: "",
        },
        checksum: "",
      };

      // Calculate checksum
      const dataString = JSON.stringify(backupData.data);
      backupData.checksum = await this.cryptoService.generateHash(dataString);

      await this.db.backups.put(backupData);
      return backupData;
    } catch (error) {
      errorService.logError("Error creating backup:", error);
      throw new Error("Failed to create backup");
    }
  }

  /**
   * Delete credential
   */
  async deleteCredential(id: string): Promise<void> {
    try {
      await this.db.credentials.delete(id);
    } catch (error) {
      errorService.logError("Error deleting credential:", error);
      throw new Error("Failed to delete credential");
    }
  }

  /**
   * Delete connection
   */
  async deleteConnection(id: string): Promise<void> {
    try {
      await this.db.connections.delete(id);
    } catch (error) {
      errorService.logError("Error deleting connection:", error);
      throw new Error("Failed to delete connection");
    }
  }

  /**
   * Clear all data (for testing or reset)
   */
  async clearAll(): Promise<void> {
    try {
      await this.db.delete();
      this.db = new WalletDatabase();
      await this.db.open();
    } catch (error) {
      errorService.logError("Error clearing storage:", error);
      throw new Error("Failed to clear storage");
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    dids: number;
    credentials: number;
    connections: number;
    sharingRecords: number;
    passkeys: number;
  }> {
    try {
      const [dids, credentials, connections, sharingRecords, passkeys] =
        await Promise.all([
          this.db.dids.count(),
          this.db.credentials.count(),
          this.db.connections.count(),
          this.db.sharingHistory.count(),
          this.db.passkeys.count(),
        ]);

      return {
        dids,
        credentials,
        connections,
        sharingRecords,
        passkeys,
      };
    } catch (error) {
      errorService.logError("Error getting storage stats:", error);
      throw new Error("Failed to get storage statistics");
    }
  }

  /**
   * Store a ZK credential
   */
  async storeZKCredential(
    zkCredential: ZKCredential,
    encrypt: boolean = true,
  ): Promise<void> {
    try {
      let credentialData: string;

      if (encrypt && this.encryptionPassword) {
        const encryptedData = await this.cryptoService.encryptData(
          JSON.stringify(zkCredential),
          this.encryptionPassword,
        );
        credentialData = JSON.stringify(encryptedData);
      } else {
        credentialData = JSON.stringify(zkCredential);
      }

      const storedZKCredential: StoredZKCredential = {
        id: zkCredential.id,
        type: [zkCredential.type],
        holder: "did:example:holder",
        metadata: zkCredential.metadata,
        credentialData,
        encrypted: encrypt,
        created: zkCredential.created,
      };

      await this.db.zkCredentials.put(storedZKCredential);
    } catch (error) {
      errorService.logError("Error storing ZK credential:", error);
      throw new Error("Failed to store ZK credential");
    }
  }

  /**
   * Get ZK credentials
   */
  async getZKCredentials(): Promise<ZKCredential[]> {
    try {
      const storedCredentials = await this.db.zkCredentials.toArray();
      const zkCredentials: ZKCredential[] = [];

      for (const stored of storedCredentials) {
        if (
          stored.encrypted &&
          stored.credentialData &&
          this.encryptionPassword
        ) {
          try {
            const encryptionResult: EncryptionResult = JSON.parse(
              stored.credentialData,
            );
            const decryptedData = await this.cryptoService.decryptData(
              encryptionResult,
              this.encryptionPassword,
            );
            zkCredentials.push(JSON.parse(decryptedData));
          } catch (decryptError) {
            console.warn("Failed to decrypt ZK credential:", stored.id);
          }
        } else {
          const parsedCredential = JSON.parse(stored.credentialData);
          zkCredentials.push(parsedCredential);
        }
      }

      return zkCredentials;
    } catch (error) {
      errorService.logError("Error retrieving ZK credentials:", error);
      throw new Error("Failed to retrieve ZK credentials");
    }
  }

  /**
   * Get ZK credential by ID
   */
  async getZKCredential(id: string): Promise<ZKCredential | null> {
    try {
      const stored = await this.db.zkCredentials.get(id);
      if (!stored) return null;

      if (
        stored.encrypted &&
        stored.credentialData &&
        this.encryptionPassword
      ) {
        try {
          const encryptionResult: EncryptionResult = JSON.parse(
            stored.credentialData,
          );
          const decryptedData = await this.cryptoService.decryptData(
            encryptionResult,
            this.encryptionPassword,
          );
          return JSON.parse(decryptedData);
        } catch (decryptError) {
          console.warn("Failed to decrypt ZK credential:", stored.id);
          return null;
        }
      } else {
        return JSON.parse(stored.credentialData);
      }
    } catch (error) {
      errorService.logError("Error retrieving ZK credential:", error);
      throw new Error("Failed to retrieve ZK credential");
    }
  }

  /**
   * Delete ZK credential
   */
  async deleteZKCredential(id: string): Promise<void> {
    try {
      await this.db.zkCredentials.delete(id);
    } catch (error) {
      errorService.logError("Error deleting ZK credential:", error);
      throw new Error("Failed to delete ZK credential");
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
