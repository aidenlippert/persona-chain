/**
 * Persona Wallet State Management
 * Global state store using Zustand for wallet data and UI state
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { persist } from "zustand/middleware";
import type {
  WalletState,
  WalletConfig,
  DID,
  WalletCredential,
  WalletConnection,
  ProofRequest,
  WalletNotification,
  SharingRecord,
  PasskeyCredential,
} from "../types/wallet";
import { StorageService } from "../services/storageService";
import { WebAuthnService } from "../services/webauthnService";
import { CryptoService } from "../services/cryptoService";
import { errorService } from "@/services/errorService";

interface WalletStore extends WalletState {
  // Configuration
  config: WalletConfig | null;
  needsOnboarding: boolean;

  // Identity Management
  dids: DID[];
  currentDID: DID | null;

  // Credential Management
  credentials: WalletCredential[];
  filteredCredentials: WalletCredential[];
  credentialFilter: {
    tags: string[];
    source?: string;
    searchQuery?: string;
  };
  connectedPlatforms: string[];

  // Connection Management
  connections: WalletConnection[];

  // Authentication
  passkeys: PasskeyCredential[];
  isAuthenticated: boolean;
  authenticationMethod: "passkey" | "password" | null;

  // Sharing and History
  sharingHistory: SharingRecord[];

  // UI State
  sidebarOpen: boolean;
  currentView:
    | "dashboard"
    | "credentials"
    | "connections"
    | "settings"
    | "sharing";
  theme: "light" | "dark" | "auto";

  // Error Handling
  error: string | null;
  loading: boolean;

  // Actions
  initialize: () => Promise<void>;
  setupWallet: (onboardingData: any) => Promise<void>;
  unlock: (method: "passkey" | "password", credential?: any) => Promise<void>;
  lock: () => void;
  loadWalletData: () => Promise<void>;

  // DID Actions
  setCurrentDID: (did: DID) => void;
  addDID: (did: DID) => Promise<void>;
  removeDID: (didId: string) => void;

  // Credential Actions
  addCredential: (credential: WalletCredential) => Promise<void>;
  removeCredential: (credentialId: string) => Promise<void>;
  updateCredential: (
    credentialId: string,
    updates: Partial<WalletCredential>,
  ) => Promise<void>;
  loadCredentials: () => Promise<void>;
  setCredentialFilter: (
    filter: Partial<WalletStore["credentialFilter"]>,
  ) => void;
  applyCredentialFilter: () => void;

  // Connection Actions
  addConnection: (connection: WalletConnection) => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
  updateConnection: (
    connectionId: string,
    updates: Partial<WalletConnection>,
  ) => Promise<void>;

  // Authentication Actions
  registerPasskey: (name: string) => Promise<void>;
  removePasskey: (credentialId: string) => Promise<void>;

  // Sharing Actions
  addSharingRecord: (record: SharingRecord) => Promise<void>;

  // Proof Request Actions
  addProofRequest: (request: ProofRequest) => void;
  removeProofRequest: (requestId: string) => void;
  approveProofRequest: (requestId: string) => Promise<void>;
  denyProofRequest: (requestId: string) => Promise<void>;

  // Notification Actions
  addNotification: (
    notification: Omit<WalletNotification, "id" | "timestamp" | "read">,
  ) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearNotifications: () => void;

  // Configuration Actions
  updateConfig: (updates: Partial<WalletConfig>) => Promise<void>;

  // UI Actions
  setSidebarOpen: (open: boolean) => void;
  setCurrentView: (view: WalletStore["currentView"]) => void;
  setTheme: (theme: WalletStore["theme"]) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Service Instances
  storageService: StorageService;
  webauthnService: WebAuthnService;
  cryptoService: CryptoService;
}

export const useWalletStore = create<WalletStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        initialized: false,
        locked: true,
        online: navigator.onLine,
        syncing: false,
        current_did: undefined,
        active_connections: [],
        pending_requests: [],
        notifications: [],

        // Configuration
        config: null,
        needsOnboarding: false,

        // Identity Management
        dids: [],
        currentDID: null,

        // Credential Management
        credentials: [],
        filteredCredentials: [],
        credentialFilter: {
          tags: [],
          source: undefined,
          searchQuery: undefined,
        },
        connectedPlatforms: [],

        // Connection Management
        connections: [],

        // Authentication
        passkeys: [],
        isAuthenticated: false,
        authenticationMethod: null,

        // Sharing and History
        sharingHistory: [],

        // UI State
        sidebarOpen: false,
        currentView: "dashboard",
        theme: "auto",

        // Error Handling
        error: null,
        loading: false,

        // Service Instances
        storageService: StorageService.getInstance(),
        webauthnService: WebAuthnService.getInstance(),
        cryptoService: CryptoService.getInstance(),

        // Actions
        initialize: async () => {
          const { storageService, setLoading, setError } = get();

          try {
            setLoading(true);
            setError(null);

            // Initialize storage
            await storageService.initialize();

            // Load configuration
            const config = await storageService.getConfig();
            if (config) {
              set({ config });
            }

            // Check if this is a first-time user (no config means setup needed)
            const needsSetup = !config || !config.setupCompleted;

            if (needsSetup) {
              set({
                initialized: true,
                locked: true,
                needsOnboarding: true,
              });
            } else {
              // Always start locked in production - security hardening
              set({
                initialized: true,
                locked: true,
                needsOnboarding: false,
              });
            }
          } catch (error) {
            errorService.logError("Error initializing wallet:", error);
            setError(
              error instanceof Error
                ? error.message
                : "Failed to initialize wallet",
            );
          } finally {
            setLoading(false);
          }
        },

        setupWallet: async (onboardingData: any) => {
          const {
            cryptoService,
            webauthnService,
            storageService,
            setLoading,
            setError,
          } = get();

          try {
            setLoading(true);
            setError(null);

            // Initialize storage with password if using password auth
            if (
              onboardingData.authMethod === "password" &&
              onboardingData.password
            ) {
              await storageService.initialize(onboardingData.password);
            } else {
              await storageService.initialize();
            }

            // Generate DID
            const keyPair = await cryptoService.generateEd25519KeyPair();
            const didDocument = await cryptoService.createDIDDocument(keyPair, {
              method: onboardingData.didMethod,
              keyType: "Ed25519",
              services: [
                {
                  id: "#persona-service",
                  type: "PersonaService",
                  serviceEndpoint: "https://api.personapass.xyz",
                },
              ],
            });

            // Store DID
            await storageService.storeDID(didDocument);

            // Setup authentication
            if (onboardingData.authMethod === "passkey") {
              await webauthnService.registerPasskey(
                onboardingData.passkeyName || "Default Passkey",
              );
            }

            // Create initial configuration
            const config: WalletConfig = {
              id: `config-${Date.now()}`,
              name: "Persona Wallet",
              version: "1.0.0",
              created: new Date().toISOString(),
              setupCompleted: true,
              security: {
                encryption_enabled: true,
                backup_enabled: onboardingData.backupEnabled || false,
                biometric_enabled: onboardingData.biometricsEnabled || false,
                auto_lock_timeout: 15,
                passkey_enabled: onboardingData.authMethod === "passkey",
              },
              privacy: {
                anonymous_analytics: onboardingData.analyticsOptIn || false,
                crash_reporting: false,
                usage_statistics: false,
                selective_disclosure_default: true,
              },
              sync: {
                enabled: false,
                provider: "none",
                auto_sync: false,
              },
              ui: {
                theme: "auto",
                language: "en",
                currency: "USD",
                notifications_enabled: true,
              },
            };

            await storageService.storeConfig(config);

            // Set initial state
            set({
              config,
              dids: [didDocument],
              currentDID: didDocument,
              current_did: didDocument.id,
              locked: false,
              isAuthenticated: true,
              authenticationMethod: onboardingData.authMethod,
              initialized: true,
              needsOnboarding: false,
            });
          } catch (error) {
            errorService.logError("Error setting up wallet:", error);
            setError(
              error instanceof Error ? error.message : "Failed to setup wallet",
            );
            throw error;
          } finally {
            setLoading(false);
          }
        },

        unlock: async (method: "passkey" | "password", credential?: any) => {
          const { storageService, webauthnService, setLoading, setError } =
            get();

          try {
            setLoading(true);
            setError(null);

            if (method === "passkey") {
              // Authenticate with passkey
              await webauthnService.authenticateWithPasskey();
              set({
                locked: false,
                isAuthenticated: true,
                authenticationMethod: "passkey",
              });
            } else if (method === "password" && credential) {
              // Initialize storage with password
              await storageService.initialize(credential);
              set({
                locked: false,
                isAuthenticated: true,
                authenticationMethod: "password",
              });
            }

            // Load wallet data after unlocking
            await get().loadWalletData();
          } catch (error) {
            errorService.logError("Error unlocking wallet:", error);
            setError(
              error instanceof Error
                ? error.message
                : "Failed to unlock wallet",
            );
          } finally {
            setLoading(false);
          }
        },

        loadWalletData: async () => {
          const { storageService } = get();

          try {
            // Load all wallet data
            const [dids, credentials, connections, passkeys, sharingHistory] =
              await Promise.all([
                storageService.getAllDIDs(),
                storageService.getCredentials(),
                storageService.getConnections(),
                storageService.getPasskeys(),
                storageService.getSharingHistory(),
              ]);

            // Extract connected platforms from credentials
            const platforms = [
              ...new Set(
                credentials
                  .map((c) => c.metadata?.source || "unknown")
                  .filter(Boolean),
              ),
            ];

            set({
              dids,
              credentials,
              connections,
              passkeys,
              sharingHistory,
              connectedPlatforms: platforms,
              currentDID: dids[0] || null,
              current_did: dids[0]?.id,
              active_connections: connections.filter((c) => c.active),
            });

            // Apply current filter
            get().applyCredentialFilter();
          } catch (error) {
            errorService.logError("Error loading wallet data:", error);
            get().setError("Failed to load wallet data");
          }
        },

        lock: () => {
          set({
            locked: true,
            isAuthenticated: false,
            authenticationMethod: null,
            dids: [],
            credentials: [],
            connections: [],
            passkeys: [],
            sharingHistory: [],
            currentDID: null,
            current_did: undefined,
            active_connections: [],
            pending_requests: [],
            error: null,
          });
        },

        // DID Actions
        setCurrentDID: (did: DID) => {
          set({
            currentDID: did,
            current_did: did.id,
          });
        },

        addDID: async (did: DID) => {
          const { storageService } = get();
          await storageService.storeDID(did);
          set((state) => ({
            dids: [...state.dids, did],
          }));
        },

        removeDID: (didId: string) => {
          set((state) => ({
            dids: state.dids.filter((d) => d.id !== didId),
            currentDID:
              state.currentDID?.id === didId
                ? state.dids.find((d) => d.id !== didId) || null
                : state.currentDID,
          }));
        },

        // Credential Actions
        addCredential: async (credential: WalletCredential) => {
          const { storageService } = get();
          await storageService.storeCredential(credential);
          set((state) => {
            // Check if platform is already connected
            const platform = credential.metadata?.source || "unknown";
            const updatedPlatforms = state.connectedPlatforms.includes(platform)
              ? state.connectedPlatforms
              : [...state.connectedPlatforms, platform];

            return {
              credentials: [...state.credentials, credential],
              connectedPlatforms: updatedPlatforms,
            };
          });
          get().applyCredentialFilter();
        },

        removeCredential: async (credentialId: string) => {
          const { storageService, credentials } = get();
          const credential = credentials.find((c) => c.id === credentialId);

          await storageService.deleteCredential(credentialId);

          set((state) => {
            const updatedCredentials = state.credentials.filter(
              (c) => c.id !== credentialId,
            );

            // Check if we should remove platform from connected list
            if (credential) {
              const platform = credential.metadata?.source || "unknown";
              const hasSamePlatform = updatedCredentials.some(
                (c) => (c.metadata?.source || "unknown") === platform,
              );

              const updatedPlatforms = hasSamePlatform
                ? state.connectedPlatforms
                : state.connectedPlatforms.filter((p) => p !== platform);

              return {
                credentials: updatedCredentials,
                connectedPlatforms: updatedPlatforms,
              };
            }

            return {
              credentials: updatedCredentials,
            };
          });
          get().applyCredentialFilter();
        },

        updateCredential: async (
          credentialId: string,
          updates: Partial<WalletCredential>,
        ) => {
          const { credentials, storageService } = get();
          const credentialIndex = credentials.findIndex(
            (c) => c.id === credentialId,
          );

          if (credentialIndex !== -1) {
            const updatedCredential = {
              ...credentials[credentialIndex],
              ...updates,
            };
            await storageService.storeCredential(updatedCredential);

            set((state) => ({
              credentials: state.credentials.map((c) =>
                c.id === credentialId ? updatedCredential : c,
              ),
            }));
            get().applyCredentialFilter();
          }
        },

        loadCredentials: async () => {
          const { storageService } = get();

          try {
            const credentials = await storageService.getCredentials();

            // Extract connected platforms from credentials
            const platforms = [
              ...new Set(
                credentials
                  .map((c) => c.metadata?.source || "unknown")
                  .filter(Boolean),
              ),
            ];

            set({
              credentials,
              connectedPlatforms: platforms,
            });

            // Apply current filter
            get().applyCredentialFilter();
          } catch (error) {
            errorService.logError("Error loading credentials:", error);
            get().setError("Failed to load credentials");
          }
        },

        setCredentialFilter: (
          filter: Partial<WalletStore["credentialFilter"]>,
        ) => {
          set((state) => ({
            credentialFilter: { ...state.credentialFilter, ...filter },
          }));
          get().applyCredentialFilter();
        },

        applyCredentialFilter: () => {
          const { credentials, credentialFilter } = get();

          let filtered = credentials;

          // Filter by tags
          if (credentialFilter.tags.length > 0) {
            filtered = filtered.filter((cred) =>
              credentialFilter.tags.some((tag) =>
                cred.metadata.tags.includes(tag),
              ),
            );
          }

          // Filter by source
          if (credentialFilter.source) {
            filtered = filtered.filter(
              (cred) => cred.metadata.source === credentialFilter.source,
            );
          }

          // Filter by search query
          if (credentialFilter.searchQuery) {
            const query = credentialFilter.searchQuery.toLowerCase();
            filtered = filtered.filter((cred) => {
              const credData = JSON.stringify(cred.credential).toLowerCase();
              return (
                credData.includes(query) ||
                cred.metadata.tags.some((tag) =>
                  tag.toLowerCase().includes(query),
                )
              );
            });
          }

          set({ filteredCredentials: filtered });
        },

        // Connection Actions
        addConnection: async (connection: WalletConnection) => {
          const { storageService } = get();
          await storageService.storeConnection(connection);
          set((state) => ({
            connections: [...state.connections, connection],
            active_connections: connection.active
              ? [...state.active_connections, connection]
              : state.active_connections,
          }));
        },

        removeConnection: async (connectionId: string) => {
          const { storageService } = get();
          await storageService.deleteConnection(connectionId);
          set((state) => ({
            connections: state.connections.filter((c) => c.id !== connectionId),
            active_connections: state.active_connections.filter(
              (c) => c.id !== connectionId,
            ),
          }));
        },

        updateConnection: async (
          connectionId: string,
          updates: Partial<WalletConnection>,
        ) => {
          const { connections, storageService } = get();
          const connectionIndex = connections.findIndex(
            (c) => c.id === connectionId,
          );

          if (connectionIndex !== -1) {
            const updatedConnection = {
              ...connections[connectionIndex],
              ...updates,
            };
            await storageService.storeConnection(updatedConnection);

            set((state) => ({
              connections: state.connections.map((c) =>
                c.id === connectionId ? updatedConnection : c,
              ),
              active_connections: state.active_connections
                .map((c) => (c.id === connectionId ? updatedConnection : c))
                .filter((c) => c.active),
            }));
          }
        },

        // Authentication Actions
        registerPasskey: async (name: string) => {
          const { webauthnService, currentDID } = get();

          if (!currentDID) {
            throw new Error("No DID selected for passkey registration");
          }

          const passkey = await webauthnService.registerPasskey({
            username: currentDID.identifier,
            displayName: name,
          });

          set((state) => ({
            passkeys: [...state.passkeys, passkey],
          }));
        },

        removePasskey: async (credentialId: string) => {
          const { webauthnService } = get();
          await webauthnService.removePasskey(credentialId);
          set((state) => ({
            passkeys: state.passkeys.filter(
              (p) => p.credentialId !== credentialId,
            ),
          }));
        },

        // Sharing Actions
        addSharingRecord: async (record: SharingRecord) => {
          const { storageService } = get();
          await storageService.storeSharingRecord(record);
          set((state) => ({
            sharingHistory: [record, ...state.sharingHistory],
          }));
        },

        // Proof Request Actions
        addProofRequest: (request: ProofRequest) => {
          set((state) => ({
            pending_requests: [...state.pending_requests, request],
          }));
        },

        removeProofRequest: (requestId: string) => {
          set((state) => ({
            pending_requests: state.pending_requests.filter(
              (r) => r.id !== requestId,
            ),
          }));
        },

        approveProofRequest: async (requestId: string) => {
          // Implementation for proof generation and response
          // This would involve the proof generation service
          get().removeProofRequest(requestId);
        },

        denyProofRequest: async (requestId: string) => {
          // Implementation for denying proof request
          get().removeProofRequest(requestId);
        },

        // Notification Actions
        addNotification: (
          notification: Omit<WalletNotification, "id" | "timestamp" | "read">,
        ) => {
          const newNotification: WalletNotification = {
            ...notification,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            read: false,
          };

          set((state) => ({
            notifications: [newNotification, ...state.notifications],
          }));
        },

        markNotificationAsRead: (notificationId: string) => {
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === notificationId ? { ...n, read: true } : n,
            ),
          }));
        },

        clearNotifications: () => {
          set({ notifications: [] });
        },

        // Configuration Actions
        updateConfig: async (updates: Partial<WalletConfig>) => {
          const { config, storageService } = get();

          if (config) {
            const updatedConfig = { ...config, ...updates };
            await storageService.storeConfig(updatedConfig);
            set({ config: updatedConfig });
          }
        },

        // UI Actions
        setSidebarOpen: (open: boolean) => {
          set({ sidebarOpen: open });
        },

        setCurrentView: (view: WalletStore["currentView"]) => {
          set({ currentView: view });
        },

        setTheme: (theme: WalletStore["theme"]) => {
          set({ theme });

          // Apply theme to document
          if (typeof document !== "undefined") {
            if (theme === "dark") {
              document.documentElement.classList.add("dark");
            } else if (theme === "light") {
              document.documentElement.classList.remove("dark");
            } else {
              // Auto theme - check system preference
              const systemPrefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)",
              ).matches;
              if (systemPrefersDark) {
                document.documentElement.classList.add("dark");
              } else {
                document.documentElement.classList.remove("dark");
              }
            }
          }
        },

        setError: (error: string | null) => {
          set({ error });
        },

        setLoading: (loading: boolean) => {
          set({ loading });
        },
      }),
      {
        name: "personapass-wallet",
        partialize: (state) => ({
          // Only persist UI preferences
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          credentialFilter: state.credentialFilter,
        }),
      },
    ),
  ),
);

// Subscribe to online/offline events
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useWalletStore.setState({ online: true });
  });

  window.addEventListener("offline", () => {
    useWalletStore.setState({ online: false });
  });
}

// Auto-lock timer
let autoLockTimer: NodeJS.Timeout | null = null;

useWalletStore.subscribe(
  (state) => state.config?.security.auto_lock_timeout,
  (autoLockTimeout) => {
    if (autoLockTimer) {
      clearTimeout(autoLockTimer);
    }

    if (autoLockTimeout && autoLockTimeout > 0) {
      autoLockTimer = setTimeout(
        () => {
          const state = useWalletStore.getState();
          if (!state.locked) {
            state.lock();
          }
        },
        autoLockTimeout * 60 * 1000,
      ); // Convert minutes to milliseconds
    }
  },
);
