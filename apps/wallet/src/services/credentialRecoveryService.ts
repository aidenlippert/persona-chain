/**
 * Credential Recovery Service
 * Implements robust data persistence and recovery mechanisms
 */

import { storageService } from './storageService';
import { personaChainService } from './personaChainService';
import type { WalletCredential } from '../types/wallet';
import { errorService } from "@/services/errorService";

interface CredentialBackup {
  credentials: WalletCredential[];
  walletAddress: string;
  timestamp: string;
  did: string;
  backupHash: string;
}

interface RecoveryStats {
  totalCredentials: number;
  recoveredCredentials: number;
  failedRecoveries: number;
  lastRecoveryAttempt: string;
}

export class CredentialRecoveryService {
  private static instance: CredentialRecoveryService;
  private recoveryStats: RecoveryStats = {
    totalCredentials: 0,
    recoveredCredentials: 0,
    failedRecoveries: 0,
    lastRecoveryAttempt: ''
  };

  public static getInstance(): CredentialRecoveryService {
    if (!CredentialRecoveryService.instance) {
      CredentialRecoveryService.instance = new CredentialRecoveryService();
    }
    return CredentialRecoveryService.instance;
  }

  /**
   * Save credentials to multiple storage layers for redundancy
   */
  async saveCredentials(credentials: WalletCredential[], walletAddress: string, did: string): Promise<void> {
    try {
      console.log('[SAVE] Saving credentials with multi-layer backup...');
      
      // Create backup object
      const backup: CredentialBackup = {
        credentials,
        walletAddress,
        timestamp: new Date().toISOString(),
        did,
        backupHash: this.generateBackupHash(credentials, walletAddress, did)
      };

      // Layer 1: IndexedDB (primary secure storage)
      await this.saveToIndexedDB(backup);
      
      // Layer 2: LocalStorage (fallback)
      await this.saveToLocalStorage(backup);
      
      // Layer 3: Session Storage (temporary)
      await this.saveToSessionStorage(backup);
      
      // Layer 4: Encrypted backup key (for blockchain recovery)
      await this.saveEncryptedBackupKey(backup);

      console.log(`[SUCCESS] Credentials saved to all storage layers (${credentials.length} credentials)`);
      
      // Update stats
      this.recoveryStats.totalCredentials = credentials.length;
      
    } catch (error) {
      errorService.logError('[ERROR] Failed to save credentials:', error);
      throw new Error('Failed to save credentials with backup redundancy');
    }
  }

  /**
   * Recover credentials from all available sources
   */
  async recoverCredentials(walletAddress: string, did?: string): Promise<WalletCredential[]> {
    console.log('[RECOVERY] Starting credential recovery process...');
    this.recoveryStats.lastRecoveryAttempt = new Date().toISOString();
    
    const recoveryResults = await Promise.allSettled([
      this.recoverFromIndexedDB(walletAddress),
      this.recoverFromLocalStorage(walletAddress),
      this.recoverFromSessionStorage(walletAddress),
      this.recoverFromBlockchain(walletAddress, did)
    ]);

    // Merge and deduplicate credentials from all sources
    const allCredentials: WalletCredential[] = [];
    const credentialIds = new Set<string>();

    recoveryResults.forEach((result, index) => {
      const sourceName = ['IndexedDB', 'LocalStorage', 'SessionStorage', 'Blockchain'][index];
      
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`[SUCCESS] Recovered ${result.value.length} credentials from ${sourceName}`);
        
        result.value.forEach(credential => {
          if (!credentialIds.has(credential.id)) {
            allCredentials.push(credential);
            credentialIds.add(credential.id);
          }
        });
      } else {
        console.log(`[WARNING] No credentials recovered from ${sourceName}`);
        if (result.status === 'rejected') {
          console.warn(`${sourceName} recovery failed:`, result.reason);
        }
      }
    });

    // Update recovery stats
    this.recoveryStats.recoveredCredentials = allCredentials.length;
    this.recoveryStats.failedRecoveries = recoveryResults.filter(r => r.status === 'rejected').length;

    console.log(`[COMPLETE] Recovery complete: ${allCredentials.length} unique credentials recovered`);
    
    // Save recovered credentials back to all layers
    if (allCredentials.length > 0 && did) {
      await this.saveCredentials(allCredentials, walletAddress, did);
    }

    return allCredentials;
  }

  /**
   * Check if credentials exist in any storage layer
   */
  async credentialsExist(walletAddress: string): Promise<boolean> {
    try {
      const checks = await Promise.allSettled([
        this.checkIndexedDB(walletAddress),
        this.checkLocalStorage(walletAddress),
        this.checkSessionStorage(walletAddress)
      ]);

      return checks.some(check => check.status === 'fulfilled' && check.value);
    } catch (error) {
      console.warn('[ERROR] Error checking credential existence:', error);
      return false;
    }
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): RecoveryStats {
    return { ...this.recoveryStats };
  }

  /**
   * Force sync credentials across all storage layers
   */
  async syncCredentials(walletAddress: string, did: string): Promise<void> {
    try {
      console.log('[SYNC] Syncing credentials across all storage layers...');
      
      const credentials = await this.recoverCredentials(walletAddress, did);
      
      if (credentials.length > 0) {
        await this.saveCredentials(credentials, walletAddress, did);
        console.log(`[SUCCESS] Synced ${credentials.length} credentials across all layers`);
      } else {
        console.log('[WARNING] No credentials found to sync');
      }
    } catch (error) {
      errorService.logError('[ERROR] Failed to sync credentials:', error);
    }
  }

  // Private methods for individual storage layers

  private async saveToIndexedDB(backup: CredentialBackup): Promise<void> {
    try {
      // Use existing storage service
      await storageService.setItem(`credentials_backup_${backup.walletAddress}`, JSON.stringify(backup));
      
      // Also save individual credentials
      for (const credential of backup.credentials) {
        await storageService.addCredential(credential);
      }
    } catch (error) {
      console.warn('[WARNING] IndexedDB save failed:', error);
      throw error;
    }
  }

  private async saveToLocalStorage(backup: CredentialBackup): Promise<void> {
    try {
      localStorage.setItem('credentials', JSON.stringify(backup.credentials));
      localStorage.setItem(`credentials_backup_${backup.walletAddress}`, JSON.stringify(backup));
      localStorage.setItem('credentials_last_backup', backup.timestamp);
    } catch (error) {
      console.warn('[WARNING] LocalStorage save failed:', error);
      throw error;
    }
  }

  private async saveToSessionStorage(backup: CredentialBackup): Promise<void> {
    try {
      sessionStorage.setItem('credentials_temp', JSON.stringify(backup.credentials));
      sessionStorage.setItem(`credentials_backup_${backup.walletAddress}`, JSON.stringify(backup));
    } catch (error) {
      console.warn('[WARNING] SessionStorage save failed:', error);
      // Don't throw for session storage failures
    }
  }

  private async saveEncryptedBackupKey(backup: CredentialBackup): Promise<void> {
    try {
      // Create a backup key that can be used for blockchain recovery
      const backupKey = {
        hash: backup.backupHash,
        timestamp: backup.timestamp,
        credentialCount: backup.credentials.length
      };
      
      localStorage.setItem(`backup_key_${backup.walletAddress}`, JSON.stringify(backupKey));
    } catch (error) {
      console.warn('[WARNING] Backup key save failed:', error);
    }
  }

  private async recoverFromIndexedDB(walletAddress: string): Promise<WalletCredential[]> {
    try {
      // Try to get backup first
      const backupStr = await storageService.getItem(`credentials_backup_${walletAddress}`);
      if (backupStr) {
        const backup: CredentialBackup = JSON.parse(backupStr);
        return backup.credentials;
      }

      // Fallback: get individual credentials
      const credentials = await storageService.getAllCredentials();
      return credentials.filter(cred => cred.issuer?.includes(walletAddress) || cred.holder?.includes(walletAddress));
    } catch (error) {
      console.warn('[WARNING] IndexedDB recovery failed:', error);
      return [];
    }
  }

  private async recoverFromLocalStorage(walletAddress: string): Promise<WalletCredential[]> {
    try {
      // Try backup first
      const backupStr = localStorage.getItem(`credentials_backup_${walletAddress}`);
      if (backupStr) {
        const backup: CredentialBackup = JSON.parse(backupStr);
        return backup.credentials;
      }

      // Fallback: general credentials
      const credentialsStr = localStorage.getItem('credentials');
      if (credentialsStr) {
        return JSON.parse(credentialsStr) as WalletCredential[];
      }

      return [];
    } catch (error) {
      console.warn('[WARNING] LocalStorage recovery failed:', error);
      return [];
    }
  }

  private async recoverFromSessionStorage(walletAddress: string): Promise<WalletCredential[]> {
    try {
      const backupStr = sessionStorage.getItem(`credentials_backup_${walletAddress}`);
      if (backupStr) {
        const backup: CredentialBackup = JSON.parse(backupStr);
        return backup.credentials;
      }

      const credentialsStr = sessionStorage.getItem('credentials_temp');
      if (credentialsStr) {
        return JSON.parse(credentialsStr) as WalletCredential[];
      }

      return [];
    } catch (error) {
      console.warn('[WARNING] SessionStorage recovery failed:', error);
      return [];
    }
  }

  private async recoverFromBlockchain(walletAddress: string, did?: string): Promise<WalletCredential[]> {
    try {
      // TODO: Implement blockchain credential recovery
      // This would query the PersonaChain blockchain for credentials
      // associated with the wallet address or DID
      
      console.log('[INFO] Blockchain credential recovery not yet implemented');
      return [];
    } catch (error) {
      console.warn('[WARNING] Blockchain recovery failed:', error);
      return [];
    }
  }

  private async checkIndexedDB(walletAddress: string): Promise<boolean> {
    try {
      const backup = await storageService.getItem(`credentials_backup_${walletAddress}`);
      return !!backup;
    } catch {
      return false;
    }
  }

  private async checkLocalStorage(walletAddress: string): Promise<boolean> {
    try {
      return !!(localStorage.getItem(`credentials_backup_${walletAddress}`) || localStorage.getItem('credentials'));
    } catch {
      return false;
    }
  }

  private async checkSessionStorage(walletAddress: string): Promise<boolean> {
    try {
      return !!(sessionStorage.getItem(`credentials_backup_${walletAddress}`) || sessionStorage.getItem('credentials_temp'));
    } catch {
      return false;
    }
  }

  private generateBackupHash(credentials: WalletCredential[], walletAddress: string, did: string): string {
    const data = JSON.stringify({ credentials: credentials.map(c => c.id), walletAddress, did });
    // Simple hash for now - in production would use proper crypto
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `backup_${Math.abs(hash).toString(16)}`;
  }
}

// Export singleton instance
export const credentialRecoveryService = CredentialRecoveryService.getInstance();