/**
 * Premium RapidAPI Marketplace - World-Class API Integration Interface
 * Inspired by top-tier platforms like Zapier, Stripe Connect, and Auth0 Marketplace
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  CreditCard, 
  Phone, 
  Users, 
  Code, 
  Star, 
  Zap,
  Database,
  CheckCircle,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Lock,
  Activity,
  // Removed unused BarChart3 import
  Sparkles,
  Rocket,
  Eye,
  ExternalLink
} from 'lucide-react';
const EliteWeb3Button = lazy(() => import('../ui/EliteWeb3Button').then(m => ({ default: m.EliteWeb3Button })));
import RapidAPIConnector, { RapidAPIMetadata, RapidAPISearchFilters } from '../../services/automation/RapidAPIConnector';
import { errorService } from "@/services/errorService";

// Enhanced API Categories with premium styling
const ELITE_CATEGORIES = {
  identity: {
    name: 'Identity & KYC',
    icon: Shield,
    gradient: 'from-blue-500 via-cyan-500 to-blue-600',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    description: 'Identity verification, KYC compliance, and document validation',
    count: 45,
    trending: true
  },
  financial: {
    name: 'Financial Data',
    icon: CreditCard,
    gradient: 'from-emerald-500 via-green-500 to-emerald-600',
    bgGradient: 'from-emerald-500/10 to-green-500/10',
    description: 'Banking, credit scores, and financial verification',
    count: 38,
    trending: false
  },
  communication: {
    name: 'Communication',
    icon: Phone,
    gradient: 'from-purple-500 via-violet-500 to-purple-600',
    bgGradient: 'from-purple-500/10 to-violet-500/10',
    description: 'SMS, email, WhatsApp, and phone verification',
    count: 42,
    trending: true
  },
  professional: {
    name: 'Professional',
    icon: Code,
    gradient: 'from-orange-500 via-amber-500 to-orange-600',
    bgGradient: 'from-orange-500/10 to-amber-500/10',
    description: 'LinkedIn, GitHub, and career verification',
    count: 29,
    trending: false
  },
  social: {
    name: 'Social Media',
    icon: Users,
    gradient: 'from-pink-500 via-rose-500 to-pink-600',
    bgGradient: 'from-pink-500/10 to-rose-500/10',
    description: 'Social platforms and community verification',
    count: 34,
    trending: true
  },
  government: {
    name: 'Government',
    icon: Lock,
    gradient: 'from-slate-500 via-gray-500 to-slate-600',
    bgGradient: 'from-slate-500/10 to-gray-500/10',
    description: 'Official documents and government services',
    count: 16,
    trending: false
  }
};

interface APICardProps {
  api: RapidAPIMetadata;
  onSelect: (api: RapidAPIMetadata) => void;
  onPreview: (api: RapidAPIMetadata) => void;
  isSelected?: boolean;
}

const EliteAPICard: React.FC<APICardProps> = ({ api, onSelect, onPreview, isSelected }) => {
  // Removed unused isHovered state
  const [connectionTest, setConnectionTest] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const getPricingBadge = () => {
    const { model, tiers } = api.pricing;
    if (model === 'free') return { text: 'FREE', color: 'bg-emerald-500' };
    if (model === 'freemium') return { text: 'FREEMIUM', color: 'bg-blue-500' };
    if (tiers && tiers[0]) return { text: `$${tiers[0].price}`, color: 'bg-purple-500' };
    return { text: 'PAID', color: 'bg-orange-500' };
  };

  const getReliabilityColor = (uptime: number) => {
    if (uptime >= 99.5) return 'text-emerald-400';
    if (uptime >= 99.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const testConnection = async () => {
    setConnectionTest('testing');
    try {
      const connector = RapidAPIConnector.getInstance();
      const result = await connector.testAPIConnection(api.id);
      setConnectionTest(result.success ? 'success' : 'error');
      setTimeout(() => setConnectionTest('idle'), 3000);
    } catch (error) {
      setConnectionTest('error');
      setTimeout(() => setConnectionTest('idle'), 3000);
    }
  };

  const pricingBadge = getPricingBadge();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -8, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`
        relative group cursor-pointer overflow-hidden
        ${isSelected 
          ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/50' 
          : 'bg-slate-900/80 border border-slate-700/50'
        }
        rounded-2xl backdrop-blur-xl
        shadow-xl shadow-slate-900/50
        hover:shadow-2xl hover:shadow-blue-500/20
        transition-all duration-300
      `}
    >
      {/* Premium Badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className={`px-2 py-1 rounded-full text-xs font-bold text-white ${pricingBadge.color}`}>
          {pricingBadge.text}
        </div>
      </div>

      {/* Trending Badge */}
      {api.reliability.uptime > 99.8 && (
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
            <TrendingUp className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-medium text-orange-400">HOT</span>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="absolute top-16 right-4 z-10">
        <div className={`w-3 h-3 rounded-full ${
          connectionTest === 'success' ? 'bg-emerald-400 animate-pulse' :
          connectionTest === 'error' ? 'bg-red-400 animate-pulse' :
          connectionTest === 'testing' ? 'bg-yellow-400 animate-spin' :
          'bg-slate-600'
        }`} />
      </div>

      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <Database className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
              {api.name}
            </h3>
            <p className="text-sm text-slate-400 mb-2 line-clamp-2">
              {api.description}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">by {api.provider}</span>
              <div className="flex items-center gap-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-3 h-3 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-slate-600'}`} 
                    />
                  ))}
                </div>
                <span className="text-slate-400">4.8</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`text-sm font-bold ${getReliabilityColor(api.reliability.uptime)}`}>
              {api.reliability.uptime}%
            </div>
            <div className="text-xs text-slate-500">Uptime</div>
          </div>
          <div>
            <div className="text-sm font-bold text-cyan-400">
              {api.reliability.responseTime}ms
            </div>
            <div className="text-xs text-slate-500">Response</div>
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-400">
              {api.rateLimits.requests}/min
            </div>
            <div className="text-xs text-slate-500">Rate Limit</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-1">
          {api.pricing.tiers?.[0]?.features.slice(0, 3).map((feature, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-slate-800/50 text-xs text-slate-400 rounded border border-slate-700/50"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 pt-0">
        <div className="flex gap-2">
          <Suspense fallback={<div className="animate-pulse bg-slate-700 h-8 rounded flex-1"></div>}>
            <EliteWeb3Button
              variant="primary"
              size="sm"
              onClick={() => onSelect(api)}
              className="flex-1 text-sm"
              icon={<Zap className="w-4 h-4" />}
            >
              {isSelected ? 'Selected' : 'Select API'}
            </EliteWeb3Button>
          </Suspense>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(api);
            }}
            className="px-3 py-2 bg-slate-800/50 text-slate-300 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-all"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              testConnection();
            }}
            className="px-3 py-2 bg-slate-800/50 text-slate-300 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-all"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
};

