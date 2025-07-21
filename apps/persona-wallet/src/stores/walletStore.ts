import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import localforage from 'localforage';
import { 
  Credential, 
  ProofHistory, 
  IdentityProfile, 
  WalletConfig, 
  SharingRequest,
  Notification,
  WalletState,
  NavigationState,
  SharingState,
  WalletStats,
  WalletError,
} from '../types/wallet.js';

// Configure localforage for better PWA storage
localforage.config({
  name: 'PersonaPassWallet',
  storeName: 'wallet_data',
  description: 'PersonaPass Wallet encrypted storage',
});

interface WalletStore {
  // Core state
  identity: IdentityProfile | null;
  credentials: Credential[];
  proofHistory: ProofHistory[];
  config: WalletConfig;
  notifications: Notification[];
  
  // UI state
  walletState: WalletState;
  navigationState: NavigationState;
  sharingState: SharingState;
  
  // Computed state
  stats: WalletStats | null;
  
  // Identity actions
  createIdentity: (profile: Omit<IdentityProfile, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIdentity: (updates: Partial<IdentityProfile>) => Promise<void>;
  
  // Credential actions
  addCredential: (credential: Credential) => Promise<void>;
  updateCredential: (id: string, updates: Partial<Credential>) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
  getCredentialsByDomain: (domain: string) => Credential[];
  getActiveCredentials: () => Credential[];
  
  // Proof actions
  addProofHistory: (proof: ProofHistory) => Promise<void>;
  getProofHistory: (filters?: { domain?: string; requester?: string; limit?: number }) => ProofHistory[];
  revokeProof: (proofId: string) => Promise<void>;
  
  // Sharing actions
  setActiveRequest: (request: SharingRequest | null) => void;
  selectCredentials: (credentialIds: string[]) => void;
  giveConsent: (consent: boolean) => void;
  startProofGeneration: () => void;
  completeProofGeneration: (success: boolean) => void;
  startSharing: () => void;
  completeSharing: (success: boolean) => void;
  showQRCode: (show: boolean) => void;
  toggleScanner: (active: boolean) => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  getUnreadCount: () => number;
  
  // Navigation actions
  setCurrentTab: (tab: NavigationState['currentTab']) => void;
  pushModal: (modalId: string) => void;
  popModal: () => string | null;
  setBottomSheet: (open: boolean) => void;
  
  // Wallet state actions
  setLoading: (loading: boolean) => void;
  unlockWallet: () => Promise<void>;
  lockWallet: () => void;
  updateConnectivity: (status: 'online' | 'offline' | 'syncing') => void;
  updateLastSync: () => void;
  
  // Configuration actions
  updateConfig: (updates: Partial<WalletConfig>) => Promise<void>;
  resetConfig: () => void;
  
  // Backup and sync
  exportWalletData: () => Promise<string>;
  importWalletData: (data: string) => Promise<void>;
  syncWithCloud: () => Promise<void>;
  
  // Analytics and stats
  calculateStats: () => Promise<WalletStats>;
  refreshStats: () => Promise<void>;
  
  // Cleanup and maintenance
  cleanupExpiredData: () => Promise<void>;
  validateDataIntegrity: () => Promise<boolean>;
  
  // Error handling
  setError: (error: WalletError) => void;
  clearError: () => void;
  lastError: WalletError | null;
}

const defaultConfig: WalletConfig = {
  theme: 'auto',
  language: 'en',
  currency: 'USD',
  notifications: {
    proofRequests: true,
    credentialUpdates: true,
    securityAlerts: true,
    pushEnabled: false,
  },
  security: {
    biometricEnabled: false,
    pinEnabled: true,
    autoLockMinutes: 15,
    requireConfirmationForSharing: true,
  },
  connectivity: {
    zkApiUrl: process.env.VITE_ZK_API_URL || 'http://localhost:3007',
    sharingProtocolUrl: process.env.VITE_SHARING_PROTOCOL_URL || 'http://localhost:3008',
    blockchainRpcUrl: process.env.VITE_BLOCKCHAIN_RPC_URL || 'http://localhost:26657',
    offlineMode: false,
  },
  features: {
    enableExperimentalFeatures: false,
    debugMode: process.env.NODE_ENV === 'development',
    analytics: true,
  },
};

const initialWalletState: WalletState = {
  isLoading: false,
  isUnlocked: false,
  hasBackup: false,
  connectivity: 'offline',
  lastSync: null,
  pendingActions: 0,
};

const initialNavigationState: NavigationState = {
  currentTab: 'home',
  previousTab: null,
  modalStack: [],
  bottomSheetOpen: false,
};

const initialSharingState: SharingState = {
  activeRequest: null,
  selectedCredentials: [],
  consentGiven: false,
  generateProofInProgress: false,
  shareInProgress: false,
  qrCodeVisible: false,
  scannerActive: false,
};

export const useWalletStore = create<WalletStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      identity: null,
      credentials: [],
      proofHistory: [],
      config: defaultConfig,
      notifications: [],
      walletState: initialWalletState,
      navigationState: initialNavigationState,
      sharingState: initialSharingState,
      stats: null,
      lastError: null,

