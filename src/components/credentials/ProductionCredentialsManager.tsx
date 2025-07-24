/**
 * Production Credentials Manager for PersonaChain
 * Enterprise-grade interface for managing verifiable credentials
 * Integrates with the complete VC creation pipeline (API→VC→DID)
 * 
 * Features:
 * - Real-time credential creation and management
 * - Integration with multiple API providers (RapidAPI, LinkedIn, GitHub, Plaid)
 * - W3C VC/VP compliance with DID attachment
 * - Advanced credential lifecycle management
 * - Privacy controls and selective disclosure
 * - Professional UI with comprehensive error handling
 * - Real-time status updates and progress tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCardIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  LinkIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

// ==================== TYPES ====================

interface VerifiableCredential {
  id: string;
  type: string[];
  issuer: {
    id: string;
    name: string;
    logo?: string;
  };
  subject: {
    id: string;
    [key: string]: any;
  };
  issuanceDate: Date;
  expirationDate?: Date;
  credentialStatus: {
    id: string;
    type: string;
    status: 'active' | 'suspended' | 'revoked' | 'expired';
  };
  proof: {
    type: string;
    created: Date;
    proofPurpose: string;
    verificationMethod: string;
    jws?: string;
  };
  metadata: {
    source: string;
    privacyLevel: 'public' | 'private' | 'confidential';
    tags: string[];
    attachedToDID: boolean;
    zkProofGenerated: boolean;
    shareCount: number;
  };
}

interface CredentialCreationRequest {
  provider: string;
  credentialType: string;
  apiData: any;
  privacySettings: {
    privacyLevel: 'public' | 'private' | 'confidential';
    selectiveDisclosure: boolean;
    zkProofEnabled: boolean;
  };
  didAttachment: {
    enabled: boolean;
    didId?: string;
    portfolioSection?: string;
  };
}

interface APIProvider {
  id: string;
  name: string;
  description: string;
  logo: string;
  supportedCredentials: string[];
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  credentialCount: number;
}

interface CredentialCreationStatus {
  requestId: string;
  stage: 'api_fetch' | 'vc_creation' | 'did_attachment' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
  result?: VerifiableCredential;
}

// ==================== MAIN COMPONENT ====================

export const ProductionCredentialsManager: React.FC = () => {
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [apiProviders, setApiProviders] = useState<APIProvider[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<VerifiableCredential | null>(null);
  const [creationRequests, setCreationRequests] = useState<CredentialCreationStatus[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'issuer'>('date');

  // ==================== EFFECTS ====================

  useEffect(() => {
    loadCredentials();
    loadAPIProviders();
    const interval = setInterval(loadCredentials, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // ==================== API INTEGRATION ====================

  const loadCredentials = useCallback(async () => {
    try {
      const response = await fetch('/api/credentials');
      const data = await response.json();
      setCredentials(data);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  }, []);

  const loadAPIProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/credentials/providers');
      const data = await response.json();
      setApiProviders(data);
    } catch (error) {
      console.error('Failed to load API providers:', error);
    }
  }, []);

  const createCredential = async (request: CredentialCreationRequest) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize creation status
    const status: CredentialCreationStatus = {
      requestId,
      stage: 'api_fetch',
      progress: 0,
      message: 'Fetching data from API provider...'
    };
    
    setCreationRequests(prev => [...prev, status]);
    setIsCreating(true);

    try {
      // Stage 1: API Data Fetching
      updateCreationStatus(requestId, {
        stage: 'api_fetch',
        progress: 25,
        message: `Fetching ${request.credentialType} data from ${request.provider}...`
      });

      const apiResponse = await fetch('/api/credentials/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'api_aggregation',
          provider: request.provider,
          credentialType: request.credentialType,
          apiData: request.apiData
        })
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to fetch API data');
      }

      const apiData = await apiResponse.json();

      // Stage 2: VC Creation
      updateCreationStatus(requestId, {
        stage: 'vc_creation',
        progress: 50,
        message: 'Creating W3C Verifiable Credential...'
      });

      const vcResponse = await fetch('/api/credentials/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'vc_creation',
          apiData: apiData.processedData,
          credentialType: request.credentialType,
          privacySettings: request.privacySettings
        })
      });

      if (!vcResponse.ok) {
        throw new Error('Failed to create verifiable credential');
      }

      const vcData = await vcResponse.json();

      // Stage 3: DID Attachment (if enabled)
      if (request.didAttachment.enabled) {
        updateCreationStatus(requestId, {
          stage: 'did_attachment',
          progress: 75,
          message: 'Attaching credential to DID...'
        });

        const didResponse = await fetch('/api/credentials/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: 'did_attachment',
            credential: vcData.credential,
            didId: request.didAttachment.didId,
            portfolioSection: request.didAttachment.portfolioSection
          })
        });

        if (!didResponse.ok) {
          throw new Error('Failed to attach credential to DID');
        }
      }

      // Stage 4: Complete
      updateCreationStatus(requestId, {
        stage: 'complete',
        progress: 100,
        message: 'Credential created successfully!',
        result: vcData.credential
      });

      // Refresh credentials list
      await loadCredentials();
      
      // Remove completed request after delay
      setTimeout(() => {
        setCreationRequests(prev => prev.filter(req => req.requestId !== requestId));
      }, 3000);

    } catch (error) {
      updateCreationStatus(requestId, {
        stage: 'error',
        progress: 0,
        message: 'Failed to create credential',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateCreationStatus = (requestId: string, updates: Partial<CredentialCreationStatus>) => {
    setCreationRequests(prev => 
      prev.map(req => 
        req.requestId === requestId 
          ? { ...req, ...updates }
          : req
      )
    );
  };

  const revokeCredential = async (credentialId: string) => {
    try {
      const response = await fetch(`/api/credentials/${credentialId}/revoke`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadCredentials();
      }
    } catch (error) {
      console.error('Failed to revoke credential:', error);
    }
  };

  const shareCredential = async (credentialId: string, recipients: string[]) => {
    try {
      const response = await fetch(`/api/credentials/${credentialId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients })
      });

      if (response.ok) {
        await loadCredentials();
      }
    } catch (error) {
      console.error('Failed to share credential:', error);
    }
  };

  // ==================== COMPUTED VALUES ====================

  const filteredCredentials = credentials
    .filter(cred => {
      if (filter === 'all') return true;
      return cred.credentialStatus.status === filter;
    })
    .filter(cred => 
      searchTerm === '' || 
      cred.type.some(type => type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      cred.issuer.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.issuanceDate).getTime() - new Date(a.issuanceDate).getTime();
        case 'type':
          return a.type[0].localeCompare(b.type[0]);
        case 'issuer':
          return a.issuer.name.localeCompare(b.issuer.name);
        default:
          return 0;
      }
    });

  // ==================== RENDER METHODS ====================

  const renderCredentialStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Credentials</p>
            <p className="text-2xl font-bold text-white">{credentials.length}</p>
          </div>
          <CreditCardIcon className="h-8 w-8 text-blue-400" />
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
            <p className="text-gray-400 text-sm">Active</p>
            <p className="text-2xl font-bold text-white">
              {credentials.filter(c => c.credentialStatus.status === 'active').length}
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
            <p className="text-gray-400 text-sm">Connected APIs</p>
            <p className="text-2xl font-bold text-white">
              {apiProviders.filter(p => p.status === 'connected').length}
            </p>
          </div>
          <LinkIcon className="h-8 w-8 text-orange-400" />
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
            <p className="text-gray-400 text-sm">ZK Proofs</p>
            <p className="text-2xl font-bold text-white">
              {credentials.filter(c => c.metadata.zkProofGenerated).length}
            </p>
          </div>
          <ShieldCheckIcon className="h-8 w-8 text-purple-400" />
        </div>
      </motion.div>
    </div>
  );

  const renderControls = () => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div className="flex items-center space-x-4">
        <input
          type="text"
          placeholder="Search credentials..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500"
        >
          <option value="date">Sort by Date</option>
          <option value="type">Sort by Type</option>
          <option value="issuer">Sort by Issuer</option>
        </select>
      </div>

      <button
        onClick={() => setShowCreateModal(true)}
        disabled={isCreating}
        className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all flex items-center space-x-2 disabled:opacity-50"
      >
        <PlusIcon className="h-5 w-5" />
        <span>Create Credential</span>
      </button>
    </div>
  );

  const renderCredentialCard = (credential: VerifiableCredential) => {
    const getStatusColor = () => {
      switch (credential.credentialStatus.status) {
        case 'active':
          return 'border-green-500/20 bg-green-500/5';
        case 'expired':
          return 'border-yellow-500/20 bg-yellow-500/5';
        case 'revoked':
          return 'border-red-500/20 bg-red-500/5';
        default:
          return 'border-gray-500/20 bg-gray-500/5';
      }
    };

    const getStatusIcon = () => {
      switch (credential.credentialStatus.status) {
        case 'active':
          return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
        case 'expired':
          return <ClockIcon className="h-5 w-5 text-yellow-400" />;
        case 'revoked':
          return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
        default:
          return <ClockIcon className="h-5 w-5 text-gray-400" />;
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className={`border rounded-xl p-6 cursor-pointer transition-all ${getStatusColor()}`}
        onClick={() => setSelectedCredential(credential)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              {credential.issuer.logo ? (
                <img src={credential.issuer.logo} alt="" className="w-6 h-6" />
              ) : (
                <BuildingOfficeIcon className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">{credential.type[0]}</h3>
              <p className="text-gray-400 text-sm">{credential.issuer.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            {credential.metadata.zkProofGenerated && (
              <ShieldCheckIcon className="h-5 w-5 text-purple-400" />
            )}
            {credential.metadata.attachedToDID && (
              <KeyIcon className="h-5 w-5 text-orange-400" />
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Issued:</span>
            <span className="text-white">{new Date(credential.issuanceDate).toLocaleDateString()}</span>
          </div>
          {credential.expirationDate && (
            <div className="flex justify-between">
              <span className="text-gray-400">Expires:</span>
              <span className="text-white">{new Date(credential.expirationDate).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Privacy:</span>
            <span className="text-white capitalize">{credential.metadata.privacyLevel}</span>
          </div>
          {credential.metadata.shareCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Shared:</span>
              <span className="text-white">{credential.metadata.shareCount} times</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {credential.metadata.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderCreationStatus = () => {
    if (creationRequests.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-white font-semibold mb-4">Active Creation Requests</h3>
        <div className="space-y-3">
          {creationRequests.map((request) => (
            <motion.div
              key={request.requestId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">
                  {request.message}
                </span>
                <span className="text-gray-400 text-sm">
                  {request.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${request.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              {request.error && (
                <p className="text-red-400 text-sm mt-2">{request.error}</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

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
            Credentials Manager
          </h1>
          <p className="text-gray-300 text-lg">
            Manage your verifiable credentials with enterprise-grade security
          </p>
        </motion.div>

        {/* Stats */}
        {renderCredentialStats()}

        {/* Creation Status */}
        {renderCreationStatus()}

        {/* Controls */}
        {renderControls()}

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCredentials.map((credential) => renderCredentialCard(credential))}
        </div>

        {/* Empty State */}
        {filteredCredentials.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <CreditCardIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Credentials Found</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first verifiable credential to get started'
              }
            </p>
            {!searchTerm && filter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all"
              >
                Create First Credential
              </button>
            )}
          </motion.div>
        )}

        {/* Modals */}
        <AnimatePresence>
          {showCreateModal && (
            <CredentialCreationModal
              apiProviders={apiProviders}
              onClose={() => setShowCreateModal(false)}
              onCreate={createCredential}
            />
          )}
          {selectedCredential && (
            <CredentialDetailModal
              credential={selectedCredential}
              onClose={() => setSelectedCredential(null)}
              onRevoke={revokeCredential}
              onShare={shareCredential}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ==================== SUPPORTING COMPONENTS ====================

const CredentialCreationModal: React.FC<{
  apiProviders: APIProvider[];
  onClose: () => void;
  onCreate: (request: CredentialCreationRequest) => void;
}> = ({ apiProviders, onClose, onCreate }) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [credentialType, setCredentialType] = useState<string>('');
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'private' | 'confidential'>('private');
  const [enableDIDAttachment, setEnableDIDAttachment] = useState(true);

  const handleSubmit = () => {
    if (!selectedProvider || !credentialType) return;

    const request: CredentialCreationRequest = {
      provider: selectedProvider,
      credentialType,
      apiData: {},
      privacySettings: {
        privacyLevel,
        selectiveDisclosure: true,
        zkProofEnabled: true
      },
      didAttachment: {
        enabled: enableDIDAttachment,
        didId: 'did:persona:user',
        portfolioSection: 'credentials'
      }
    };

    onCreate(request);
    onClose();
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
        className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Create New Credential</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              API Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
            >
              <option value="">Select provider...</option>
              {apiProviders.filter(p => p.status === 'connected').map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Credential Type
            </label>
            <select
              value={credentialType}
              onChange={(e) => setCredentialType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
              disabled={!selectedProvider}
            >
              <option value="">Select type...</option>
              <option value="professional">Professional Profile</option>
              <option value="education">Education History</option>
              <option value="financial">Financial Status</option>
              <option value="identity">Identity Verification</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Privacy Level
            </label>
            <select
              value={privacyLevel}
              onChange={(e) => setPrivacyLevel(e.target.value as any)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="confidential">Confidential</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white text-sm">Attach to DID</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableDIDAttachment}
                onChange={(e) => setEnableDIDAttachment(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedProvider || !credentialType}
            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50"
          >
            Create Credential
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CredentialDetailModal: React.FC<{
  credential: VerifiableCredential;
  onClose: () => void;
  onRevoke: (id: string) => void;
  onShare: (id: string, recipients: string[]) => void;
}> = ({ credential, onClose, onRevoke, onShare }) => {
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
          <h3 className="text-xl font-semibold text-white">Credential Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h4 className="text-white font-medium mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Type:</span>
                <span className="text-white ml-2">{credential.type.join(', ')}</span>
              </div>
              <div>
                <span className="text-gray-400">Issuer:</span>
                <span className="text-white ml-2">{credential.issuer.name}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="text-white ml-2 capitalize">{credential.credentialStatus.status}</span>
              </div>
              <div>
                <span className="text-gray-400">Privacy:</span>
                <span className="text-white ml-2 capitalize">{credential.metadata.privacyLevel}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => onShare(credential.id, [])}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Share
            </button>
            {credential.credentialStatus.status === 'active' && (
              <button
                onClick={() => onRevoke(credential.id)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProductionCredentialsManager;