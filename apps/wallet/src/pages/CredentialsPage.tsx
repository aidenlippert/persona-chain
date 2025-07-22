/**
 * 🔐 REAL CREDENTIALS PAGE WITH SMART API MARKETPLACE
 * Unified credential management + Real API marketplace + DID security
 * Auto-discovers 1000+ APIs + Premium identity/financial APIs
 * Real W3C verifiable credentials with cryptographic proofs
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  AcademicCapIcon,
  UserGroupIcon,
  GlobeAltIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CreditCardIcon,
  PlusIcon,
  KeyIcon,
  LockClosedIcon,
  CloudArrowUpIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { useSecureCredentials } from '../hooks/useSecureCredentials';
import { unifiedAPIService, UnifiedAPI } from '../services/marketplace/UnifiedAPIService';
import { didCryptoService, DIDKeyPair } from '../services/crypto/DIDCryptoService';

// 🎯 SMART API MARKETPLACE TYPES
interface MarketplaceStats {
  totalAPIs: number;
  premiumAPIs: number;
  discoveredAPIs: number;
  categories: { name: string; count: number }[];
  recentConnections: number;
}

interface APIConnectionRequest {
  apiId: string;
  credentials?: { [key: string]: string };
  testData?: any;
}

interface CredentialCreationRequest {
  apiId: string;
  endpoint: string;
  inputData: any;
  options?: {
    challenge?: string;
    expirationDays?: number;
  };
}

// 🏆 API CATEGORIES WITH REAL ICONS
const API_CATEGORIES = [
  { id: 'all', name: 'All APIs', icon: GlobeAltIcon },
  { id: 'identity', name: 'Identity & KYC', icon: ShieldCheckIcon },
  { id: 'financial', name: 'Financial & Credit', icon: BanknotesIcon },
  { id: 'education', name: 'Education & Skills', icon: AcademicCapIcon },
  { id: 'professional', name: 'Professional & Work', icon: UserGroupIcon },
  { id: 'premium', name: 'Premium APIs', icon: StarIcon },
];

export const CredentialsPage = () => {
  // 🎛️ STATE MANAGEMENT
  const [activeTab, setActiveTab] = useState<'credentials' | 'marketplace' | 'security'>('credentials');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAPI, setSelectedAPI] = useState<UnifiedAPI | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [didKeyPair, setDidKeyPair] = useState<DIDKeyPair | null>(null);
  
  // 🚀 REAL API MARKETPLACE STATE
  const [apis, setAPIs] = useState<UnifiedAPI[]>([]);
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats | null>(null);
  const [isLoadingAPIs, setIsLoadingAPIs] = useState(false);
  const [apiCategories, setAPICategories] = useState<{ name: string; count: number }[]>([]);
  
  // 🔐 SECURE CREDENTIALS HOOK
  const { credentials, loading, error, addCredential, removeCredential, credentialCount } = useSecureCredentials();

  // 🔍 REAL API SEARCH AND FILTERING
  const searchAPIs = async (query: string = searchQuery, category: string = selectedCategory) => {
    try {
      setIsLoadingAPIs(true);
      const results = await unifiedAPIService.searchAPIs(
        query, 
        category === 'all' ? undefined : category,
        {
          type: category === 'premium' ? 'premium' : 'all',
          verified: category === 'premium' ? true : undefined
        },
        50
      );
      setAPIs(results);
    } catch (error) {
      console.error('❌ Failed to search APIs:', error);
      setAPIs([]);
    } finally {
      setIsLoadingAPIs(false);
    }
  };

  // 🚀 REAL API CONNECTION WITH UNIFIED SERVICE
  const handleConnectAPI = async (api: UnifiedAPI) => {
    setIsConnecting(true);
    
    try {
      console.log(`🔗 Connecting to ${api.name}...`);
      
      // Step 1: Connect to API
      const connectionResult = await unifiedAPIService.connectToAPI({
        apiId: api.id,
        credentials: {}, // Will be enhanced with actual credentials input
        testData: { test: true }
      });
      
      if (!connectionResult.success) {
        throw new Error(connectionResult.error || 'Connection failed');
      }
      
      // Step 2: Create verifiable credential
      const credential = await unifiedAPIService.createCredentialFromAPI({
        apiId: api.id,
        endpoint: api.endpoints[0]?.path || '/test',
        inputData: {
          apiProvider: api.provider,
          apiName: api.name,
          connectedAt: new Date().toISOString()
        },
        options: {
          challenge: `challenge_${Date.now()}`,
          expirationDays: 365
        }
      });
      
      // Step 3: Add to local storage
      await addCredential(credential);
      
      console.log(`✅ Successfully connected to ${api.name} and created real W3C credential!`);
      alert(`🎉 Successfully connected to ${api.name}!\n\nA verifiable credential has been created and added to your wallet.`);
      
      setSelectedAPI(null);
      setActiveTab('credentials'); // Switch to credentials tab
      
    } catch (error) {
      console.error('❌ Failed to connect to API:', error);
      alert(`❌ Failed to connect to ${api.name}\n\nError: ${error.message}\n\nPlease check the API configuration and try again.`);
    } finally {
      setIsConnecting(false);
    }
  };

  // 🔑 REAL DID KEY MANAGEMENT
  const generateDIDKeys = async () => {
    try {
      console.log('🔑 Generating real DID key pair...');
      const keyPair = await didCryptoService.generateDIDKeyPair();
      await didCryptoService.storeKeyPair(keyPair);
      setDidKeyPair(keyPair);
      console.log('✅ DID key pair generated and stored securely');
    } catch (error) {
      console.error('❌ Failed to generate DID keys:', error);
      alert('Failed to generate DID keys. Please try again.');
    }
  };

  // 🚀 INITIALIZE COMPONENT
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        console.log('🚀 Initializing Credentials Page...');
        
        // Load DID keys
        const keyPair = await didCryptoService.loadKeyPair();
        if (keyPair) {
          setDidKeyPair(keyPair);
        }
        
        // Load marketplace stats
        const stats = await unifiedAPIService.getMarketplaceStats();
        setMarketplaceStats(stats);
        
        // Load API categories
        const categories = await unifiedAPIService.getCategories();
        setAPICategories(categories);
        
        // Load featured APIs
        const featuredAPIs = await unifiedAPIService.getFeaturedAPIs(20);
        setAPIs(featuredAPIs);
        
        console.log('✅ Credentials Page initialized');
      } catch (error) {
        console.error('❌ Failed to initialize:', error);
      }
    };
    
    initializeComponent();
  }, []);
  
  // 🔍 SEARCH HANDLER
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (activeTab === 'marketplace') {
        searchAPIs();
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedCategory, activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* 🎯 HEADER WITH TABS */}
      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                Digital Credentials
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Manage your verifiable credentials and connect to thousands of APIs to expand your digital identity.
            </p>
          </motion.div>

          {/* 📑 TAB NAVIGATION */}
          <div className="flex justify-center">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-1">
              <div className="flex space-x-1">
                {[
                  { id: 'credentials', name: 'My Credentials', icon: CreditCardIcon, count: credentialCount },
                  { id: 'marketplace', name: 'API Marketplace', icon: GlobeAltIcon, count: marketplaceStats?.totalAPIs || 'Loading...' },
                  { id: 'security', name: 'DID Security', icon: KeyIcon, count: didKeyPair ? 1 : 0 }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{tab.name}</span>
                      <span className="text-xs opacity-75">({tab.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 🔐 CREDENTIALS TAB */}
        {activeTab === 'credentials' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Existing Credentials */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your Credentials</h2>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all flex items-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add Credential</span>
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-3">
                    <div className="w-6 h-6 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-300">Loading credentials...</span>
                  </div>
                </div>
              ) : credentials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {credentials.map((credential) => (
                    <motion.div
                      key={credential.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-700/50 border border-gray-600/50 rounded-xl p-6 hover:bg-gray-700/70 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {(credential.type && credential.type[1]) || credential.credentialSubject?.credentialType || 'Credential'}
                          </h3>
                          <p className="text-sm text-gray-400">{credential.issuer || 'Unknown Issuer'}</p>
                        </div>
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-400">Issued:</span> {new Date(credential.issuanceDate).toLocaleDateString()}
                        </div>
                        {credential.credentialSubject?.verificationLevel && (
                          <div className="text-sm">
                            <span className="text-gray-400">Level:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              credential.credentialSubject?.verificationLevel === 'verified' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {credential.credentialSubject?.verificationLevel}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeCredential(credential.id)}
                        className="w-full bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                      >
                        Remove Credential
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CreditCardIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Credentials Yet</h3>
                  <p className="text-gray-400 mb-6">
                    Connect to APIs and services to create your first verifiable credential
                  </p>
                  <button
                    onClick={() => setActiveTab('marketplace')}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all"
                  >
                    Explore API Marketplace
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 🛒 MARKETPLACE TAB */}
        {activeTab === 'marketplace' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 🔍 SEARCH AND FILTERS */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${marketplaceStats?.totalAPIs || '1000+'} APIs (e.g., 'identity verification', 'credit score', 'education')`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-700 border border-gray-600 rounded-xl text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
                >
                  <FunnelIcon className="h-5 w-5" />
                  Filters
                </button>
              </div>

              {/* 📂 REAL CATEGORY FILTERS */}
              <div className="flex flex-wrap gap-3">
                {API_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const categoryData = apiCategories.find(cat => 
                    cat.name.toLowerCase().includes(category.id) || category.id === 'all'
                  );
                  const count = category.id === 'all' ? marketplaceStats?.totalAPIs : 
                               category.id === 'premium' ? marketplaceStats?.premiumAPIs :
                               categoryData?.count || 0;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        selectedCategory === category.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs opacity-75">({count || '...'})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 🎯 REAL API GRID */}
            {isLoadingAPIs ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">Discovering APIs...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {apis.map((api) => (
                  <motion.div
                    key={api.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-gray-600 transition-all group cursor-pointer"
                    onClick={() => setSelectedAPI(api)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors">
                            {api.name}
                          </h3>
                          {api.verified && (
                            <CheckCircleIcon className="h-5 w-5 text-green-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{api.provider}</p>
                        <p className="text-sm text-gray-300 line-clamp-2">{api.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1">
                        <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium text-white">{api.rating.toFixed(1)}</span>
                        {api.type === 'premium' && (
                          <span className="text-xs bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full ml-2">
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        api.pricing === 'free' ? 'bg-green-500/20 text-green-400' :
                        api.pricing === 'freemium' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {api.pricing.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-orange-400">{api.credentialType}</div>
                        <div className="text-xs text-gray-400">Setup: {api.setupTime}</div>
                        {api.connectionStatus?.isConnected && (
                          <div className="text-xs text-green-400 mt-1">
                            ✅ Connected ({api.connectionStatus.quotaUsed}/{api.connectionStatus.quotaLimit})
                          </div>
                        )}
                      </div>
                      <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-orange-400 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!isLoadingAPIs && apis.length === 0 && (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No APIs found</h3>
                <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => searchAPIs('', 'all')}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Show All APIs
                </button>
              </div>
            )}
            
            {/* 📊 MARKETPLACE STATS */}
            {marketplaceStats && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Marketplace Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{marketplaceStats.totalAPIs}</div>
                    <div className="text-sm text-gray-400">Total APIs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{marketplaceStats.premiumAPIs}</div>
                    <div className="text-sm text-gray-400">Premium APIs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{marketplaceStats.discoveredAPIs}</div>
                    <div className="text-sm text-gray-400">Discovered APIs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{marketplaceStats.recentConnections}</div>
                    <div className="text-sm text-gray-400">Recent Connections</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 🔒 SECURITY TAB */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">DID Security Management</h2>
              
              {didKeyPair ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      <span className="text-green-400 font-medium">Real DID Keys Generated</span>
                    </div>
                    <div className="text-sm text-gray-300">
                      <div className="mb-2">
                        <span className="text-gray-400">DID:</span>
                        <code className="ml-2 bg-gray-700 px-2 py-1 rounded text-xs break-all">{didKeyPair.did}</code>
                      </div>
                      <div className="mb-2">
                        <span className="text-gray-400">Public Key:</span>
                        <code className="ml-2 bg-gray-700 px-2 py-1 rounded text-xs">{didKeyPair.publicKeyBase58.substring(0, 20)}...</code>
                      </div>
                      <div>
                        <span className="text-gray-400">Private Key:</span>
                        <code className="ml-2 bg-gray-700 px-2 py-1 rounded text-xs">******* (secured with encryption)</code>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="text-sm text-blue-300">
                        <strong>Real Cryptographic Security:</strong> Your credentials are now signed with Ed25519 cryptography 
                        following W3C DID specifications, providing mathematically verifiable authenticity and non-repudiation.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                      <span className="text-yellow-400 font-medium">No DID Keys Found</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Generate real Ed25519 DID keys to enable cryptographic signing of your credentials with 
                      industry-standard security following W3C specifications.
                    </p>
                  </div>
                  
                  <button
                    onClick={generateDIDKeys}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all flex items-center space-x-2"
                  >
                    <KeyIcon className="h-5 w-5" />
                    <span>Generate DID Keys</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* 🔗 API DETAIL MODAL */}
      <AnimatePresence>
        {selectedAPI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAPI(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold text-white">{selectedAPI.name}</h2>
                      {selectedAPI.verified && (
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                      )}
                      {selectedAPI.type === 'premium' && (
                        <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs px-2 py-1 rounded-full">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400">{selectedAPI.provider}</p>
                  </div>
                  <button
                    onClick={() => setSelectedAPI(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-gray-300 mb-6">{selectedAPI.description}</p>

                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => handleConnectAPI(selectedAPI)}
                    disabled={isConnecting}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isConnecting ? (
                      <>
                        <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="h-4 w-4" />
                        <span>Connect & Create Credential</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      <strong>How it works:</strong> PersonaPass will securely connect to this API and create a verifiable credential 
                      with the returned data. All credentials are encrypted and {didKeyPair ? 'cryptographically signed with your real DID keys' : 'stored securely'}.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};