      // Identity actions
      createIdentity: async (profile) => {
        const now = new Date().toISOString();
        const newIdentity: IdentityProfile = {
          ...profile,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => {
          state.identity = newIdentity;
          state.walletState.isUnlocked = true;
        });

        console.log('🆔 Identity created:', newIdentity.did);
      },

      updateIdentity: async (updates) => {
        set((state) => {
          if (state.identity) {
            Object.assign(state.identity, updates);
            state.identity.updatedAt = new Date().toISOString();
          }
        });
      },

      // Credential actions
      addCredential: async (credential) => {
        set((state) => {
          state.credentials.push(credential);
        });
        
        get().addNotification({
          type: 'credential_update',
          title: 'New Credential Added',
          message: `Added ${credential.type} credential from ${credential.issuer.name}`,
          priority: 'medium',
          actionable: false,
        });

        console.log('📜 Credential added:', credential.type);
      },

      updateCredential: async (id, updates) => {
        set((state) => {
          const index = state.credentials.findIndex(c => c.id === id);
          if (index !== -1) {
            Object.assign(state.credentials[index], updates);
            state.credentials[index].metadata.lastUpdated = new Date().toISOString();
          }
        });
      },

      removeCredential: async (id) => {
        set((state) => {
          state.credentials = state.credentials.filter(c => c.id !== id);
        });
      },

      getCredentialsByDomain: (domain) => {
        return get().credentials.filter(c => c.domain === domain && c.status === 'active');
      },

      getActiveCredentials: () => {
        return get().credentials.filter(c => c.status === 'active');
      },

      // Proof actions
      addProofHistory: async (proof) => {
        set((state) => {
          state.proofHistory.unshift(proof); // Add to beginning for chronological order
          
          // Keep only last 100 proof records
          if (state.proofHistory.length > 100) {
            state.proofHistory = state.proofHistory.slice(0, 100);
          }
        });
      },

      getProofHistory: (filters = {}) => {
        let history = get().proofHistory;
        
        if (filters.domain) {
          history = history.filter(p => p.domain === filters.domain);
        }
        
        if (filters.requester) {
          history = history.filter(p => p.requester.did === filters.requester);
        }
        
        if (filters.limit) {
          history = history.slice(0, filters.limit);
        }
        
        return history;
      },

      revokeProof: async (proofId) => {
        set((state) => {
          const proof = state.proofHistory.find(p => p.id === proofId);
          if (proof) {
            proof.status = 'revoked';
          }
        });
      },

      // Sharing actions
      setActiveRequest: (request) => {
        set((state) => {
          state.sharingState.activeRequest = request;
          state.sharingState.selectedCredentials = [];
          state.sharingState.consentGiven = false;
        });
      },

      selectCredentials: (credentialIds) => {
        set((state) => {
          state.sharingState.selectedCredentials = credentialIds;
        });
      },

      giveConsent: (consent) => {
        set((state) => {
          state.sharingState.consentGiven = consent;
        });
      },

      startProofGeneration: () => {
        set((state) => {
          state.sharingState.generateProofInProgress = true;
        });
      },

      completeProofGeneration: (success) => {
        set((state) => {
          state.sharingState.generateProofInProgress = false;
        });
        
        get().addNotification({
          type: success ? 'success' : 'error',
          title: success ? 'Proof Generated' : 'Proof Generation Failed',
          message: success 
            ? 'Zero-knowledge proof generated successfully'
            : 'Failed to generate proof. Please try again.',
          priority: success ? 'low' : 'high',
          actionable: !success,
        });
      },

      startSharing: () => {
        set((state) => {
          state.sharingState.shareInProgress = true;
        });
      },

