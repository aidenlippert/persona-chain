/**
 * Mobile-Optimized Proof Explorer
 * Touch-friendly interface for community proof discovery
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Star, 
  Shield, 
  Users, 
  Zap,
  Eye,
  Heart,
  Share2,
  Download,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  TrendingUp,
  X
} from 'lucide-react';
import { CommunityProof, ProofSearchQuery, ProofSearchResult } from '../../services/community/CommunityProofLibrary';
import { communityProofLibrary } from '../../services/community/CommunityProofLibrary';
import { errorService } from "@/services/errorService";

interface MobileProofExplorerProps {
  onProofSelect?: (proof: CommunityProof) => void;
  onProofShare?: (proof: CommunityProof) => void;
  onProofUse?: (proof: CommunityProof) => void;
}

interface FilterState {
  category: string | null;
  complexity: string | null;
  verificationLevel: string | null;
  minTrustScore: number;
  tags: string[];
}

const MobileProofExplorer: React.FC<MobileProofExplorerProps> = ({
  onProofSelect,
  onProofShare,
  onProofUse
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProofSearchResult | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    category: null,
    complexity: null,
    verificationLevel: null,
    minTrustScore: 0,
    tags: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProof, setSelectedProof] = useState<CommunityProof | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'recent' | 'popular' | 'trustScore'>('relevance');

  // Search function with debouncing
  const performSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const query: ProofSearchQuery = {
        query: searchQuery,
        category: filters.category || undefined,
        complexity: filters.complexity || undefined,
        verificationLevel: filters.verificationLevel || undefined,
        minTrustScore: filters.minTrustScore > 0 ? filters.minTrustScore : undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        sortBy,
        sortDirection: 'desc',
        limit: 20,
        offset: 0
      };

      const results = await communityProofLibrary.searchProofs(query);
      setSearchResults(results);
    } catch (error) {
      errorService.logError('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, filters, sortBy]);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [performSearch]);

  const handleProofTap = (proof: CommunityProof) => {
    setSelectedProof(proof);
    onProofSelect?.(proof);
  };

  const handleEndorse = async (proof: CommunityProof) => {
    try {
      await communityProofLibrary.endorseProof(
        proof.id,
        'did:persona:user:current',
        'quality',
        'Helpful proof'
      );
      // Refresh search results
      performSearch();
    } catch (error) {
      errorService.logError('Endorsement failed:', error);
    }
  };

  const handleShare = (proof: CommunityProof) => {
    onProofShare?.(proof);
  };

  const handleUse = (proof: CommunityProof) => {
    onProofUse?.(proof);
  };

  const clearFilters = () => {
    setFilters({
      category: null,
      complexity: null,
      verificationLevel: null,
      minTrustScore: 0,
      tags: []
    });
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-500';
    if (score >= 0.7) return 'text-blue-500';
    if (score >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'identity': return <Shield className="w-4 h-4" />;
      case 'professional': return <Users className="w-4 h-4" />;
      case 'financial': return <Zap className="w-4 h-4" />;
      case 'educational': return <Star className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search community proofs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg ${
              showFilters ? 'bg-blue-500 text-white' : 'text-gray-400'
            }`}
          >
            <Filter className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Sort Options */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[
            { key: 'relevance', label: 'Relevant', icon: Star },
            { key: 'recent', label: 'Recent', icon: Clock },
            { key: 'popular', label: 'Popular', icon: TrendingUp },
            { key: 'trustScore', label: 'Trusted', icon: Shield }
          ].map(({ key, label, icon: Icon }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSortBy(key as any)}
              className={`flex items-center space-x-1 px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                sortBy === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-gray-200 p-4 space-y-4"
          >
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {['identity', 'professional', 'financial', 'educational', 'social'].map((category) => (
                  <motion.button
                    key={category}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilters(f => ({ 
                      ...f, 
                      category: f.category === category ? null : category 
                    }))}
                    className={`px-3 py-1 rounded-full text-sm capitalize ${
                      filters.category === category
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {category}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Trust Score Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Trust Score: {filters.minTrustScore.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.minTrustScore}
                onChange={(e) => setFilters(f => ({ 
                  ...f, 
                  minTrustScore: parseFloat(e.target.value) 
                }))}
                className="w-full"
              />
            </div>

            {/* Clear Filters */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={clearFilters}
              className="w-full py-2 px-4 bg-gray-100 text-gray-600 rounded-lg text-sm"
            >
              Clear All Filters
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <div className="flex-1 overflow-auto">
        {isSearching && (
          <div className="flex justify-center items-center p-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        )}

        {searchResults && !isSearching && (
          <div className="p-4 space-y-4">
            {/* Results Count */}
            <div className="text-sm text-gray-500">
              {searchResults.total} proofs found
            </div>

            {/* Proof Cards */}
            {searchResults.proofs.map((proof) => (
              <motion.div
                key={proof.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleProofTap(proof)}
                className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getCategoryIcon(proof.category)}
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {proof.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 text-xs line-clamp-2">
                      {proof.description}
                    </p>
                  </div>
                  
                  {proof.verification.isVerified && (
                    <Shield className="w-4 h-4 text-green-500 mt-1" />
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>{proof.usageCount}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>{proof.endorsements}</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${getTrustScoreColor(proof.trustScore)}`}>
                      <Star className="w-3 h-3" />
                      <span>{(proof.trustScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEndorse(proof);
                      }}
                      className="p-2 rounded-lg bg-blue-50 text-blue-500"
                    >
                      <Heart className="w-4 h-4" />
                    </motion.button>
                    
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(proof);
                      }}
                      className="p-2 rounded-lg bg-gray-50 text-gray-500"
                    >
                      <Share2 className="w-4 h-4" />
                    </motion.button>
                    
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUse(proof);
                      }}
                      className="p-2 rounded-lg bg-green-50 text-green-500"
                    >
                      <Download className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {/* Tags */}
                {proof.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {proof.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {proof.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{proof.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {/* Empty State */}
            {searchResults.proofs.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No proofs found</h3>
                <p className="text-gray-500 text-sm">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Proof Detail Modal */}
      <AnimatePresence>
        {selectedProof && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
            onClick={() => setSelectedProof(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedProof.title}
                </h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedProof(null)}
                  className="p-2 rounded-lg bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Proof Details */}
              <div className="space-y-4">
                <p className="text-gray-600">{selectedProof.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <span className="ml-2 capitalize">{selectedProof.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Complexity:</span>
                    <span className="ml-2 capitalize">{selectedProof.metadata.complexity}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Trust Score:</span>
                    <span className={`ml-2 ${getTrustScoreColor(selectedProof.trustScore)}`}>
                      {(selectedProof.trustScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Usage:</span>
                    <span className="ml-2">{selectedProof.usageCount} times</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUse(selectedProof)}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium"
                  >
                    Use This Proof
                  </motion.button>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleShare(selectedProof)}
                    className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl"
                  >
                    Share
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileProofExplorer;