/**
 * ZKP Dashboard Component
 * Main dashboard for zero-knowledge proof templates and generation
 */

import React, { useState, useEffect } from 'react';
import { Shield, Zap, TrendingUp, Clock, Plus, Eye, Award, Users } from 'lucide-react';
import { ZKPTemplateLibrary } from './ZKPTemplateLibrary';
import { ZKPTemplateDetails } from './ZKPTemplateDetails';
import { ZKPProofGenerator } from './ZKPProofGenerator';
import { zkpTemplateService } from '../../services/zkpTemplateService';
import { storageService } from '../../services/storageService';
import type { ZKPTemplate, ProofGenerationResult } from '../../services/zkpTemplateService';
import type { WalletCredential } from '../../types/wallet';
import { errorService } from "@/services/errorService";

type ViewMode = 'dashboard' | 'library' | 'details' | 'generator';

interface DashboardStats {
  totalTemplates: number;
  proofsGenerated: number;
  credentialsUsed: number;
  featuredTemplates: number;
}

export const ZKPDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedTemplate, setSelectedTemplate] = useState<ZKPTemplate | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalTemplates: 0,
    proofsGenerated: 0,
    credentialsUsed: 0,
    featuredTemplates: 0,
  });
  const [recentProofs, setRecentProofs] = useState<WalletCredential[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get template statistics
      const allTemplates = zkpTemplateService.getAllTemplates();
      const featuredTemplates = zkpTemplateService.getFeaturedTemplates();
      
      // Get recent ZKP credentials
      const credentials = await storageService.getAllCredentials();
      const zkpCredentials = credentials.filter(cred => 
        cred.type === 'ZKCredential' || cred.metadata.source === 'zkp_template'
      );
      
      setStats({
        totalTemplates: allTemplates.length,
        proofsGenerated: zkpCredentials.length,
        credentialsUsed: credentials.length,
        featuredTemplates: featuredTemplates.length,
      });

      // Get recent proofs (last 5)
      const sortedProofs = zkpCredentials
        .sort((a, b) => new Date(b.metadata.issuedAt || 0).getTime() - new Date(a.metadata.issuedAt || 0).getTime())
        .slice(0, 5);
      
      setRecentProofs(sortedProofs);
    } catch (error) {
      errorService.logError('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: ZKPTemplate) => {
    setSelectedTemplate(template);
    setCurrentView('details');
  };

  const handleStartProof = (template: ZKPTemplate) => {
    setSelectedTemplate(template);
    setCurrentView('generator');
  };

  const handleProofGenerated = (result: ProofGenerationResult) => {
    // Refresh dashboard data after proof generation
    loadDashboardData();
    
    // Show success message or navigate to credentials
    console.log('Proof generated successfully:', result);
  };

  const handleBack = () => {
    if (currentView === 'generator') {
      setCurrentView('details');
    } else if (currentView === 'details') {
      setCurrentView('library');
    } else {
      setCurrentView('dashboard');
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Route to different views
  if (currentView === 'library') {
    return (
      <ZKPTemplateLibrary
        onTemplateSelect={handleTemplateSelect}
        selectedTemplateId={selectedTemplate?.id}
      />
    );
  }

  if (currentView === 'details' && selectedTemplate) {
    return (
      <ZKPTemplateDetails
        template={selectedTemplate}
        onBack={handleBack}
        onStartProof={handleStartProof}
      />
    );
  }

  if (currentView === 'generator' && selectedTemplate) {
    return (
      <ZKPProofGenerator
        template={selectedTemplate}
        onBack={handleBack}
        onProofGenerated={handleProofGenerated}
      />
    );
  }

  // Main dashboard view
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Zero-Knowledge Proofs</h1>
          <p className="text-gray-600 mt-1">
            Generate privacy-preserving proofs using professional templates
          </p>
        </div>
        <button
          onClick={() => setCurrentView('library')}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Proof</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Templates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTemplates}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.featuredTemplates} featured templates
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Proofs Generated</p>
              <p className="text-2xl font-bold text-gray-900">{stats.proofsGenerated}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Zero-knowledge proofs created
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Credentials Used</p>
              <p className="text-2xl font-bold text-gray-900">{stats.credentialsUsed}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Available for proof generation
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">98.5%</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Proof generation success rate
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('library')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Generate New Proof</p>
              <p className="text-sm text-gray-600">Create a zero-knowledge proof</p>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/credentials'}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-green-100 rounded-lg">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View Credentials</p>
              <p className="text-sm text-gray-600">Manage your credentials</p>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('library')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Browse Templates</p>
              <p className="text-sm text-gray-600">Explore available templates</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Proofs */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Proofs</h2>
          <button
            onClick={() => window.location.href = '/credentials'}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View All
          </button>
        </div>

        {recentProofs.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No proofs generated yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Generate your first zero-knowledge proof to get started
            </p>
            <button
              onClick={() => setCurrentView('library')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Proof
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentProofs.map((proof) => (
              <div
                key={proof.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Shield className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{proof.metadata.name}</p>
                    <p className="text-sm text-gray-600">{proof.metadata.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {formatTimeAgo(proof.metadata.issuedAt || '')}
                  </p>
                  <p className="text-xs text-gray-400">{proof.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Featured Templates Preview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Featured Templates</h2>
          <button
            onClick={() => setCurrentView('library')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View All Templates
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zkpTemplateService.getFeaturedTemplates().slice(0, 3).map((template) => (
            <div
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{template.name}</h3>
                <span className="text-xs text-gray-500 capitalize">{template.difficulty}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{Math.floor(template.estimatedTime / 60)}m</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>{template.metadata.usageCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ZKPDashboard;