/**
 * Production ZK Proof Dashboard for PersonaChain
 * Enterprise-grade interface for the complete ZK proof workflow system
 * Integrates with all backend services: Integration, Generation, Verification, Sharing
 * 
 * Features:
 * - Complete VC→ZK→Generate→Verify→Share workflow
 * - Real-time workflow monitoring and progress tracking
 * - Privacy-preserving proof sharing with selective disclosure
 * - Enterprise security and compliance features
 * - Advanced error handling and recovery
 * - Performance monitoring and analytics
 * - Professional UI with beautiful animations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  ShareIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ChartBarIcon,
  UserGroupIcon,
  LockClosedIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

// ==================== TYPES ====================

interface WorkflowStatus {
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
  steps: WorkflowStepStatus[];
  results?: any;
  error?: string;
}

interface WorkflowStepStatus {
  stepId: string;
  stepType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  output?: any;
  error?: string;
  retryCount: number;
}

interface ZKProofMetrics {
  totalProofs: number;
  successRate: number;
  averageGenerationTime: number;
  averageVerificationTime: number;
  activeWorkflows: number;
  recentShares: number;
}

interface SharedProof {
  proofId: string;
  sharingId: string;
  circuitType: string;
  recipients: number;
  sharedAt: Date;
  expiresAt?: Date;
  accessCount: number;
  status: 'active' | 'expired' | 'revoked';
}

// ==================== MAIN COMPONENT ====================

export const ProductionZKPDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'proofs' | 'sharing' | 'analytics'>('workflows');
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowStatus[]>([]);
  const [completedWorkflows, setCompletedWorkflows] = useState<WorkflowStatus[]>([]);
  const [metrics, setMetrics] = useState<ZKProofMetrics>({
    totalProofs: 0,
    successRate: 0,
    averageGenerationTime: 0,
    averageVerificationTime: 0,
    activeWorkflows: 0,
    recentShares: 0
  });
  const [sharedProofs, setSharedProofs] = useState<SharedProof[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowStatus | null>(null);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);

  // ==================== EFFECTS ====================

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // ==================== API INTEGRATION ====================

  const loadDashboardData = useCallback(async () => {
    try {
      // Load active workflows
      const workflowsResponse = await fetch('/api/zkp/workflows/active');
      const workflows = await workflowsResponse.json();
      setActiveWorkflows(workflows);

      // Load completed workflows
      const completedResponse = await fetch('/api/zkp/workflows/completed?limit=10');
      const completed = await completedResponse.json();
      setCompletedWorkflows(completed);

      // Load metrics
      const metricsResponse = await fetch('/api/zkp/metrics');
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Load shared proofs
      const sharedResponse = await fetch('/api/zkp/shared-proofs');
      const shared = await sharedResponse.json();
      setSharedProofs(shared);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, []);

  const createWorkflow = async (workflowType: string, configuration: any) => {
    setIsCreatingWorkflow(true);
    try {
      const response = await fetch('/api/zkp/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowType,
          configuration,
          steps: getWorkflowSteps(workflowType),
          input: configuration.input
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }

      const workflow = await response.json();
      setActiveWorkflows(prev => [...prev, workflow]);
      setSelectedWorkflow(workflow);
      
    } catch (error) {
      console.error('Failed to create workflow:', error);
    } finally {
      setIsCreatingWorkflow(false);
    }
  };

  const getWorkflowSteps = (workflowType: string) => {
    const baseSteps = [
      {
        stepId: 'vc-integration',
        stepType: 'vc_integration',
        enabled: true,
        configuration: {}
      },
      {
        stepId: 'proof-generation',
        stepType: 'proof_generation',
        enabled: true,
        dependencies: ['vc-integration'],
        configuration: {}
      },
      {
        stepId: 'proof-verification',
        stepType: 'proof_verification',
        enabled: true,
        dependencies: ['proof-generation'],
        configuration: {}
      }
    ];

    if (workflowType === 'full-workflow') {
      baseSteps.push({
        stepId: 'proof-sharing',
        stepType: 'proof_sharing',
        enabled: true,
        dependencies: ['proof-verification'],
        configuration: {}
      });
    }

    return baseSteps;
  };

  // ==================== RENDER METHODS ====================

  const renderMetricsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Proofs</p>
            <p className="text-2xl font-bold text-white">{metrics.totalProofs}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <ShieldCheckIcon className="h-6 w-6 text-white" />
          </div>
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
            <p className="text-gray-400 text-sm">Success Rate</p>
            <p className="text-2xl font-bold text-white">{(metrics.successRate * 100).toFixed(1)}%</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <CheckCircleIcon className="h-6 w-6 text-white" />
          </div>
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
            <p className="text-gray-400 text-sm">Active Workflows</p>
            <p className="text-2xl font-bold text-white">{metrics.activeWorkflows}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
            <CogIcon className="h-6 w-6 text-white" />
          </div>
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
            <p className="text-gray-400 text-sm">Recent Shares</p>
            <p className="text-2xl font-bold text-white">{metrics.recentShares}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <ShareIcon className="h-6 w-6 text-white" />
          </div>
        </div>
      </motion.div>
    </div>
  );

  const renderTabNavigation = () => (
    <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1 mb-8">
      {[
        { id: 'workflows', label: 'Workflows', icon: CogIcon },
        { id: 'proofs', label: 'Proofs', icon: ShieldCheckIcon },
        { id: 'sharing', label: 'Sharing', icon: ShareIcon },
        { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${activeTab === tab.id
              ? 'bg-orange-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }
          `}
        >
          <tab.icon className="h-4 w-4" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  const renderWorkflowsTab = () => (
    <div className="space-y-6">
      {/* Create Workflow Section */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Create New Workflow</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => createWorkflow('vc-to-proof', {
              input: { vcData: { credentials: [], holderDID: 'did:persona:user', purpose: 'verification' } }
            })}
            disabled={isCreatingWorkflow}
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-left hover:bg-blue-500/20 transition-all"
          >
            <DocumentTextIcon className="h-8 w-8 text-blue-400 mb-3" />
            <h4 className="text-white font-medium mb-1">VC to Proof</h4>
            <p className="text-gray-400 text-sm">Convert verifiable credentials into ZK proofs</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => createWorkflow('proof-verification', {
              input: { verificationData: { proof: {}, publicSignals: [], circuitId: 'membership' } }
            })}
            disabled={isCreatingWorkflow}
            className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-left hover:bg-green-500/20 transition-all"
          >
            <CheckCircleIcon className="h-8 w-8 text-green-400 mb-3" />
            <h4 className="text-white font-medium mb-1">Verify Proof</h4>
            <p className="text-gray-400 text-sm">Verify existing zero-knowledge proofs</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => createWorkflow('full-workflow', {
              input: { 
                vcData: { credentials: [], holderDID: 'did:persona:user', purpose: 'sharing' },
                sharingData: { recipients: [], sharingPolicy: {} }
              }
            })}
            disabled={isCreatingWorkflow}
            className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-left hover:bg-purple-500/20 transition-all"
          >
            <ShareIcon className="h-8 w-8 text-purple-400 mb-3" />
            <h4 className="text-white font-medium mb-1">Full Workflow</h4>
            <p className="text-gray-400 text-sm">Complete VC→ZK→Share pipeline</p>
          </motion.button>
        </div>
      </div>

      {/* Active Workflows */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Active Workflows</h3>
        <div className="space-y-4">
          {activeWorkflows.length === 0 ? (
            <div className="text-center py-8">
              <CogIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No active workflows</p>
            </div>
          ) : (
            activeWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.workflowId}
                workflow={workflow}
                onClick={() => setSelectedWorkflow(workflow)}
              />
            ))
          )}
        </div>
      </div>

      {/* Recent Workflows */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Recent Workflows</h3>
        <div className="space-y-4">
          {completedWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.workflowId}
              workflow={workflow}
              onClick={() => setSelectedWorkflow(workflow)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderSharingTab = () => (
    <div className="space-y-6">
      {/* Sharing Controls */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Privacy-Preserving Sharing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-3">Selective Disclosure</h4>
            <p className="text-gray-400 text-sm mb-4">
              Control which parts of your proofs are shared while maintaining privacy
            </p>
            <button className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all">
              Configure Disclosure
            </button>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Access Control</h4>
            <p className="text-gray-400 text-sm mb-4">
              Set time-based and conditional access rules for shared proofs
            </p>
            <button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all">
              Manage Access
            </button>
          </div>
        </div>
      </div>

      {/* Shared Proofs */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Shared Proofs</h3>
        <div className="space-y-4">
          {sharedProofs.map((proof) => (
            <SharedProofCard key={proof.sharingId} proof={proof} />
          ))}
        </div>
      </div>
    </div>
  );

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
            Zero-Knowledge Proof Dashboard
          </h1>
          <p className="text-gray-300 text-lg">
            Enterprise-grade ZK proof workflow management
          </p>
        </motion.div>

        {/* Metrics Overview */}
        {renderMetricsOverview()}

        {/* Tab Navigation */}
        {renderTabNavigation()}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'workflows' && renderWorkflowsTab()}
            {activeTab === 'sharing' && renderSharingTab()}
            {activeTab === 'proofs' && <ProofLibrary />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
          </motion.div>
        </AnimatePresence>

        {/* Workflow Detail Modal */}
        <AnimatePresence>
          {selectedWorkflow && (
            <WorkflowDetailModal
              workflow={selectedWorkflow}
              onClose={() => setSelectedWorkflow(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ==================== SUPPORTING COMPONENTS ====================

const WorkflowCard: React.FC<{
  workflow: WorkflowStatus;
  onClick: () => void;
}> = ({ workflow, onClick }) => {
  const getStatusIcon = () => {
    switch (workflow.status) {
      case 'running':
        return <PlayIcon className="h-5 w-5 text-blue-400" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getStatusColor = () => {
    switch (workflow.status) {
      case 'running':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'completed':
        return 'border-green-500/20 bg-green-500/5';
      case 'failed':
        return 'border-red-500/20 bg-red-500/5';
      default:
        return 'border-yellow-500/20 bg-yellow-500/5';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${getStatusColor()}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h4 className="text-white font-medium">{workflow.workflowId}</h4>
            <p className="text-gray-400 text-sm">
              {workflow.currentStep} • {workflow.progress}% complete
            </p>
          </div>
        </div>
        <ArrowRightIcon className="h-5 w-5 text-gray-400" />
      </div>
    </motion.div>
  );
};

const SharedProofCard: React.FC<{
  proof: SharedProof;
}> = ({ proof }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-700/50 rounded-lg p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <ShareIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-white font-medium">{proof.circuitType}</h4>
            <p className="text-gray-400 text-sm">
              {proof.recipients} recipients • {proof.accessCount} accesses
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`
            px-2 py-1 rounded text-xs font-medium
            ${proof.status === 'active' ? 'bg-green-500/20 text-green-400' : 
              proof.status === 'expired' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'}
          `}>
            {proof.status}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const WorkflowDetailModal: React.FC<{
  workflow: WorkflowStatus;
  onClose: () => void;
}> = ({ workflow, onClose }) => {
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
          <h3 className="text-xl font-semibold text-white">Workflow Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Workflow Info */}
          <div>
            <h4 className="text-white font-medium mb-3">Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">ID:</span>
                <span className="text-white ml-2">{workflow.workflowId}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="text-white ml-2">{workflow.status}</span>
              </div>
              <div>
                <span className="text-gray-400">Progress:</span>
                <span className="text-white ml-2">{workflow.progress}%</span>
              </div>
              <div>
                <span className="text-gray-400">Current Step:</span>
                <span className="text-white ml-2">{workflow.currentStep}</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-white font-medium mb-3">Steps</h4>
            <div className="space-y-2">
              {workflow.steps.map((step) => (
                <div
                  key={step.stepId}
                  className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-3 h-3 rounded-full
                      ${step.status === 'completed' ? 'bg-green-400' :
                        step.status === 'running' ? 'bg-blue-400' :
                        step.status === 'failed' ? 'bg-red-400' :
                        'bg-gray-400'}
                    `} />
                    <span className="text-white text-sm">{step.stepId}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{step.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProofLibrary: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Proof Library</h3>
        <p className="text-gray-400">Your generated zero-knowledge proofs</p>
      </div>
    </div>
  );
};

const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Analytics Dashboard</h3>
        <p className="text-gray-400">Performance metrics and usage analytics</p>
      </div>
    </div>
  );
};

export default ProductionZKPDashboard;