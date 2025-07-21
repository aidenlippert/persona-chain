/**
 * ZK Proof Bundle Dashboard
 * Advanced dashboard for creating, managing, and sharing ZK proof bundles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicButton } from '../ui/advanced/MagicButton';
import { MagicCard } from '../ui/advanced/MagicCard';
import { MagicModal } from '../ui/advanced/MagicModal';
import { 
  zkProofBundleService, 
  ZKProofBundle, 
  BundleTemplate, 
  BundleGenerationProgress 
} from '../../services/zkp/ZKProofBundleService';

interface DashboardState {
  bundles: ZKProofBundle[];
  templates: BundleTemplate[];
  isLoading: boolean;
  selectedTemplate: BundleTemplate | null;
  showCreateModal: boolean;
  showTemplateModal: boolean;
  generationProgress: BundleGenerationProgress | null;
  isGenerating: boolean;
  selectedBundle: ZKProofBundle | null;
  error: string | null;
  searchQuery: string;
  filterCategory: string;
  sortBy: 'name' | 'created' | 'popularity' | 'complexity';
}

export const ZKProofBundleDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    bundles: [],
    templates: [],
    isLoading: true,
    selectedTemplate: null,
    showCreateModal: false,
    showTemplateModal: false,
    generationProgress: null,
    isGenerating: false,
    selectedBundle: null,
    error: null,
    searchQuery: '',
    filterCategory: 'all',
    sortBy: 'created'
  });

  const userDid = 'did:persona:user:123'; // TODO: Get from auth context

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [bundles, templates] = await Promise.all([
        zkProofBundleService.getUserBundles(userDid),
        zkProofBundleService.getBundleTemplates()
      ]);

      setState(prev => ({
        ...prev,
        bundles,
        templates,
        isLoading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data',
        isLoading: false
      }));
    }
  }, [userDid]);

  const handleCreateBundle = useCallback(async (templateId: string, customName?: string) => {
    setState(prev => ({ ...prev, isGenerating: true, showCreateModal: false }));

    try {
      // Create bundle
      const bundle = await zkProofBundleService.createBundle(
        userDid,
        templateId,
        customName ? { name: customName } : undefined
      );

      // Generate bundle with progress tracking
      await zkProofBundleService.generateBundle(
        bundle.id,
        [], // TODO: Pass actual credentials
        (progress) => setState(prev => ({ ...prev, generationProgress: progress }))
      );

      // Reload bundles
      await loadDashboardData();

      setState(prev => ({
        ...prev,
        isGenerating: false,
        generationProgress: null
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create bundle',
        isGenerating: false,
        generationProgress: null
      }));
    }
  }, [userDid, loadDashboardData]);

  const handleVerifyBundle = useCallback(async (bundleId: string) => {
    try {
      await zkProofBundleService.verifyBundle(bundleId);
      await loadDashboardData();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to verify bundle'
      }));
    }
  }, [loadDashboardData]);

  const handleShareBundle = useCallback(async (bundleId: string) => {
    try {
      const { shareUrl } = await zkProofBundleService.shareBundle(bundleId, {
        isPublic: true,
        requiresPermission: false
      });
      
      if (navigator.share) {
        await navigator.share({
          title: 'ZK Proof Bundle',
          text: 'Check out my verified proof bundle',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        // Show success message
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to share bundle'
      }));
    }
  }, []);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'identity': return '🆔';
      case 'financial': return '💰';
      case 'education': return '🎓';
      case 'employment': return '💼';
      case 'social': return '👥';
      default: return '📦';
    }
  };

  const filteredTemplates = state.templates
    .filter(template => 
      state.filterCategory === 'all' || template.category === state.filterCategory
    )
    .filter(template =>
      template.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(state.searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (state.sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'popularity': return b.popularity - a.popularity;
        case 'complexity': 
          const complexityOrder = { low: 1, medium: 2, high: 3 };
          return complexityOrder[a.complexity] - complexityOrder[b.complexity];
        default: return 0;
      }
    });

  const filteredBundles = state.bundles
    .filter(bundle =>
      bundle.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      bundle.description.toLowerCase().includes(state.searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🎯 ZK Proof Bundles
        </h1>
        <p className="text-gray-600 text-lg">
          Create, manage, and share collections of zero-knowledge proofs
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { label: 'Active Bundles', value: state.bundles.length, icon: '📦' },
          { label: 'Verified Bundles', value: state.bundles.filter(b => b.verification.isVerified).length, icon: '✅' },
          { label: 'Shared Bundles', value: state.bundles.filter(b => b.sharing.isPublic).length, icon: '🔗' },
          { label: 'Total Proofs', value: state.bundles.reduce((sum, b) => sum + b.metadata.totalProofs, 0), icon: '🏆' }
        ].map((stat, index) => (
          <MagicCard
            key={stat.label}
            variant="elevated"
            hoverable
            glowEffect
            className="text-center"
          >
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </MagicCard>
        ))}
      </motion.div>

      {/* Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4 items-center justify-between bg-white rounded-2xl p-6 shadow-lg border"
      >
        <div className="flex gap-4">
          <MagicButton
            variant="primary"
            icon={<span>➕</span>}
            onClick={() => setState(prev => ({ ...prev, showTemplateModal: true }))}
            glowEffect
            soundEffect
            hapticFeedback
          >
            Create Bundle
          </MagicButton>
          
          <MagicButton
            variant="secondary"
            icon={<span>🔄</span>}
            onClick={loadDashboardData}
            disabled={state.isLoading}
            loading={state.isLoading}
          >
            Refresh
          </MagicButton>
        </div>

        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Search bundles..."
            value={state.searchQuery}
            onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <select
            value={state.filterCategory}
            onChange={(e) => setState(prev => ({ ...prev, filterCategory: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="identity">Identity</option>
            <option value="financial">Financial</option>
            <option value="education">Education</option>
            <option value="employment">Employment</option>
            <option value="social">Social</option>
          </select>
        </div>
      </motion.div>

      {/* Existing Bundles */}
      {filteredBundles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Bundles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBundles.map((bundle, index) => (
              <MagicCard
                key={bundle.id}
                variant="glass"
                size="md"
                hoverable
                tiltEffect
                glowEffect
                className="h-full"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getCategoryIcon(bundle.category)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{bundle.name}</h3>
                        <p className="text-sm text-gray-600">{bundle.category}</p>
                      </div>
                    </div>
                    
                    {bundle.verification.isVerified && (
                      <div className="text-green-500 text-xl">✅</div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">{bundle.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Proofs:</span>
                      <span className="font-medium ml-2">
                        {bundle.metadata.completedProofs}/{bundle.metadata.totalProofs}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Trust Score:</span>
                      <span className="font-medium ml-2">
                        {Math.round(bundle.metadata.trustScore * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getComplexityColor(bundle.metadata.overallComplexity)
                    }`}>
                      {bundle.metadata.overallComplexity.toUpperCase()}
                    </span>
                    
                    <div className="text-xs text-gray-500">
                      {new Date(bundle.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <MagicButton
                      size="sm"
                      variant="primary"
                      onClick={() => handleVerifyBundle(bundle.id)}
                      className="flex-1"
                    >
                      Verify
                    </MagicButton>
                    
                    <MagicButton
                      size="sm"
                      variant="secondary"
                      onClick={() => handleShareBundle(bundle.id)}
                      className="flex-1"
                    >
                      Share
                    </MagicButton>
                  </div>
                </div>
              </MagicCard>
            ))}
          </div>
        </motion.div>
      )}

      {/* Template Selection Modal */}
      <MagicModal
        isOpen={state.showTemplateModal}
        onClose={() => setState(prev => ({ ...prev, showTemplateModal: false }))}
        title="Choose a Bundle Template"
        size="xl"
        variant="glass"
        animation="scale"
        glowEffect
        particleEffect
        soundEffect
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <MagicCard
                key={template.id}
                variant="default"
                hoverable
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  selectedTemplate: template,
                  showTemplateModal: false,
                  showCreateModal: true 
                }))}
                className="cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getCategoryIcon(template.category)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{template.name}</h3>
                        {template.isOfficial && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                            Official
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <div className="text-gray-600">Popularity</div>
                      <div className="font-bold">{template.popularity}%</div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">{template.description}</p>

                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getComplexityColor(template.complexity)
                    }`}>
                      {template.complexity.toUpperCase()}
                    </span>
                    
                    <span className="text-gray-600">
                      ~{template.estimatedTime} min
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </MagicCard>
            ))}
          </div>
        </div>
      </MagicModal>

      {/* Bundle Creation Modal */}
      <MagicModal
        isOpen={state.showCreateModal}
        onClose={() => setState(prev => ({ ...prev, showCreateModal: false }))}
        title={`Create ${state.selectedTemplate?.name}`}
        size="md"
        variant="holographic"
        animation="zoom"
        footer={
          <div className="flex gap-4">
            <MagicButton
              variant="ghost"
              onClick={() => setState(prev => ({ ...prev, showCreateModal: false }))}
              className="flex-1"
            >
              Cancel
            </MagicButton>
            <MagicButton
              variant="primary"
              onClick={() => state.selectedTemplate && handleCreateBundle(state.selectedTemplate.id)}
              className="flex-1"
              glowEffect
            >
              Create Bundle
            </MagicButton>
          </div>
        }
      >
        {state.selectedTemplate && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {getCategoryIcon(state.selectedTemplate.category)}
              </div>
              <h3 className="text-xl font-bold">{state.selectedTemplate.name}</h3>
              <p className="text-gray-600">{state.selectedTemplate.description}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Bundle Details:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Proofs:</span>
                  <span className="font-medium ml-2">{state.selectedTemplate.proofTypes.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Complexity:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    getComplexityColor(state.selectedTemplate.complexity)
                  }`}>
                    {state.selectedTemplate.complexity.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Est. Time:</span>
                  <span className="font-medium ml-2">{state.selectedTemplate.estimatedTime} min</span>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium ml-2 capitalize">{state.selectedTemplate.category}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Required Proofs:</h4>
              <div className="space-y-1">
                {state.selectedTemplate.proofTypes.map((proofType) => (
                  <div key={proofType} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">✓</span>
                    <span>{proofType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </MagicModal>

      {/* Generation Progress Modal */}
      <MagicModal
        isOpen={state.isGenerating}
        onClose={() => {}}
        title="Generating ZK Proof Bundle"
        size="md"
        variant="neon"
        animation="bounce"
        closeOnBackdrop={false}
        closeOnEscape={false}
        showCloseButton={false}
        particleEffect
      >
        {state.generationProgress && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">
                {state.generationProgress.message}
              </h3>
              <p className="text-gray-600">
                Step {state.generationProgress.currentStep} of {state.generationProgress.totalSteps}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{state.generationProgress.progress}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${state.generationProgress.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {state.generationProgress.estimatedTimeRemaining > 0 && (
                <div className="text-center text-sm text-gray-600">
                  Estimated time remaining: {state.generationProgress.estimatedTimeRemaining}s
                </div>
              )}
            </div>
          </div>
        )}
      </MagicModal>

      {/* Error Display */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="text-red-600 text-xl">❌</div>
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, error: null }))}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};