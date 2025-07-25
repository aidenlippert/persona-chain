/**
 * Advanced Workflow Dashboard
 * Comprehensive interface for managing multi-API verification workflows
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicButton } from '../ui/advanced/MagicButton';
import { MagicCard } from '../ui/advanced/MagicCard';
import { MagicModal } from '../ui/advanced/MagicModal';
import { 
  advancedWorkflowService, 
  WorkflowDefinition, 
  WorkflowExecution, 
  WorkflowExecutionRequest 
} from '../../services/automation/AdvancedWorkflowService';

interface DashboardState {
  workflows: WorkflowDefinition[];
  executions: WorkflowExecution[];
  selectedWorkflow: WorkflowDefinition | null;
  activeExecution: WorkflowExecution | null;
  showWorkflowModal: boolean;
  showExecutionModal: boolean;
  showConfigModal: boolean;
  isLoading: boolean;
  error: string | null;
  filterCategory: string;
  sortBy: 'name' | 'complexity' | 'duration' | 'category';
}

interface ExecutionConfig {
  linkedinToken?: string;
  githubToken?: string;
  plaidAccessToken?: string;
  personalInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    ssn: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  options?: {
    skipOptionalSteps: boolean;
    allowPartialCompletion: boolean;
    notifyOnProgress: boolean;
  };
}

export const AdvancedWorkflowDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    workflows: [],
    executions: [],
    selectedWorkflow: null,
    activeExecution: null,
    showWorkflowModal: false,
    showExecutionModal: false,
    showConfigModal: false,
    isLoading: true,
    error: null,
    filterCategory: 'all',
    sortBy: 'name'
  });

  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig>({
    options: {
      skipOptionalSteps: false,
      allowPartialCompletion: true,
      notifyOnProgress: true
    }
  });

  const userDid = 'did:persona:user:123'; // TODO: Get from auth context

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const workflows = advancedWorkflowService.getAvailableWorkflows();
      
      setState(prev => ({
        ...prev,
        workflows,
        isLoading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load workflows',
        isLoading: false
      }));
    }
  }, []);

  const handleExecuteWorkflow = useCallback(async (workflowId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const request: WorkflowExecutionRequest = {
        workflowId,
        userDid,
        config: executionConfig.personalInfo || {},
        tokens: {
          linkedinToken: executionConfig.linkedinToken,
          githubToken: executionConfig.githubToken,
          plaidAccessToken: executionConfig.plaidAccessToken
        },
        options: executionConfig.options
      };

      const execution = await advancedWorkflowService.executeWorkflow(request);
      
      setState(prev => ({
        ...prev,
        activeExecution: execution,
        executions: [...prev.executions, execution],
        showConfigModal: false,
        showExecutionModal: true,
        isLoading: false
      }));

      // Start polling for execution updates
      pollExecutionStatus(execution.id);

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to execute workflow',
        isLoading: false
      }));
    }
  }, [userDid, executionConfig]);

  const pollExecutionStatus = useCallback((executionId: string) => {
    const pollInterval = setInterval(() => {
      const execution = advancedWorkflowService.getExecutionStatus(executionId);
      if (execution) {
        setState(prev => ({
          ...prev,
          activeExecution: execution,
          executions: prev.executions.map(exec => 
            exec.id === executionId ? execution : exec
          )
        }));

        if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
          clearInterval(pollInterval);
        }
      }
    }, 1000);

    // Cleanup after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000);
  }, []);

  const handleCancelExecution = useCallback(async (executionId: string) => {
    try {
      await advancedWorkflowService.cancelExecution(executionId);
      const execution = advancedWorkflowService.getExecutionStatus(executionId);
      if (execution) {
        setState(prev => ({
          ...prev,
          activeExecution: execution,
          executions: prev.executions.map(exec => 
            exec.id === executionId ? execution : exec
          )
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to cancel execution'
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
      case 'professional': return '💼';
      case 'financial': return '💰';
      case 'developer': return '👨‍💻';
      case 'identity': return '🆔';
      case 'comprehensive': return '🌟';
      default: return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-yellow-600';
    }
  };

  const filteredWorkflows = state.workflows
    .filter(workflow => 
      state.filterCategory === 'all' || workflow.category === state.filterCategory
    )
    .sort((a, b) => {
      switch (state.sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'complexity': 
          const complexityOrder = { low: 1, medium: 2, high: 3 };
          return complexityOrder[a.complexity] - complexityOrder[b.complexity];
        case 'duration': return a.estimatedDuration - b.estimatedDuration;
        case 'category': return a.category.localeCompare(b.category);
        default: return 0;
      }
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🚀 Advanced Workflow Automation
        </h1>
        <p className="text-gray-600 text-lg">
          Execute complex multi-API verification workflows with intelligent orchestration
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
          { label: 'Available Workflows', value: state.workflows.length, icon: '📋' },
          { label: 'Active Executions', value: state.executions.filter(e => e.status === 'running').length, icon: '⚡' },
          { label: 'Completed Today', value: state.executions.filter(e => e.status === 'completed').length, icon: '✅' },
          { label: 'Success Rate', value: '94%', icon: '🎯' }
        ].map((stat) => (
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
            icon={<span>🚀</span>}
            onClick={() => setState(prev => ({ ...prev, showWorkflowModal: true }))}
            glowEffect
            soundEffect
            hapticFeedback
          >
            Start Workflow
          </MagicButton>
          
          <MagicButton
            variant="secondary"
            icon={<span>📊</span>}
            onClick={() => setState(prev => ({ ...prev, showExecutionModal: true }))}
          >
            View Executions
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
          <select
            value={state.filterCategory}
            onChange={(e) => setState(prev => ({ ...prev, filterCategory: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="professional">Professional</option>
            <option value="financial">Financial</option>
            <option value="developer">Developer</option>
            <option value="identity">Identity</option>
            <option value="comprehensive">Comprehensive</option>
          </select>
          
          <select
            value={state.sortBy}
            onChange={(e) => setState(prev => ({ ...prev, sortBy: e.target.value as any }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="complexity">Sort by Complexity</option>
            <option value="duration">Sort by Duration</option>
            <option value="category">Sort by Category</option>
          </select>
        </div>
      </motion.div>

      {/* Workflow Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredWorkflows.map((workflow) => (
          <MagicCard
            key={workflow.id}
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
                    {getCategoryIcon(workflow.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{workflow.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{workflow.category}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600">{workflow.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Steps:</span>
                  <span className="font-medium ml-2">{workflow.steps.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium ml-2">{workflow.estimatedDuration}m</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  getComplexityColor(workflow.complexity)
                }`}>
                  {workflow.complexity.toUpperCase()}
                </span>
                
                <div className="text-xs text-gray-500">
                  {workflow.outputCredentials.length} credentials
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {workflow.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {workflow.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{workflow.tags.length - 3}
                  </span>
                )}
              </div>

              <MagicButton
                variant="primary"
                onClick={() => {
                  setState(prev => ({ ...prev, selectedWorkflow: workflow, showConfigModal: true }));
                }}
                className="w-full"
                glowEffect
              >
                Configure & Run
              </MagicButton>
            </div>
          </MagicCard>
        ))}
      </motion.div>

      {/* Workflow Selection Modal */}
      <MagicModal
        isOpen={state.showWorkflowModal}
        onClose={() => setState(prev => ({ ...prev, showWorkflowModal: false }))}
        title="Select Workflow to Execute"
        size="xl"
        variant="glass"
        animation="scale"
        glowEffect
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.workflows.map((workflow) => (
            <MagicCard
              key={workflow.id}
              variant="default"
              hoverable
              onClick={() => {
                setState(prev => ({ 
                  ...prev, 
                  selectedWorkflow: workflow,
                  showWorkflowModal: false,
                  showConfigModal: true 
                }));
              }}
              className="cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getCategoryIcon(workflow.category)}</div>
                  <div>
                    <h3 className="font-bold text-gray-900">{workflow.name}</h3>
                    <p className="text-sm text-gray-600">{workflow.estimatedDuration}m • {workflow.complexity}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{workflow.description}</p>
              </div>
            </MagicCard>
          ))}
        </div>
      </MagicModal>

      {/* Configuration Modal */}
      <MagicModal
        isOpen={state.showConfigModal}
        onClose={() => setState(prev => ({ ...prev, showConfigModal: false }))}
        title={`Configure ${state.selectedWorkflow?.name}`}
        size="lg"
        variant="holographic"
        animation="zoom"
        footer={
          <div className="flex gap-4">
            <MagicButton
              variant="ghost"
              onClick={() => setState(prev => ({ ...prev, showConfigModal: false }))}
              className="flex-1"
            >
              Cancel
            </MagicButton>
            <MagicButton
              variant="primary"
              onClick={() => state.selectedWorkflow && handleExecuteWorkflow(state.selectedWorkflow.id)}
              className="flex-1"
              glowEffect
              disabled={state.isLoading}
              loading={state.isLoading}
            >
              Execute Workflow
            </MagicButton>
          </div>
        }
      >
        {state.selectedWorkflow && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {getCategoryIcon(state.selectedWorkflow.category)}
              </div>
              <h3 className="text-xl font-bold">{state.selectedWorkflow.name}</h3>
              <p className="text-gray-600">{state.selectedWorkflow.description}</p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Required Tokens & Configuration:</h4>
              
              {state.selectedWorkflow.requiredPermissions.includes('linkedin:read') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LinkedIn Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="Enter LinkedIn access token"
                    value={executionConfig.linkedinToken || ''}
                    onChange={(e) => setExecutionConfig(prev => ({
                      ...prev,
                      linkedinToken: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {state.selectedWorkflow.requiredPermissions.includes('github:read') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GitHub Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="Enter GitHub access token"
                    value={executionConfig.githubToken || ''}
                    onChange={(e) => setExecutionConfig(prev => ({
                      ...prev,
                      githubToken: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium">Options:</h4>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={executionConfig.options?.skipOptionalSteps || false}
                    onChange={(e) => setExecutionConfig(prev => ({
                      ...prev,
                      options: { 
                        skipOptionalSteps: e.target.checked,
                        allowPartialCompletion: prev.options?.allowPartialCompletion ?? false,
                        notifyOnProgress: prev.options?.notifyOnProgress ?? false
                      }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Skip optional steps</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={executionConfig.options?.allowPartialCompletion || false}
                    onChange={(e) => setExecutionConfig(prev => ({
                      ...prev,
                      options: { 
                        skipOptionalSteps: prev.options?.skipOptionalSteps ?? false,
                        allowPartialCompletion: e.target.checked,
                        notifyOnProgress: prev.options?.notifyOnProgress ?? false
                      }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Allow partial completion</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={executionConfig.options?.notifyOnProgress || false}
                    onChange={(e) => setExecutionConfig(prev => ({
                      ...prev,
                      options: { 
                        skipOptionalSteps: prev.options?.skipOptionalSteps ?? false,
                        allowPartialCompletion: prev.options?.allowPartialCompletion ?? false,
                        notifyOnProgress: e.target.checked
                      }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Notify on progress updates</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </MagicModal>

      {/* Execution Progress Modal */}
      <MagicModal
        isOpen={state.showExecutionModal && !!state.activeExecution}
        onClose={() => setState(prev => ({ ...prev, showExecutionModal: false }))}
        title="Workflow Execution Progress"
        size="lg"
        variant="neon"
        animation="bounce"
        closeOnBackdrop={false}
        closeOnEscape={false}
        showCloseButton={state.activeExecution?.status !== 'running'}
        particleEffect
      >
        {state.activeExecution && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {state.activeExecution.status === 'running' ? '⚡' : 
                 state.activeExecution.status === 'completed' ? '✅' : 
                 state.activeExecution.status === 'failed' ? '❌' : '⏸️'}
              </div>
              <h3 className="text-xl font-bold mb-2">
                {state.activeExecution.progress.message}
              </h3>
              <p className={`text-sm font-medium ${getStatusColor(state.activeExecution.status)}`}>
                Status: {state.activeExecution.status.toUpperCase()}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{state.activeExecution.progress.overallProgress}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${state.activeExecution.progress.overallProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Completed Steps:</span>
                  <span className="font-medium ml-2">
                    {state.activeExecution.metadata.completedSteps}/{state.activeExecution.metadata.totalSteps}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Credentials Generated:</span>
                  <span className="font-medium ml-2">
                    {state.activeExecution.results.credentials.length}
                  </span>
                </div>
              </div>

              {state.activeExecution.status === 'running' && (
                <div className="text-center">
                  <MagicButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleCancelExecution(state.activeExecution!.id)}
                  >
                    Cancel Execution
                  </MagicButton>
                </div>
              )}

              {state.activeExecution.status === 'completed' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Execution Completed Successfully!</h4>
                  <div className="space-y-1 text-sm text-green-700">
                    <p>✅ {state.activeExecution.results.credentials.length} credentials generated</p>
                    <p>⏱️ Completed in {state.activeExecution.metadata.actualDuration || 'N/A'} minutes</p>
                    <p>🎯 Overall Trust Score: {Math.round(state.activeExecution.results.aggregatedScores.overallTrustScore)}%</p>
                  </div>
                </div>
              )}

              {state.activeExecution.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                  <div className="space-y-1">
                    {state.activeExecution.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-700">
                        {error.stepName}: {error.error}
                      </p>
                    ))}
                  </div>
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

export default AdvancedWorkflowDashboard;