/**
 * API Marketplace for Credential Creation
 * Beautiful interface with categorized API tiles for VC generation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  CreditCard, 
  Phone, 
  Users, 
  Code, 
  Star, 
  Clock, 
  Zap,
  Database,
  Link,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Settings,
  TrendingUp,
  Globe,
  Lock
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import RapidAPIConnector, { RapidAPIMetadata } from '../../services/automation/RapidAPIConnector';
import { errorService } from "@/services/errorService";

// API Category Definitions
const API_CATEGORIES = {
  identity: {
    name: 'Identity & KYC',
    icon: Shield,
    color: 'from-blue-500 to-cyan-500',
    description: 'Identity verification, KYC, and document validation'
  },
  financial: {
    name: 'Financial Data',
    icon: CreditCard,
    color: 'from-green-500 to-emerald-500',
    description: 'Banking, credit scores, and financial verification'
  },
  communication: {
    name: 'Communication',
    icon: Phone,
    color: 'from-purple-500 to-pink-500',
    description: 'SMS, email, and phone verification'
  },
  professional: {
    name: 'Professional',
    icon: Code,
    color: 'from-orange-500 to-red-500',
    description: 'LinkedIn, GitHub, and career verification'
  },
  social: {
    name: 'Social Media',
    icon: Users,
    color: 'from-indigo-500 to-purple-500',
    description: 'Social platforms and community verification'
  },
  government: {
    name: 'Government',
    icon: Lock,
    color: 'from-gray-600 to-gray-800',
    description: 'Official documents and government services'
  }
};

// Built-in API Configurations
const BUILTIN_APIS: Record<string, RapidAPIMetadata[]> = {
  identity: [
    {
      id: 'trulioo_global',
      name: 'Trulioo GlobalGateway',
      description: 'Global identity verification in 100+ countries with document validation',
      category: 'identity_verification',
      provider: 'Trulioo',
      baseUrl: 'https://api.globaldatacompany.com/v1',
      pricing: { model: 'paid', tiers: [{ name: 'Professional', price: 1.25, requests: 10000, features: ['Full verification', 'AML screening'] }] },
      authentication: { type: 'rapidapi-key', headers: { 'X-RapidAPI-Key': 'RAPIDAPI_KEY' } },
      endpoints: [{ path: '/verifications/v1/verify', method: 'POST', description: 'Verify identity', parameters: [] }],
      rateLimits: { requests: 100, window: 60 },
      reliability: { uptime: 99.9, responseTime: 850, errorRate: 0.01 },
      rapidApiUrl: 'https://rapidapi.com/trulioo/api/trulioo-globalgatewaytesting'
    },
    {
      id: 'onfido_verify',
      name: 'Onfido Identity',
      description: 'AI-powered identity verification with facial recognition',
      category: 'biometric_verification',
      provider: 'Onfido',
      baseUrl: 'https://api.onfido.com/v3',
      pricing: { model: 'paid', tiers: [{ name: 'Complete', price: 2.50, requests: 1000, features: ['Full verification', 'Fraud detection'] }] },
      authentication: { type: 'api-key', headers: { 'Authorization': 'Token token=API_TOKEN' } },
      endpoints: [{ path: '/applicants', method: 'POST', description: 'Create applicant', parameters: [] }],
      rateLimits: { requests: 100, window: 60 },
      reliability: { uptime: 99.7, responseTime: 950, errorRate: 0.015 },
      rapidApiUrl: 'https://rapidapi.com/onfido/api/onfido-identity'
    }
  ],
  financial: [
    {
      id: 'plaid_financial',
      name: 'Plaid Financial Data',
      description: 'Connect bank accounts and verify financial information',
      category: 'financial_data',
      provider: 'Plaid',
      baseUrl: 'https://production.plaid.com',
      pricing: { model: 'freemium', tiers: [{ name: 'Development', price: 0, requests: 100, features: ['Account verification'] }] },
      authentication: { type: 'api-key', headers: { 'PLAID-CLIENT-ID': 'CLIENT_ID', 'PLAID-SECRET': 'SECRET' } },
      endpoints: [{ path: '/accounts/get', method: 'POST', description: 'Get account data', parameters: [] }],
      rateLimits: { requests: 600, window: 60 },
      reliability: { uptime: 99.8, responseTime: 400, errorRate: 0.008 },
      rapidApiUrl: 'https://rapidapi.com/plaid/api/plaid'
    },
    {
      id: 'experian_credit',
      name: 'Experian Credit API',
      description: 'Credit scores, reports, and financial risk assessment',
      category: 'credit_verification',
      provider: 'Experian',
      baseUrl: 'https://api.experian.com/consumerservices',
      pricing: { model: 'paid', tiers: [{ name: 'Professional', price: 0.75, requests: 1000, features: ['Credit reports', 'Risk scoring'] }] },
      authentication: { type: 'oauth2', headers: { 'Authorization': 'Bearer TOKEN' } },
      endpoints: [{ path: '/credit-profile/v2/credit-reports', method: 'POST', description: 'Get credit report', parameters: [] }],
      rateLimits: { requests: 50, window: 60 },
      reliability: { uptime: 99.5, responseTime: 1200, errorRate: 0.02 },
      rapidApiUrl: 'https://rapidapi.com/experian/api/experian-credit'
    }
  ],
  professional: [
    {
      id: 'linkedin_advanced',
      name: 'LinkedIn Professional',
      description: 'Professional profile verification and career data',
      category: 'professional_verification',
      provider: 'LinkedIn',
      baseUrl: 'https://api.linkedin.com/v2',
      pricing: { model: 'freemium', tiers: [{ name: 'Developer', price: 0, requests: 1000, features: ['Profile data'] }] },
      authentication: { type: 'oauth2', headers: { 'Authorization': 'Bearer ACCESS_TOKEN' } },
      endpoints: [{ path: '/people/~', method: 'GET', description: 'Get profile', parameters: [] }],
      rateLimits: { requests: 200, window: 3600 },
      reliability: { uptime: 99.9, responseTime: 300, errorRate: 0.005 },
      rapidApiUrl: 'https://rapidapi.com/linkedin/api/linkedin-data'
    },
    {
      id: 'github_advanced',
      name: 'GitHub Developer',
      description: 'Code contributions, repositories, and developer verification',
      category: 'developer_verification',
      provider: 'GitHub',
      baseUrl: 'https://api.github.com',
      pricing: { model: 'free', tiers: [{ name: 'Free', price: 0, requests: 5000, features: ['Public data', 'Repository access'] }] },
      authentication: { type: 'api-key', headers: { 'Authorization': 'token GITHUB_TOKEN' } },
      endpoints: [{ path: '/user', method: 'GET', description: 'Get user profile', parameters: [] }],
      rateLimits: { requests: 5000, window: 3600 },
      reliability: { uptime: 99.95, responseTime: 150, errorRate: 0.002 },
      rapidApiUrl: 'https://rapidapi.com/github/api/github-api'
    }
  ],
  communication: [
    {
      id: 'twilio_verify',
      name: 'Twilio Verify',
      description: 'Multi-channel verification via SMS, voice, and WhatsApp',
      category: 'communication',
      provider: 'Twilio',
      baseUrl: 'https://verify.twilio.com/v2',
      pricing: { model: 'freemium', tiers: [{ name: 'Pay-as-go', price: 0.05, requests: -1, features: ['All channels'] }] },
      authentication: { type: 'basic', headers: { 'Authorization': 'Basic ACCOUNT_SID:AUTH_TOKEN' } },
      endpoints: [{ path: '/Services/{ServiceSid}/Verifications', method: 'POST', description: 'Send verification', parameters: [] }],
      rateLimits: { requests: 1000, window: 3600 },
      reliability: { uptime: 99.95, responseTime: 400, errorRate: 0.005 },
      rapidApiUrl: 'https://rapidapi.com/twilio/api/twilio-verify'
    }
  ]
};

interface APITileProps {
  api: RapidAPIMetadata;
  onSelect: (api: RapidAPIMetadata) => void;
  isSelected?: boolean;
}

const APITile: React.FC<APITileProps> = ({ api, onSelect, isSelected }) => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');

  const handleConnect = async () => {
    setStatus('testing');
    // Simulate API connection test
    setTimeout(() => {
      setStatus(Math.random() > 0.2 ? 'connected' : 'error');
    }, 1500);
    
    onSelect(api);
  };

  const getPricingDisplay = () => {
    if (api.pricing.model === 'free') return 'Free';
    if (api.pricing.model === 'freemium') return 'Freemium';
    const tier = api.pricing.tiers?.[0];
    return tier ? `$${tier.price}` : 'Contact';
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'testing': return <Clock className="w-4 h-4 animate-spin" />;
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Link className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.02 }}
      className={`relative group cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <Card className="h-full bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${API_CATEGORIES[api.category as keyof typeof API_CATEGORIES]?.color || 'from-gray-400 to-gray-600'} flex items-center justify-center`}>
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">{api.name}</CardTitle>
                <p className="text-sm text-gray-500">{api.provider}</p>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <Badge variant={api.pricing.model === 'free' ? 'default' : 'secondary'}>
                {getPricingDisplay()}
              </Badge>
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span className="text-xs text-gray-600">
                  {api.reliability.uptime.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <CardDescription className="text-sm text-gray-700 mb-4 line-clamp-2">
            {api.description}
          </CardDescription>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>{api.reliability.responseTime}ms</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>{api.rateLimits.requests}/min</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              <span className="text-xs text-gray-500 capitalize">{status}</span>
            </div>
          </div>
          
          <Button 
            onClick={handleConnect}
            disabled={status === 'testing'}
            className={`w-full transition-all duration-300 ${
              status === 'connected' 
                ? 'bg-green-500 hover:bg-green-600' 
                : status === 'error'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {status === 'testing' && <Clock className="w-4 h-4 mr-2 animate-spin" />}
            {status === 'connected' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Create Credential
              </>
            ) : status === 'error' ? (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Retry Connection
              </>
            ) : (
              <>
                Connect & Verify
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
        
        {/* Hover overlay with more details */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white rounded-lg p-3 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <p className="text-xs text-gray-600">Click to configure and create credentials</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const APIMarketplaceCredentials: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAPIs, setSelectedAPIs] = useState<RapidAPIMetadata[]>([]);
  const [rapidAPIAPIs, setRapidAPIAPIs] = useState<RapidAPIMetadata[]>([]);
  const [isLoadingRapidAPI, setIsLoadingRapidAPI] = useState(false);

  useEffect(() => {
    loadRapidAPIs();
  }, []);

  const loadRapidAPIs = async () => {
    setIsLoadingRapidAPI(true);
    try {
      const connector = RapidAPIConnector.getInstance();
      const identityAPIs = await connector.getIdentityVerificationAPIs();
      const financialAPIs = await connector.getFinancialVerificationAPIs();
      const commAPIs = await connector.getCommunicationAPIs();
      
      setRapidAPIAPIs([...identityAPIs, ...financialAPIs, ...commAPIs]);
    } catch (error) {
      errorService.logError('Failed to load RapidAPI data:', error);
    } finally {
      setIsLoadingRapidAPI(false);
    }
  };

  const getAllAPIs = (): RapidAPIMetadata[] => {
    const builtinAPIs = Object.values(BUILTIN_APIS).flat();
    return [...builtinAPIs, ...rapidAPIAPIs];
  };

  const getFilteredAPIs = () => {
    let apis = getAllAPIs();
    
    if (selectedCategory !== 'all') {
      apis = apis.filter(api => 
        api.category.includes(selectedCategory) || 
        Object.keys(BUILTIN_APIS).includes(selectedCategory)
      );
    }
    
    if (searchQuery) {
      apis = apis.filter(api =>
        api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        api.provider.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return apis;
  };

  const handleAPISelect = (api: RapidAPIMetadata) => {
    setSelectedAPIs(prev => {
      const exists = prev.find(a => a.id === api.id);
      if (exists) {
        return prev.filter(a => a.id !== api.id);
      } else {
        return [...prev, api];
      }
    });
  };

  const getAPIsByCategory = (category: string) => {
    if (category === 'all') return getFilteredAPIs();
    
    return getFilteredAPIs().filter(api => {
      if (category === 'identity') return api.category.includes('identity') || api.category.includes('biometric');
      if (category === 'financial') return api.category.includes('financial') || api.category.includes('credit');
      if (category === 'professional') return api.category.includes('professional') || api.category.includes('developer');
      if (category === 'communication') return api.category.includes('communication');
      return false;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Marketplace</h1>
              <p className="text-gray-600 mt-1">Connect APIs to create verifiable credentials automatically</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {getAllAPIs().length} APIs Available
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {selectedAPIs.length} Selected
              </Badge>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search APIs by name, provider, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              RapidAPI Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          {/* Category Navigation */}
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="all" className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>All APIs</span>
            </TabsTrigger>
            {Object.entries(API_CATEGORIES).map(([key, category]) => {
              const Icon = category.icon;
              const count = getAPIsByCategory(key).length;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{category.name}</span>
                  <Badge variant="secondary" className="ml-2">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* API Grids by Category */}
          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {getFilteredAPIs().map((api, index) => (
                  <motion.div
                    key={api.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <APITile
                      api={api}
                      onSelect={handleAPISelect}
                      isSelected={selectedAPIs.some(a => a.id === api.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          {Object.keys(API_CATEGORIES).map(category => (
            <TabsContent key={category} value={category}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {API_CATEGORIES[category as keyof typeof API_CATEGORIES].name}
                </h2>
                <p className="text-gray-600">
                  {API_CATEGORIES[category as keyof typeof API_CATEGORIES].description}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {getAPIsByCategory(category).map((api, index) => (
                    <motion.div
                      key={api.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <APITile
                        api={api}
                        onSelect={handleAPISelect}
                        isSelected={selectedAPIs.some(a => a.id === api.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Loading State for RapidAPI */}
        {isLoadingRapidAPI && (
          <div className="text-center py-12">
            <Clock className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
            <p className="text-gray-600">Loading additional APIs from RapidAPI...</p>
          </div>
        )}

        {/* Selected APIs Summary */}
        {selectedAPIs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm"
          >
            <h3 className="font-bold text-gray-900 mb-3">Selected APIs ({selectedAPIs.length})</h3>
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {selectedAPIs.map(api => (
                <div key={api.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{api.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAPISelect(api)}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <Button className="w-full">
              <ArrowRight className="w-4 h-4 mr-2" />
              Create Credentials ({selectedAPIs.length})
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default APIMarketplaceCredentials;