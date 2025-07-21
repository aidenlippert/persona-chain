/**
 * Credentials Page - Beautiful credential management interface
 * Black/white/orange design system with production-ready UX
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { EnhancedCredentialsManager } from '../components/credentials/EnhancedCredentialsManager';
import { TouchButton, TouchCard, SwipeableCard, FloatingActionButton } from '../components/ui/TouchOptimized';

interface Credential {
  "@context": string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: any;
  proof?: any;
  blockchainTxHash?: string;
}

export const CredentialsPage = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'pending'>('all');

  // Get user DID from localStorage
  const userDID = localStorage.getItem('user_did') || 'did:persona:cosmos17em1752791625853';
  const walletAddress = localStorage.getItem('wallet_address') || 'cosmos17em1752791625853';

  const loadCredentials = useCallback(() => {
    const stored = localStorage.getItem('credentials');
    if (stored) {
      setCredentials(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const filteredCredentials = credentials.filter(cred => {
    if (filterType === 'verified') return cred.blockchainTxHash;
    if (filterType === 'pending') return !cred.blockchainTxHash;
    return true;
  });

  const getCredentialIcon = useCallback((type: string[]) => {
    const credType = type.find(t => t !== 'VerifiableCredential')?.toLowerCase() || '';
    if (credType.includes('github')) return '🐙';
    if (credType.includes('linkedin')) return '💼';
    if (credType.includes('plaid') || credType.includes('financial')) return '🏦';
    if (credType.includes('education')) return '🎓';
    if (credType.includes('employment')) return '💼';
    return '🎫';
  }, []);

  const getCredentialColor = useCallback((type: string[]) => {
    const credType = type.find(t => t !== 'VerifiableCredential')?.toLowerCase() || '';
    if (credType.includes('github')) return 'from-gray-800 to-gray-900';
    if (credType.includes('linkedin')) return 'from-blue-600 to-blue-700';
    if (credType.includes('plaid') || credType.includes('financial')) return 'from-green-600 to-green-700';
    if (credType.includes('education')) return 'from-purple-600 to-purple-700';
    if (credType.includes('employment')) return 'from-indigo-600 to-indigo-700';
    return 'from-orange-500 to-orange-600';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Mobile-First Header */}
      <div className="bg-white shadow-lg border-b-4 border-orange-500">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col space-y-4 sm:space-y-6 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-1 sm:mb-2">
                Verifiable Credentials
              </h1>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Manage your digital identity credentials with privacy and security
              </p>
            </div>
            
            <div className="flex items-center justify-center sm:justify-start lg:justify-end space-x-2 sm:space-x-4">
              {/* Mobile-optimized View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <TouchButton
                  size="sm"
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('grid')}
                  className="!px-3 !py-2 !text-sm"
                >
                  📱
                </TouchButton>
                <TouchButton
                  size="sm"
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('list')}
                  className="!px-3 !py-2 !text-sm"
                >
                  📋
                </TouchButton>
              </div>

              {/* Mobile-optimized Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
              >
                <option value="all">All</option>
                <option value="verified">✅ Verified</option>
                <option value="pending">⏳ Pending</option>
              </select>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🎫</div>
              <div>
                <div className="text-2xl font-bold text-black">{credentials.length}</div>
                <div className="text-gray-600">Total Credentials</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="text-3xl mr-4">✅</div>
              <div>
                <div className="text-2xl font-bold text-black">
                  {credentials.filter(c => c.blockchainTxHash).length}
                </div>
                <div className="text-gray-600">Verified</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="text-3xl mr-4">⏳</div>
              <div>
                <div className="text-2xl font-bold text-black">
                  {credentials.filter(c => !c.blockchainTxHash).length}
                </div>
                <div className="text-gray-600">Pending</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Credentials List */}
          <div className="xl:col-span-2">
            {filteredCredentials.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-lg p-12 text-center"
              >
                <div className="text-6xl mb-4">🎫</div>
                <h3 className="text-xl font-semibold text-black mb-2">No Credentials Yet</h3>
                <p className="text-gray-600 mb-6">
                  Start building your digital identity by creating your first verifiable credential.
                </p>
                <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all">
                  Create First Credential
                </button>
              </motion.div>
            ) : (
              <div className={`${
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
                  : 'space-y-4'
              }`}>
                {filteredCredentials.map((credential, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedCredential(credential)}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 hover:border-orange-500 overflow-hidden transform hover:scale-105"
                  >
                    <div className={`h-2 bg-gradient-to-r ${getCredentialColor(credential.type)}`}></div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="text-4xl mr-4">
                            {getCredentialIcon(credential.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-black">
                              {credential.type.find(t => t !== 'VerifiableCredential') || 'Credential'}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {credential.issuer}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          {credential.blockchainTxHash ? (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                              ✅ Verified
                            </span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                              ⏳ Pending
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div className="mb-2">
                          <strong>Issued:</strong> {new Date(credential.issuanceDate).toLocaleDateString()}
                        </div>
                        {credential.blockchainTxHash && (
                          <div className="text-xs font-mono bg-gray-100 p-2 rounded">
                            {credential.blockchainTxHash}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Credential Manager */}
          <div className="xl:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-6 sticky top-8"
            >
              <h2 className="text-xl font-semibold text-black mb-6">
                Create New Credential
              </h2>
              <EnhancedCredentialsManager 
                did={userDID}
                walletAddress={walletAddress}
              />
            </motion.div>
          </div>
        </div>

        {/* Credential Detail Modal */}
        {selectedCredential && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedCredential(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-black">
                    Credential Details
                  </h2>
                  <button
                    onClick={() => setSelectedCredential(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(selectedCredential, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};