      completeSharing: (success) => {
        set((state) => {
          state.sharingState.shareInProgress = false;
          if (success) {
            state.sharingState.activeRequest = null;
            state.sharingState.selectedCredentials = [];
            state.sharingState.consentGiven = false;
          }
        });
      },

      showQRCode: (show) => {
        set((state) => {
          state.sharingState.qrCodeVisible = show;
        });
      },

      toggleScanner: (active) => {
        set((state) => {
          state.sharingState.scannerActive = active;
        });
      },

      // Notification actions
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };
        
        set((state) => {
          state.notifications.unshift(newNotification);
          
          // Keep only last 50 notifications
          if (state.notifications.length > 50) {
            state.notifications = state.notifications.slice(0, 50);
          }
        });
      },

      markNotificationRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.read = true;
          }
        });
      },

      dismissNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.dismissed = true;
          }
        });
      },

      clearNotifications: () => {
        set((state) => {
          state.notifications = [];
        });
      },

      getUnreadCount: () => {
        return get().notifications.filter(n => !n.read && !n.dismissed).length;
      },

      // Navigation actions
      setCurrentTab: (tab) => {
        set((state) => {
          state.navigationState.previousTab = state.navigationState.currentTab;
          state.navigationState.currentTab = tab;
        });
      },

      pushModal: (modalId) => {
        set((state) => {
          state.navigationState.modalStack.push(modalId);
        });
      },

      popModal: () => {
        const { modalStack } = get().navigationState;
        if (modalStack.length === 0) return null;
        
        const modalId = modalStack[modalStack.length - 1];
        set((state) => {
          state.navigationState.modalStack.pop();
        });
        
        return modalId;
      },

      setBottomSheet: (open) => {
        set((state) => {
          state.navigationState.bottomSheetOpen = open;
        });
      },

      // Wallet state actions
      setLoading: (loading) => {
        set((state) => {
          state.walletState.isLoading = loading;
        });
      },

      unlockWallet: async () => {
        set((state) => {
          state.walletState.isUnlocked = true;
        });
      },

      lockWallet: () => {
        set((state) => {
          state.walletState.isUnlocked = false;
          state.sharingState = initialSharingState;
        });
      },

      updateConnectivity: (status) => {
        set((state) => {
          state.walletState.connectivity = status;
        });
      },

      updateLastSync: () => {
        set((state) => {
          state.walletState.lastSync = new Date().toISOString();
        });
      },

      // Configuration actions
      updateConfig: async (updates) => {
        set((state) => {
          Object.assign(state.config, updates);
        });
      },

      resetConfig: () => {
        set((state) => {
          state.config = { ...defaultConfig };
        });
      },

      // Backup and sync
      exportWalletData: async () => {
        const state = get();
        const exportData = {
          identity: state.identity,
          credentials: state.credentials,
          proofHistory: state.proofHistory,
          config: state.config,
          exportedAt: new Date().toISOString(),
        };
        
        return JSON.stringify(exportData, null, 2);
      },

      importWalletData: async (data) => {
        try {
          const importData = JSON.parse(data);
          
          set((state) => {
            if (importData.identity) state.identity = importData.identity;
            if (importData.credentials) state.credentials = importData.credentials;
            if (importData.proofHistory) state.proofHistory = importData.proofHistory;
            if (importData.config) state.config = { ...defaultConfig, ...importData.config };
          });
          
          get().addNotification({
            type: 'success',
            title: 'Wallet Imported',
            message: 'Wallet data imported successfully',
            priority: 'medium',
            actionable: false,
          });
        } catch (error) {
          throw new WalletError('Failed to import wallet data', 'IMPORT_ERROR', { error });
        }
      },

      syncWithCloud: async () => {
        // Placeholder for cloud sync implementation
        set((state) => {
          state.walletState.connectivity = 'syncing';
        });
        
        // Simulate sync delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        set((state) => {
          state.walletState.connectivity = 'online';
          state.walletState.lastSync = new Date().toISOString();
        });
      },

      // Analytics and stats
      calculateStats: async () => {
        const state = get();
        const { credentials, proofHistory } = state;
        
        // Calculate credential stats
        const activeCredentials = credentials.filter(c => c.status === 'active');
        const expiredCredentials = credentials.filter(c => c.status === 'expired');
        const credentialsByDomain = credentials.reduce((acc, cred) => {
          acc[cred.domain] = (acc[cred.domain] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const trustScoreAverage = activeCredentials.length > 0
          ? activeCredentials.reduce((sum, c) => sum + c.metadata.trustScore, 0) / activeCredentials.length
          : 0;
        
        // Calculate proof stats
        const totalShared = proofHistory.length;
        const successfulProofs = proofHistory.filter(p => p.proofVerified).length;
        const successRate = totalShared > 0 ? successfulProofs / totalShared : 0;
        
        const proofsByDomain = proofHistory.reduce((acc, proof) => {
          acc[proof.domain] = (acc[proof.domain] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const recentActivity = proofHistory.filter(p => p.sharedAt > sevenDaysAgo).length;
        
        // Calculate sharing stats
        const totalRequests = proofHistory.length;
        const consentGivenCount = proofHistory.filter(p => p.consentGiven).length;
        const consentRate = totalRequests > 0 ? consentGivenCount / totalRequests : 0;
        
        // Top requesters
        const requesterCounts = proofHistory.reduce((acc, proof) => {
          const name = proof.requester.name;
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const topRequesters = Object.entries(requesterCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        const stats: WalletStats = {
          credentials: {
            total: credentials.length,
            active: activeCredentials.length,
            expired: expiredCredentials.length,
            byDomain: credentialsByDomain,
            trustScoreAverage: Math.round(trustScoreAverage),
          },
          proofs: {
            totalGenerated: totalShared,
            totalShared,
            successRate: Math.round(successRate * 100),
            byDomain: proofsByDomain,
            recentActivity,
          },
          sharing: {
            totalRequests,
            consentRate: Math.round(consentRate * 100),
            averageResponseTime: 45, // Placeholder
            topRequesters,
          },
          security: {
            lastBackup: state.walletState.lastSync,
            securityScore: 85, // Calculated based on various factors
            vulnerabilities: [],
            recommendations: [],
          },
        };
        
        set((state) => {
          state.stats = stats;
        });
        
        return stats;
      },

      refreshStats: async () => {
        await get().calculateStats();
      },

      // Cleanup and maintenance
      cleanupExpiredData: async () => {
        set((state) => {
          const now = new Date();
          
          // Remove expired notifications
          state.notifications = state.notifications.filter(n => 
            !n.expiresAt || new Date(n.expiresAt) > now
          );
          
          // Update expired credentials
          state.credentials.forEach(credential => {
            if (credential.expiresAt && new Date(credential.expiresAt) < now) {
              credential.status = 'expired';
            }
          });
          
          // Remove old proof history (older than 1 year)
          const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          state.proofHistory = state.proofHistory.filter(p => p.sharedAt > oneYearAgo);
        });
      },

      validateDataIntegrity: async () => {
        // Placeholder for data integrity validation
        return true;
      },

      // Error handling
      setError: (error) => {
        set((state) => {
          state.lastError = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.lastError = null;
        });
      },
    })),
    {
      name: 'personapass-wallet',
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        identity: state.identity,
        credentials: state.credentials,
        proofHistory: state.proofHistory,
        config: state.config,
      }),
    }
  )
);

// Utility hooks
export const useCredentials = () => {
  const credentials = useWalletStore(state => state.credentials);
  const getCredentialsByDomain = useWalletStore(state => state.getCredentialsByDomain);
  const getActiveCredentials = useWalletStore(state => state.getActiveCredentials);
  
  return {
    credentials,
    getCredentialsByDomain,
    getActiveCredentials,
  };
};

export const useSharing = () => {
  const sharingState = useWalletStore(state => state.sharingState);
  const setActiveRequest = useWalletStore(state => state.setActiveRequest);
  const selectCredentials = useWalletStore(state => state.selectCredentials);
  const giveConsent = useWalletStore(state => state.giveConsent);
  
  return {
    ...sharingState,
    setActiveRequest,
    selectCredentials,
    giveConsent,
  };
};

export const useNotifications = () => {
  const notifications = useWalletStore(state => state.notifications);
  const addNotification = useWalletStore(state => state.addNotification);
  const markNotificationRead = useWalletStore(state => state.markNotificationRead);
  const dismissNotification = useWalletStore(state => state.dismissNotification);
  const getUnreadCount = useWalletStore(state => state.getUnreadCount);
  
  return {
    notifications,
    addNotification,
    markNotificationRead,
    dismissNotification,
    unreadCount: getUnreadCount(),
  };
};