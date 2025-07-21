/**
 * ZKP Template Library Component
 * Browse, search, and select zero-knowledge proof templates
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Star, Clock, Zap, Shield, ChevronRight, Tag } from 'lucide-react';
import { zkpTemplateService } from '../../services/zkpTemplateService';
import type { ZKPTemplate, ZKPCategory } from '../../services/zkpTemplateService';
import { errorService } from "@/services/errorService";

interface ZKPTemplateLibraryProps {
  onTemplateSelect: (template: ZKPTemplate) => void;
  selectedTemplateId?: string;
}

const categoryIcons: Record<ZKPCategory, React.ReactNode> = {
  identity: <Shield className="w-5 h-5" />,
  financial: <Zap className="w-5 h-5" />,
  education: <Star className="w-5 h-5" />,
  employment: <Clock className="w-5 h-5" />,
  healthcare: <Shield className="w-5 h-5" />,
  government: <Shield className="w-5 h-5" />,
  social: <Star className="w-5 h-5" />,
  membership: <Tag className="w-5 h-5" />,
  reputation: <Star className="w-5 h-5" />,
  compliance: <Shield className="w-5 h-5" />,
  custom: <Tag className="w-5 h-5" />,
};

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-orange-100 text-orange-800',
  expert: 'bg-red-100 text-red-800',
};

const securityLevelColors = {
  basic: 'bg-gray-100 text-gray-800',
  enhanced: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

export const ZKPTemplateLibrary: React.FC<ZKPTemplateLibraryProps> = ({
  onTemplateSelect,
  selectedTemplateId,
}) => {
  const [templates, setTemplates] = useState<ZKPTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ZKPCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // Get all templates from the service
      const allTemplates = zkpTemplateService.getAllTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      errorService.logError('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    return zkpTemplateService.searchTemplates(searchQuery, {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
      featured: showFeaturedOnly || undefined,
    });
  }, [searchQuery, selectedCategory, selectedDifficulty, showFeaturedOnly]);

  const featuredTemplates = useMemo(() => {
    return zkpTemplateService.getFeaturedTemplates().slice(0, 6);
  }, []);

  const popularTemplates = useMemo(() => {
    return zkpTemplateService.getPopularTemplates(6);
  }, []);

  const categories = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    templates.forEach(template => {
      categoryCounts[template.category] = (categoryCounts[template.category] || 0) + 1;
    });
    return Object.entries(categoryCounts);
  }, [templates]);

  const formatEstimatedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const formatGasEstimate = (gas: number): string => {
    if (gas >= 1000000) return `${(gas / 1000000).toFixed(1)}M`;
    if (gas >= 1000) return `${(gas / 1000).toFixed(0)}K`;
    return gas.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">ZKP Template Library</h1>
        <p className="text-lg text-gray-600">
          Choose from {templates.length} professionally designed zero-knowledge proof templates
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ZKPCategory | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(([category, count]) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>

          {/* Featured Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFeaturedOnly}
              onChange={(e) => setShowFeaturedOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Featured only</span>
          </label>
        </div>
      </div>

      {/* Featured Templates Section */}
      {!searchQuery && selectedCategory === 'all' && !showFeaturedOnly && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            <h2 className="text-xl font-semibold text-gray-900">Featured Templates</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => onTemplateSelect(template)}
                isSelected={selectedTemplateId === template.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Popular Templates Section */}
      {!searchQuery && selectedCategory === 'all' && !showFeaturedOnly && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-900">Popular Templates</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => onTemplateSelect(template)}
                isSelected={selectedTemplateId === template.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all' || showFeaturedOnly
              ? 'Search Results'
              : 'All Templates'}
          </h2>
          <span className="text-sm text-gray-500">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => onTemplateSelect(template)}
                isSelected={selectedTemplateId === template.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface TemplateCardProps {
  template: ZKPTemplate;
  onSelect: () => void;
  isSelected: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, isSelected }) => {
  return (
    <div
      onClick={onSelect}
      className={`relative bg-white rounded-lg shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            {categoryIcons[template.category]}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{template.category}</p>
          </div>
        </div>
        {template.metadata.featured && (
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[template.difficulty]}`}>
          {template.difficulty}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${securityLevelColors[template.metadata.securityLevel]}`}>
          {template.metadata.securityLevel}
        </span>
        {template.metadata.verified && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Verified
          </span>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 mb-4">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{formatEstimatedTime(template.estimatedTime)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Zap className="w-3 h-3" />
          <span>{formatGasEstimate(template.gasEstimate)} gas</span>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < Math.floor(template.metadata.rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {template.metadata.rating} ({template.metadata.reviews})
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"></div>
      )}
    </div>
  );
};

export default ZKPTemplateLibrary;