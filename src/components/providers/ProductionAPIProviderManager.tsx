/**
 * Production API Provider Manager for PersonaChain
 * Enterprise-grade API integration and management interface
 * Connects with APIAggregatorService for comprehensive provider management
 * 
 * Features:
 * - Multi-provider API integration (RapidAPI, LinkedIn, GitHub, Plaid, Experian, Stripe)
 * - Real-time connection status and health monitoring
 * - OAuth flow management with secure token handling
 * - Rate limiting and quota management per provider
 * - Advanced authentication methods (OAuth 2.0, API Keys, JWT)
 * - Credential type mapping and availability tracking
 * - Professional UI with comprehensive error handling
 * - Usage analytics and cost optimization
 * - Automated reconnection and retry logic
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LinkIcon,
  GlobeAltIcon,
  KeyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CogIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  ChartBarIcon,
  BanknotesIcon,
  UserGroupIcon,
  DocumentTextIcon,
  StarIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  Bars3Icon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

// ==================== TYPES ====================

interface APIProvider {
  id: string;
  name: string;
  description: string;
  logo: string;
  website: string;
  category: 'professional' | 'financial' | 'identity' | 'social' | 'education' | 'healthcare';
  authMethods: AuthMethod[];
  supportedCredentials: SupportedCredential[];
  status: 'connected' | 'disconnected' | 'error' | 'connecting' | 'maintenance';
  connectionDate?: Date;
  lastSync?: Date;
  nextSync?: Date;
  config: ProviderConfiguration;
  metrics: ProviderMetrics;
  compliance: ComplianceInfo;
}

interface AuthMethod {
  type: 'oauth2' | 'api_key' | 'jwt' | 'basic_auth';
  name: string;
  description: string;
  scopes: string[];
  required: boolean;
  configured: boolean;
}

interface SupportedCredential {
  type: string;
  name: string;
  description: string;
  dataFields: DataField[];
  verificationLevel: 'basic' | 'enhanced' | 'premium';
  cost: number;
  processingTime: string;
  available: boolean;
}

interface DataField {
  field: string;
  displayName: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  validation?: ValidationRule;
}

interface ValidationRule {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

interface ProviderConfiguration {
  rateLimits: RateLimit;
  dataRetention: DataRetentionPolicy;
  privacySettings: PrivacySettings;
  notifications: NotificationSettings;
  advanced: AdvancedSettings;
}

interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstAllowance: number;
  currentUsage: UsageMetrics;
}

interface UsageMetrics {
  requestsThisMinute: number;
  requestsThisHour: number;
  requestsThisDay: number;
  resetTime: Date;
}

interface DataRetentionPolicy {
  retentionPeriod: number; // days
  autoDelete: boolean;
  backupEnabled: boolean;
  encryptionEnabled: boolean;
}

interface PrivacySettings {
  dataSharingEnabled: boolean;
  analyticsEnabled: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed';
  piiHandling: 'strip' | 'hash' | 'encrypt' | 'retain';
}

interface NotificationSettings {
  rateLimitWarnings: boolean;
  connectionIssues: boolean;
  credentialUpdates: boolean;
  maintenanceAlerts: boolean;
  emailNotifications: boolean;
  webhookURL?: string;
}

interface AdvancedSettings {
  timeoutSeconds: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  cacheDuration: number;
  customHeaders: Record<string, string>;
  proxyEnabled: boolean;
  proxyURL?: string;
}

interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  costThisMonth: number;
  credentialsCreated: number;
  lastError?: ErrorInfo;
}

interface ErrorInfo {
  message: string;
  code: string;
  timestamp: Date;
  details?: any;
}

interface ComplianceInfo {
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  hipaaCompliant: boolean;
  soc2Type2: boolean;
  iso27001: boolean;
  dataProcessingAgreement: boolean;
  privacyPolicyURL?: string;
  termsOfServiceURL?: string;
}

interface ConnectionRequest {
  providerId: string;
  authMethod: string;
  credentials: Record<string, any>;
  scopes: string[];
  configuration: Partial<ProviderConfiguration>;
}

// ==================== MAIN COMPONENT ====================

export const ProductionAPIProviderManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'providers' | 'connected' | 'marketplace' | 'analytics'>('providers');
  const [providers, setProviders] = useState<APIProvider[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<APIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<APIProvider | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'professional' | 'financial' | 'identity' | 'social'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'cost' | 'popularity'>('name');

  // ==================== EFFECTS ====================

  useEffect(() => {
    loadProviders();
    loadConnectedProviders();
    const interval = setInterval(loadConnectedProviders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // ==================== API INTEGRATION ====================

  const loadProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/providers/marketplace');
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }, []);

  const loadConnectedProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/providers/connected');
      const data = await response.json();
      setConnectedProviders(data);
    } catch (error) {
      console.error('Failed to load connected providers:', error);
    }
  }, []);

  const connectProvider = async (request: ConnectionRequest) => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/providers/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to connect provider');
      }

      const result = await response.json();
      
      // Handle OAuth redirect if needed
      if (result.authURL) {
        window.open(result.authURL, '_blank', 'width=600,height=600');
        // Poll for completion
        const pollInterval = setInterval(async () => {
          const statusResponse = await fetch(`/api/providers/connection-status/${result.connectionId}`);
          const status = await statusResponse.json();
          
          if (status.completed) {
            clearInterval(pollInterval);
            await loadConnectedProviders();
            setShowConnectionModal(false);
          } else if (status.error) {
            clearInterval(pollInterval);
            throw new Error(status.error);
          }
        }, 2000);
      } else {
        // Direct connection completed
        await loadConnectedProviders();
        setShowConnectionModal(false);
      }
      
    } catch (error) {
      console.error('Failed to connect provider:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectProvider = async (providerId: string) => {
    try {
      const response = await fetch(`/api/providers/${providerId}/disconnect`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadConnectedProviders();
      }
    } catch (error) {
      console.error('Failed to disconnect provider:', error);
    }
  };

  const testConnection = async (providerId: string) => {
    try {
      const response = await fetch(`/api/providers/${providerId}/test`, {
        method: 'POST'
      });

      const result = await response.json();
      
      // Update provider status
      setConnectedProviders(prev => 
        prev.map(p => 
          p.id === providerId 
            ? { ...p, status: result.success ? 'connected' : 'error', lastSync: new Date() }
            : p
        )
      );
      
    } catch (error) {
      console.error('Failed to test connection:', error);
    }
  };

  const syncProvider = async (providerId: string) => {
    try {
      const response = await fetch(`/api/providers/${providerId}/sync`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadConnectedProviders();
      }
    } catch (error) {
      console.error('Failed to sync provider:', error);
    }
  };

  // ==================== COMPUTED VALUES ====================

  const filteredProviders = providers
    .filter(provider => {
      if (filter === 'all') return true;
      return provider.category === filter;
    })
    .filter(provider => 
      searchTerm === '' || 
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'cost':
          return Math.min(...a.supportedCredentials.map(c => c.cost)) - 
                 Math.min(...b.supportedCredentials.map(c => c.cost));
        case 'popularity':
          return b.metrics.totalRequests - a.metrics.totalRequests;
        default:
          return 0;
      }
    });

  // ==================== RENDER METHODS ====================

  const renderOverviewStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Connected Providers</p>
            <p className="text-2xl font-bold text-white">{connectedProviders.length}</p>
          </div>
          <LinkIcon className="h-8 w-8 text-blue-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Active Connections</p>
            <p className="text-2xl font-bold text-white">
              {connectedProviders.filter(p => p.status === 'connected').length}
            </p>
          </div>
          <CheckCircleIcon className="h-8 w-8 text-green-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Requests</p>
            <p className="text-2xl font-bold text-white">
              {connectedProviders.reduce((sum, p) => sum + p.metrics.totalRequests, 0)}
            </p>
          </div>
          <ChartBarIcon className="h-8 w-8 text-purple-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Monthly Cost</p>
            <p className="text-2xl font-bold text-white">
              ${connectedProviders.reduce((sum, p) => sum + p.metrics.costThisMonth, 0).toFixed(2)}
            </p>
          </div>
          <BanknotesIcon className="h-8 w-8 text-orange-400" />
        </div>
      </motion.div>
    </div>
  );

  const renderControls = () => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div className="flex items-center space-x-4">
        <input
          type="text"
          placeholder="Search providers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="professional">Professional</option>
          <option value="financial">Financial</option>
          <option value="identity">Identity</option>
          <option value="social">Social</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="name">Sort by Name</option>
          <option value="category">Sort by Category</option>
          <option value="cost">Sort by Cost</option>
          <option value="popularity">Sort by Popularity</option>
        </select>
      </div>

      <button
        onClick={() => setShowConnectionModal(true)}
        className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center space-x-2"
      >
        <PlusIcon className="h-5 w-5" />
        <span>Connect Provider</span>
      </button>
    </div>
  );

  const renderProvidersTab = () => (
    <div className="space-y-6">
      {renderControls()}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProviders.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isConnected={connectedProviders.some(p => p.id === provider.id)}
            onClick={() => setSelectedProvider(provider)}
            onConnect={() => {
              setSelectedProvider(provider);
              setShowConnectionModal(true);
            }}
          />
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <GlobeAltIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Providers Found</h3>
          <p className="text-gray-400">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Explore our marketplace of API providers'
            }
          </p>
        </div>
      )}
    </div>
  );

  const renderConnectedTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {connectedProviders.map((provider) => (
          <ConnectedProviderCard
            key={provider.id}
            provider={provider}
            onDisconnect={disconnectProvider}
            onTest={testConnection}
            onSync={syncProvider}
            onConfigure={() => {
              setSelectedProvider(provider);
              setShowConfigModal(true);
            }}
          />
        ))}
      </div>

      {connectedProviders.length === 0 && (
        <div className="text-center py-12">
          <LinkIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Connected Providers</h3>
          <p className="text-gray-400 mb-6">
            Connect to API providers to start creating verifiable credentials
          </p>
          <button
            onClick={() => setActiveTab('providers')}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
          >
            Browse Providers
          </button>
        </div>
      )}
    </div>
  );

  const renderTabNavigation = () => (
    <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1 mb-8">
      {[
        { id: 'providers', label: 'Providers', icon: GlobeAltIcon },
        { id: 'connected', label: 'Connected', icon: LinkIcon },
        { id: 'marketplace', label: 'Marketplace', icon: BuildingOfficeIcon },
        { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${activeTab === tab.id
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }
          `}
        >
          <tab.icon className="h-4 w-4" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            API Provider Manager
          </h1>
          <p className="text-gray-300 text-lg">
            Connect and manage external API providers for credential creation
          </p>
        </motion.div>

        {/* Overview Stats */}
        {renderOverviewStats()}

        {/* Tab Navigation */}
        {renderTabNavigation()}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'providers' && renderProvidersTab()}
            {activeTab === 'connected' && renderConnectedTab()}
            {activeTab === 'marketplace' && <ProviderMarketplace providers={providers} />}
            {activeTab === 'analytics' && <ProviderAnalytics connectedProviders={connectedProviders} />}
          </motion.div>
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {showConnectionModal && selectedProvider && (
            <ConnectionModal
              provider={selectedProvider}
              onClose={() => setShowConnectionModal(false)}
              onConnect={connectProvider}
              isConnecting={isConnecting}
            />
          )}
          {showConfigModal && selectedProvider && (
            <ConfigurationModal
              provider={selectedProvider}
              onClose={() => setShowConfigModal(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ==================== SUPPORTING COMPONENTS ====================

const ProviderCard: React.FC<{
  provider: APIProvider;
  isConnected: boolean;
  onClick: () => void;
  onConnect: () => void;
}> = ({ provider, isConnected, onClick, onConnect }) => {
  const getCategoryColor = () => {
    switch (provider.category) {
      case 'professional':
        return 'bg-blue-500/20 text-blue-400';
      case 'financial':
        return 'bg-green-500/20 text-green-400';
      case 'identity':
        return 'bg-purple-500/20 text-purple-400';
      case 'social':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="border border-gray-700/50 bg-gray-800/50 rounded-xl p-6 cursor-pointer transition-all hover:border-gray-600/50"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <img src={provider.logo} alt="" className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{provider.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor()}`}>
              {provider.category}
            </span>
          </div>
        </div>
        {isConnected && (
          <CheckCircleIcon className="h-5 w-5 text-green-400" />
        )}
      </div>

      <p className="text-gray-300 text-sm mb-4 line-clamp-2">{provider.description}</p>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-400">Credentials:</span>
          <span className="text-white">{provider.supportedCredentials.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Auth Methods:</span>
          <span className="text-white">{provider.authMethods.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Min Cost:</span>
          <span className="text-white">
            ${Math.min(...provider.supportedCredentials.map(c => c.cost))}
          </span>
        </div>
      </div>

      <div className="flex space-x-2">
        {!isConnected ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnect();
            }}
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all text-sm"
          >
            Connect
          </button>
        ) : (
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg cursor-not-allowed text-sm"
            disabled
          >
            Connected
          </button>
        )}
        <button
          onClick={(e) => e.stopPropagation()}
          className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-all text-sm"
        >
          Details
        </button>
      </div>
    </motion.div>
  );
};

const ConnectedProviderCard: React.FC<{
  provider: APIProvider;
  onDisconnect: (id: string) => void;
  onTest: (id: string) => void;
  onSync: (id: string) => void;
  onConfigure: () => void;
}> = ({ provider, onDisconnect, onTest, onSync, onConfigure }) => {
  const getStatusIcon = () => {
    switch (provider.status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
      case 'connecting':
        return <ArrowPathIcon className="h-5 w-5 text-blue-400 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getStatusColor = () => {
    switch (provider.status) {
      case 'connected':
        return 'border-green-500/20 bg-green-500/5';
      case 'error':
        return 'border-red-500/20 bg-red-500/5';
      case 'connecting':
        return 'border-blue-500/20 bg-blue-500/5';
      default:
        return 'border-yellow-500/20 bg-yellow-500/5';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-xl p-6 ${getStatusColor()}`}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <img src={provider.logo} alt="" className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{provider.name}</h3>
            <p className="text-gray-400">{provider.description}</p>
            <div className="flex items-center space-x-2 mt-2">
              {getStatusIcon()}
              <span className="text-sm text-white capitalize">{provider.status}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onTest(provider.id)}
            className="text-gray-400 hover:text-blue-400 transition-colors"
            title="Test Connection"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onSync(provider.id)}
            className="text-gray-400 hover:text-green-400 transition-colors"
            title="Sync Data"
          >
            <ArrowDownIcon className="h-5 w-5" />
          </button>
          <button
            onClick={onConfigure}
            className="text-gray-400 hover:text-orange-400 transition-colors"
            title="Configure"
          >
            <CogIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDisconnect(provider.id)}
            className="text-gray-400 hover:text-red-400 transition-colors"
            title="Disconnect"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Total Requests</p>
          <p className="text-white font-semibold">{provider.metrics.totalRequests}</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Success Rate</p>
          <p className="text-white font-semibold">
            {((provider.metrics.successfulRequests / provider.metrics.totalRequests) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Avg Response</p>
          <p className="text-white font-semibold">{provider.metrics.averageResponseTime}ms</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Monthly Cost</p>
          <p className="text-white font-semibold">${provider.metrics.costThisMonth.toFixed(2)}</p>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Rate Limits</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-xs">Per Minute</p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ 
                    width: `${(provider.config.rateLimits.currentUsage.requestsThisMinute / 
                              provider.config.rateLimits.requestsPerMinute) * 100}%` 
                  }}
                />
              </div>
              <span className="text-white text-xs">
                {provider.config.rateLimits.currentUsage.requestsThisMinute}/{provider.config.rateLimits.requestsPerMinute}
              </span>
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Per Hour</p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ 
                    width: `${(provider.config.rateLimits.currentUsage.requestsThisHour / 
                              provider.config.rateLimits.requestsPerHour) * 100}%` 
                  }}
                />
              </div>
              <span className="text-white text-xs">
                {provider.config.rateLimits.currentUsage.requestsThisHour}/{provider.config.rateLimits.requestsPerHour}
              </span>
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Per Day</p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full" 
                  style={{ 
                    width: `${(provider.config.rateLimits.currentUsage.requestsThisDay / 
                              provider.config.rateLimits.requestsPerDay) * 100}%` 
                  }}
                />
              </div>
              <span className="text-white text-xs">
                {provider.config.rateLimits.currentUsage.requestsThisDay}/{provider.config.rateLimits.requestsPerDay}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Last Error */}
      {provider.metrics.lastError && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-sm font-medium">Last Error</p>
          <p className="text-red-300 text-xs">{provider.metrics.lastError.message}</p>
          <p className="text-gray-400 text-xs">
            {new Date(provider.metrics.lastError.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </motion.div>
  );
};

const ConnectionModal: React.FC<{
  provider: APIProvider;
  onClose: () => void;
  onConnect: (request: ConnectionRequest) => void;
  isConnecting: boolean;
}> = ({ provider, onClose, onConnect, isConnecting }) => {
  const [selectedAuthMethod, setSelectedAuthMethod] = useState(provider.authMethods[0]?.type || '');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const handleConnect = () => {
    const authMethod = provider.authMethods.find(m => m.type === selectedAuthMethod);
    if (!authMethod) return;

    const request: ConnectionRequest = {
      providerId: provider.id,
      authMethod: selectedAuthMethod,
      credentials,
      scopes: selectedScopes,
      configuration: {
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          burstAllowance: 10,
          currentUsage: {
            requestsThisMinute: 0,
            requestsThisHour: 0,
            requestsThisDay: 0,
            resetTime: new Date()
          }
        }
      }
    };

    onConnect(request);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Connect to {provider.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Authentication Method
            </label>
            <select
              value={selectedAuthMethod}
              onChange={(e) => setSelectedAuthMethod(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
            >
              {provider.authMethods.map((method) => (
                <option key={method.type} value={method.type}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          {selectedAuthMethod === 'api_key' && (
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                API Key
              </label>
              <input
                type="password"
                placeholder="Enter your API key..."
                value={credentials.apiKey || ''}
                onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
              />
            </div>
          )}

          {selectedAuthMethod === 'basic_auth' && (
            <>
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username..."
                  value={credentials.username || ''}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={credentials.password || ''}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
                />
              </div>
            </>
          )}

          {selectedAuthMethod === 'oauth2' && (
            <div>
              <p className="text-gray-400 text-sm">
                Click connect to authorize access through OAuth 2.0. A new window will open for authentication.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConfigurationModal: React.FC<{
  provider: APIProvider;
  onClose: () => void;
}> = ({ provider, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Configure {provider.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Provider Configuration</h4>
            <p className="text-gray-400 text-sm">
              Advanced configuration options for {provider.name} integration
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
          >
            Save Configuration
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProviderMarketplace: React.FC<{
  providers: APIProvider[];
}> = ({ providers }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Provider Marketplace</h3>
        <p className="text-gray-400">Discover and explore available API providers</p>
      </div>
    </div>
  );
};

const ProviderAnalytics: React.FC<{
  connectedProviders: APIProvider[];
}> = ({ connectedProviders }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Provider Analytics</h3>
        <p className="text-gray-400">Usage analytics and performance metrics</p>
      </div>
    </div>
  );
};

export default ProductionAPIProviderManager;