/**
 * Enhanced Credentials Page - Beautiful, organized credential management
 * Features: Separate flows, status tracking, history, auto-selection
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CredentialMetadata {
  id: string;
  type: 'github' | 'linkedin' | 'plaid' | 'custom';
  status: 'active' | 'revoked' | 'pending' | 'expired';
  provider: string;
  issuanceDate: string;
  expirationDate?: string;
  lastVerified: string;
  usageCount: number;
  apiCallHistory: APICall[];
  credential: any;
  blockchainTxHash?: string;
  isSelected?: boolean;
}

interface APICall {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status: 'success' | 'failed' | 'pending';
  responseCode: number;
  duration: number;
}

export const EnhancedCredentialsPage = () => {
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'revoked' | 'pending'>('all');
  const [showHistory, setShowHistory] = useState<string | null>(null);

  // Load credentials on mount
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = useCallback(() => {
    // Mock data with proper structure
    const mockCredentials: CredentialMetadata[] = [
      {
        id: 'github_001',
        type: 'github',
        status: 'active',
        provider: 'GitHub',
        issuanceDate: '2024-01-15T10:30:00Z',
        lastVerified: '2024-07-18T09:15:00Z',
        usageCount: 15,
        apiCallHistory: [
          {
            id: 'api_001',
            timestamp: '2024-07-18T09:15:00Z',
            endpoint: '/api/connectors/github/auth',
            method: 'POST',
            status: 'success',
            responseCode: 200,
            duration: 1200
          },
          {
            id: 'api_002',
            timestamp: '2024-07-17T14:22:00Z',
            endpoint: '/api/connectors/github/verify',
            method: 'GET',
            status: 'success',
            responseCode: 200,
            duration: 800
          }
        ],
        credential: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "GitHubCredential"],
          credentialSubject: {
            username: "developer123",
            profileUrl: "https://github.com/developer123",
            publicRepos: 42,
            followers: 156
          }
        },
        blockchainTxHash: '0x7f9f8e5d4c3b2a1e9f8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d'
      },
      {
        id: 'github_002',
        type: 'github',
        status: 'revoked',
        provider: 'GitHub',
        issuanceDate: '2024-01-10T08:20:00Z',
        lastVerified: '2024-06-15T16:45:00Z',
        usageCount: 8,
        apiCallHistory: [
          {
            id: 'api_003',
            timestamp: '2024-06-15T16:45:00Z',
            endpoint: '/api/connectors/github/revoke',
            method: 'DELETE',
            status: 'success',
            responseCode: 200,
            duration: 600
          }
        ],
        credential: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "GitHubCredential"],
          credentialSubject: {
            username: "developer123",
            profileUrl: "https://github.com/developer123",
            publicRepos: 38,
            followers: 120
          }
        }
      },
      {
        id: 'linkedin_001',
        type: 'linkedin',
        status: 'active',
        provider: 'LinkedIn',
        issuanceDate: '2024-02-01T12:00:00Z',
        lastVerified: '2024-07-18T10:30:00Z',
        usageCount: 7,
        apiCallHistory: [
          {
            id: 'api_004',
            timestamp: '2024-07-18T10:30:00Z',
            endpoint: '/api/connectors/linkedin/profile',
            method: 'GET',
            status: 'success',
            responseCode: 200,
            duration: 1500
          }
        ],
        credential: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "LinkedInCredential"],
          credentialSubject: {
            name: "John Developer",
            headline: "Senior Software Engineer",
            connections: 500,
            industry: "Information Technology"
          }
        },
        blockchainTxHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b'
      },
      {
        id: 'plaid_001',
        type: 'plaid',
        status: 'pending',
        provider: 'Plaid',
        issuanceDate: '2024-07-18T11:00:00Z',
        lastVerified: '2024-07-18T11:00:00Z',
        usageCount: 1,
        apiCallHistory: [
          {
            id: 'api_005',
            timestamp: '2024-07-18T11:00:00Z',
            endpoint: '/api/connectors/plaid/verify',
            method: 'POST',
            status: 'pending',
            responseCode: 202,
            duration: 2000
          }
        ],
        credential: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "PlaidCredential"],
          credentialSubject: {
            bankName: "Chase Bank",
            accountType: "checking",
            verified: false
          }
        }
      }
    ];

    // Auto-select most recent credential for each provider
    const grouped = mockCredentials.reduce((acc, cred) => {
      if (!acc[cred.type]) acc[cred.type] = [];
      acc[cred.type].push(cred);
      return acc;
    }, {} as Record<string, CredentialMetadata[]>);

    // Mark most recent as selected
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => new Date(b.issuanceDate).getTime() - new Date(a.issuanceDate).getTime());
      if (grouped[type].length > 0) {
        grouped[type][0].isSelected = true;
      }
    });

    setCredentials(mockCredentials);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'revoked': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'expired': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'github': return '🐙';
      case 'linkedin': return '💼';
      case 'plaid': return '🏦';
      default: return '📄';
    }
  };

  const filteredCredentials = credentials.filter(cred => {
    if (filterStatus === 'all') return true;
    return cred.status === filterStatus;
  });

  const groupedCredentials = filteredCredentials.reduce((acc, cred) => {
    if (!acc[cred.type]) acc[cred.type] = [];
    acc[cred.type].push(cred);
    return acc;
  }, {} as Record<string, CredentialMetadata[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎫 Credential Management
          </h1>
          <p className="text-gray-600 text-lg">
            Manage your verifiable credentials with separate flows and complete history tracking
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Status Filter */}
            <div className="flex gap-2">
              {['all', 'active', 'revoked', 'pending'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterStatus === status
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* View Mode */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋
              </button>
            </div>
          </div>
        </motion.div>

        {/* Credentials by Provider */}
        <div className="space-y-8">
          {Object.entries(groupedCredentials).map(([provider, creds], index) => (
            <motion.div
              key={provider}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{getProviderIcon(provider)}</span>
                    <div>
                      <h2 className="text-2xl font-bold capitalize">{provider} Credentials</h2>
                      <p className="text-gray-300">
                        {creds.length} credential{creds.length !== 1 ? 's' : ''} • 
                        {creds.filter(c => c.isSelected).length} selected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProvider(selectedProvider === provider ? null : provider)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg"
                  >
                    {selectedProvider === provider ? 'Hide Details' : 'Manage'}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {selectedProvider === provider && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6">
                      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                        {creds.map((cred) => (
                          <motion.div
                            key={cred.id}
                            layout
                            className={`border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                              cred.isSelected
                                ? 'border-orange-300 bg-orange-50 shadow-md'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            {/* Credential Header */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{getProviderIcon(cred.type)}</span>
                                <div>
                                  <h3 className="font-bold text-lg text-gray-900">
                                    {cred.provider}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {new Date(cred.issuanceDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              {cred.isSelected && (
                                <span className="text-orange-500 text-xl">⭐</span>
                              )}
                            </div>

                            {/* Status */}
                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(cred.status)} mb-4`}>
                              {cred.status.toUpperCase()}
                            </div>

                            {/* Credential Details */}
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Usage:</span>
                                <span className="font-medium">{cred.usageCount} times</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Last Verified:</span>
                                <span className="font-medium">
                                  {new Date(cred.lastVerified).toLocaleDateString()}
                                </span>
                              </div>
                              {cred.blockchainTxHash && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Blockchain:</span>
                                  <span className="font-mono text-xs text-green-600">
                                    {cred.blockchainTxHash.slice(0, 8)}...
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowHistory(showHistory === cred.id ? null : cred.id)}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium transition-all"
                              >
                                {showHistory === cred.id ? 'Hide' : 'History'}
                              </button>
                              <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all">
                                Verify
                              </button>
                            </div>

                            {/* API Call History */}
                            <AnimatePresence>
                              {showHistory === cred.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-4 p-4 bg-gray-100 rounded-lg overflow-hidden"
                                >
                                  <h4 className="font-bold text-gray-900 mb-3">API Call History</h4>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {cred.apiCallHistory.map((call) => (
                                      <div key={call.id} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${
                                            call.status === 'success' ? 'bg-green-500' :
                                            call.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                                          }`}></span>
                                          <span className="font-mono">{call.method}</span>
                                          <span className="text-gray-600">{call.endpoint}</span>
                                        </div>
                                        <div className="text-gray-500">
                                          {new Date(call.timestamp).toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCredentials.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Credentials Found</h2>
            <p className="text-gray-600 mb-8">
              Get started by connecting your first credential provider
            </p>
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg">
              Add Credential
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};