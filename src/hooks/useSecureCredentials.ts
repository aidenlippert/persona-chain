/**
 * 🔐 SECURE CREDENTIALS HOOK
 * Modern React hook for encrypted credential management
 * Replaces direct localStorage access with secure storage
 */

import { useState, useEffect, useCallback } from 'react';
import { secureCredentialStorage, SecureCredential } from '../services/secureCredentialStorage';
import { errorService } from '../services/errorService';

interface UseSecureCredentialsReturn {
  credentials: SecureCredential[];
  loading: boolean;
  error: string | null;
  credentialCount: number;
  addCredential: (credential: SecureCredential) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
  refreshCredentials: () => Promise<void>;
  clearAllCredentials: () => Promise<void>;
  storageStats: {
    encrypted: number;
    localStorage: number;
    total: number;
  };
}

export const useSecureCredentials = (): UseSecureCredentialsReturn => {
  const [credentials, setCredentials] = useState<SecureCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState({ encrypted: 0, localStorage: 0, total: 0 });

  // Load credentials on hook initialization
  const loadCredentials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await secureCredentialStorage.initialize();
      const creds = await secureCredentialStorage.getCredentials();
      const stats = await secureCredentialStorage.getStorageStats();
      
      setCredentials(creds);
      setStorageStats(stats);
      
      console.log(`🔐 Loaded ${creds.length} credentials via secure hook`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load credentials';
      setError(errorMessage);
      errorService.logError('useSecureCredentials: Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new credential
  const addCredential = useCallback(async (credential: SecureCredential) => {
    try {
      setError(null);
      
      console.log('🔍 DEBUG: useSecureCredentials.addCredential called with:', {
        credential,
        credentialId: credential?.id,
        credentialType: typeof credential,
        credentialKeys: credential ? Object.keys(credential) : 'no keys',
        hasCredentialSubject: !!credential?.credentialSubject
      });

      await secureCredentialStorage.storeCredential(credential);
      await loadCredentials(); // Refresh list
      console.log(`✅ Added credential: ${credential.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add credential';
      setError(errorMessage);
      errorService.logError('useSecureCredentials: Add failed:', err);
      throw err;
    }
  }, [loadCredentials]);

  // Remove credential
  const removeCredential = useCallback(async (id: string) => {
    try {
      setError(null);
      await secureCredentialStorage.deleteCredential(id);
      await loadCredentials(); // Refresh list
      console.log(`🗑️ Removed credential: ${id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove credential';
      setError(errorMessage);
      errorService.logError('useSecureCredentials: Remove failed:', err);
      throw err;
    }
  }, [loadCredentials]);

  // Clear all credentials
  const clearAllCredentials = useCallback(async () => {
    try {
      setError(null);
      await secureCredentialStorage.clearAllCredentials();
      await loadCredentials(); // Refresh list
      console.log('🧹 Cleared all credentials');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear credentials';
      setError(errorMessage);
      errorService.logError('useSecureCredentials: Clear failed:', err);
      throw err;
    }
  }, [loadCredentials]);

  // Initialize on mount
  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  return {
    credentials,
    loading,
    error,
    credentialCount: credentials.length,
    addCredential,
    removeCredential,
    refreshCredentials: loadCredentials,
    clearAllCredentials,
    storageStats
  };
};

// Legacy compatibility hook for components that expect localStorage format
export const useCredentialCount = (): number => {
  const { credentialCount, loading } = useSecureCredentials();
  
  // Return 0 while loading to prevent flash of incorrect count
  return loading ? 0 : credentialCount;
};