/**
 * Production Database Service for PersonaPass
 * Handles secure data storage and retrieval with encryption
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VerifiableCredential } from '../../types/identity';
import { errorService } from "@/services/errorService";

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
  encryptionKey: string;
  tableName?: string;
}

export interface UserProfile {
  id: string;
  did: string;
  email?: string;
  displayName?: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
  verificationLevel: 'basic' | 'standard' | 'premium';
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    analytics: boolean;
    dataSharing: boolean;
  };
  metadata: Record<string, any>;
}

export interface CredentialRecord {
  id: string;
  userDid: string;
  credentialId: string;
  credentialType: string;
  encryptedCredential: string;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  status: 'active' | 'revoked' | 'expired';
  verificationHistory: VerificationEvent[];
  createdAt: string;
  updatedAt: string;
  metadata: {
    source: string;
    automaticallyGenerated: boolean;
    verificationScore: number;
    tags: string[];
  };
}

export interface VerificationEvent {
  id: string;
  timestamp: string;
  verifierDid?: string;
  verificationMethod: string;
  result: 'success' | 'failure' | 'partial';
  details?: string;
}

export interface ApiIntegrationRecord {
  id: string;
  userDid: string;
  apiProvider: string;
  integrationId: string;
  status: 'active' | 'inactive' | 'error';
  lastSync: string;
  syncCount: number;
  credentials: string[]; // credential IDs generated from this integration
  configuration: Record<string, any>;
  errorLog: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ZKProofRecord {
  id: string;
  userDid: string;
  proofType: string;
  proofData: string; // encrypted proof data
  publicSignals: Record<string, any>;
  verificationCount: number;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: {
    circuit: string;
    complexity: 'low' | 'medium' | 'high';
    generationTime: number;
    verified: boolean;
  };
}

export class DatabaseService {
  private static instance: DatabaseService;
  private static supabaseInstance: SupabaseClient;
  private supabase: SupabaseClient;
  private encryptionKey: string;

  constructor(config: DatabaseConfig) {
    // Use singleton pattern for Supabase to avoid multiple GoTrueClient instances
    if (!DatabaseService.supabaseInstance) {
      DatabaseService.supabaseInstance = createClient(config.supabaseUrl, config.supabaseKey);
    }
    this.supabase = DatabaseService.supabaseInstance;
    this.encryptionKey = config.encryptionKey;
  }

  /**
   * Initialize database service - placeholder for compatibility
   */
  async initialize(): Promise<void> {
    // DatabaseService is ready upon construction with Supabase
    // This method exists for compatibility with secureCredentialStorage
    return Promise.resolve();
  }

  /**
   * Initialize database service with configuration (singleton pattern)
   */
  static create(config?: Partial<DatabaseConfig>): DatabaseService {
    if (!DatabaseService.instance) {
      const defaultConfig: DatabaseConfig = {
        supabaseUrl: process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
        supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key',
        encryptionKey: process.env.VITE_DB_ENCRYPTION_KEY || 'default_encryption_key',
      };

      DatabaseService.instance = new DatabaseService({ ...defaultConfig, ...config });
    }
    return DatabaseService.instance;
  }

  /**
   * 🔒 REAL AES-256-GCM encryption for sensitive data
   */
  private async encrypt(data: string): Promise<string> {
    try {
      // Get encryption key from environment or generate
      const keyMaterial = await this.getEncryptionKey();
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt using AES-256-GCM
      const encodedData = new TextEncoder().encode(data);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        keyMaterial,
        encodedData
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      errorService.logError('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * 🔓 Decrypt AES-256-GCM encrypted data
   */
  private async decrypt(encryptedData: string): Promise<string> {
    try {
      // Get encryption key
      const keyMaterial = await this.getEncryptionKey();
      
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      // Decrypt using AES-256-GCM
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        keyMaterial,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      errorService.logError('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * 🔑 Get or derive encryption key for AES-256-GCM
   */
  private async getEncryptionKey(): Promise<CryptoKey> {
    const encKey = this.config.encryptionKey || 'persona-secure-key-2024';
    
    // Derive key from password using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(encKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive AES-256-GCM key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('persona-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Create or update user profile
   */
  async saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    console.log('💾 Saving user profile to database...');

    try {
      const profileData = {
        ...profile,
        updatedAt: new Date().toISOString(),
        createdAt: profile.createdAt || new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'did' })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save user profile: ${error.message}`);
      }

      console.log('✅ User profile saved successfully');
      return data as UserProfile;

    } catch (error) {
      errorService.logError('❌ Failed to save user profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile by DID
   */
  async getUserProfile(userDid: string): Promise<UserProfile | null> {
    console.log('🔍 Retrieving user profile from database...');

    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('did', userDid)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to get user profile: ${error.message}`);
      }

      return data as UserProfile | null;

    } catch (error) {
      errorService.logError('❌ Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Store verifiable credential securely
   */
  async storeCredential(userDid: string, credential: VerifiableCredential): Promise<CredentialRecord> {
    console.log('🔐 Storing credential in secure database...');

    try {
      const encryptedCredential = await this.encrypt(JSON.stringify(credential));
      
      const credentialRecord: Omit<CredentialRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        userDid,
        credentialId: credential.id,
        credentialType: credential.type.find(t => t !== 'VerifiableCredential') || 'UnknownCredential',
        encryptedCredential,
        issuer: typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id,
        issuanceDate: credential.issuanceDate,
        expirationDate: credential.expirationDate,
        status: 'active',
        verificationHistory: [],
        metadata: {
          source: 'PersonaPass',
          automaticallyGenerated: true,
          verificationScore: 0.95,
          tags: credential.type.filter(t => t !== 'VerifiableCredential')
        }
      };

      const { data, error } = await this.supabase
        .from('credentials')
        .insert({
          ...credentialRecord,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store credential: ${error.message}`);
      }

      console.log('✅ Credential stored successfully');
      return data as CredentialRecord;

    } catch (error) {
      errorService.logError('❌ Failed to store credential:', error);
      throw error;
    }
  }

  /**
   * Retrieve user's credentials
   */
  async getUserCredentials(userDid: string): Promise<VerifiableCredential[]> {
    console.log('📋 Retrieving user credentials from database...');

    try {
      const { data, error } = await this.supabase
        .from('credentials')
        .select('*')
        .eq('userDid', userDid)
        .eq('status', 'active')
        .order('createdAt', { ascending: false });

      if (error) {
        throw new Error(`Failed to retrieve credentials: ${error.message}`);
      }

      const credentials: VerifiableCredential[] = [];
      
      for (const record of data as CredentialRecord[]) {
        try {
          const decryptedCredential = await this.decrypt(record.encryptedCredential);
          const credential = JSON.parse(decryptedCredential) as VerifiableCredential;
          credentials.push(credential);
        } catch (error) {
          console.warn(`Failed to decrypt credential ${record.id}:`, error);
        }
      }

      console.log(`✅ Retrieved ${credentials.length} credentials`);
      return credentials;

    } catch (error) {
      errorService.logError('❌ Failed to retrieve credentials:', error);
      return [];
    }
  }

  /**
   * Record API integration
   */
  async recordApiIntegration(integration: Omit<ApiIntegrationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiIntegrationRecord> {
    console.log('🔗 Recording API integration...');

    try {
      const { data, error } = await this.supabase
        .from('api_integrations')
        .insert({
          ...integration,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to record API integration: ${error.message}`);
      }

      console.log('✅ API integration recorded successfully');
      return data as ApiIntegrationRecord;

    } catch (error) {
      errorService.logError('❌ Failed to record API integration:', error);
      throw error;
    }
  }

  /**
   * Get user's API integrations
   */
  async getUserApiIntegrations(userDid: string): Promise<ApiIntegrationRecord[]> {
    console.log('🔗 Retrieving user API integrations...');

    try {
      const { data, error } = await this.supabase
        .from('api_integrations')
        .select('*')
        .eq('userDid', userDid)
        .order('createdAt', { ascending: false });

      if (error) {
        throw new Error(`Failed to retrieve API integrations: ${error.message}`);
      }

      return data as ApiIntegrationRecord[];

    } catch (error) {
      errorService.logError('❌ Failed to retrieve API integrations:', error);
      return [];
    }
  }

  /**
   * Store ZK proof
   */
  async storeZKProof(userDid: string, proofData: any): Promise<ZKProofRecord> {
    console.log('🔐 Storing ZK proof...');

    try {
      const encryptedProofData = await this.encrypt(JSON.stringify(proofData));
      
      const zkProofRecord: Omit<ZKProofRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        userDid,
        proofType: proofData.type || 'unknown',
        proofData: encryptedProofData,
        publicSignals: proofData.publicSignals || {},
        verificationCount: 0,
        isShared: false,
        metadata: {
          circuit: proofData.circuit || 'unknown',
          complexity: proofData.complexity || 'medium',
          generationTime: proofData.generationTime || 0,
          verified: true
        }
      };

      const { data, error } = await this.supabase
        .from('zk_proofs')
        .insert({
          ...zkProofRecord,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store ZK proof: ${error.message}`);
      }

      console.log('✅ ZK proof stored successfully');
      return data as ZKProofRecord;

    } catch (error) {
      errorService.logError('❌ Failed to store ZK proof:', error);
      throw error;
    }
  }

  /**
   * Get user's ZK proofs
   */
  async getUserZKProofs(userDid: string): Promise<ZKProofRecord[]> {
    console.log('🔐 Retrieving user ZK proofs...');

    try {
      const { data, error } = await this.supabase
        .from('zk_proofs')
        .select('*')
        .eq('userDid', userDid)
        .order('createdAt', { ascending: false });

      if (error) {
        throw new Error(`Failed to retrieve ZK proofs: ${error.message}`);
      }

      return data as ZKProofRecord[];

    } catch (error) {
      errorService.logError('❌ Failed to retrieve ZK proofs:', error);
      return [];
    }
  }

  /**
   * Record verification event
   */
  async recordVerificationEvent(
    credentialId: string,
    event: Omit<VerificationEvent, 'id'>
  ): Promise<void> {
    console.log('📝 Recording verification event...');

    try {
      // First, get the current credential record
      const { data: credentialData, error: fetchError } = await this.supabase
        .from('credentials')
        .select('verificationHistory')
        .eq('credentialId', credentialId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch credential: ${fetchError.message}`);
      }

      // Add new event to verification history
      const updatedHistory = [
        ...credentialData.verificationHistory,
        { ...event, id: `verification_${Date.now()}` }
      ];

      // Update the credential record
      const { error: updateError } = await this.supabase
        .from('credentials')
        .update({
          verificationHistory: updatedHistory,
          updatedAt: new Date().toISOString()
        })
        .eq('credentialId', credentialId);

      if (updateError) {
        throw new Error(`Failed to update verification history: ${updateError.message}`);
      }

      console.log('✅ Verification event recorded successfully');

    } catch (error) {
      errorService.logError('❌ Failed to record verification event:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalUsers: number;
    totalCredentials: number;
    totalIntegrations: number;
    totalProofs: number;
    healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    console.log('📊 Getting database statistics...');

    try {
      const [usersResult, credentialsResult, integrationsResult, proofsResult] = await Promise.all([
        this.supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        this.supabase.from('credentials').select('id', { count: 'exact', head: true }),
        this.supabase.from('api_integrations').select('id', { count: 'exact', head: true }),
        this.supabase.from('zk_proofs').select('id', { count: 'exact', head: true })
      ]);

      const stats = {
        totalUsers: usersResult.count || 0,
        totalCredentials: credentialsResult.count || 0,
        totalIntegrations: integrationsResult.count || 0,
        totalProofs: proofsResult.count || 0,
        healthStatus: 'healthy' as const
      };

      // Determine health status based on errors
      const hasErrors = [usersResult, credentialsResult, integrationsResult, proofsResult]
        .some(result => result.error !== null);

      if (hasErrors) {
        stats.healthStatus = 'degraded';
      }

      console.log('✅ Database statistics retrieved:', stats);
      return stats;

    } catch (error) {
      errorService.logError('❌ Failed to get database statistics:', error);
      return {
        totalUsers: 0,
        totalCredentials: 0,
        totalIntegrations: 0,
        totalProofs: 0,
        healthStatus: 'unhealthy'
      };
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string; latency: number }> {
    const startTime = Date.now();

    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      const latency = Date.now() - startTime;

      if (error) {
        return {
          healthy: false,
          message: `Database connection failed: ${error.message}`,
          latency
        };
      }

      return {
        healthy: true,
        message: 'Database connection healthy',
        latency
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        healthy: false,
        message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latency
      };
    }
  }
}

// Export default instance
export const databaseService = DatabaseService.create();