interface CategoryCardProps {
  category: typeof ELITE_CATEGORIES[keyof typeof ELITE_CATEGORIES];
  categoryKey: string;
  isSelected: boolean;
  onClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, isSelected, onClick }) => {
  const Icon = category.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative cursor-pointer overflow-hidden rounded-2xl p-6
        backdrop-blur-xl border transition-all duration-300
        ${isSelected 
          ? `bg-gradient-to-br ${category.bgGradient} border-2 border-opacity-50` 
          : 'bg-slate-900/60 border-slate-700/50 hover:bg-slate-800/60'
        }
        group
      `}
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
        {category.name}
      </h3>
      <p className="text-sm text-slate-400 mb-4 line-clamp-2">
        {category.description}
      </p>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{category.count} APIs</span>
          {category.trending && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
              <Sparkles className="w-3 h-3 text-orange-400" />
              <span className="text-xs font-medium text-orange-400">Trending</span>
            </div>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
      </div>

      {/* Glow Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
    </motion.div>
  );
};

export const PremiumRapidAPIMarketplace: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('identity');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAPIs, setSelectedAPIs] = useState<Set<string>>(new Set());
  const [availableAPIs, setAvailableAPIs] = useState<RapidAPIMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewAPI, setPreviewAPI] = useState<RapidAPIMetadata | null>(null);
  const [filters] = useState<RapidAPISearchFilters>({});

  const connector = useMemo(() => RapidAPIConnector.getInstance(), []);

  // Load APIs for selected category
  const loadAPIs = useCallback(async (category: string) => {
    setLoading(true);
    try {
      const apis = await connector.getAPIsByCategory(category);
      setAvailableAPIs(apis);
    } catch (error) {
      errorService.logError('Failed to load APIs:', error);
    } finally {
      setLoading(false);
    }
  }, [connector]);

  useEffect(() => {
    loadAPIs(selectedCategory);
  }, [selectedCategory, loadAPIs]);

  // Filter APIs based on search and filters
  const filteredAPIs = useMemo(() => {
    return availableAPIs.filter(api => {
      const matchesSearch = !searchQuery || 
        api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        api.provider.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilters = (!filters.pricing || api.pricing.model === filters.pricing) &&
        (!filters.minReliability || api.reliability.uptime >= filters.minReliability) &&
        (!filters.maxLatency || api.reliability.responseTime <= filters.maxLatency);

      return matchesSearch && matchesFilters;
    });
  }, [availableAPIs, searchQuery, filters]);

  const handleAPISelect = (api: RapidAPIMetadata) => {
    const newSelected = new Set(selectedAPIs);
    if (newSelected.has(api.id)) {
      newSelected.delete(api.id);
    } else {
      newSelected.add(api.id);
    }
    setSelectedAPIs(newSelected);
  };

  const handleCreateVCs = async () => {
    const selectedAPIsList = availableAPIs.filter(api => selectedAPIs.has(api.id));
    console.log('Creating VCs with APIs:', selectedAPIsList);
    // Here you would integrate with your VC creation workflow
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Header */}
      <div className="p-8 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                API Marketplace
              </h1>
              <p className="text-slate-400">
                Connect with 40,000+ APIs to create powerful verifiable credentials
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-slate-500">Selected APIs</div>
                <div className="text-2xl font-bold text-cyan-400">{selectedAPIs.size}</div>
              </div>
              {selectedAPIs.size > 0 && (
                <Suspense fallback={<div className="animate-pulse bg-slate-700 h-12 rounded"></div>}>
                  <EliteWeb3Button
                    variant="primary"
                    size="lg"
                    onClick={handleCreateVCs}
                    icon={<Rocket className="w-5 h-5" />}
                  >
                    Create VCs ({selectedAPIs.size})
                  </EliteWeb3Button>
                </Suspense>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search APIs, providers, or features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 backdrop-blur-xl"
              />
            </div>
            <button className="px-6 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all backdrop-blur-xl">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Categories */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(ELITE_CATEGORIES).map(([key, category]) => (
                <CategoryCard
                  key={key}
                  category={category}
                  categoryKey={key}
                  isSelected={selectedCategory === key}
                  onClick={() => setSelectedCategory(key)}
                />
              ))}
            </div>
          </div>

          {/* APIs Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {ELITE_CATEGORIES[selectedCategory as keyof typeof ELITE_CATEGORIES]?.name} APIs
              </h2>
              <div className="text-sm text-slate-400">
                {filteredAPIs.length} APIs available
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-slate-900/60 rounded-2xl h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredAPIs.map((api) => (
                    <EliteAPICard
                      key={api.id}
                      api={api}
                      onSelect={handleAPISelect}
                      onPreview={setPreviewAPI}
                      isSelected={selectedAPIs.has(api.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Preview Modal */}
      <AnimatePresence>
        {previewAPI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewAPI(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{previewAPI.name}</h3>
                    <p className="text-slate-400">{previewAPI.description}</p>
                  </div>
                  <button
                    onClick={() => setPreviewAPI(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* API Details */}
                <div className="space-y-6">
                  {/* Endpoints */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Endpoints</h4>
                    <div className="space-y-3">
                      {previewAPI.endpoints.map((endpoint, index) => (
                        <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                              {endpoint.method}
                            </span>
                            <span className="font-mono text-cyan-400">{endpoint.path}</span>
                          </div>
                          <p className="text-sm text-slate-400">{endpoint.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Pricing</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {previewAPI.pricing.tiers?.map((tier, index) => (
                        <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                          <h5 className="font-semibold text-white mb-2">{tier.name}</h5>
                          <div className="text-2xl font-bold text-cyan-400 mb-2">
                            ${tier.price}
                          </div>
                          <div className="text-sm text-slate-400 mb-3">
                            {tier.requests === -1 ? 'Unlimited' : `${tier.requests} requests`}
                          </div>
                          <ul className="space-y-1">
                            {tier.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="text-sm text-slate-300 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 pt-6 border-t border-slate-700/50">
                    <Suspense fallback={<div className="animate-pulse bg-slate-700 h-12 rounded flex-1"></div>}>
                      <EliteWeb3Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                          handleAPISelect(previewAPI);
                          setPreviewAPI(null);
                        }}
                        icon={<Zap className="w-4 h-4" />}
                        className="flex-1"
                      >
                        {selectedAPIs.has(previewAPI.id) ? 'Selected' : 'Select API'}
                      </EliteWeb3Button>
                    </Suspense>
                    <button
                      onClick={() => window.open(previewAPI.rapidApiUrl, '_blank')}
                      className="flex-1 px-6 py-3 bg-slate-800/50 text-slate-300 rounded-xl border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on RapidAPI
                    </button>
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